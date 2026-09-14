//! Terminal execution mediation.
//!
//! # The ownership gap
//!
//! In v1, terminals are **client executed**. The agent sends `terminal/create`
//! to the client; the client runs the process, buffers its output, and answers
//! `terminal/output`, `terminal/wait_for_exit`, `terminal/kill`, and
//! `terminal/release`. In v2 there is **no client terminal surface at all**: an
//! agent that owns a terminal merely reports it for display through
//! `SessionUpdate::TerminalUpdate` / `TerminalOutputChunk`.
//!
//! So when a v1 agent is bridged to a v2 client, nobody executes: the v1 agent
//! expects a client to run the command, and the v2 client only knows how to
//! *display* one. The bridge closes that gap by **owning execution itself**. It
//! mints the terminal id, spawns the process, buffers output, answers every v1
//! `terminal/*` method from its own state, and separately emits v2 display
//! updates. Getting this wrong in either direction is the classic failure the
//! task warns about: forward the create to a v2 client that cannot run it and
//! the command never runs; convert a v2 display update into a v1 create and the
//! command runs twice.
//!
//! # Directionality
//!
//! * v1 agent `terminal/*` to v2 client: SUPPORTED. The bridge executes.
//! * v2 agent `TerminalUpdate` to v1 client: REFUSED. Re-issuing it as a v1
//!   `terminal/create` would make the v1 client re-run a command the v2 agent
//!   already ran. See [`ProtocolBridge::refuse_v2_terminal_update`].

use std::fmt;
use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Condvar, Mutex, MutexGuard, PoisonError};
use std::thread;
use std::time::Duration;

use agent_client_protocol_schema::{v1, v2};

use crate::{BridgeError, ProtocolBridge};

/// The exit outcome of a bridge-executed terminal.
///
/// The presence of a `TerminalExit` marks the process as exited, matching the
/// protocol convention where an exit-status object signals termination even
/// when neither an exit code nor a signal is known.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
#[non_exhaustive]
pub struct TerminalExit {
    /// Process exit code, when known.
    pub exit_code: Option<u32>,
    /// Terminating signal name, when known (for example `SIGTERM`).
    pub signal: Option<String>,
}

impl TerminalExit {
    /// Builds an exit outcome with neither an exit code nor a signal known.
    #[must_use]
    pub fn unknown() -> Self {
        Self::default()
    }

    /// Sets the exit code.
    #[must_use]
    pub fn code(mut self, code: u32) -> Self {
        self.exit_code = Some(code);
        self
    }

    /// Sets the terminating signal name.
    #[must_use]
    pub fn with_signal(mut self, signal: impl Into<String>) -> Self {
        self.signal = Some(signal.into());
        self
    }

    /// Renders this outcome as a v1 [`TerminalExitStatus`](v1::TerminalExitStatus).
    #[must_use]
    pub fn to_v1(&self) -> v1::TerminalExitStatus {
        v1::TerminalExitStatus::new()
            .exit_code(self.exit_code)
            .signal(self.signal.clone())
    }

    /// Renders this outcome as a v2 [`TerminalExitStatus`](v2::TerminalExitStatus).
    #[must_use]
    pub fn to_v2(&self) -> v2::TerminalExitStatus {
        v2::TerminalExitStatus::new()
            .exit_code(self.exit_code)
            .signal(self.signal.clone())
    }
}

/// A resolved command to execute, derived from a v1 `terminal/create` request.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub struct TerminalSpec {
    /// The program to run.
    pub command: String,
    /// Command arguments.
    pub args: Vec<String>,
    /// Environment variables to set, as `(name, value)` pairs.
    pub env: Vec<(String, String)>,
    /// Working directory, if specified.
    pub cwd: Option<PathBuf>,
    /// Maximum retained output bytes, if the request set a limit.
    pub output_byte_limit: Option<u64>,
}

impl TerminalSpec {
    /// Builds a spec from a v1 `terminal/create` request.
    #[must_use]
    pub fn from_v1(request: &v1::CreateTerminalRequest) -> Self {
        Self {
            command: request.command.clone(),
            args: request.args.clone(),
            env: request
                .env
                .iter()
                .map(|variable| (variable.name.clone(), variable.value.clone()))
                .collect(),
            cwd: request.cwd.clone(),
            output_byte_limit: request.output_byte_limit,
        }
    }
}

