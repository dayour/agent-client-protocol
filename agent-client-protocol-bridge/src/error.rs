//! Error and warning types for the bridge.
//!
//! Every lossy or unsupported mediation is surfaced through one of these types.
//! A caller can choose to degrade (for example by ignoring a warning), but the
//! bridge itself never discards protocol meaning without saying so.

use std::fmt;

use agent_client_protocol_schema::v2::conversion::ProtocolConversionError;

/// An error returned when the bridge cannot mediate a request soundly.
///
/// Variants distinguish *unsupported* directions (which are refused by design)
/// from *runtime* faults (an unknown terminal, a spawn failure). Both are loud:
/// the bridge returns them rather than guessing.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum BridgeError {
    /// A session id was referenced that the bridge is not tracking.
    UnknownSession {
        /// The offending session id.
        session_id: String,
    },
    /// A terminal id was referenced that the bridge did not mint or has already
    /// released.
    UnknownTerminal {
        /// The offending terminal id.
        terminal_id: String,
    },
    /// A terminal operation requires the process to have exited, but it has not.
    TerminalStillRunning {
        /// The terminal id.
        terminal_id: String,
    },
    /// A terminal was used after it was released.
    TerminalReleased {
        /// The terminal id.
        terminal_id: String,
    },
    /// The requested bridging direction is not soundly implementable and is
    /// refused by design. The message explains why.
    UnsupportedDirection {
        /// Human-readable explanation of the refusal.
        reason: String,
    },
    /// A v1 client method has no v2 client surface and the active policy refuses
    /// to emulate it.
    UnsupportedClientMethod {
        /// The v1 method name, for example `fs/read_text_file`.
        method: String,
        /// Why the method cannot be served.
        reason: String,
    },
    /// A v2 `session/resume` cannot be honoured against the v1 agent's
    /// advertised capabilities without changing replay semantics.
    IncompatibleSessionResume {
        /// Explanation of the incompatibility.
        reason: String,
    },
    /// The underlying stateless type conversion rejected the value.
    ///
    /// This is how the bridge reuses, rather than duplicates, the pure
    /// conversion layer: when the shared subset does not cover a value, the
    /// converter's own rejection is propagated verbatim.
    Conversion {
        /// The message from the pure conversion layer.
        message: String,
    },
    /// A filesystem or process I/O operation failed.
    Io {
        /// The operation being attempted.
        operation: String,
        /// The underlying error text.
        message: String,
    },
}

impl fmt::Display for BridgeError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnknownSession { session_id } => {
                write!(formatter, "unknown session `{session_id}`")
            }
            Self::UnknownTerminal { terminal_id } => {
                write!(formatter, "unknown terminal `{terminal_id}`")
            }
            Self::TerminalStillRunning { terminal_id } => {
                write!(formatter, "terminal `{terminal_id}` has not exited")
            }
            Self::TerminalReleased { terminal_id } => {
                write!(formatter, "terminal `{terminal_id}` was already released")
            }
            Self::UnsupportedDirection { reason } => {
                write!(formatter, "unsupported bridge direction: {reason}")
            }
            Self::UnsupportedClientMethod { method, reason } => {
                write!(
                    formatter,
                    "v1 client method `{method}` cannot be bridged to v2: {reason}"
                )
            }
            Self::IncompatibleSessionResume { reason } => {
                write!(formatter, "incompatible session resume: {reason}")
            }
            Self::Conversion { message } => {
                write!(
                    formatter,
                    "protocol conversion rejected the value: {message}"
                )
            }
            Self::Io { operation, message } => {
                write!(formatter, "{operation} failed: {message}")
            }
        }
    }
}

impl std::error::Error for BridgeError {}

impl From<ProtocolConversionError> for BridgeError {
    fn from(error: ProtocolConversionError) -> Self {
        Self::Conversion {
            message: error.message().to_owned(),
        }
    }
}

/// The category of a [`BridgeWarning`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum BridgeWarningKind {
    /// A value was produced, but some protocol semantics could not be
    /// preserved across the version boundary.
    LossyDegrade,
}

/// A structured, non-fatal notice that a mediation was lossy.
///
/// Warnings accompany a produced value in [`Emulated`]. They exist so that a
/// lossy bridge is never a *silent* bridge: the caller receives the value and
/// an explicit record of what was lost.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub struct BridgeWarning {
    /// The category of the warning.
    pub kind: BridgeWarningKind,
    /// The v1 method or shape the warning concerns, for example
    /// `fs/read_text_file`.
    pub subject: String,
    /// A human-readable explanation of what was lost.
    pub detail: String,
}

impl BridgeWarning {
    /// Builds a lossy-degrade warning.
    #[must_use]
    pub fn lossy(subject: impl Into<String>, detail: impl Into<String>) -> Self {
        Self {
            kind: BridgeWarningKind::LossyDegrade,
            subject: subject.into(),
            detail: detail.into(),
        }
    }
}

impl fmt::Display for BridgeWarning {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "[{}] {}", self.subject, self.detail)
    }
}

/// A produced value paired with any warnings raised while producing it.
///
/// An empty [`warnings`](Emulated::warnings) list means the mediation was
/// lossless. A non-empty list means the value is usable but some semantics were
/// dropped; the caller decides whether that is acceptable.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub struct Emulated<T> {
    /// The produced protocol value.
    pub value: T,
    /// Warnings raised while producing [`value`](Emulated::value).
    pub warnings: Vec<BridgeWarning>,
}

impl<T> Emulated<T> {
    /// Wraps a losslessly produced value with no warnings.
    #[must_use]
    pub fn lossless(value: T) -> Self {
        Self {
            value,
            warnings: Vec::new(),
        }
    }

    /// Wraps a value together with the warnings raised producing it.
    #[must_use]
    pub fn with_warnings(value: T, warnings: Vec<BridgeWarning>) -> Self {
        Self { value, warnings }
    }

    /// Returns `true` if producing the value was lossless.
    #[must_use]
    pub fn is_lossless(&self) -> bool {
        self.warnings.is_empty()
    }

    /// Consumes the wrapper, returning the value and its warnings.
    #[must_use]
    pub fn into_parts(self) -> (T, Vec<BridgeWarning>) {
        (self.value, self.warnings)
    }
}
