//! The agent role: the `Agent` trait and its side of the connection.
//!
//! An ACP *agent* receives requests and notifications from a client
//! ([`Agent`]) and may itself call back into the client (via
//! [`AgentSideConnection`]) to read/write files, request permission, or stream
//! session updates.

use std::future::Future;
use std::io;
use std::sync::Arc;

use tokio::io::{AsyncRead, AsyncWrite};

use agent_client_protocol_schema::v1::{
    AuthenticateRequest, AuthenticateResponse, CancelNotification, ExtNotification, ExtRequest,
    ExtResponse, InitializeRequest, InitializeResponse, LoadSessionRequest, LoadSessionResponse,
    NewSessionRequest, NewSessionResponse, PromptRequest, PromptResponse, ReadTextFileRequest,
    ReadTextFileResponse, RequestPermissionRequest, RequestPermissionResponse, SessionNotification,
    SetSessionModeRequest, SetSessionModeResponse, WriteTextFileRequest, WriteTextFileResponse,
    AGENT_METHOD_NAMES, CLIENT_METHOD_NAMES,
};

use crate::connection::{drive, Handler, PeerHandle};
use crate::error::Error;
use crate::util::{decode_params, encode_value, params_to_raw, raw_to_value};

/// The behavior an ACP agent implements.
///
/// The runtime decodes each inbound request into the matching schema type and
/// dispatches it to one of these methods. Required protocol methods
/// ([`Agent::initialize`], [`Agent::new_session`], [`Agent::prompt`]) have no
/// default; optional methods default to a `method not found` error, and
/// notifications default to a no-op, so a minimal agent only implements what it
/// supports.
#[async_trait::async_trait]
pub trait Agent: Send + Sync + 'static {
    /// Handles the `initialize` request that negotiates protocol version and
    /// capabilities.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if initialization cannot be completed.
    async fn initialize(&self, request: InitializeRequest) -> Result<InitializeResponse, Error>;

    /// Handles the `authenticate` request.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`]; defaults to `method not found` when unimplemented.
    async fn authenticate(
        &self,
        _request: AuthenticateRequest,
    ) -> Result<AuthenticateResponse, Error> {
        Err(Error::method_not_found())
    }

    /// Handles the `session/new` request that creates a session.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if the session cannot be created.
    async fn new_session(&self, request: NewSessionRequest) -> Result<NewSessionResponse, Error>;

    /// Handles the `session/load` request.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`]; defaults to `method not found` when unimplemented.
    async fn load_session(
        &self,
        _request: LoadSessionRequest,
    ) -> Result<LoadSessionResponse, Error> {
        Err(Error::method_not_found())
    }

    /// Handles the `session/set_mode` request.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`]; defaults to `method not found` when unimplemented.
    async fn set_session_mode(
        &self,
        _request: SetSessionModeRequest,
    ) -> Result<SetSessionModeResponse, Error> {
        Err(Error::method_not_found())
    }

    /// Handles the `session/prompt` request that runs a prompt turn.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if the prompt turn cannot be run.
    async fn prompt(&self, request: PromptRequest) -> Result<PromptResponse, Error>;

    /// Handles the `session/cancel` notification. Defaults to a no-op.
    async fn cancel(&self, _notification: CancelNotification) {}

    /// Handles an extension method request (method names starting with `_`).
    ///
    /// # Errors
    ///
    /// Returns an [`Error`]; defaults to `method not found` when unimplemented.
    async fn ext_method(&self, _request: ExtRequest) -> Result<ExtResponse, Error> {
        Err(Error::method_not_found())
    }

    /// Handles an extension notification. Defaults to a no-op.
    async fn ext_notification(&self, _notification: ExtNotification) {}
}

/// The agent's handle onto a live connection.
///
/// Constructed by [`AgentSideConnection::new`]. It exposes the requests an agent
/// may send *to the client* (filesystem access, permission prompts) and the
/// notifications it may stream (`session/update`).
#[derive(Clone, Debug)]
pub struct AgentSideConnection {
    peer: PeerHandle,
}

