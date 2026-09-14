//! `session/load` vs `session/resume` mediation.
//!
//! # The semantic gap
//!
//! v1 has two ways to re-enter a session:
//!
//! * `session/load` — re-opens a session and **always** replays the prior
//!   conversation to the client before responding.
//! * `session/resume` — re-opens a session and **never** replays.
//!
//! v2 dropped `session/load` entirely. It exposes only `session/resume`, with
//! an optional `replayFrom` cursor: absent means "do not replay",
//! `{ "type": "start" }` means "replay the whole conversation". The stateless
//! converter already encodes this correspondence
//! (`v1::LoadSessionRequest` maps to a v2 resume with `replayFrom: start`, and a
//! v2 resume maps back to v1 `session/load` only when `replayFrom` is `start`).
//!
//! # Why state is required
//!
//! The converter maps a *value*; it cannot see the peer on the other side. A v2
//! `session/resume` that asks for **no** replay can only be honoured by a v1
//! agent that actually implements `session/resume`. If the v1 agent implements
//! only `session/load`, the sole available operation forces a full replay, and
//! v1 provides no marker delimiting replayed history from new activity — so the
//! bridge cannot suppress the unwanted replay without guessing. Rather than
//! silently replay history the caller did not ask for, or silently drop updates
//! it cannot classify, the bridge **refuses** that combination
//! ([`BridgeError::IncompatibleSessionResume`]).
//!
//! # Directionality
//!
//! * `session/load` (v1 caller) to `session/resume` (v2 agent): SUPPORTED.
//! * `session/resume` (v2 caller) to a v1 agent: SUPPORTED when the v1 agent's
//!   advertised capability can honour the requested replay semantics, REFUSED
//!   otherwise.

use agent_client_protocol_schema::v2::conversion;
use agent_client_protocol_schema::{v1, v2};

use crate::{BridgeError, ProtocolBridge, SessionRecord};

/// Whether history replay was requested when a session was (re-)opened.
///
/// Recorded per session so the bridge reasons about replay from state instead
/// of re-deriving it from each request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum ReplayExpectation {
    /// The bridge did not mediate this session's opening.
    Unknown,
    /// The session was opened without replay.
    None,
    /// The session was opened with a full history replay.
    Full,
}

/// The session capabilities a v1 agent advertises, as far as they affect
/// resume mediation.
///
/// v1 agents may implement `session/load`, `session/resume`, both, or (for a
/// fresh-only agent) neither. The bridge needs to know which, because a v2
/// `session/resume` can only be routed to a method the agent actually exposes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub struct V1SessionSupport {
    /// The agent implements `session/load` (forced history replay).
    pub supports_load: bool,
    /// The agent implements `session/resume` (no history replay).
    pub supports_resume: bool,
}

impl V1SessionSupport {
    /// Builds a support descriptor.
    #[must_use]
    pub fn new(supports_load: bool, supports_resume: bool) -> Self {
        Self {
            supports_load,
            supports_resume,
        }
    }

    /// A v1 agent that implements only `session/load`.
    #[must_use]
    pub fn load_only() -> Self {
        Self::new(true, false)
    }

    /// A v1 agent that implements only `session/resume`.
    #[must_use]
    pub fn resume_only() -> Self {
        Self::new(false, true)
    }

    /// A v1 agent that implements both re-entry methods.
    #[must_use]
    pub fn load_and_resume() -> Self {
        Self::new(true, true)
    }
}

/// The v1 method a v2 `session/resume` was routed to.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum V1ResumeTarget {
    /// Route to v1 `session/load` (the v2 resume asked for a full replay).
    Load(v1::LoadSessionRequest),
    /// Route to v1 `session/resume` (the v2 resume asked for no replay).
    Resume(v1::ResumeSessionRequest),
}

fn session_key_v1(id: &v1::SessionId) -> String {
    id.0.as_ref().to_owned()
}

fn session_key_v2(id: &v2::SessionId) -> String {
    id.0.as_ref().to_owned()
}

/// The replay semantics a v2 resume asks for, reduced to the three cases the
/// bridge routes on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ReplayIntent {
    /// `replayFrom: start` -- replay the whole conversation.
    Full,
    /// No `replayFrom` -- do not replay.
    NoReplay,
    /// An unknown or future `replayFrom` cursor.
    Unknown,
}

fn replay_intent(request: &v2::ResumeSessionRequest) -> ReplayIntent {
    match &request.replay_from {
        Some(v2::ReplayFrom::Start(_)) => ReplayIntent::Full,
        None => ReplayIntent::NoReplay,
        // `Other` and any future non-exhaustive cursor variant are unknown to
        // v1 and are refused rather than guessed at.
        Some(_) => ReplayIntent::Unknown,
    }
}

