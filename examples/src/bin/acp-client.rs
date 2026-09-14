//! Reference ACP client binary.
//!
//! Spawns the `acp-agent` binary as a child process, connects to its stdio over
//! real OS pipes, and drives a full handshake: `initialize`, `session/new`,
//! `session/prompt`. It prints the negotiated protocol version, the session id,
//! the streamed `session/update` chunk, and the prompt stop reason, then shuts
//! the agent down gracefully and exits with code 0.
//!
//! Passing `--malformed` spawns the agent in its fault-injection mode and
//! asserts that the client surfaces the decode error instead of treating the
//! malformed response as success.
//!
//! Exit codes:
//! - `0`: happy-path handshake completed and the agent exited.
//! - `2`: malformed mode, and the client correctly surfaced the error.
//! - `3`: malformed mode, but the client wrongly accepted the bad response.
//! - `4`: the run timed out (the process would otherwise hang).
//! - `1`: any other failure.

// The async runtime resolves multiple versions of some platform shims via
// `tokio`; that is a dependency-graph property, not a code smell here.
#![allow(clippy::multiple_crate_versions)]

use std::process::{ExitCode, Stdio};

use agent_client_protocol_rt::{Client, ClientSideConnection};
use agent_client_protocol_schema::v1::{
    ContentBlock, InitializeRequest, NewSessionRequest, PromptRequest, SessionNotification,
    SessionUpdate, TextContent,
};
use agent_client_protocol_schema::ProtocolVersion;
use tokio::process::Command;
use tokio::sync::mpsc;
use tokio::time::{timeout, Duration};

/// A client that records streamed agent message chunks onto a channel.
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

#[tokio::main]
async fn main() -> ExitCode {
    let malformed = std::env::args().any(|arg| arg == "--malformed");

    match timeout(Duration::from_secs(20), run(malformed)).await {
        Ok(Ok(code)) => code,
        Ok(Err(error)) => {
            eprintln!("acp-client: {error}");
            ExitCode::FAILURE
        }
        Err(_) => {
            eprintln!("acp-client: timed out waiting for the agent");
            ExitCode::from(4)
        }
    }
}

async fn run(malformed: bool) -> Result<ExitCode, Box<dyn std::error::Error>> {
    let mut agent_path = std::env::current_exe()?;
    agent_path.set_file_name(format!("acp-agent{}", std::env::consts::EXE_SUFFIX));

    let mut command = Command::new(&agent_path);
    if malformed {
        command.arg("--malformed");
    }
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .kill_on_drop(true);

    let mut child = command.spawn()?;
    let stdout = child.stdout.take().ok_or("child stdout was not captured")?;
    let stdin = child.stdin.take().ok_or("child stdin was not captured")?;

    let (updates_tx, mut updates_rx) = mpsc::unbounded_channel::<String>();
    let (connection, driver) =
        ClientSideConnection::new(stdout, stdin, move |_conn| RecordingClient {
            updates: updates_tx,
        });
    let driver_handle = tokio::spawn(driver);

    let init = connection
        .initialize(InitializeRequest::new(ProtocolVersion::V1))
        .await;

    if malformed {
        driver_handle.abort();
        drop(child.wait().await);
        return Ok(match init {
            Ok(_) => {
                println!("UNEXPECTED: client accepted a malformed initialize response");
                ExitCode::from(3)
            }
            Err(error) => {
                println!("client surfaced initialize error: {error}");
                ExitCode::from(2)
            }
        });
    }

    let init = init.map_err(|error| format!("initialize failed: {error}"))?;
    println!(
        "initialized: protocolVersion={}",
        init.protocol_version.as_u16()
    );

    let cwd = std::env::current_dir()?;
    let session = connection
        .new_session(NewSessionRequest::new(cwd))
        .await
        .map_err(|error| format!("new_session failed: {error}"))?;
    println!("session created: {}", session.session_id);

    let prompt_result = connection
        .prompt(PromptRequest::new(
            session.session_id.clone(),
            vec![ContentBlock::Text(TextContent::new(
                "hello from the reference client",
            ))],
        ))
        .await
        .map_err(|error| format!("prompt failed: {error}"))?;
    println!("prompt stop reason: {:?}", prompt_result.stop_reason);

    match timeout(Duration::from_secs(3), updates_rx.recv()).await {
        Ok(Some(update)) => println!("session update received: {update}"),
        _ => println!("session update received: <none>"),
    }

    // Graceful shutdown: dropping the connection and the driver closes the
    // child's stdin, so the agent observes EOF and exits on its own.
    drop(connection);
    driver_handle.abort();
    let status = child.wait().await?;
    println!("agent exited with status: {status}");

    Ok(ExitCode::SUCCESS)
}
