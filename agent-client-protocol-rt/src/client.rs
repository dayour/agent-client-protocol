//! The client role: the `Client` trait and its side of the connection.
//!
//! An ACP *client* (typically an editor) receives requests and notifications
//! from an agent ([`Client`]) and drives the agent by issuing the top-level ACP
//! requests (`initialize`, `session/new`, `session/prompt`, ...) via
//! [`ClientSideConnection`].

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

/// The behavior an ACP client implements.
///
/// The runtime decodes each inbound request from the agent into the matching
/// schema type and dispatches it here. All request methods default to
/// `method not found` and notifications to a no-op, so a client only implements
/// the capabilities it advertises.
#[async_trait::async_trait]
pub trait Client: Send + Sync + 'static {
    /// Handles a `session/request_permission` request from the agent.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`]; defaults to `method not found` when unimplemented.
    async fn request_permission(
        &self,
        _request: RequestPermissionRequest,
    ) -> Result<RequestPermissionResponse, Error> {
        Err(Error::method_not_found())
    }

    /// Handles a `fs/read_text_file` request from the agent.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`]; defaults to `method not found` when unimplemented.
    async fn read_text_file(
        &self,
        _request: ReadTextFileRequest,
    ) -> Result<ReadTextFileResponse, Error> {
        Err(Error::method_not_found())
    }

    /// Handles a `fs/write_text_file` request from the agent.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`]; defaults to `method not found` when unimplemented.
    async fn write_text_file(
        &self,
        _request: WriteTextFileRequest,
    ) -> Result<WriteTextFileResponse, Error> {
        Err(Error::method_not_found())
    }

    /// Handles a `session/update` notification from the agent. Defaults to a
    /// no-op.
    async fn session_notification(&self, _notification: SessionNotification) {}

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

/// The client's handle onto a live connection.
///
/// Constructed by [`ClientSideConnection::new`]. It exposes the top-level
/// requests a client sends *to the agent*.
#[derive(Clone, Debug)]
pub struct ClientSideConnection {
    peer: PeerHandle,
}

impl ClientSideConnection {
    /// Builds a client-side connection over `read`/`write`.
    ///
    /// `make_client` receives a clone of this connection. Returns the connection
    /// and a future that drives I/O until EOF; the caller must await or spawn
    /// it.
    pub fn new<C, MakeClient, R, W>(
        read: R,
        write: W,
        make_client: MakeClient,
    ) -> (Self, impl Future<Output = io::Result<()>> + Send)
    where
        C: Client,
        MakeClient: FnOnce(ClientSideConnection) -> C,
        R: AsyncRead + Unpin + Send + 'static,
        W: AsyncWrite + Unpin + Send + 'static,
    {
        let (peer, outgoing_rx) = PeerHandle::new();
        let connection = Self { peer: peer.clone() };
        let client = Arc::new(make_client(Self { peer: peer.clone() }));
        let handler = Arc::new(ClientHandler { client });
        let driver = drive(handler, peer, outgoing_rx, read, write);
        (connection, driver)
    }

    /// Sends the `initialize` request.
    ///
    /// # Errors
    ///
    /// Returns the agent's [`Error`], or a connection-closed error.
    pub async fn initialize(
        &self,
        request: InitializeRequest,
    ) -> Result<InitializeResponse, Error> {
        self.call(AGENT_METHOD_NAMES.initialize, &request).await
    }

    /// Sends the `authenticate` request.
    ///
    /// # Errors
    ///
    /// Returns the agent's [`Error`], or a connection-closed error.
    pub async fn authenticate(
        &self,
        request: AuthenticateRequest,
    ) -> Result<AuthenticateResponse, Error> {
        self.call(AGENT_METHOD_NAMES.authenticate, &request).await
    }

    /// Sends the `session/new` request.
    ///
    /// # Errors
    ///
    /// Returns the agent's [`Error`], or a connection-closed error.
    pub async fn new_session(
        &self,
        request: NewSessionRequest,
    ) -> Result<NewSessionResponse, Error> {
        self.call(AGENT_METHOD_NAMES.session_new, &request).await
    }

