//! Integration tests for filesystem method mediation.
//!
//! v1 client filesystem methods have no v2 client surface. The bridge refuses
//! them by default and can degrade to local disk with a loud warning. These
//! tests prove both the refusal and the loud-not-silent degrade.

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};

use agent_client_protocol_bridge::schema::v1;
use agent_client_protocol_bridge::{BridgeConfig, BridgeError, FilesystemPolicy, ProtocolBridge};

static COUNTER: AtomicU64 = AtomicU64::new(0);

fn temp_file(tag: &str) -> PathBuf {
    let mut path = std::env::temp_dir();
    let unique = COUNTER.fetch_add(1, Ordering::Relaxed);
    path.push(format!(
        "acp-bridge-{tag}-{}-{unique}.txt",
        std::process::id()
    ));
    path
}

fn fallback_bridge() -> ProtocolBridge {
    ProtocolBridge::with_config(
        BridgeConfig::default().filesystem(FilesystemPolicy::LocalDiskFallback),
    )
}

#[test]
fn read_is_refused_under_the_default_policy() {
    let mut bridge = ProtocolBridge::new();

    let error = bridge
        .read_text_file(&v1::ReadTextFileRequest::new("s1", "/no/such/path"))
        .expect_err("the default policy must refuse fs reads");

    assert!(matches!(error, BridgeError::UnsupportedClientMethod { .. }));
}

#[test]
fn write_is_refused_under_the_default_policy() {
    let mut bridge = ProtocolBridge::new();

    let error = bridge
        .write_text_file(&v1::WriteTextFileRequest::new(
            "s1",
            "/no/such/path",
            "data",
        ))
        .expect_err("the default policy must refuse fs writes");

    assert!(matches!(error, BridgeError::UnsupportedClientMethod { .. }));
}

#[test]
fn fallback_read_returns_content_with_a_loud_warning() {
    let path = temp_file("read");
    fs::write(&path, "alpha\nbeta\ngamma\n").expect("test setup writes the file");
    let mut bridge = fallback_bridge();

    let emulated = bridge
        .read_text_file(&v1::ReadTextFileRequest::new("s1", path.clone()))
        .expect("fallback read must succeed");

    assert_eq!(emulated.value.content, "alpha\nbeta\ngamma\n");
    assert!(
        !emulated.is_lossless(),
        "a disk fallback must not claim to be lossless"
    );
    assert_eq!(emulated.warnings[0].subject, "fs/read_text_file");

    fs::remove_file(&path).ok();
}

#[test]
fn fallback_read_honours_line_and_limit() {
    let path = temp_file("window");
    fs::write(&path, "alpha\nbeta\ngamma\n").expect("test setup writes the file");
    let mut bridge = fallback_bridge();

    let mut request = v1::ReadTextFileRequest::new("s1", path.clone());
    request.line = Some(2);
    request.limit = Some(1);

    let emulated = bridge
        .read_text_file(&request)
        .expect("windowed fallback read must succeed");

    assert_eq!(
        emulated.value.content, "beta",
        "line 2, limit 1 selects only the second line"
    );

    fs::remove_file(&path).ok();
}

#[test]
fn fallback_write_persists_and_warns() {
    let path = temp_file("write");
    let mut bridge = fallback_bridge();

    let emulated = bridge
        .write_text_file(&v1::WriteTextFileRequest::new(
            "s1",
            path.clone(),
            "written-by-bridge",
        ))
        .expect("fallback write must succeed");

    assert!(!emulated.is_lossless(), "a disk fallback write is lossy");
    assert_eq!(
        fs::read_to_string(&path).expect("the file must exist on disk"),
        "written-by-bridge"
    );

    fs::remove_file(&path).ok();
}

#[test]
fn fallback_read_of_a_missing_file_surfaces_io_error() {
    let path = temp_file("missing");
    let mut bridge = fallback_bridge();

    let error = bridge
        .read_text_file(&v1::ReadTextFileRequest::new("s1", path))
        .expect_err("a missing file must surface a typed I/O error, not a silent empty string");

    assert!(matches!(error, BridgeError::Io { .. }));
}