/// A live handle to a bridge-executed process.
///
/// Implementations own the OS resources; the bridge owns the protocol state
/// layered on top (the minted id, the byte limit, the released flag, and how
/// much output has already been forwarded to the v2 client).
pub trait TerminalHandle: Send + Sync + fmt::Debug {
    /// Returns all output bytes captured so far (cumulative, never truncated).
    fn output_bytes(&self) -> Vec<u8>;

    /// Returns the exit outcome if the process has exited, else `None`.
    fn status(&self) -> Option<TerminalExit>;

    /// Blocks until the process exits and returns its outcome.
    fn wait(&self) -> TerminalExit;

    /// Kills the process. A no-op if it has already exited.
    fn kill(&self);
}

/// Spawns processes for the bridge to own.
///
/// The default [`ProcessTerminalExecutor`] runs real OS commands. Tests inject
/// a deterministic in-memory executor through
/// [`ProtocolBridge::with_executor`](crate::ProtocolBridge::with_executor).
pub trait TerminalExecutor: Send + Sync + fmt::Debug {
    /// Spawns the command described by `spec`.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::Io`] if the process cannot be started.
    fn spawn(&self, spec: &TerminalSpec) -> Result<Box<dyn TerminalHandle>, BridgeError>;
}

/// Bridge-owned protocol state for one terminal.
#[derive(Debug)]
pub(crate) struct TerminalState {
    pub(crate) handle: Box<dyn TerminalHandle>,
    byte_limit: Option<u64>,
    released: bool,
    forwarded_len: usize,
    exit_emitted: bool,
    command: String,
    cwd: Option<PathBuf>,
}

