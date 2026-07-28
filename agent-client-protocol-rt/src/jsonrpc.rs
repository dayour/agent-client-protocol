//! Newline-delimited JSON-RPC 2.0 codec.
//!
//! This module encodes and decodes the JSON-RPC 2.0 envelopes ACP rides on. It
//! is transport agnostic: [`encode_request`], [`encode_notification`],
//! [`encode_success`], and [`encode_error`] each return a single line of JSON
//! (without the trailing newline), and [`parse_line`] turns one received line
//! back into zero or more routable [`Parsed`] items.
//!
//! The codec follows the JSON-RPC 2.0 rules that matter for routing:
//!
//! - A message with a `method` and an `id` is a [`Incoming::Request`].
//! - A message with a `method` and no `id` member is an
//!   [`Incoming::Notification`].
//! - A message with an `id` and a `result` or `error` (and no `method`) is an
//!   [`Incoming::Response`].
//! - Request ids may be JSON strings or numbers; both are preserved verbatim so
//!   responses correlate correctly.
//! - Anything else (non-JSON input, a JSON value that is not an object, an
//!   empty batch, or an object that matches none of the shapes above) becomes
//!   [`Parsed::Invalid`] carrying the id to answer with, if one is known, and a
//!   suitable JSON-RPC error.

use serde_json::{Map, Value};

use crate::error::Error;
pub use agent_client_protocol_schema::v1::RequestId;

/// A single decoded inbound item produced by [`parse_line`].
#[derive(Debug)]
#[non_exhaustive]
pub enum Parsed {
    /// A structurally valid JSON-RPC message ready to be routed.
    Incoming(Incoming),
    /// A structurally invalid message. `id` is the id to answer with (or
    /// [`RequestId::Null`] when none could be recovered), and `error` describes
    /// the failure.
    Invalid {
        /// Request id to include in the error response.
        id: RequestId,
        /// The JSON-RPC error to report back to the peer.
        error: Error,
    },
}

/// A structurally valid inbound JSON-RPC message.
#[derive(Debug)]
#[non_exhaustive]
pub enum Incoming {
    /// A request expecting a matching response.
    Request {
        /// Correlation id echoed back in the response.
        id: RequestId,
        /// Wire method name being invoked.
        method: String,
        /// Raw method parameters, if any were supplied.
        params: Option<Value>,
    },
    /// A one-way notification that expects no response.
    Notification {
        /// Wire method name being signalled.
        method: String,
        /// Raw method parameters, if any were supplied.
        params: Option<Value>,
    },
    /// A response correlating to a previously sent request.
    Response {
        /// Correlation id from the originating request.
        id: RequestId,
        /// `Ok` for a successful `result`, `Err` for a JSON-RPC `error`.
        result: Result<Value, Error>,
    },
}

const JSONRPC_VERSION: &str = "2.0";

/// Encodes a JSON-RPC request line.
///
/// `params` is omitted from the wire form when `None` so strict peers do not
/// observe an explicit `"params": null`.
#[must_use]
pub fn encode_request(id: &RequestId, method: &str, params: Option<Value>) -> String {
    let mut map = base_map();
    map.insert("id".to_owned(), id_to_value(id));
    map.insert("method".to_owned(), Value::String(method.to_owned()));
    if let Some(params) = params {
        map.insert("params".to_owned(), params);
    }
    to_line(&map)
}

/// Encodes a JSON-RPC notification line.
///
/// `params` is omitted from the wire form when `None`.
#[must_use]
pub fn encode_notification(method: &str, params: Option<Value>) -> String {
    let mut map = base_map();
    map.insert("method".to_owned(), Value::String(method.to_owned()));
    if let Some(params) = params {
        map.insert("params".to_owned(), params);
    }
    to_line(&map)
}

/// Encodes a successful JSON-RPC response line.
#[must_use]
pub fn encode_success(id: &RequestId, result: Value) -> String {
    let mut map = base_map();
    map.insert("id".to_owned(), id_to_value(id));
    map.insert("result".to_owned(), result);
    to_line(&map)
}

/// Encodes a failed JSON-RPC response line.
#[must_use]
pub fn encode_error(id: &RequestId, error: &Error) -> String {
    let mut map = base_map();
    map.insert("id".to_owned(), id_to_value(id));
    map.insert(
        "error".to_owned(),
        serde_json::to_value(error).unwrap_or_else(|_| {
            // `Error` is a plain data struct and always serializes; fall back to
            // a minimal internal error object rather than panicking.
            serde_json::json!({ "code": -32603, "message": "internal error" })
        }),
    );
    to_line(&map)
}

/// Parses one received line into zero or more routable items.
///
/// Blank lines produce an empty vector. A JSON batch (top-level array) produces
/// one item per element. Malformed input produces a single [`Parsed::Invalid`].
#[must_use]
pub fn parse_line(line: &str) -> Vec<Parsed> {
    if line.trim().is_empty() {
        return Vec::new();
    }

    match serde_json::from_str::<Value>(line) {
        Err(_) => vec![Parsed::Invalid {
            id: RequestId::Null,
            error: Error::parse_error(),
        }],
        Ok(Value::Array(items)) if items.is_empty() => vec![Parsed::Invalid {
            id: RequestId::Null,
            error: Error::invalid_request(),
        }],
        Ok(Value::Array(items)) => items.into_iter().map(parse_value).collect(),
        Ok(value) => vec![parse_value(value)],
    }
}