impl AgentSideConnection {
    /// Builds an agent-side connection over `read`/`write`.
    ///
    /// `make_agent` receives a clone of this connection so the agent can call
    /// back into the client while handling requests. Returns the connection and
    /// a future that drives I/O until EOF; the caller must await or spawn it.
    pub fn new<A, MakeAgent, R, W>(
        read: R,
        write: W,
        make_agent: MakeAgent,
    ) -> (Self, impl Future<Output = io::Result<()>> + Send)
    where
        A: Agent,
        MakeAgent: FnOnce(AgentSideConnection) -> A,
        R: AsyncRead + Unpin + Send + 'static,
        W: AsyncWrite + Unpin + Send + 'static,
    {
        let (peer, outgoing_rx) = PeerHandle::new();
        let connection = Self { peer: peer.clone() };
        let agent = Arc::new(make_agent(Self { peer: peer.clone() }));
        let handler = Arc::new(AgentHandler { agent });
        let driver = drive(handler, peer, outgoing_rx, read, write);
        (connection, driver)
    }

    /// Streams a `session/update` notification to the client.
    ///
    /// # Errors
    ///
    /// Returns a connection-closed [`Error`] if the transport is shut down.
    #[allow(clippy::needless_pass_by_value)]
    pub fn session_notification(&self, notification: SessionNotification) -> Result<(), Error> {
        let params = encode_value(&notification)?;
        self.peer
            .notify(CLIENT_METHOD_NAMES.session_update, Some(params))
    }

    /// Requests permission from the client for a tool call.
    ///
    /// # Errors
    ///
    /// Returns the client's [`Error`], or a connection-closed error.
    pub async fn request_permission(
        &self,
        request: RequestPermissionRequest,
    ) -> Result<RequestPermissionResponse, Error> {
        let params = encode_value(&request)?;
        let value = self
            .peer
            .request(CLIENT_METHOD_NAMES.session_request_permission, Some(params))
            .await?;
        serde_json::from_value(value).map_err(Error::from)
    }

    /// Reads a text file through the client's filesystem.
    ///
    /// # Errors
    ///
    /// Returns the client's [`Error`], or a connection-closed error.
    pub async fn read_text_file(
        &self,
        request: ReadTextFileRequest,
    ) -> Result<ReadTextFileResponse, Error> {
        let params = encode_value(&request)?;
        let value = self
            .peer
            .request(CLIENT_METHOD_NAMES.fs_read_text_file, Some(params))
            .await?;
        serde_json::from_value(value).map_err(Error::from)
    }

    /// Writes a text file through the client's filesystem.
    ///
    /// # Errors
    ///
    /// Returns the client's [`Error`], or a connection-closed error.
    pub async fn write_text_file(
        &self,
        request: WriteTextFileRequest,
    ) -> Result<WriteTextFileResponse, Error> {
        let params = encode_value(&request)?;
        let value = self
            .peer
            .request(CLIENT_METHOD_NAMES.fs_write_text_file, Some(params))
            .await?;
        serde_json::from_value(value).map_err(Error::from)
    }
}

struct AgentHandler<A: Agent> {
    agent: Arc<A>,
}

#[async_trait::async_trait]
impl<A: Agent> Handler for AgentHandler<A> {
    async fn handle_request(
        &self,
        method: String,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, Error> {
        let names = AGENT_METHOD_NAMES;
        if method == names.initialize {
            let response = self.agent.initialize(decode_params(params)?).await?;
            encode_value(&response)
        } else if method == names.authenticate {
            let response = self.agent.authenticate(decode_params(params)?).await?;
            encode_value(&response)
        } else if method == names.session_new {
            let response = self.agent.new_session(decode_params(params)?).await?;
            encode_value(&response)
        } else if method == names.session_load {
            let response = self.agent.load_session(decode_params(params)?).await?;
            encode_value(&response)
        } else if method == names.session_set_mode {
            let response = self.agent.set_session_mode(decode_params(params)?).await?;
            encode_value(&response)
        } else if method == names.session_prompt {
            let response = self.agent.prompt(decode_params(params)?).await?;
            encode_value(&response)
        } else if method.starts_with('_') {
            let request = ExtRequest::new(method, params_to_raw(params)?);
            let response = self.agent.ext_method(request).await?;
            raw_to_value(&response.0)
        } else {
            Err(Error::method_not_found())
        }
    }

    async fn handle_notification(&self, method: String, params: Option<serde_json::Value>) {
        let names = AGENT_METHOD_NAMES;
        if method == names.session_cancel {
            if let Ok(notification) = decode_params(params) {
                self.agent.cancel(notification).await;
            }
        } else if method.starts_with('_') {
            if let Ok(raw) = params_to_raw(params) {
                self.agent
                    .ext_notification(ExtNotification::new(method, raw))
                    .await;
            }
        }
    }
}
