//! Integration tests for the Rust runtime package boundary.

use std::path::PathBuf;

use agent_client_protocol_schema::{
    ProtocolVersion,
    rpc::JsonRpcMessage,
    v1::{
        self, AGENT_METHOD_NAMES, CLIENT_METHOD_NAMES, CurrentModeUpdate, Implementation,
        InitializeRequest, NewSessionRequest, Notification, Request, RequestId, SessionId,
        SessionModeId, SessionNotification, SessionUpdate,
    },
};
use serde_json::json;

#[test]
fn rust_runtime_boundary_jsonrpc_round_trip() {
    let initialize_request = JsonRpcMessage::wrap(Request {
        id: RequestId::from(String::from("initialize-1")),
        method: AGENT_METHOD_NAMES.initialize.into(),
        params: Some(
            InitializeRequest::new(ProtocolVersion::V1)
                .client_info(Implementation::new("runtime-boundary-test", "0.1.0")),
        ),
    });
    let initialize_json = serde_json::to_value(&initialize_request).unwrap();
    let initialize_round_trip =
        serde_json::from_value::<JsonRpcMessage<Request<InitializeRequest>>>(
            initialize_json.clone(),
        )
        .unwrap();
    assert_eq!(initialize_round_trip, initialize_request);
    assert_eq!(initialize_json["jsonrpc"], json!("2.0"));
    assert_eq!(initialize_json["method"], json!("initialize"));

    let new_session_request = JsonRpcMessage::wrap(Request {
        id: RequestId::from(String::from("session-new-1")),
        method: AGENT_METHOD_NAMES.session_new.into(),
        params: Some(
            NewSessionRequest::new(PathBuf::from(r"E:\acp-fleet\rustboundary"))
                .additional_directories(vec![PathBuf::from(r"E:\acp-fleet\rustboundary\docs")]),
        ),
    });
    let new_session_json = serde_json::to_value(&new_session_request).unwrap();
    let new_session_round_trip =
        serde_json::from_value::<JsonRpcMessage<Request<NewSessionRequest>>>(
            new_session_json.clone(),
        )
        .unwrap();
    assert_eq!(new_session_round_trip, new_session_request);
    assert_eq!(new_session_json["jsonrpc"], json!("2.0"));
    assert_eq!(new_session_json["method"], json!("session/new"));

    let session_update_notification = JsonRpcMessage::wrap(Notification {
        method: CLIENT_METHOD_NAMES.session_update.into(),
        params: Some(SessionNotification::new(
            SessionId::new("session-123"),
            SessionUpdate::CurrentModeUpdate(CurrentModeUpdate::new(SessionModeId::new("code"))),
        )),
    });
    let session_update_json = serde_json::to_value(&session_update_notification).unwrap();
    let session_update_round_trip = serde_json::from_value::<
        JsonRpcMessage<Notification<SessionNotification>>,
    >(session_update_json.clone())
    .unwrap();
    assert_eq!(session_update_round_trip, session_update_notification);
    assert_eq!(session_update_json["jsonrpc"], json!("2.0"));
    assert_eq!(session_update_json["method"], json!("session/update"));

    let initialize_request_params = initialize_json["params"].clone();
    let schema_initialize_request =
        serde_json::from_value::<v1::InitializeRequest>(initialize_request_params.clone()).unwrap();
    assert_eq!(
        serde_json::to_value(&schema_initialize_request).unwrap(),
        initialize_request_params
    );
}
