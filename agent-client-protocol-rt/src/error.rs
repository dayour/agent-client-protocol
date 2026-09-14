//! Error types for the runtime.
//!
//! Protocol-level failures reuse the schema crate's JSON-RPC [`Error`] and
//! [`ErrorCode`] types so that errors produced by the runtime are wire
//! identical to errors produced by the types crate. Transport-level failures
//! (a closed pipe, an I/O error on the underlying stream) are surfaced through
//! [`std::io::Error`] on the connection's driving future.

pub use agent_client_protocol_schema::v1::{Error, ErrorCode};

/// Convenience result alias for runtime operations that fail with a protocol
/// [`Error`].
pub type Result<T, E = Error> = std::result::Result<T, E>;

/// Builds the [`Error`] returned to a caller whose outbound request could not
/// be completed because the connection shut down before a response arrived.
#[must_use]
pub(crate) fn connection_closed() -> Error {
    Error::internal_error().data("connection closed before a response was received")
}
