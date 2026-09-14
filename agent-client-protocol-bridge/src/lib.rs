//! Stateful v1-to-v2 bridge for the Agent Client Protocol (ACP).
//!
//! The pure conversion layer in
//! [`agent_client_protocol_schema::v2::conversion`] is, by its own module
//! documentation, *not a protocol router*: it is a stateless, field-by-field
//! type mapping that rejects any v2 shape with no v1 representation (and vice
//! versa). That is the right contract for a converter, but it cannot bridge two
//! live peers, because the hard cases require **state** that lives in neither
//! peer.
//!
//! This crate is that state. [`ProtocolBridge`] sits between a v1 peer and a v2
//! peer and mediates the three shapes the converter cannot:
//!
//! 1. **`session/load` vs `session/resume`.** v2 dropped `session/load`
//!    entirely and folded it into `session/resume` with an optional
//!    `replayFrom` cursor. v1 `session/load` *always* replays history; v1
//!    `session/resume` *never* does. The bridge decides which v1 method a v2
//!    resume maps to, and refuses the combination that cannot be honoured
//!    (see [`session`]).
//! 2. **Terminals.** v1 `terminal/*` methods are *client executed*: the client
//!    runs the process. v2 has no client terminal surface at all; its
//!    `TerminalUpdate` is *display only*. Bridging a v1 agent to a v2 client
//!    therefore requires the bridge to **own process execution**, because
//!    neither side does (see [`terminal`]).
//! 3. **Filesystem.** v1 `fs/read_text_file` and `fs/write_text_file` are
//!    client methods with no v2 client surface. The bridge refuses them by
//!    default and can be configured to degrade to local-disk I/O with a loud,
//!    structured warning (see [`fs`]).
//!
//! # Directionality
//!
//! v1-to-v2 and v2-to-v1 are **not** symmetric. Each public method names the
//! direction it supports. Where a mapping is lossy it is *loud*: the method
//! returns a typed [`BridgeError`] or attaches a [`BridgeWarning`]. This crate
//! never silently drops protocol semantics.
//!
//! # What the bridge does not do
//!
//! This is the mediation core, not a transport. It converts and sequences typed
//! protocol values and owns the execution/session state required to do so
//! correctly. Wiring it to a JSON-RPC transport, negotiating capabilities on
//! the wire, and pumping notifications are the responsibility of the embedding
//! runtime.

pub mod error;
pub mod fs;
pub mod session;
pub mod terminal;

use std::collections::HashMap;
use std::sync::Arc;

pub use error::{BridgeError, BridgeWarning, BridgeWarningKind, Emulated};
pub use fs::FilesystemPolicy;
pub use session::{V1ResumeTarget, V1SessionSupport};
pub use terminal::{
    ProcessTerminalExecutor, TerminalCreated, TerminalExecutor, TerminalExit, TerminalHandle,
    TerminalSpec,
};

use terminal::TerminalState;

/// Re-exported schema crate, so callers can name the exact protocol types the
/// bridge consumes and produces without a separate dependency line.
pub use agent_client_protocol_schema as schema;

/// Configuration for a [`ProtocolBridge`].
#[derive(Debug, Clone)]
#[non_exhaustive]
pub struct BridgeConfig {
    /// How the bridge answers v1 `fs/*` client methods that v2 does not expose.
    pub filesystem: FilesystemPolicy,
}

impl Default for BridgeConfig {
    fn default() -> Self {
        Self {
            filesystem: FilesystemPolicy::Reject,
        }
    }
}

impl BridgeConfig {
    /// Builds the default configuration (filesystem methods rejected).
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets the filesystem policy.
    #[must_use]
    pub fn filesystem(mut self, policy: FilesystemPolicy) -> Self {
        self.filesystem = policy;
        self
    }
}

/// Per-session state owned by the bridge for the lifetime of the session.
#[derive(Debug)]
pub(crate) struct SessionRecord {
    /// Whether the upstream request asked for history replay. Recorded so the
    /// bridge can reason about replay semantics rather than guessing.
    pub(crate) replay: session::ReplayExpectation,
    /// Bridge-owned terminals, keyed by the terminal id the bridge minted.
    pub(crate) terminals: HashMap<String, TerminalState>,
}

impl SessionRecord {
    fn new(replay: session::ReplayExpectation) -> Self {
        Self {
            replay,
            terminals: HashMap::new(),
        }
    }
}

/// A stateful mediator between a v1 peer and a v2 peer.
///
/// The bridge owns two kinds of state, both scoped to the session that created
/// them and dropped when the session is dropped:
///
/// * a **session registry** recording, per session id, whether history replay
///   was requested (used by the `session/load` vs `session/resume` mediation);
/// * a **terminal table**, per session, holding the OS process handles the
///   bridge executes on behalf of a v1 agent talking to a v2 client.
///
/// A single bridge instance mediates a single v1/v2 peer pairing. It is not
/// `Sync`-shared across pairings; construct one per connection.
#[derive(Debug)]
pub struct ProtocolBridge {
    config: BridgeConfig,
    sessions: HashMap<String, SessionRecord>,
    executor: Arc<dyn TerminalExecutor>,
    terminal_seq: u64,
}

impl ProtocolBridge {
    /// Builds a bridge with the default configuration and the real
    /// OS-process terminal executor.
    #[must_use]
    pub fn new() -> Self {
        Self::with_config(BridgeConfig::default())
    }

    /// Builds a bridge with a custom configuration and the real OS-process
    /// terminal executor.
    #[must_use]
    pub fn with_config(config: BridgeConfig) -> Self {
        Self::with_executor(config, Arc::new(ProcessTerminalExecutor::new()))
    }

    /// Builds a bridge with a custom configuration and a custom terminal
    /// executor.
    ///
    /// A custom executor is the seam used by tests to run deterministic,
    /// in-memory processes instead of real OS commands.
    #[must_use]
    pub fn with_executor(config: BridgeConfig, executor: Arc<dyn TerminalExecutor>) -> Self {
        Self {
            config,
            sessions: HashMap::new(),
            executor,
            terminal_seq: 0,
        }
    }

    /// Returns the bridge configuration.
    #[must_use]
    pub fn config(&self) -> &BridgeConfig {
        &self.config
    }

    /// Returns the number of sessions the bridge is currently tracking.
    #[must_use]
    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }

    /// Drops all state for a session, killing any still-running terminals.
    ///
    /// Returns `true` if a session was present.
    pub fn close_session(&mut self, session_id: &str) -> bool {
        if let Some(record) = self.sessions.remove(session_id) {
            for (_, terminal) in record.terminals {
                terminal.handle.kill();
            }
            true
        } else {
            false
        }
    }

    /// Returns a session record, inserting a default one if the session id is
    /// not yet known. Terminal operations vivify a session because an active
    /// terminal implies an active session even when the bridge did not mediate
    /// the session opening.
    pub(crate) fn session_entry(&mut self, session_id: &str) -> &mut SessionRecord {
        self.sessions
            .entry(session_id.to_owned())
            .or_insert_with(|| SessionRecord::new(session::ReplayExpectation::Unknown))
    }
}

impl Default for ProtocolBridge {
    fn default() -> Self {
        Self::new()
    }
}
