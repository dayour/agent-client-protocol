//! Internal serialization helpers shared by the agent and client dispatchers.

use std::sync::Arc;

use serde::{de::DeserializeOwned, Serialize};
use serde_json::value::RawValue;
use serde_json::Value;

use crate::error::Error;

/// Decodes raw JSON-RPC parameters into a typed request/notification struct.
///
/// Missing params are treated as JSON `null`, matching the schema structs whose
/// fields all default.
pub(crate) fn decode_params<T: DeserializeOwned>(params: Option<Value>) -> Result<T, Error> {
    serde_json::from_value(params.unwrap_or(Value::Null)).map_err(Error::from)
}

/// Serializes a typed response/request into a JSON value for the wire.
pub(crate) fn encode_value<T: Serialize>(value: &T) -> Result<Value, Error> {
    serde_json::to_value(value).map_err(|err| Error::internal_error().data(err.to_string()))
}

/// Wraps raw inbound params as an owned [`RawValue`] for extension routing.
pub(crate) fn params_to_raw(params: Option<Value>) -> Result<Arc<RawValue>, Error> {
    let value = params.unwrap_or(Value::Null);
    let text = serde_json::to_string(&value)
        .map_err(|err| Error::internal_error().data(err.to_string()))?;
    RawValue::from_string(text)
        .map(Arc::from)
        .map_err(|err| Error::internal_error().data(err.to_string()))
}

/// Converts a raw extension payload into a JSON value for the wire.
pub(crate) fn raw_to_value(raw: &RawValue) -> Result<Value, Error> {
    serde_json::from_str(raw.get()).map_err(|err| Error::internal_error().data(err.to_string()))
}
