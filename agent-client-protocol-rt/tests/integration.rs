//! Integration tests for the in-repo ACP runtime.
//!
//! These tests exercise the real [`Connection`], [`AgentSideConnection`], and
//! [`ClientSideConnection`] machinery over `tokio::io::duplex` in-memory pipes.
//! Nothing here mocks the transport or the codec: every test drives two live
//! connection drivers that serialize JSON-RPC frames, push them through a real
//! byte stream, parse them back, and correlate responses. The only thing absent
//! versus the binary launch test is separate OS processes.

#![allow(clippy::multiple_crate_versions)]

use agent_client_protocol_rt::error::Error;
use agent_client_protocol_rt::{
    Agent, AgentSideConnection, Client, ClientSideConnection, Connection, ErrorCode, Handler,
};
use agent_client_protocol_schema::v1::{
    ContentBlock, ContentChunk, InitializeRequest, InitializeResponse, NewSessionRequest,
    NewSessionResponse, PromptRequest, PromptResponse, SessionNotification, SessionUpdate,
    StopReason, TextContent,
};
use agent_client_protocol_schema::ProtocolVersion;

use tokio::io::{split, AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::mpsc;
use tokio::time::{timeout, Duration};

/// A test agent that echoes prompts and reports the number of prompts served.
struct EchoAgent {
    connection: AgentSideConnection,
}

#[async_trait::async_trait]
impl Agent for EchoAgent {
    async fn initialize(&self, request: InitializeRequest) -> Result<InitializeResponse, Error> {
        Ok(InitializeResponse::new(request.protocol_version))
    }

    async fn new_session(&self, _request: NewSessionRequest) -> Result<NewSessionResponse, Error> {
        Ok(NewSessionResponse::new("test-session"))
    }

    async fn prompt(&self, request: PromptRequest) -> Result<PromptResponse, Error> {
        let text = request
            .prompt
            .iter()
            .find_map(|block| match block {
                ContentBlock::Text(text) => Some(text.text.clone()),
                _ => None,
            })
            .unwrap_or_default();
        let update = SessionUpdate::AgentMessageChunk(ContentChunk::new(ContentBlock::Text(
            TextContent::new(format!("echo: {text}")),
        )));
        self.connection
            .session_notification(SessionNotification::new(request.session_id.clone(), update))?;
        Ok(PromptResponse::new(StopReason::EndTurn))
    }
}

/// A client that records streamed agent message chunks.
struct RecordingClient {
    updates: mpsc::UnboundedSender<String>,
}

#[async_trait::async_trait]
impl Client for RecordingClient {
    async fn session_notification(&self, notification: SessionNotification) {
        if let SessionUpdate::AgentMessageChunk(chunk) = &notification.update {
            if let ContentBlock::Text(text) = &chunk.content {
                drop(self.updates.send(text.text.clone()));
            }
        }
    }
}

/// A handler that rejects every request, used as an inert caller side.
struct RejectingHandler;

#[async_trait::async_trait]
impl Handler for RejectingHandler {
    async fn handle_request(
        &self,
        _method: String,
        _params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, Error> {
        Err(Error::method_not_found())
    }

    async fn handle_notification(&self, _method: String, _params: Option<serde_json::Value>) {}
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn full_handshake_roundtrip() {
    let (client_io, agent_io) = tokio::io::duplex(8192);
    let (client_read, client_write) = split(client_io);
    let (agent_read, agent_write) = split(agent_io);

    let (_agent, agent_driver) = AgentSideConnection::new(agent_read, agent_write, |connection| {
        EchoAgent { connection }
    });
    let (updates_tx, mut updates_rx) = mpsc::unbounded_channel::<String>();
    let (client, client_driver) =
        ClientSideConnection::new(client_read, client_write, move |_connection| {
            RecordingClient {
                updates: updates_tx,
            }
        });

    let agent_task = tokio::spawn(agent_driver);
    let client_task = tokio::spawn(client_driver);

    let init = client
        .initialize(InitializeRequest::new(ProtocolVersion::V1))
        .await
        .expect("initialize should succeed");
    assert_eq!(init.protocol_version, ProtocolVersion::V1);

    let session = client
        .new_session(NewSessionRequest::new(std::env::temp_dir()))
        .await
        .expect("new_session should succeed");

    let prompt = client
        .prompt(PromptRequest::new(
            session.session_id.clone(),
            vec![ContentBlock::Text(TextContent::new("ping"))],
        ))
        .await
        .expect("prompt should succeed");
    assert_eq!(prompt.stop_reason, StopReason::EndTurn);

    let update = timeout(Duration::from_secs(2), updates_rx.recv())
        .await
        .expect("update should arrive before timeout")
        .expect("update channel should stay open");
    assert_eq!(update, "echo: ping");

    // Dropping the client closes the transport; both drivers shut down.
    drop(client);
    agent_task.abort();
    client_task.abort();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn unknown_method_returns_method_not_found() {
    let (caller_io, agent_io) = tokio::io::duplex(8192);
    let (caller_read, caller_write) = split(caller_io);
    let (agent_read, agent_write) = split(agent_io);

    let (caller, caller_driver) = Connection::new(RejectingHandler, caller_read, caller_write);
    let (_agent, agent_driver) = AgentSideConnection::new(agent_read, agent_write, |connection| {
        EchoAgent { connection }
    });

    let agent_task = tokio::spawn(agent_driver);
    let caller_task = tokio::spawn(caller_driver);

    let error = caller
        .request("no/such/method", None)
        .await
        .expect_err("unknown method must be rejected");
    assert_eq!(error.code, ErrorCode::MethodNotFound);

    agent_task.abort();
    caller_task.abort();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn malformed_response_surfaces_error() {
    let (client_io, server_io) = tokio::io::duplex(8192);
    let (client_read, client_write) = split(client_io);
    let (server_read, mut server_write) = split(server_io);

    let (client, client_driver) =
        ClientSideConnection::new(client_read, client_write, |_connection| RecordingClient {
            updates: mpsc::unbounded_channel().0,
        });
    let client_task = tokio::spawn(client_driver);

    // Hand-rolled responder: read the initialize request, reply with a
    // structurally valid JSON-RPC response whose result cannot decode into an
    // InitializeResponse (it lacks the required protocolVersion field).
    let responder = tokio::spawn(async move {
        let mut lines = BufReader::new(server_read).lines();
        if let Ok(Some(line)) = lines.next_line().await {
            let id = serde_json::from_str::<serde_json::Value>(&line)
                .ok()
                .and_then(|value| value.get("id").cloned())
                .unwrap_or_else(|| serde_json::json!(1));
            let response = serde_json::json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": { "unexpected": "shape" },
            });
            let mut bytes = response.to_string().into_bytes();
            bytes.push(b'\n');
            let _write = server_write.write_all(&bytes).await;
            let _flush = server_write.flush().await;
        }
    });

    let result = client
        .initialize(InitializeRequest::new(ProtocolVersion::V1))
        .await;
    assert!(
        result.is_err(),
        "client must surface the decode error, got {result:?}"
    );

    responder.abort();
    client_task.abort();
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn graceful_shutdown_on_eof() {
    let (local_io, remote_io) = tokio::io::duplex(64);
    let (local_read, local_write) = split(local_io);

    let (caller, driver) = Connection::new(RejectingHandler, local_read, local_write);
    let driver_task = tokio::spawn(driver);

    // Close the peer entirely: the caller's read side observes EOF.
    drop(remote_io);

    // The driver resolves to Ok(()) on a clean EOF rather than hanging.
    let shutdown_result = timeout(Duration::from_secs(2), driver_task)
        .await
        .expect("driver must finish promptly after EOF")
        .expect("driver task should not panic");
    assert!(
        shutdown_result.is_ok(),
        "graceful EOF should yield Ok, got {shutdown_result:?}"
    );

    // A request issued after shutdown fails fast with a connection-closed error.
    let error = caller
        .request("anything", None)
        .await
        .expect_err("request after shutdown must fail");
    assert_eq!(error.code, ErrorCode::InternalError);
}