/// The result of mediating a v1 `terminal/create`.
///
/// It carries both the v1 response to return to the agent *and* the v2 display
/// update to send to the client, because the bridge must satisfy both sides at
/// once.
#[derive(Debug, Clone, PartialEq)]
#[non_exhaustive]
pub struct TerminalCreated {
    /// The v1 response to return to the agent.
    pub v1_response: v1::CreateTerminalResponse,
    /// The v2 display update to forward to the client.
    pub display: v2::SessionUpdate,
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

/// Truncates cumulative output to the byte limit, keeping the tail and aligning
/// to a UTF-8 boundary, and reports whether truncation occurred.
fn view_within_limit(bytes: &[u8], limit: Option<u64>) -> (String, bool) {
    let Some(limit) = limit else {
        return (String::from_utf8_lossy(bytes).into_owned(), false);
    };
    let limit = usize::try_from(limit).unwrap_or(usize::MAX);
    if bytes.len() <= limit {
        return (String::from_utf8_lossy(bytes).into_owned(), false);
    }
    let mut start = bytes.len() - limit;
    while start < bytes.len() && (bytes[start] & 0xC0) == 0x80 {
        start += 1;
    }
    (String::from_utf8_lossy(&bytes[start..]).into_owned(), true)
}

/// Encodes bytes as standard (RFC 4648) base64, matching the v2 terminal wire
/// encoding without pulling in a dependency.
fn base64_encode(input: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = u32::from(chunk[0]);
        let b1 = chunk.get(1).copied().map_or(0, u32::from);
        let b2 = chunk.get(2).copied().map_or(0, u32::from);
        let triple = (b0 << 16) | (b1 << 8) | b2;
        out.push(ALPHABET[((triple >> 18) & 0x3F) as usize] as char);
        out.push(ALPHABET[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(ALPHABET[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(ALPHABET[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

impl ProtocolBridge {
    /// Mediates a v1 `terminal/create`: mints an id, spawns the process, stores
    /// the execution state, and returns both the v1 response and the initial v2
    /// display update.
    ///
    /// Direction: v1 agent to v2 client. SUPPORTED (the bridge executes).
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::Io`] if the process cannot be started.
    pub fn create_terminal(
        &mut self,
        request: &v1::CreateTerminalRequest,
    ) -> Result<TerminalCreated, BridgeError> {
        let session_key = request.session_id.0.as_ref().to_owned();
        let spec = TerminalSpec::from_v1(request);
        let handle = self.executor().spawn(&spec)?;

        self.terminal_seq = self.terminal_seq.wrapping_add(1);
        let terminal_id = format!("bridge-term-{}", self.terminal_seq);

        let display = v2::SessionUpdate::TerminalUpdate({
            let mut update = v2::TerminalUpdate::new(terminal_id.as_str());
            update = update.command(spec.command.clone());
            if let Some(cwd) = spec.cwd.clone() {
                update = update.cwd(v2::AbsolutePath::new(cwd));
            }
            update
        });

        let state = TerminalState {
            handle,
            byte_limit: spec.output_byte_limit,
            released: false,
            forwarded_len: 0,
            exit_emitted: false,
            command: spec.command.clone(),
            cwd: spec.cwd.clone(),
        };
        self.session_entry(&session_key)
            .terminals
            .insert(terminal_id.clone(), state);

        Ok(TerminalCreated {
            v1_response: v1::CreateTerminalResponse::new(v1::TerminalId::new(terminal_id.as_str())),
            display,
        })
    }

    /// Answers a v1 `terminal/output` from bridge-owned state.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::UnknownTerminal`] or
    /// [`BridgeError::TerminalReleased`] if the terminal is not live.
    pub fn terminal_output(
        &mut self,
        request: &v1::TerminalOutputRequest,
    ) -> Result<v1::TerminalOutputResponse, BridgeError> {
        let state = self.live_terminal(&request.session_id, &request.terminal_id)?;
        let bytes = state.handle.output_bytes();
        let (output, truncated) = view_within_limit(&bytes, state.byte_limit);
        let exit = state.handle.status();
        let mut response = v1::TerminalOutputResponse::new(output, truncated);
        if let Some(exit) = exit {
            response = response.exit_status(exit.to_v1());
        }
        Ok(response)
    }

    /// Answers a v1 `terminal/wait_for_exit` by blocking on the bridge-owned
    /// process.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::UnknownTerminal`] or
    /// [`BridgeError::TerminalReleased`] if the terminal is not live.
    pub fn wait_for_terminal_exit(
        &mut self,
        request: &v1::WaitForTerminalExitRequest,
    ) -> Result<v1::WaitForTerminalExitResponse, BridgeError> {
        let exit = {
            let state = self.live_terminal(&request.session_id, &request.terminal_id)?;
            state.handle.wait()
        };
        Ok(v1::WaitForTerminalExitResponse::new(exit.to_v1()))
    }

    /// Answers a v1 `terminal/kill` by killing the bridge-owned process. The
    /// terminal remains addressable for `terminal/output` until released.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::UnknownTerminal`] or
    /// [`BridgeError::TerminalReleased`] if the terminal is not live.
    pub fn kill_terminal(
        &mut self,
        request: &v1::KillTerminalRequest,
    ) -> Result<v1::KillTerminalResponse, BridgeError> {
        let state = self.live_terminal(&request.session_id, &request.terminal_id)?;
        state.handle.kill();
        Ok(v1::KillTerminalResponse::new())
    }

    /// Answers a v1 `terminal/release`: kills the process if still running and
    /// marks the terminal released. The id is retained as a tombstone so that
    /// any later use is refused with [`BridgeError::TerminalReleased`] rather
    /// than the weaker [`BridgeError::UnknownTerminal`]; the tombstone is
    /// reclaimed when the session is closed.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::UnknownTerminal`] if the terminal was never
    /// minted, or [`BridgeError::TerminalReleased`] if it was already released.
    pub fn release_terminal(
        &mut self,
        request: &v1::ReleaseTerminalRequest,
    ) -> Result<v1::ReleaseTerminalResponse, BridgeError> {
        let terminal_key = request.terminal_id.0.as_ref();
        let session_key = request.session_id.0.as_ref();
        let Some(record) = self.sessions.get_mut(session_key) else {
            return Err(BridgeError::UnknownSession {
                session_id: session_key.to_owned(),
            });
        };
        match record.terminals.get_mut(terminal_key) {
            None => Err(BridgeError::UnknownTerminal {
                terminal_id: terminal_key.to_owned(),
            }),
            Some(state) if state.released => Err(BridgeError::TerminalReleased {
                terminal_id: terminal_key.to_owned(),
            }),
            Some(state) => {
                state.handle.kill();
                state.released = true;
                Ok(v1::ReleaseTerminalResponse::new())
            }
        }
    }

    /// Returns the v2 display updates for a terminal that have accrued since the
    /// last drain: an output chunk for newly captured bytes, and a terminal
    /// update carrying the exit status once the process has exited.
    ///
    /// This is the display half of the bridge's terminal ownership: the v1
    /// agent gets authoritative responses through the `terminal/*` methods, and
    /// the v2 client gets a display stream here.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::UnknownTerminal`] or
    /// [`BridgeError::TerminalReleased`] if the terminal is not live.
    pub fn drain_terminal_display(
        &mut self,
        session_id: &v1::SessionId,
        terminal_id: &v1::TerminalId,
    ) -> Result<Vec<v2::SessionUpdate>, BridgeError> {
        let state = self.live_terminal(session_id, terminal_id)?;
        let terminal_key = terminal_id.0.as_ref().to_owned();
        let bytes = state.handle.output_bytes();
        let mut updates = Vec::new();
        if bytes.len() > state.forwarded_len {
            let fresh = &bytes[state.forwarded_len..];
            updates.push(v2::SessionUpdate::TerminalOutputChunk(
                v2::TerminalOutputChunk::new(terminal_key.as_str(), base64_encode(fresh)),
            ));
            state.forwarded_len = bytes.len();
        }
        if !state.exit_emitted
            && let Some(exit) = state.handle.status()
        {
            let update = v2::TerminalUpdate::new(terminal_key.as_str()).exit_status(exit.to_v2());
            updates.push(v2::SessionUpdate::TerminalUpdate(update));
            state.exit_emitted = true;
        }
        Ok(updates)
    }

    /// Refuses to bridge a v2 agent `TerminalUpdate` down to a v1 client.
    ///
    /// A v2 `TerminalUpdate` is display-only: the v2 agent already ran the
    /// command and owns the terminal. v1 has no display-only terminal; the only
    /// v1 terminal surface is `terminal/create`, which asks the client to
    /// **execute**. Re-issuing the update as a create would run the command a
    /// second time. There is no sound mapping, so the bridge refuses loudly and
    /// never silently drops the display. The pure converter rejects the same
    /// shape; this method surfaces that rejection at the stateful layer.
    ///
    /// The success type is [`std::convert::Infallible`] to make it type-level
    /// explicit that this direction can never succeed.
    ///
    /// Direction: v2 agent to v1 client. REFUSED.
    ///
    /// # Errors
    ///
    /// Always returns [`BridgeError::UnsupportedDirection`].
    #[allow(clippy::unused_self)]
    pub fn refuse_v2_terminal_update(
        &self,
        update: &v2::TerminalUpdate,
    ) -> Result<std::convert::Infallible, BridgeError> {
        Err(BridgeError::UnsupportedDirection {
            reason: format!(
                "v2 TerminalUpdate for terminal `{}` is display-only and cannot be bridged to v1: \
                 v1 has no display-only terminal, and re-issuing it as terminal/create would make \
                 the v1 client re-run a command the v2 agent already executed",
                update.terminal_id.0.as_ref()
            ),
        })
    }

    fn executor(&self) -> Arc<dyn TerminalExecutor> {
        Arc::clone(&self.executor)
    }

    fn live_terminal(
        &mut self,
        session_id: &v1::SessionId,
        terminal_id: &v1::TerminalId,
    ) -> Result<&mut TerminalState, BridgeError> {
        let session_key = session_id.0.as_ref();
        let terminal_key = terminal_id.0.as_ref();
        let Some(record) = self.sessions.get_mut(session_key) else {
            return Err(BridgeError::UnknownSession {
                session_id: session_key.to_owned(),
            });
        };
        match record.terminals.get_mut(terminal_key) {
            None => Err(BridgeError::UnknownTerminal {
                terminal_id: terminal_key.to_owned(),
            }),
            Some(state) if state.released => Err(BridgeError::TerminalReleased {
                terminal_id: terminal_key.to_owned(),
            }),
            Some(state) => Ok(state),
        }
    }
}

impl ProtocolBridge {
    /// Returns the command and working directory the bridge recorded for a
    /// terminal, for embedding runtimes that build richer display updates.
    #[must_use]
    pub fn terminal_command(
        &self,
        session_id: &str,
        terminal_id: &str,
    ) -> Option<(String, Option<PathBuf>)> {
        self.sessions
            .get(session_id)?
            .terminals
            .get(terminal_id)
            .map(|state| (state.command.clone(), state.cwd.clone()))
    }
}

// ---------------------------------------------------------------------------
// Real OS-process executor
// ---------------------------------------------------------------------------

/// A [`TerminalExecutor`] that runs real OS processes with `std::process`.
///
/// Output from stdout and stderr is captured into a single cumulative buffer on
/// background threads; the process is reaped on another, so `terminal/output`
/// and `terminal/wait_for_exit` are answered without blocking the caller beyond
/// the wait itself.
#[derive(Debug, Default, Clone)]
#[non_exhaustive]
pub struct ProcessTerminalExecutor;

impl ProcessTerminalExecutor {
    /// Builds the executor.
    #[must_use]
    pub fn new() -> Self {
        Self
    }
}

#[derive(Debug, Default)]
struct ProcessShared {
    buffer: Vec<u8>,
    exit: Option<TerminalExit>,
}

#[derive(Debug)]
struct ProcessHandle {
    shared: Arc<(Mutex<ProcessShared>, Condvar)>,
    child: Arc<Mutex<std::process::Child>>,
}

fn map_exit(status: std::process::ExitStatus) -> TerminalExit {
    let mut exit = TerminalExit::unknown();
    if let Some(code) = status.code() {
        exit.exit_code = u32::try_from(code).ok();
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt;
        if let Some(signal) = status.signal() {
            exit.signal = Some(signal_name(signal));
        }
    }
    exit
}

#[cfg(unix)]
fn signal_name(signal: i32) -> String {
    match signal {
        1 => "SIGHUP".to_owned(),
        2 => "SIGINT".to_owned(),
        9 => "SIGKILL".to_owned(),
        15 => "SIGTERM".to_owned(),
        other => format!("SIG{other}"),
    }
}

impl TerminalExecutor for ProcessTerminalExecutor {
    fn spawn(&self, spec: &TerminalSpec) -> Result<Box<dyn TerminalHandle>, BridgeError> {
        let mut command = Command::new(&spec.command);
        command
            .args(&spec.args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        for (name, value) in &spec.env {
            command.env(name, value);
        }
        if let Some(cwd) = &spec.cwd {
            command.current_dir(cwd);
        }
        let mut child = command.spawn().map_err(|error| BridgeError::Io {
            operation: format!("spawning `{}`", spec.command),
            message: error.to_string(),
        })?;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let child = Arc::new(Mutex::new(child));
        let shared = Arc::new((Mutex::new(ProcessShared::default()), Condvar::new()));

        let mut readers = Vec::new();
        for pipe in [stdout.map(PipeSource::Out), stderr.map(PipeSource::Err)]
            .into_iter()
            .flatten()
        {
            let shared = Arc::clone(&shared);
            readers.push(thread::spawn(move || drain_pipe(pipe, &shared)));
        }

        let waiter_shared = Arc::clone(&shared);
        let waiter_child = Arc::clone(&child);
        thread::spawn(move || {
            for reader in readers {
                drop(reader.join());
            }
            let status = loop {
                let result = { lock(&waiter_child).try_wait() };
                match result {
                    Ok(Some(status)) => break map_exit(status),
                    Ok(None) => thread::sleep(Duration::from_millis(5)),
                    Err(_) => break TerminalExit::unknown(),
                }
            };
            let (mutex, condvar) = &*waiter_shared;
            lock(mutex).exit = Some(status);
            condvar.notify_all();
        });

        Ok(Box::new(ProcessHandle { shared, child }))
    }
}

enum PipeSource {
    Out(std::process::ChildStdout),
    Err(std::process::ChildStderr),
}

fn drain_pipe(source: PipeSource, shared: &Arc<(Mutex<ProcessShared>, Condvar)>) {
    let mut buffer = [0u8; 4096];
    let mut reader: Box<dyn Read> = match source {
        PipeSource::Out(out) => Box::new(out),
        PipeSource::Err(err) => Box::new(err),
    };
    loop {
        match reader.read(&mut buffer) {
            Ok(0) | Err(_) => break,
            Ok(read) => {
                let (mutex, _) = &**shared;
                lock(mutex).buffer.extend_from_slice(&buffer[..read]);
            }
        }
    }
}

impl TerminalHandle for ProcessHandle {
    fn output_bytes(&self) -> Vec<u8> {
        let (mutex, _) = &*self.shared;
        lock(mutex).buffer.clone()
    }

    fn status(&self) -> Option<TerminalExit> {
        let (mutex, _) = &*self.shared;
        lock(mutex).exit.clone()
    }

    fn wait(&self) -> TerminalExit {
        let (mutex, condvar) = &*self.shared;
        let mut guard = lock(mutex);
        while guard.exit.is_none() {
            guard = condvar.wait(guard).unwrap_or_else(PoisonError::into_inner);
        }
        guard.exit.clone().unwrap_or_else(TerminalExit::unknown)
    }

    fn kill(&self) {
        let mut child = lock(&self.child);
        drop(child.kill());
    }
}
