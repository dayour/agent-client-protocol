//! Integration tests for terminal execution mediation.
//!
//! Terminal state is the hardest case: v1 terminals are client-executed and v2
//! terminals are display-only, so the bridge must own execution. These tests
//! assert on the real schema values the bridge produces. One test drives a real
//! OS process to prove the bridge actually executes rather than faking it.

use std::sync::{Arc, Mutex};

use agent_client_protocol_bridge::schema::{v1, v2};
use agent_client_protocol_bridge::{
    BridgeConfig, BridgeError, ProtocolBridge, TerminalExecutor, TerminalExit, TerminalHandle,
    TerminalSpec,
};

/// A deterministic, in-memory terminal used to exercise the bridge's state
/// machine without depending on any real process. It is a test double for the
/// executor seam only; every assertion below is on the real schema values the
/// bridge emits, never on this stub's internals.
#[derive(Debug)]
struct StubExecutor {
    output: Vec<u8>,
    exit: TerminalExit,
}

impl TerminalExecutor for StubExecutor {
    fn spawn(&self, _spec: &TerminalSpec) -> Result<Box<dyn TerminalHandle>, BridgeError> {
        Ok(Box::new(StubHandle {
            output: self.output.clone(),
            exit: self.exit.clone(),
            killed: Mutex::new(false),
        }))
    }
}

#[derive(Debug)]
struct StubHandle {
    output: Vec<u8>,
    exit: TerminalExit,
    killed: Mutex<bool>,
}

impl TerminalHandle for StubHandle {
    fn output_bytes(&self) -> Vec<u8> {
        self.output.clone()
    }

    fn status(&self) -> Option<TerminalExit> {
        Some(self.exit.clone())
    }

    fn wait(&self) -> TerminalExit {
        self.exit.clone()
    }

    fn kill(&self) {
        *self
            .killed
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = true;
    }
}

fn stub_bridge(output: &str, exit: TerminalExit) -> ProtocolBridge {
    ProtocolBridge::with_executor(
        BridgeConfig::default(),
        Arc::new(StubExecutor {
            output: output.as_bytes().to_vec(),
            exit,
        }),
    )
}

#[test]
fn create_returns_v1_response_and_v2_display() {
    let mut bridge = stub_bridge("hi", TerminalExit::unknown().code(0));

    let created = bridge
        .create_terminal(&v1::CreateTerminalRequest::new("s1", "echo"))
        .expect("create must succeed");

    assert_eq!(
        created.v1_response.terminal_id.0.as_ref(),
        "bridge-term-1",
        "the bridge, not either peer, mints the terminal id"
    );
    assert!(
        matches!(created.display, v2::SessionUpdate::TerminalUpdate(_)),
        "the bridge must also produce a v2 display update for the client"
    );
}

#[test]
fn output_is_served_from_bridge_state() {
    let mut bridge = stub_bridge("hi", TerminalExit::unknown().code(7));
    bridge
        .create_terminal(&v1::CreateTerminalRequest::new("s1", "echo"))
        .expect("create must succeed");

    let response = bridge
        .terminal_output(&v1::TerminalOutputRequest::new("s1", "bridge-term-1"))
        .expect("output must be answerable from state");

    assert_eq!(response.output, "hi");
    assert!(!response.truncated);
    let exit = response.exit_status.expect("stub process has exited");
    assert_eq!(exit.exit_code, Some(7));
}

#[test]
fn drain_emits_base64_chunk_then_exit_update() {
    let mut bridge = stub_bridge("hi", TerminalExit::unknown().code(0));
    bridge
        .create_terminal(&v1::CreateTerminalRequest::new("s1", "echo"))
        .expect("create must succeed");

    let updates = bridge
        .drain_terminal_display(
            &v1::SessionId::from("s1"),
            &v1::TerminalId::from("bridge-term-1"),
        )
        .expect("drain must succeed for a live terminal");

    assert_eq!(updates.len(), 2, "one output chunk and one exit update");
    match &updates[0] {
        v2::SessionUpdate::TerminalOutputChunk(chunk) => {
            assert_eq!(chunk.data, "aGk=", "v2 terminal output is base64 of `hi`");
        }
        other => panic!("expected a terminal output chunk, got {other:?}"),
    }
    assert!(
        matches!(updates[1], v2::SessionUpdate::TerminalUpdate(_)),
        "the second update reports the exit"
    );
}

#[test]
fn v2_terminal_update_to_v1_is_refused() {
    let bridge = ProtocolBridge::new();
    let update = v2::TerminalUpdate::new("term-x");

    // A v2 TerminalUpdate is display-only; re-issuing it as a v1 create would
    // run the command a second time. There is no sound mapping.
    let error = bridge
        .refuse_v2_terminal_update(&update)
        .expect_err("this direction has no sound mapping and must be refused");

    assert!(matches!(error, BridgeError::UnsupportedDirection { .. }));
}

#[test]
fn use_after_release_is_refused() {
    let mut bridge = stub_bridge("hi", TerminalExit::unknown().code(0));
    bridge
        .create_terminal(&v1::CreateTerminalRequest::new("s1", "echo"))
        .expect("create must succeed");
    bridge
        .release_terminal(&v1::ReleaseTerminalRequest::new("s1", "bridge-term-1"))
        .expect("release must succeed");

    let error = bridge
        .terminal_output(&v1::TerminalOutputRequest::new("s1", "bridge-term-1"))
        .expect_err("a released terminal must not answer further calls");

    assert!(matches!(error, BridgeError::TerminalReleased { .. }));
}

#[test]
fn unknown_terminal_is_refused() {
    let mut bridge = stub_bridge("hi", TerminalExit::unknown());
    bridge
        .create_terminal(&v1::CreateTerminalRequest::new("s1", "echo"))
        .expect("create must succeed");

    let error = bridge
        .terminal_output(&v1::TerminalOutputRequest::new("s1", "never-minted"))
        .expect_err("an id the bridge never minted must be refused");

    assert!(matches!(error, BridgeError::UnknownTerminal { .. }));
}

#[test]
fn real_process_is_actually_executed() {
    // This uses the default real OS-process executor. It proves the bridge runs
    // the command rather than only bookkeeping it.
    let mut bridge = ProtocolBridge::new();

    let mut request = v1::CreateTerminalRequest::new("s1", real_shell());
    request.args = real_echo_args("bridge-smoke");

    let created = bridge
        .create_terminal(&request)
        .expect("spawning a real process must succeed");
    let terminal_id = created.v1_response.terminal_id.0.as_ref().to_owned();

    let exit = bridge
        .wait_for_terminal_exit(&v1::WaitForTerminalExitRequest::new(
            "s1",
            terminal_id.clone(),
        ))
        .expect("waiting for a real process must succeed");
    assert_eq!(
        exit.exit_status.exit_code,
        Some(0),
        "the echo command exits 0"
    );

    let output = bridge
        .terminal_output(&v1::TerminalOutputRequest::new("s1", terminal_id.clone()))
        .expect("reading real output must succeed");
    assert!(
        output.output.contains("bridge-smoke"),
        "the bridge must capture real process output, got: {:?}",
        output.output
    );
}

#[cfg(windows)]
fn real_shell() -> &'static str {
    "cmd"
}

#[cfg(windows)]
fn real_echo_args(text: &str) -> Vec<String> {
    vec!["/C".to_owned(), format!("echo {text}")]
}

#[cfg(unix)]
fn real_shell() -> &'static str {
    "sh"
}

#[cfg(unix)]
fn real_echo_args(text: &str) -> Vec<String> {
    vec!["-c".to_owned(), format!("echo {text}")]
}
