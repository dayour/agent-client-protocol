//! Transport-agnostic bidirectional JSON-RPC connection.
//!
//! [`Connection`] wires a [`Handler`] to a byte-stream transport. It is generic
//! over [`tokio::io::AsyncRead`] and [`tokio::io::AsyncWrite`], so the same code
//! path drives an OS pipe, a TCP socket, or an in-memory
//! [`tokio::io::duplex`] pair used by the test suite.
//!
//! Responsibilities:
//!
//! - Frame outbound messages as newline-delimited JSON and pump them through a
//!   dedicated writer task.
//! - Read inbound lines, decode them with [`crate::jsonrpc`], and route each
//!   item: requests and notifications go to the [`Handler`]; responses are
//!   correlated back to the outbound request that is awaiting them.
//! - Track every outbound request by id and deliver its response (or a
//!   connection-closed error on shutdown) to the awaiting caller.
//! - Shut down gracefully on EOF: the driving future returns, in-flight
//!   outbound requests are failed with a connection-closed error, and the
//!   writer task is stopped.

use std::collections::HashMap;
use std::future::Future;
use std::io;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};

use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncRead, AsyncWrite, AsyncWriteExt, BufReader};
use tokio::sync::{mpsc, oneshot};

use crate::error::{connection_closed, Error};
use crate::jsonrpc::{
    encode_error, encode_notification, encode_request, encode_success, parse_line, Incoming,
    Parsed, RequestId,
};

/// Routing hook invoked by a [`Connection`] for every inbound request and
/// notification.
///
/// Implementations translate a wire method name plus raw parameters into
/// application behavior. The runtime provides handlers for the ACP agent and
/// client roles; custom handlers can implement bespoke routing.
#[async_trait::async_trait]
pub trait Handler: Send + Sync + 'static {
    /// Handles an inbound request and returns the JSON result to send back, or
    /// a protocol [`Error`].
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] when the method is unknown, the parameters are
    /// invalid, or the application fails to service the request.
    async fn handle_request(&self, method: String, params: Option<Value>) -> Result<Value, Error>;

    /// Handles an inbound notification. Notifications never produce a response,
    /// so failures are intentionally not reported back to the peer.
    async fn handle_notification(&self, method: String, params: Option<Value>);
}

/// A cloneable handle to a running connection.
///
/// Cloning is cheap (it shares the underlying channels and pending-request
/// table). Use [`Connection::request`] to issue an outbound request and await
/// its response, or [`Connection::notify`] to send a fire-and-forget
/// notification.
#[derive(Clone, Debug)]
pub struct Connection {
    peer: PeerHandle,
}

impl Connection {
    /// Builds a connection from a [`Handler`] and a read/write transport.
    ///
    /// Returns the cloneable [`Connection`] handle plus a future that drives all
    /// I/O. The caller must poll the future to completion (typically with
    /// [`tokio::spawn`] or by awaiting it). The future resolves when the read
    /// side reaches EOF or errors.
    pub fn new<H, R, W>(
        handler: H,
        read: R,
        write: W,
    ) -> (Self, impl Future<Output = io::Result<()>> + Send)
    where
        H: Handler,
        R: AsyncRead + Unpin + Send + 'static,
        W: AsyncWrite + Unpin + Send + 'static,
    {
        let (peer, outgoing_rx) = PeerHandle::new();
        let driver = drive(Arc::new(handler), peer.clone(), outgoing_rx, read, write);
        (Self { peer }, driver)
    }

    /// Sends an outbound request and awaits its correlated response.
    ///
    /// A fresh numeric id is allocated and tracked until the matching response
    /// arrives.
    ///
    /// # Errors
    ///
    /// Returns the peer's JSON-RPC [`Error`] for a failed response, or a
    /// connection-closed [`Error`] if the transport shuts down before a
    /// response is received.
    pub async fn request(&self, method: &str, params: Option<Value>) -> Result<Value, Error> {
        self.peer.request(method, params).await
    }

    /// Sends an outbound notification.
    ///
    /// # Errors
    ///
    /// Returns a connection-closed [`Error`] if the transport is already shut
    /// down.
    pub fn notify(&self, method: &str, params: Option<Value>) -> Result<(), Error> {
        self.peer.notify(method, params)
    }
}

/// Shared, cloneable sending/correlation state for one connection.
#[derive(Clone, Debug)]
pub(crate) struct PeerHandle {
    inner: Arc<PeerInner>,
}

#[derive(Debug)]
struct PeerInner {
    next_id: AtomicI64,
    pending: Mutex<HashMap<RequestId, oneshot::Sender<Result<Value, Error>>>>,
    outgoing: mpsc::UnboundedSender<String>,
}