fn parse_value(value: Value) -> Parsed {
    let Value::Object(obj) = value else {
        return invalid(RequestId::Null);
    };

    let has_id = obj.contains_key("id");
    let id = if has_id {
        match obj
            .get("id")
            .cloned()
            .map(serde_json::from_value::<RequestId>)
        {
            Some(Ok(id)) => id,
            _ => return invalid(RequestId::Null),
        }
    } else {
        RequestId::Null
    };

    if let Some(method_value) = obj.get("method") {
        let Some(method) = method_value.as_str() else {
            return invalid(id);
        };
        let method = method.to_owned();
        let params = obj.get("params").cloned();
        if has_id {
            return Parsed::Incoming(Incoming::Request { id, method, params });
        }
        return Parsed::Incoming(Incoming::Notification { method, params });
    }

    // No method: this must be a response.
    if !has_id {
        return invalid(RequestId::Null);
    }
    if let Some(error_value) = obj.get("error") {
        return match serde_json::from_value::<Error>(error_value.clone()) {
            Ok(error) => Parsed::Incoming(Incoming::Response {
                id,
                result: Err(error),
            }),
            Err(_) => invalid(id),
        };
    }
    if let Some(result) = obj.get("result").cloned() {
        return Parsed::Incoming(Incoming::Response {
            id,
            result: Ok(result),
        });
    }

    invalid(id)
}

fn invalid(id: RequestId) -> Parsed {
    Parsed::Invalid {
        id,
        error: Error::invalid_request(),
    }
}

fn base_map() -> Map<String, Value> {
    let mut map = Map::new();
    map.insert(
        "jsonrpc".to_owned(),
        Value::String(JSONRPC_VERSION.to_owned()),
    );
    map
}

fn id_to_value(id: &RequestId) -> Value {
    serde_json::to_value(id).unwrap_or(Value::Null)
}

fn to_line(map: &Map<String, Value>) -> String {
    serde_json::to_string(map).unwrap_or_else(|_| String::from("{\"jsonrpc\":\"2.0\"}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_round_trips_numeric_id() {
        let line = encode_request(
            &RequestId::Number(7),
            "initialize",
            Some(serde_json::json!({"protocolVersion": 1})),
        );
        let parsed = parse_line(&line);
        assert_eq!(parsed.len(), 1);
        match &parsed[0] {
            Parsed::Incoming(Incoming::Request { id, method, params }) => {
                assert_eq!(*id, RequestId::Number(7));
                assert_eq!(method, "initialize");
                assert!(params.is_some());
            }
            other => panic!("expected request, got {other:?}"),
        }
    }

    #[test]
    fn request_round_trips_string_id() {
        let line = encode_request(&RequestId::Str("abc".to_owned()), "session/new", None);
        assert!(!line.contains("params"));
        match &parse_line(&line)[0] {
            Parsed::Incoming(Incoming::Request { id, .. }) => {
                assert_eq!(*id, RequestId::Str("abc".to_owned()));
            }
            other => panic!("expected request, got {other:?}"),
        }
    }

    #[test]
    fn notification_has_no_id() {
        let line = encode_notification("session/cancel", Some(serde_json::json!({"a": 1})));
        match &parse_line(&line)[0] {
            Parsed::Incoming(Incoming::Notification { method, .. }) => {
                assert_eq!(method, "session/cancel");
            }
            other => panic!("expected notification, got {other:?}"),
        }
    }

    #[test]
    fn success_and_error_responses_decode() {
        let ok = encode_success(&RequestId::Number(1), serde_json::json!({"ok": true}));
        match &parse_line(&ok)[0] {
            Parsed::Incoming(Incoming::Response { id, result }) => {
                assert_eq!(*id, RequestId::Number(1));
                assert!(result.is_ok());
            }
            other => panic!("expected response, got {other:?}"),
        }

        let err = encode_error(&RequestId::Number(2), &Error::method_not_found());
        match &parse_line(&err)[0] {
            Parsed::Incoming(Incoming::Response { result, .. }) => {
                let error = result.as_ref().expect_err("should be an error response");
                assert_eq!(error.code, ErrorCodeMirror::method_not_found_code());
            }
            other => panic!("expected error response, got {other:?}"),
        }
    }

    #[test]
    fn non_json_is_parse_error() {
        match &parse_line("this is not json")[0] {
            Parsed::Invalid { id, error } => {
                assert_eq!(*id, RequestId::Null);
                assert_eq!(i32::from(error.code), -32700);
            }
            other => panic!("expected invalid, got {other:?}"),
        }
    }

    #[test]
    fn empty_batch_is_invalid_request() {
        match &parse_line("[]")[0] {
            Parsed::Invalid { error, .. } => assert_eq!(i32::from(error.code), -32600),
            other => panic!("expected invalid, got {other:?}"),
        }
    }

    #[test]
    fn blank_line_is_skipped() {
        assert!(parse_line("   ").is_empty());
    }

    // Small helper so the error-code assertion does not depend on importing the
    // schema enum name into the test module directly.
    struct ErrorCodeMirror;
    impl ErrorCodeMirror {
        fn method_not_found_code() -> crate::error::ErrorCode {
            Error::method_not_found().code
        }
    }
}
