//! Filesystem method mediation.
//!
//! # The surface gap
//!
//! v1 exposes two client filesystem methods, `fs/read_text_file` and
//! `fs/write_text_file`. The agent calls them on the client because the client
//! (typically an editor) is the authority on file contents, including unsaved
//! in-editor buffers that differ from disk. v2 has **no client filesystem
//! surface at all**: an agent bridged to a v2 client has nobody to ask.
//!
//! # The deliberate choice
//!
//! There is no free lunch. Three options exist and each loses something:
//!
//! * **Reject** (default). The bridge refuses the method with a typed error. It
//!   loses the capability but preserves correctness: it never fabricates file
//!   contents.
//! * **Emulate against the editor.** Impossible: the bridge has no channel to a
//!   v2 client's editor buffers, because v2 does not define one.
//! * **Degrade to local disk.** The bridge reads and writes the real
//!   filesystem. This is usable but **lossy**: it silently ignores unsaved
//!   editor state, which is the entire reason v1's client-side fs methods
//!   exist. The bridge makes this loud by attaching a [`BridgeWarning`] to
//!   every degraded result.
//!
//! The default is [`FilesystemPolicy::Reject`] because silently substituting
//! disk contents for editor contents is exactly the kind of quiet semantic loss
//! this crate refuses to commit.
//!
//! # Directionality
//!
//! v1 agent `fs/*` to v2 client: REFUSED by default, or SUPPORTED-BUT-LOSSY
//! under [`FilesystemPolicy::LocalDiskFallback`].

use std::fs;

use agent_client_protocol_schema::v1;

use crate::{BridgeError, BridgeWarning, Emulated, ProtocolBridge};

/// How the bridge answers v1 `fs/*` client methods that v2 does not expose.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[non_exhaustive]
pub enum FilesystemPolicy {
    /// Refuse the method with [`BridgeError::UnsupportedClientMethod`]. Default.
    #[default]
    Reject,
    /// Serve the method from the local disk, attaching a [`BridgeWarning`] that
    /// unsaved editor-buffer semantics are not preserved.
    LocalDiskFallback,
}

const UNSAVED_BUFFER_DETAIL: &str = "served from local disk; v1 client filesystem methods can reflect unsaved editor buffers, \
     but a v2 client exposes no filesystem surface, so any in-editor changes not written to disk \
     are not reflected here";

impl ProtocolBridge {
    /// Mediates a v1 `fs/read_text_file`.
    ///
    /// Under [`FilesystemPolicy::Reject`] (default) this refuses. Under
    /// [`FilesystemPolicy::LocalDiskFallback`] it reads the file from disk,
    /// applies the optional `line`/`limit` window, and returns the content with
    /// a loud lossy-degrade warning.
    ///
    /// Direction: v1 agent to v2 client. REFUSED or SUPPORTED-BUT-LOSSY.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::UnsupportedClientMethod`] under the reject policy,
    /// or [`BridgeError::Io`] if the fallback cannot read the file.
    pub fn read_text_file(
        &mut self,
        request: &v1::ReadTextFileRequest,
    ) -> Result<Emulated<v1::ReadTextFileResponse>, BridgeError> {
        match self.config().filesystem {
            FilesystemPolicy::Reject => Err(BridgeError::UnsupportedClientMethod {
                method: "fs/read_text_file".to_owned(),
                reason: "a v2 client exposes no filesystem surface; enable \
                         FilesystemPolicy::LocalDiskFallback to serve it from local disk instead"
                    .to_owned(),
            }),
            FilesystemPolicy::LocalDiskFallback => {
                let raw = fs::read_to_string(&request.path).map_err(|error| BridgeError::Io {
                    operation: format!("reading `{}`", request.path.display()),
                    message: error.to_string(),
                })?;
                let content = window_lines(&raw, request.line, request.limit);
                Ok(Emulated::with_warnings(
                    v1::ReadTextFileResponse::new(content),
                    vec![BridgeWarning::lossy(
                        "fs/read_text_file",
                        UNSAVED_BUFFER_DETAIL,
                    )],
                ))
            }
        }
    }

    /// Mediates a v1 `fs/write_text_file`.
    ///
    /// Under [`FilesystemPolicy::Reject`] (default) this refuses. Under
    /// [`FilesystemPolicy::LocalDiskFallback`] it writes the file to disk and
    /// returns a response with a loud lossy-degrade warning.
    ///
    /// Direction: v1 agent to v2 client. REFUSED or SUPPORTED-BUT-LOSSY.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::UnsupportedClientMethod`] under the reject policy,
    /// or [`BridgeError::Io`] if the fallback cannot write the file.
    pub fn write_text_file(
        &mut self,
        request: &v1::WriteTextFileRequest,
    ) -> Result<Emulated<v1::WriteTextFileResponse>, BridgeError> {
        match self.config().filesystem {
            FilesystemPolicy::Reject => Err(BridgeError::UnsupportedClientMethod {
                method: "fs/write_text_file".to_owned(),
                reason: "a v2 client exposes no filesystem surface; enable \
                         FilesystemPolicy::LocalDiskFallback to serve it from local disk instead"
                    .to_owned(),
            }),
            FilesystemPolicy::LocalDiskFallback => {
                fs::write(&request.path, request.content.as_bytes()).map_err(|error| {
                    BridgeError::Io {
                        operation: format!("writing `{}`", request.path.display()),
                        message: error.to_string(),
                    }
                })?;
                Ok(Emulated::with_warnings(
                    v1::WriteTextFileResponse::new(),
                    vec![BridgeWarning::lossy(
                        "fs/write_text_file",
                        "written to local disk; a v2 client exposes no filesystem surface, so this \
                         bypasses any editor that would otherwise own the buffer for this path",
                    )],
                ))
            }
        }
    }
}

/// Applies the v1 `line`/`limit` window: `line` is a 1-based start line and
/// `limit` is a maximum line count. Absent values mean "from the start" and "no
/// limit" respectively.
fn window_lines(raw: &str, line: Option<u32>, limit: Option<u32>) -> String {
    if line.is_none() && limit.is_none() {
        return raw.to_owned();
    }
    let start = line.map_or(0, |value| {
        usize::try_from(value.saturating_sub(1)).unwrap_or(usize::MAX)
    });
    let selected = raw.lines().skip(start);
    let collected: Vec<&str> = match limit {
        Some(limit) => selected
            .take(usize::try_from(limit).unwrap_or(usize::MAX))
            .collect(),
        None => selected.collect(),
    };
    collected.join("\n")
}