impl PeerHandle {
    pub(crate) fn new() -> (Self, mpsc::UnboundedReceiver<String>) {
        let (tx, rx) = mpsc::unbounded_channel();
        let handle = Self {
            inner: Arc::new(PeerInner {
                next_id: AtomicI64::new(1),
                pending: Mutex::new(HashMap::new()),
                outgoing: tx,
            }),
        };
        (handle, rx)
    }

    fn lock_pending(
        &self,
    ) -> MutexGuard<'_, HashMap<RequestId, oneshot::Sender<Result<Value, Error>>>> {
        // Recover from a poisoned lock rather than panicking: the map only ever
        // holds channel senders, so a panic elsewhere cannot leave it in an
        // unsafe state.
        self.inner
            .pending
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    pub(crate) async fn request(
        &self,
        method: &str,
        params: Option<Value>,
    ) -> Result<Value, Error> {
        let id = RequestId::Number(self.inner.next_id.fetch_add(1, Ordering::Relaxed));
        let (tx, rx) = oneshot::channel();
        self.lock_pending().insert(id.clone(), tx);

        let line = encode_request(&id, method, params);
        if self.inner.outgoing.send(line).is_err() {
            self.lock_pending().remove(&id);
            return Err(connection_closed());
        }

        match rx.await {
            Ok(result) => result,
            Err(_) => Err(connection_closed()),
        }
    }

    pub(crate) fn notify(&self, method: &str, params: Option<Value>) -> Result<(), Error> {
        if self
            .inner
            .outgoing
            .send(encode_notification(method, params))
            .is_err()
        {
            return Err(connection_closed());
        }
        Ok(())
    }

    fn respond(&self, id: &RequestId, result: Result<Value, Error>) {
        let line = match result {
            Ok(value) => encode_success(id, value),
            Err(error) => encode_error(id, &error),
        };
        drop(self.inner.outgoing.send(line));
    }

    fn respond_error(&self, id: &RequestId, error: &Error) {
        drop(self.inner.outgoing.send(encode_error(id, error)));
    }

    fn complete_pending(&self, id: &RequestId, result: Result<Value, Error>) {
        if let Some(tx) = self.lock_pending().remove(id) {
            drop(tx.send(result));
        }
    }

    fn drain_pending(&self) {
        let mut pending = self.lock_pending();
        for (_, tx) in pending.drain() {
            drop(tx.send(Err(connection_closed())));
        }
    }
}

/// Runs the reader and writer loops concurrently until the read side reaches
/// EOF (or either half errors), then fails any outstanding outbound requests.
///
/// Both loops live inside the returned future rather than in a detached task,
/// so dropping the future drops the write half of the transport and closes it.
/// That is what lets a peer trigger a graceful EOF shutdown on the other end
/// simply by dropping its connection.
pub(crate) fn drive<H, R, W>(
    handler: Arc<H>,
    peer: PeerHandle,
    outgoing_rx: mpsc::UnboundedReceiver<String>,
    read: R,
    write: W,
) -> impl Future<Output = io::Result<()>> + Send
where
    H: Handler,
    R: AsyncRead + Unpin + Send + 'static,
    W: AsyncWrite + Unpin + Send + 'static,
{
    let shutdown_peer = peer.clone();
    async move {
        let result = tokio::select! {
            read_result = reader_loop(handler, peer, read) => read_result,
            write_result = writer_loop(write, outgoing_rx) => write_result,
        };
        shutdown_peer.drain_pending();
        result
    }
}

async fn writer_loop<W>(
    mut write: W,
    mut outgoing_rx: mpsc::UnboundedReceiver<String>,
) -> io::Result<()>
where
    W: AsyncWrite + Unpin,
{
    while let Some(line) = outgoing_rx.recv().await {
        write.write_all(line.as_bytes()).await?;
        write.write_all(b"\n").await?;
        write.flush().await?;
    }
    Ok(())
}

async fn reader_loop<H, R>(handler: Arc<H>, peer: PeerHandle, read: R) -> io::Result<()>
where
    H: Handler,
    R: AsyncRead + Unpin,
{
    let mut lines = BufReader::new(read).lines();
    while let Some(line) = lines.next_line().await? {
        for parsed in parse_line(&line) {
            route(&handler, &peer, parsed);
        }
    }
    Ok(())
}

fn route<H: Handler>(handler: &Arc<H>, peer: &PeerHandle, parsed: Parsed) {
    match parsed {
        Parsed::Invalid { id, error } => peer.respond_error(&id, &error),
        Parsed::Incoming(Incoming::Response { id, result }) => peer.complete_pending(&id, result),
        Parsed::Incoming(Incoming::Request { id, method, params }) => {
            let handler = Arc::clone(handler);
            let peer = peer.clone();
            tokio::spawn(async move {
                let result = handler.handle_request(method, params).await;
                peer.respond(&id, result);
            });
        }
        Parsed::Incoming(Incoming::Notification { method, params }) => {
            let handler = Arc::clone(handler);
            tokio::spawn(async move {
                handler.handle_notification(method, params).await;
            });
        }
    }
}
