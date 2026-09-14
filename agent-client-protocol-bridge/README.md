# agent-client-protocol-bridge

A stateful v1-to-v2 bridge for the Agent Client Protocol (ACP).

The schema crate's `v2::conversion` module is a pure, stateless type converter:
it maps values that fall inside the shared v1/v2 subset and rejects everything
else. That is the correct contract for a converter, but it cannot bridge two
live peers, because the hard cases require state that lives in neither peer.

This crate supplies that state. `ProtocolBridge` mediates:

- `session/load` vs `session/resume` (v2 folded load into resume with a
  `replayFrom` cursor);
- terminals (v1 terminals are client-executed; v2 terminals are display-only,
  so the bridge owns execution);
- filesystem methods (v1 client fs methods have no v2 client surface).

Where a mapping is lossy it is loud: a typed `BridgeError` or a structured
`BridgeWarning`. The bridge never silently drops protocol semantics.

See the module documentation for the full support matrix and directionality
rules. This crate is the mediation core; wiring it to a JSON-RPC transport is
the embedding runtime's job.