    /// Sends the `session/load` request.
    ///
    /// # Errors
    ///
    /// Returns the agent's [`Error`], or a connection-closed error.
    pub async fn load_session(
        &self,
        request: LoadSessionRequest,
    ) -> Result<LoadSessionResponse, Error> {
        self.call(AGENT_METHOD_NAMES.session_load, &request).await
    }

    /// Sends the `session/set_mode` request.
    ///
    /// # Errors
    ///
    /// Returns the agent's [`Error`], or a connection-closed error.
    pub async fn set_session_mode(
        &self,
        request: SetSessionModeRequest,
    ) -> Result<SetSessionModeResponse, Error> {
        self.call(AGENT_METHOD_NAMES.session_set_mode, &request)
            .await
    }

    /// Sends the `session/prompt` request that runs a prompt turn.
    ///
    /// # Errors
    ///
    /// Returns the agent's [`Error`], or a connection-closed error.
    pub async fn prompt(&self, request: PromptRequest) -> Result<PromptResponse, Error> {
        self.call(AGENT_METHOD_NAMES.session_prompt, &request).await
    }

    /// Sends the `session/cancel` notification.
    ///
    /// # Errors
    ///
    /// Returns a connection-closed [`Error`] if the transport is shut down.
    #[allow(clippy::needless_pass_by_value)]
    pub fn cancel(&self, notification: CancelNotification) -> Result<(), Error> {
        let params = encode_value(&notification)?;
        self.peer
            .notify(AGENT_METHOD_NAMES.session_cancel, Some(params))
    }

    /// Sends an extension method request to the agent.
    ///
    /// # Errors
    ///
    /// Returns the agent's [`Error`], or a connection-closed error.
    pub async fn ext_method(&self, request: ExtRequest) -> Result<ExtResponse, Error> {
        let params = raw_to_value(&request.params)?;
        let value = self.peer.request(&request.method, Some(params)).await?;
        let raw = params_to_raw(Some(value))?;
        Ok(ExtResponse::new(raw))
    }

    async fn call<Req, Resp>(&self, method: &str, request: &Req) -> Result<Resp, Error>
    where
        Req: serde::Serialize,
        Resp: serde::de::DeserializeOwned,
    {
        let params = encode_value(request)?;
        let value = self.peer.request(method, Some(params)).await?;
        serde_json::from_value(value).map_err(Error::from)
    }
}

struct ClientHandler<C: Client> {
    client: Arc<C>,
}

#[async_trait::async_trait]
impl<C: Client> Handler for ClientHandler<C> {
    async fn handle_request(
        &self,
        method: String,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, Error> {
        let names = CLIENT_METHOD_NAMES;
        if method == names.session_request_permission {
            let response = self
                .client
                .request_permission(decode_params(params)?)
                .await?;
            encode_value(&response)
        } else if method == names.fs_read_text_file {
            let response = self.client.read_text_file(decode_params(params)?).await?;
            encode_value(&response)
        } else if method == names.fs_write_text_file {
            let response = self.client.write_text_file(decode_params(params)?).await?;
            encode_value(&response)
        } else if method.starts_with('_') {
            let request = ExtRequest::new(method, params_to_raw(params)?);
            let response = self.client.ext_method(request).await?;
            raw_to_value(&response.0)
        } else {
            Err(Error::method_not_found())
        }
    }

    async fn handle_notification(&self, method: String, params: Option<serde_json::Value>) {
        let names = CLIENT_METHOD_NAMES;
        if method == names.session_update {
            if let Ok(notification) = decode_params(params) {
                self.client.session_notification(notification).await;
            }
        } else if method.starts_with('_') {
            if let Ok(raw) = params_to_raw(params) {
                self.client
                    .ext_notification(ExtNotification::new(method, raw))
                    .await;
            }
        }
    }
}
