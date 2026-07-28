//! Reference ACP agent binary.
//!
//! Speaks the Agent Client Protocol over stdio. It negotiates `initialize`,
//! creates a session on `session/new`, and on `session/prompt` streams a single
//! `session/update` message chunk that echoes the user's prompt, then returns an
//! `end_turn` stop reason.
//!
//! Passing `--malformed` switches to a fault-injection mode: instead of
//! speaking the protocol it answers the first request with a structurally valid
//! JSON-RPC response whose result cannot be decoded into an `InitializeResponse`.
//! This exists to prove that the reference client surfaces the decode error
//! rather than silently succeeding.

// The async runtime resolves multiple versions of some platform shims via
// `tokio`; that is a dependency-graph property, not a code smell here.
#![allow(clippy::multiple_crate_versions)]

use std::process::ExitCode;

use agent_client_protocol_rt::error::Error;
use agent_client_protocol_rt::stdio::serve_agent_over_stdio;
use agent_client_protocol_rt::{Agent, AgentSideConnection};
use agent_client_protocol_schema::v1::{
    ContentBlock, ContentChunk, InitializeRequest, InitializeResponse, NewSessionRequest,
    NewSessionResponse, PromptRequest, PromptResponse, SessionNotification, SessionUpdate,
    StopReason, TextContent,
};

/// A minimal agent that echoes prompts back as a streamed message chunk.
struct EchoAgent {
    connection: AgentSideConnection,
}

#[async_trait::async_trait]
impl Agent for EchoAgent {
    async fn initialize(&self, request: InitializeRequest) -> Result<InitializeResponse, Error> {
        // Echo the client's requested protocol version; this reference agent
        // supports exactly the version the schema crate advertises.
        Ok(InitializeResponse::new(request.protocol_version))
    }

    async fn new_session(&self, _request: NewSessionRequest) -> Result<NewSessionResponse, Error> {
        Ok(NewSessionResponse::new("reference-session-1"))
    }

    async fn prompt(&self, request: PromptRequest) -> Result<PromptResponse, Error> {
        let user_text = request
            .prompt
            .iter()
            .find_map(|block| match block {
                ContentBlock::Text(text) => Some(text.text.clone()),
                _ => None,
            })
            .unwrap_or_default();

        let reply = format!("echo: {user_text}");
        let update = SessionUpdate::AgentMessageChunk(ContentChunk::new(ContentBlock::Text(
            TextContent::new(reply),
        )));
        self.connection
            .session_notification(SessionNotification::new(request.session_id.clone(), update))?;

        Ok(PromptResponse::new(StopReason::EndTurn))
    }
}

#[tokio::main]
async fn main() -> ExitCode {
    if std::env::args().any(|arg| arg == "--malformed") {
        return run_malformed().await;
    }

    match serve_agent_over_stdio(|connection| EchoAgent { connection }).await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("acp-agent: I/O error: {error}");
            ExitCode::FAILURE
        }
    }
}

/// Fault-injection mode: reply to the first request with an undecodable result.
async fn run_malformed() -> ExitCode {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut lines = BufReader::new(tokio::io::stdin()).lines();
    let mut stdout = tokio::io::stdout();

    if let Ok(Some(line)) = lines.next_line().await {
        let id = serde_json::from_str::<serde_json::Value>(&line)
            .ok()
            .and_then(|value| value.get("id").cloned())
            .unwrap_or_else(|| serde_json::json!(1));

        // A response with the correct id but a result that lacks the required
        // `protocolVersion` field, so `InitializeResponse` cannot decode it.
        let response = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": { "unexpected": "shape" },
        });

        drop(stdout.write_all(response.to_string().as_bytes()).await);
        drop(stdout.write_all(b"\n").await);
        drop(stdout.flush().await);
    }

    ExitCode::SUCCESS
}
