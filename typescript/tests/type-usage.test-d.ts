// Compile-only type test for the generated ACP declaration files.
//
// `tsc --noEmit` (see `npm run test:types`) proves that every generated `.d.ts`
// parses, resolves, and actually constrains values. The negative `@ts-expect-error`
// assertions below are the important part: if a generated declaration were a
// hollow `any`, those lines would fail to error and tsc would report the unused
// `@ts-expect-error` directives, failing the build. In other words, this test
// fails both when the types are missing AND when they are too loose to be useful.

import type {
  SessionId as V1SessionId,
  StopReason as V1StopReason,
  TextContent as V1TextContent,
  ContentBlock as V1ContentBlock,
} from "../v1/schema";
import type {
  SessionId as V2SessionId,
  StopReason as V2StopReason,
  TextContent as V2TextContent,
} from "../v2/schema";
import type { StopReason as V1UnstableStopReason } from "../v1/schema.unstable";
import type { SessionId as V2UnstableSessionId } from "../v2/schema.unstable";

// --- v1 stable: positive usage ---------------------------------------------

// SessionId is a string alias.
const v1SessionId: V1SessionId = "sess-v1";

// StopReason is a closed string-literal union.
const v1Stop: V1StopReason = "end_turn";

// TextContent requires `text: string`.
const v1Text: V1TextContent = { text: "hello" };

// A TextContent value is assignable to the ContentBlock union.
const v1Block: V1ContentBlock = { text: "hi" };

// --- v2 stable: positive usage (proves v2 coverage) ------------------------

const v2SessionId: V2SessionId = "sess-v2";
const v2Stop: V2StopReason = "cancelled";
const v2Text: V2TextContent = { text: "world" };

// v2 StopReason is an *open* union: it carries an extensibility variant
// (`Other = string`) for custom or future stop reasons, so any string is a
// valid v2 StopReason by design. This is a real difference from v1, whose
// StopReason is a closed literal union (see the negative assertion below).
const v2CustomStop: V2StopReason = "some_custom_future_reason";

// --- unstable variants: positive usage (proves unstable coverage) ----------

const v2UnstableSessionId: V2UnstableSessionId = "sess-v2-unstable";
declare const v1UnstableStop: V1UnstableStopReason;

// --- negative assertions: the types must genuinely constrain ---------------

// @ts-expect-error invalid StopReason literal is rejected by the closed v1 union.
const badV1Stop: V1StopReason = "not_a_real_stop_reason";
// @ts-expect-error TextContent.text is required and must be a string.
const badV1Text: V1TextContent = { text: 123 };
// @ts-expect-error v2 StopReason is an open *string* union and still rejects non-string values.
const badV2Stop: V2StopReason = 42;
// @ts-expect-error v2 TextContent.text is required and must be a string.
const badV2Text: V2TextContent = { text: 123 };

// Keep every binding live so the file is a real program, not dead code.
export const exercised = [
  v1SessionId,
  v1Stop,
  v1Text,
  v1Block,
  v2SessionId,
  v2Stop,
  v2Text,
  v2CustomStop,
  v2UnstableSessionId,
  v1UnstableStop,
  badV1Stop,
  badV1Text,
  badV2Stop,
  badV2Text,
];
