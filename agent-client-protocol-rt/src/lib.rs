#![cfg_attr(docsrs, feature(doc_cfg))]
// The async runtime pulls in `tokio`, which transitively resolves multiple
// versions of some platform shims (for example `windows-sys`). That is a
// property of the dependency graph, not of this crate, so allow the
// `cargo`-group lint that would otherwise fail the `-D warnings` gate.
#![allow(clippy::multiple_crate_versions)]

//! # Agent Client Protocol runtime
//!
//! An in-repo, dependency-light async runtime for the Agent Client Protocol
//! (ACP) built directly on top of the local
//! [`agent-client-protocol-schema`](agent_client_protocol_schema) crate.
//!
//! This crate provides the executable protocol pieces that the schema crate
//! intentionally omits:
//!
//! - A newline-delimited JSON-RPC 2.0 codec ([`jsonrpc`]) covering requests,
//!   responses, notifications, and error objects, with string and numeric id
//!   handling.
//! - A generic [`Connection`] that drives a bidirectional peer over any
//!   [`tokio::io::AsyncRead`]/[`tokio::io::AsyncWrite`] pair, so it is testable
//!   fully in memory without spawning OS processes.
//! - [`Agent`] and [`Client`] traits mirroring the v1 protocol surface, using
//!   the schema crate's own request/response types.
//! - Ready-made [`AgentSideConnection`] and [`ClientSideConnection`] helpers,
//!   plus a [`stdio`] transport.
//!
//! It deliberately does **not** depend on the published `agent-client-protocol`
//! runtime crate, which pins an older schema version. See
//! `docs/rfds/rust-runtime-boundary.mdx` for the full rationale.
//!
//! ## Example: an in-memory round trip
//!
//! ```no_run
//! use agent_client_protocol_rt::{AgentSideConnection, ClientSideConnection};
//! # async fn f() {}
//! ```

pub mod error;
pub mod jsonrpc;

mod agent;
mod client;
mod connection;
pub mod stdio;
mod util;

pub use connection::Handler;

pub use agent::{Agent, AgentSideConnection};
pub use client::{Client, ClientSideConnection};
pub use connection::Connection;
pub use error::{Error, ErrorCode, Result};

/// Re-export of the schema crate so downstream users can name the wire types
/// through a single dependency.
pub use agent_client_protocol_schema as schema;
