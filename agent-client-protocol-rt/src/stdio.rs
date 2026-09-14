//! Stdio transport helpers.
//!
//! ACP peers most commonly speak over a child process's stdin/stdout. These
//! helpers wire an [`Agent`](crate::Agent) or [`Client`](crate::Client) to the
//! current process's standard streams and return the driving future.

use std::io;

use crate::agent::{Agent, AgentSideConnection};
use crate::client::{Client, ClientSideConnection};

/// Serves an [`Agent`](crate::Agent) over this process's stdin/stdout until the
/// client closes the connection (EOF on stdin).
///
/// `make_agent` receives the [`AgentSideConnection`] so the agent can stream
/// `session/update` notifications and call back into the client.
///
/// # Errors
///
/// Returns any I/O error raised while reading stdin or writing stdout.
pub async fn serve_agent_over_stdio<A, MakeAgent>(make_agent: MakeAgent) -> io::Result<()>
where
    A: Agent,
    MakeAgent: FnOnce(AgentSideConnection) -> A,
{
    let (_connection, driver) =
        AgentSideConnection::new(tokio::io::stdin(), tokio::io::stdout(), make_agent);
    driver.await
}

/// Connects a [`Client`](crate::Client) over this process's stdin/stdout.
///
/// Returns the [`ClientSideConnection`] for issuing requests plus the driving
/// future. Most clients instead spawn the agent as a child process and connect
/// to the child's pipes; use [`ClientSideConnection::new`] directly for that.
///
/// # Errors
///
/// The returned future yields any I/O error raised on the standard streams.
pub fn connect_client_over_stdio<C, MakeClient>(
    make_client: MakeClient,
) -> (
    ClientSideConnection,
    impl std::future::Future<Output = io::Result<()>> + Send,
)
where
    C: Client,
    MakeClient: FnOnce(ClientSideConnection) -> C,
{
    ClientSideConnection::new(tokio::io::stdin(), tokio::io::stdout(), make_client)
}