impl ProtocolBridge {
    /// Mediates a v1 `session/load` into the v2 `session/resume` to send to a
    /// v2 agent.
    ///
    /// v1 `session/load` always replays, so the produced resume carries
    /// `replayFrom: start`. The pure type mapping is delegated to the schema
    /// crate's converter; this method adds the session-state bookkeeping.
    ///
    /// Direction: v1 caller to v2 agent. SUPPORTED.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::Conversion`] if the request carries a field with
    /// no v2 representation.
    pub fn load_to_resume(
        &mut self,
        request: v1::LoadSessionRequest,
    ) -> Result<v2::ResumeSessionRequest, BridgeError> {
        let key = session_key_v1(&request.session_id);
        let resume: v2::ResumeSessionRequest = conversion::try_v1_to_v2(request)?;
        self.sessions
            .insert(key, SessionRecord::new(ReplayExpectation::Full));
        Ok(resume)
    }

    /// Mediates a v2 `session/resume` into the correct v1 re-entry method for a
    /// v1 agent with the given capabilities.
    ///
    /// The routing is:
    ///
    /// * `replayFrom: start` requires a full replay, which v1 exposes only
    ///   through `session/load`. Routed to [`V1ResumeTarget::Load`] when the
    ///   agent supports load; otherwise REFUSED.
    /// * no `replayFrom` requires no replay, which v1 exposes through
    ///   `session/resume`. Routed to [`V1ResumeTarget::Resume`] when the agent
    ///   supports resume; otherwise REFUSED, because the only alternative
    ///   (`session/load`) would replay history the caller did not ask for with
    ///   no way to delimit it.
    /// * an unknown `replayFrom` cursor is rejected by the converter and
    ///   surfaced as [`BridgeError::Conversion`].
    ///
    /// Direction: v2 caller to v1 agent. SUPPORTED or REFUSED per the above.
    ///
    /// # Errors
    ///
    /// Returns [`BridgeError::IncompatibleSessionResume`] when the requested
    /// replay semantics cannot be honoured by the agent, or
    /// [`BridgeError::Conversion`] when a field or cursor has no v1
    /// representation.
    pub fn resume_to_v1(
        &mut self,
        request: v2::ResumeSessionRequest,
        support: V1SessionSupport,
    ) -> Result<V1ResumeTarget, BridgeError> {
        let key = session_key_v2(&request.session_id);
        let intent = replay_intent(&request);
        match intent {
            ReplayIntent::Full => {
                if !support.supports_load {
                    return Err(BridgeError::IncompatibleSessionResume {
                        reason: "resume requested `replayFrom: start` (full history replay), \
                                 which v1 exposes only through session/load, but this v1 agent \
                                 does not support session/load"
                            .to_owned(),
                    });
                }
                let load: v1::LoadSessionRequest = conversion::try_v2_to_v1(request)?;
                self.sessions
                    .insert(key, SessionRecord::new(ReplayExpectation::Full));
                Ok(V1ResumeTarget::Load(load))
            }
            ReplayIntent::NoReplay => {
                if support.supports_resume {
                    let resume: v1::ResumeSessionRequest = conversion::try_v2_to_v1(request)?;
                    self.sessions
                        .insert(key, SessionRecord::new(ReplayExpectation::None));
                    Ok(V1ResumeTarget::Resume(resume))
                } else if support.supports_load {
                    Err(BridgeError::IncompatibleSessionResume {
                        reason: "resume requested no replay, but this v1 agent supports only \
                                 session/load, which always replays history and provides no \
                                 replay-boundary marker; refusing rather than replaying history \
                                 the caller did not ask for or dropping updates the bridge cannot \
                                 classify"
                            .to_owned(),
                    })
                } else {
                    Err(BridgeError::IncompatibleSessionResume {
                        reason: "this v1 agent advertises neither session/load nor session/resume"
                            .to_owned(),
                    })
                }
            }
            ReplayIntent::Unknown => {
                // Unknown/future cursor: neither v1 method can represent it.
                // Ask the converter to produce the precise rejection message.
                let attempt: Result<v1::LoadSessionRequest, _> = conversion::try_v2_to_v1(request);
                Err(attempt.err().map_or_else(
                    || BridgeError::UnsupportedDirection {
                        reason: "unknown replayFrom cursor has no v1 representation".to_owned(),
                    },
                    BridgeError::from,
                ))
            }
        }
    }

    /// Returns the replay expectation recorded for a session, if any.
    ///
    /// Exposes the bridge's session state so an embedding runtime can reason
    /// about replay after mediation.
    #[must_use]
    pub fn session_replay(&self, session_id: &str) -> Option<ReplayExpectation> {
        self.sessions.get(session_id).map(|record| record.replay)
    }
}
