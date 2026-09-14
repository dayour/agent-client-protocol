//! Integration tests for `session/load` vs `session/resume` mediation.
//!
//! Every assertion is against real schema types produced by the bridge, not
//! against a test double.

use agent_client_protocol_bridge::schema::{v1, v2};
use agent_client_protocol_bridge::session::ReplayExpectation;
use agent_client_protocol_bridge::{BridgeError, ProtocolBridge, V1ResumeTarget, V1SessionSupport};

fn resume_with_start(session: &str) -> v2::ResumeSessionRequest {
    v2::ResumeSessionRequest::new(session, "/home/user/project")
        .replay_from(v2::ReplayFrom::from(v2::ReplayFromStart::new()))
}

fn resume_no_replay(session: &str) -> v2::ResumeSessionRequest {
    v2::ResumeSessionRequest::new(session, "/home/user/project")
}

#[test]
fn load_maps_to_resume_with_replay_from_start() {
    let mut bridge = ProtocolBridge::new();
    let request = v1::LoadSessionRequest::new("sess-load", "/home/user/project");

    let resume = bridge
        .load_to_resume(request)
        .expect("load must map to resume");

    assert!(
        matches!(resume.replay_from, Some(v2::ReplayFrom::Start(_))),
        "v1 load always replays, so the v2 resume must carry replayFrom: start"
    );
    assert_eq!(
        bridge.session_replay("sess-load"),
        Some(ReplayExpectation::Full),
        "the bridge must record that this session was opened with a full replay"
    );
}

#[test]
fn resume_with_start_routes_to_v1_load_when_agent_supports_load() {
    let mut bridge = ProtocolBridge::new();

    let target = bridge
        .resume_to_v1(resume_with_start("sess-a"), V1SessionSupport::load_only())
        .expect("a full-replay resume must route to v1 load");

    assert!(matches!(target, V1ResumeTarget::Load(_)));
    assert_eq!(
        bridge.session_replay("sess-a"),
        Some(ReplayExpectation::Full)
    );
}

#[test]
fn resume_without_replay_routes_to_v1_resume_when_agent_supports_resume() {
    let mut bridge = ProtocolBridge::new();

    let target = bridge
        .resume_to_v1(resume_no_replay("sess-b"), V1SessionSupport::resume_only())
        .expect("a no-replay resume must route to v1 resume");

    assert!(matches!(target, V1ResumeTarget::Resume(_)));
    assert_eq!(
        bridge.session_replay("sess-b"),
        Some(ReplayExpectation::None)
    );
}

#[test]
fn resume_without_replay_is_refused_when_agent_only_supports_load() {
    let mut bridge = ProtocolBridge::new();

    // This is the honest refusal: v1 session/load always replays and provides
    // no marker to suppress it, so a no-replay resume cannot be honoured.
    let error = bridge
        .resume_to_v1(resume_no_replay("sess-c"), V1SessionSupport::load_only())
        .expect_err("a no-replay resume against a load-only agent must be refused");

    assert!(matches!(
        error,
        BridgeError::IncompatibleSessionResume { .. }
    ));
    assert_eq!(
        bridge.session_replay("sess-c"),
        None,
        "a refused resume must not record session state"
    );
}

#[test]
fn resume_with_start_is_refused_when_agent_only_supports_resume() {
    let mut bridge = ProtocolBridge::new();

    // A full replay can only come from v1 load; a resume-only agent cannot
    // produce it, so the bridge refuses rather than dropping the replay.
    let error = bridge
        .resume_to_v1(resume_with_start("sess-d"), V1SessionSupport::resume_only())
        .expect_err("a full-replay resume against a resume-only agent must be refused");

    assert!(matches!(
        error,
        BridgeError::IncompatibleSessionResume { .. }
    ));
}

#[test]
fn resume_is_refused_when_agent_supports_neither() {
    let mut bridge = ProtocolBridge::new();

    let error = bridge
        .resume_to_v1(
            resume_no_replay("sess-e"),
            V1SessionSupport::new(false, false),
        )
        .expect_err("an agent that supports no re-entry method must be refused");

    assert!(matches!(
        error,
        BridgeError::IncompatibleSessionResume { .. }
    ));
}
