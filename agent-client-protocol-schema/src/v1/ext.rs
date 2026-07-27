//! Extension types and constants for protocol extensibility.
use derive_more::From;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::sync::Arc;

/// Value attached to a given ACP type on the `_meta` field.
///
/// The _meta property is reserved by ACP to allow clients and agents to attach
/// additional metadata to their interactions. Implementations MUST NOT make assumptions about
/// values at these keys.
///
/// See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
pub type Meta = serde_json::Map<String, serde_json::Value>;

/// Allows for sending an arbitrary request that is not part of the ACP spec.
/// Extension methods provide a way to add custom functionality while maintaining
/// protocol compatibility.
///
/// See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(transparent)]
#[non_exhaustive]
pub struct ExtRequest {
    /// Wire method name for this extension request.
    ///
    /// Extension method names must start with `_`.
    #[serde(skip)] // this is used for routing, but when serializing we only want the params
    pub method: Arc<str>,
    /// Raw JSON parameters for this extension message.
    #[schemars(with = "serde_json::Value")]
    pub params: Arc<RawValue>,
}

impl ExtRequest {
    /// Builds [`ExtRequest`] with the required request fields set; optional fields start unset or empty.
    #[must_use]
    pub fn new(method: impl Into<Arc<str>>, params: Arc<RawValue>) -> Self {
        Self {
            method: method.into(),
            params,
        }
    }
}

/// Allows for sending an arbitrary response to an [`ExtRequest`] that is not part of the ACP spec.
/// Extension methods provide a way to add custom functionality while maintaining
/// protocol compatibility.
///
/// See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, From)]
#[serde(transparent)]
#[non_exhaustive]
pub struct ExtResponse(#[schemars(with = "serde_json::Value")] pub Arc<RawValue>);

impl ExtResponse {
    /// Builds [`ExtResponse`] with the required response fields set; optional fields start unset or empty.
    #[must_use]
    pub fn new(params: Arc<RawValue>) -> Self {
        Self(params)
    }
}

/// Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
/// Extension notifications provide a way to send one-way messages for custom functionality
/// while maintaining protocol compatibility.
///
/// See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(transparent)]
#[non_exhaustive]
pub struct ExtNotification {
    /// Wire method name for this extension notification.
    ///
    /// Extension method names must start with `_`.
    #[serde(skip)] // this is used for routing, but when serializing we only want the params
    pub method: Arc<str>,
    /// Raw JSON parameters for this extension message.
    #[schemars(with = "serde_json::Value")]
    pub params: Arc<RawValue>,
}

impl ExtNotification {
    /// Builds [`ExtNotification`] with the required notification fields set; optional fields start unset or empty.
    #[must_use]
    pub fn new(method: impl Into<Arc<str>>, params: Arc<RawValue>) -> Self {
        Self {
            method: method.into(),
            params,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn raw(json: &str) -> Arc<RawValue> {
        Arc::from(RawValue::from_string(json.to_string()).unwrap())
    }

    #[test]
    fn ext_request_round_trips_raw_params() {
        let params = raw(r#"{"enabled":true}"#);
        let request = ExtRequest::new("_future/request", params.clone());

        assert_eq!(serde_json::to_string(&request).unwrap(), params.get());

        let decoded: ExtRequest = serde_json::from_str(params.get()).unwrap();
        assert!(decoded.method.is_empty());
        assert_eq!(decoded.params.get(), params.get());
    }

    #[test]
    fn ext_response_round_trips_raw_params() {
        let params = raw(r#"{"result":"ok"}"#);
        let response = ExtResponse::new(params.clone());

        assert_eq!(serde_json::to_string(&response).unwrap(), params.get());

        let decoded: ExtResponse = serde_json::from_str(params.get()).unwrap();
        assert_eq!(decoded.0.get(), params.get());
    }

    #[test]
    fn ext_notification_round_trips_raw_params() {
        let params = raw(r#"{"progress":50}"#);
        let notification = ExtNotification::new("_future/notify", params.clone());

        assert_eq!(serde_json::to_string(&notification).unwrap(), params.get());

        let decoded: ExtNotification = serde_json::from_str(params.get()).unwrap();
        assert!(decoded.method.is_empty());
        assert_eq!(decoded.params.get(), params.get());
    }
}
