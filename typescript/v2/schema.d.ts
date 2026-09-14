// Code generated from the ACP JSON Schema by typescript/generate-types.mjs.
// DO NOT EDIT BY HAND. Run `npm run generate` to regenerate.
// Source of truth: the sibling schema.json under schema/.

export type AgentClientProtocol =
  | Agent
  | Client
  | AgentBatchCall
  | AgentBatchResponse
  | ClientBatchCall
  | ClientBatchResponse
  | ProtocolLevel;
/**
 * A message (request, response, or notification) with `"jsonrpc": "2.0"` specified as
 * [required by JSON-RPC 2.0 Specification][1].
 *
 * [1]: https://www.jsonrpc.org/specification#compatibility
 */
export type Agent = Request | Response | Notification;
export type Request = AgentRequest;
/**
 * JSON RPC Request Id
 *
 * An identifier established by the Client that MUST contain a String, Number, or NULL value if included. If it is not included it is assumed to be a notification. The value SHOULD normally not be Null \[1\] and Numbers SHOULD NOT contain fractional parts \[2\]
 *
 * The Server MUST reply with the same value in the Response object if included. This member is used to correlate the context between the two objects.
 *
 * \[1\] The use of Null as a value for the id member in a Request object is discouraged, because this specification uses a value of Null for Responses with an unknown id. Also, because JSON-RPC 1.0 uses an id value of Null for Notifications this could cause confusion in handling.
 *
 * \[2\] Fractional parts may be problematic, since many decimal fractions cannot be represented exactly as binary fractions.
 */
export type RequestId = Null | Number | Str;
/**
 * The JSON-RPC `null` request id.
 */
export type Null = null;
/**
 * A numeric JSON-RPC request id.
 */
export type Number = number;
/**
 * A string JSON-RPC request id.
 */
export type Str = string;
/**
 * Requests permission from the user for an operation.
 *
 * Called by the agent when it needs user authorization before executing
 * a potentially sensitive operation. The client should present the options
 * to the user and return their decision.
 *
 * If the client cancels active session work via `session/cancel`, it MUST
 * respond to this request with `RequestPermissionOutcome::Cancelled`.
 *
 * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/v2/tool-calls#requesting-permission)
 */
export type RequestPermissionRequest = RequestPermissionRequest1;
/**
 * A unique identifier for a conversation session between a client and agent.
 *
 * Sessions maintain their own context, conversation history, and state,
 * allowing multiple independent interactions with the same agent.
 *
 * See protocol docs: [Session ID](https://agentclientprotocol.com/protocol/v2/session-setup#session-id)
 */
export type SessionId = string;
/**
 * The operation requiring permission.
 */
export type RequestPermissionSubject =
  ToolCallPermissionSubject | CommandPermissionSubject | Other8;
/**
 * Unique identifier for a tool call within a session.
 */
export type ToolCallId = string;
/**
 * Categories of tools that can be invoked.
 *
 * Tool kinds help clients choose appropriate icons and optimize how they
 * display tool execution progress.
 *
 * v2 keeps this enum losslessly decode-open. Unknown values are preserved so
 * draft peers can forward or display future tool kinds without corrupting the
 * wire payload.
 *
 * See protocol docs: [Creating](https://agentclientprotocol.com/protocol/v2/tool-calls#creating)
 */
export type ToolKind =
  | "read"
  | "edit"
  | "delete"
  | "move"
  | "search"
  | "execute"
  | "think"
  | "fetch"
  | "switch_mode"
  | "other"
  | Unknown;
/**
 * Custom or future tool kind.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Unknown = string;
/**
 * Execution status of a tool call.
 *
 * Tool calls progress through different statuses during their lifecycle.
 *
 * v2 keeps this enum losslessly decode-open so future lifecycle states can be
 * preserved instead of forcing older peers to reject or rewrite them.
 *
 * See protocol docs: [Status](https://agentclientprotocol.com/protocol/v2/tool-calls#status)
 */
export type ToolCallStatus =
  "pending" | "in_progress" | "completed" | "failed" | "cancelled" | Other;
/**
 * Custom or future tool call status.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other = string;
/**
 * Content produced by a tool call.
 *
 * Tool calls can produce different types of content including standard
 * content blocks (text, images), file diffs, or display-only terminals.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/v2/tool-calls#content)
 */
export type ToolCallContent = Content | Diff | Terminal | Other7;
/**
 * Content blocks represent displayable information in the Agent Client Protocol.
 *
 * They provide a structured way to handle various types of user-facing content—whether
 * it's text from language models, images for analysis, or embedded resources for context.
 *
 * Content blocks appear in:
 * - User prompts sent via `session/prompt`
 * - Language model output reported through `session/update` notifications as
 *   message updates or streamed chunks
 * - Progress updates and results from tool calls
 *
 * This structure is compatible with the Model Context Protocol (MCP), enabling
 * agents to seamlessly forward content from MCP tool outputs without transformation.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/v2/content)
 */
export type ContentBlock =
  | TextContent
  | ImageContent
  | AudioContent
  | ResourceLink
  | EmbeddedResource
  | Other3;
/**
 * The sender or recipient of messages and data in a conversation.
 */
export type Role = "assistant" | "user" | Other1;
/**
 * Custom or future role.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other1 = string;
/**
 * An Internet media type identifying the format of protocol content.
 */
export type MediaType = string;
/**
 * Theme an icon is designed for.
 */
export type IconTheme = "light" | "dark" | Other2;
/**
 * Custom or future icon theme.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other2 = string;
/**
 * Resource content that can be embedded in a message.
 */
export type EmbeddedResourceResource =
  TextResourceContents | BlobResourceContents;
/**
 * Text resource contents embedded directly in the message.
 */
export type TextResourceContents = TextResourceContents1;
/**
 * Binary resource contents embedded directly in the message.
 */
export type BlobResourceContents = BlobResourceContents1;
/**
 * One file-level change described by a [`Diff`].
 *
 * Structured change metadata lets clients identify affected files and
 * operations without parsing the text patch.
 */
export type DiffChange = DiffChange1 & {
  /**
   * File content kind.
   *
   * Omitted or `null` means the content kind is unknown.
   */
  fileType?: DiffFileType | null;
  /**
   * MIME type of the file contents.
   *
   * Omitted or `null` means the MIME type is unknown.
   */
  mimeType?: MediaType | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
};
export type DiffChange1 = DiffPathChange | DiffPathPairChange | Other4;
/**
 * An absolute filesystem path used by the protocol.
 */
export type AbsolutePath = string;
/**
 * Kind of file content represented by a diff change.
 */
export type DiffFileType = "text" | "binary" | "directory" | "symlink" | Other5;
/**
 * Custom or future file type.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other5 = string;
/**
 * Text patch format used by [`DiffPatch`].
 */
export type DiffPatchFormat = "git_patch" | Other6;
/**
 * Custom or future patch format.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other6 = string;
/**
 * Unique identifier for an agent-owned terminal within a session.
 */
export type TerminalId = string;
/**
 * Unique identifier for a permission option.
 */
export type PermissionOptionId = string;
/**
 * The type of permission option being presented to the user.
 *
 * Helps clients choose appropriate icons and UI treatment.
 */
export type PermissionOptionKind =
  "allow_once" | "allow_always" | "reject_once" | "reject_always" | Other9;
/**
 * Custom or future permission option kind.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other9 = string;
/**
 * Requests structured user input via a form or URL.
 *
 * See protocol docs: [Elicitation](https://agentclientprotocol.com/protocol/v2/elicitation)
 */
export type CreateElicitationRequest = CreateElicitationRequest1;
/**
 * Request from the agent to elicit structured user input.
 *
 * The agent sends this to the client to request information from the user,
 * either via a form or by directing them to a URL.
 * Elicitations are tied to a session (optionally a tool call) or a request.
 */
export type CreateElicitationRequest1 = CreateElicitationRequest2 & {
  /**
   * A human-readable message describing what input is needed.
   */
  message: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
};
export type CreateElicitationRequest2 =
  ElicitationFormMode | ElicitationUrlMode | Other13;
/**
 * Form-based elicitation mode where the client renders a form from the provided schema.
 */
export type ElicitationFormMode = ElicitationFormMode1 & {
  /**
   * A JSON Schema describing the form fields to present to the user.
   */
  requestedSchema: ElicitationSchema;
};
export type ElicitationFormMode1 = Session | Request1;
/**
 * Tied to a session, optionally to a specific tool call within that session.
 */
export type Session = ElicitationSessionScope;
/**
 * Tied to a specific JSON-RPC request outside of a session
 * (e.g., during auth/configuration phases before any session is started).
 */
export type Request1 = ElicitationRequestScope;
/**
 * Type discriminator for elicitation schemas.
 */
export type ElicitationSchemaType = "object";
/**
 * Property schema for elicitation form fields.
 *
 * Each variant corresponds to a JSON Schema `"type"` value.
 * Single-select enums use the `String` variant with `enum` or `oneOf` set.
 * Multi-select enums use the `Array` variant.
 */
export type ElicitationPropertySchema =
  | StringPropertySchema
  | NumberPropertySchema
  | IntegerPropertySchema
  | BooleanPropertySchema
  | MultiSelectPropertySchema
  | Other12;
/**
 * String format types for string properties in elicitation schemas.
 */
export type StringFormat = "email" | "uri" | "date" | "date-time" | Other10;
/**
 * Custom or future string format.
 *
 * Unknown formats are preserved. Implementations that do not understand a
 * format should treat it as an annotation rather than rejecting the schema.
 */
export type Other10 = string;
/**
 * Items for a multi-select (array) property schema.
 */
export type MultiSelectItems = StringMultiSelectItems | Other11 | Titled;
/**
 * Titled multi-select items with human-readable labels.
 */
export type Titled = TitledMultiSelectItems;
/**
 * URL-based elicitation mode where the client directs the user to a URL.
 */
export type ElicitationUrlMode = ElicitationUrlMode1 & {
  /**
   * The unique identifier for this elicitation.
   */
  elicitationId: ElicitationId;
  /**
   * The URL to direct the user to.
   */
  url: string;
};
export type ElicitationUrlMode1 = Session1 | Request2;
/**
 * Tied to a session, optionally to a specific tool call within that session.
 */
export type Session1 = ElicitationSessionScope;
/**
 * Tied to a specific JSON-RPC request outside of a session
 * (e.g., during auth/configuration phases before any session is started).
 */
export type Request2 = ElicitationRequestScope;
/**
 * Unique identifier for an elicitation.
 */
export type ElicitationId = string;
/**
 * Custom or future elicitation mode.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Clients that do not understand this mode should preserve the raw payload
 * when storing, replaying, proxying, or forwarding elicitation requests.
 * They MUST NOT render it as a known elicitation mode.
 */
export type Other13 = Session2 | Request3;
/**
 * Tied to a session, optionally to a specific tool call within that session.
 */
export type Session2 = ElicitationSessionScope;
/**
 * Tied to a specific JSON-RPC request outside of a session
 * (e.g., during auth/configuration phases before any session is started).
 */
export type Request3 = ElicitationRequestScope;
/**
 * Handles extension method requests from the agent.
 *
 * Allows the Agent to send an arbitrary request that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
 */
export type ExtMethodRequest = ExtRequest;
export type Response = AgentResponse;
/**
 * A JSON-RPC response object.
 */
export type AgentResponse = Result | Error;
/**
 * Successful result returned for a `initialize` request.
 */
export type InitializeResponse = InitializeResponse1;
/**
 * Protocol version identifier.
 *
 * This version is only bumped for breaking changes.
 * Non-breaking changes should be introduced via capabilities.
 */
export type ProtocolVersion = number;
/**
 * Describes an available authentication method.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 */
export type AuthMethod = AuthMethodAgent | Other14;
/**
 * Typed identifier used for auth method values on the wire.
 */
export type AuthMethodId = string;
/**
 * Successful result returned for an `auth/login` request.
 */
export type LoginAuthResponse = LoginAuthResponse1;
/**
 * Successful result returned for an `auth/logout` request.
 */
export type LogoutAuthResponse = LogoutAuthResponse1;
/**
 * Successful result returned for a `session/new` request.
 */
export type NewSessionResponse = NewSessionResponse1;
/**
 * A session configuration option selector and its current state.
 */
export type SessionConfigOption = SessionConfigOption1 & {
  /**
   * Unique identifier for the configuration option.
   */
  configId: SessionConfigId;
  /**
   * Human-readable label for the option.
   */
  name: string;
  /**
   * Optional description for the Client to display to the user.
   */
  description?: string | null;
  /**
   * Optional semantic category for this option (UX only).
   */
  category?: SessionConfigOptionCategory | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
};
export type SessionConfigOption1 =
  SessionConfigSelect | SessionConfigBoolean | Other15;
/**
 * Unique identifier for a session configuration option value.
 */
export type SessionConfigValueId = string;
/**
 * Possible values for a session configuration option.
 */
export type SessionConfigSelectOptions = Ungrouped | Grouped;
/**
 * A flat list of options with no grouping.
 */
export type Ungrouped = SessionConfigSelectOption[];
/**
 * Unique identifier for a session configuration option value group.
 */
export type SessionConfigGroupId = string;
/**
 * A list of options grouped under headers.
 */
export type Grouped = SessionConfigSelectGroup[];
/**
 * Unique identifier for a session configuration option.
 */
export type SessionConfigId = string;
/**
 * Semantic category for a session configuration option.
 *
 * This is intended to help Clients distinguish broadly common selectors (e.g. model selector vs
 * session mode selector vs thought/reasoning level) for UX purposes (keyboard shortcuts, icons,
 * placement). It MUST NOT be required for correctness. Clients MUST handle missing or unknown
 * categories gracefully.
 *
 * Category names beginning with `_` are free for custom use, like other ACP extension methods.
 * Category names that do not begin with `_` are reserved for the ACP spec.
 */
export type SessionConfigOptionCategory =
  "mode" | "model" | "model_config" | "thought_level" | Other16;
/**
 * Custom or future category.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other16 = string;
/**
 * Successful result returned for a `session/list` request.
 */
export type ListSessionsResponse = ListSessionsResponse1;
/**
 * An opaque cursor used to paginate `session/list` results.
 */
export type SessionListCursor = string;
/**
 * Successful result returned for a `session/delete` request.
 */
export type DeleteSessionResponse = DeleteSessionResponse1;
/**
 * Successful result returned for a `session/resume` request.
 */
export type ResumeSessionResponse = ResumeSessionResponse1;
/**
 * Successful result returned for a `session/close` request.
 */
export type CloseSessionResponse = CloseSessionResponse1;
/**
 * Successful result returned for a `session/set_config_option` request.
 */
export type SetSessionConfigOptionResponse = SetSessionConfigOptionResponse1;
/**
 * Successful result returned for a `session/prompt` request.
 */
export type PromptResponse = PromptResponse1;
/**
 * Successful result returned by an extension method outside the core ACP method set.
 */
export type ExtMethodResponse = ExtResponse;
/**
 * Predefined error codes for common JSON-RPC and ACP-specific errors.
 *
 * These codes follow the JSON-RPC 2.0 specification for standard errors
 * and use the reserved range (-32000 to -32099) for protocol-specific errors.
 */
export type ErrorCode =
  | ParseError
  | InvalidRequest
  | MethodNotFound
  | InvalidParams
  | InternalError
  | RequestCancelled
  | AuthenticationRequired
  | ResourceNotFound
  | Other17;
/**
 * **Parse error**: Invalid JSON was received by the server.
 * An error occurred on the server while parsing the JSON text.
 */
export type ParseError = -32700;
/**
 * **Invalid request**: The JSON sent is not a valid Request object.
 */
export type InvalidRequest = -32600;
/**
 * **Method not found**: The method does not exist or is not available.
 */
export type MethodNotFound = -32601;
/**
 * **Invalid params**: Invalid method parameter(s).
 */
export type InvalidParams = -32602;
/**
 * **Internal error**: Internal JSON-RPC error.
 * Reserved for implementation-defined server errors.
 */
export type InternalError = -32603;
/**
 * **Request cancelled**: Execution of the method was aborted either due to a cancellation request from the caller or
 * because of resource constraints or shutdown.
 */
export type RequestCancelled = -32800;
/**
 * **Authentication required**: Authentication is required before this operation can be performed.
 */
export type AuthenticationRequired = -32000;
/**
 * **Resource not found**: A given resource, such as a file, was not found.
 */
export type ResourceNotFound = -32002;
/**
 * Other undefined error code.
 */
export type Other17 = number;
export type Notification = AgentNotification;
/**
 * Handles session update notifications from the agent.
 *
 * This is a notification endpoint (no response expected) that receives
 * updates about session activity, including message updates, message chunks,
 * tool calls, and execution plans.
 *
 * Note: Clients SHOULD continue accepting tool call updates even after
 * sending a `session/cancel` notification, as the agent may send final
 * updates before reporting an idle `state_update` with the cancelled
 * stop reason.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#3-agent-reports-output)
 */
export type UpdateSessionNotification = UpdateSessionNotification1;
/**
 * Different types of updates that can be sent while a session exists.
 *
 * These updates report messages, progress, and other session activity.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#3-agent-reports-output)
 */
export type SessionUpdate =
  | ContentChunk
  | UserMessage
  | AgentMessage
  | AgentThought
  | StateUpdate
  | ToolCallContentChunk
  | ToolCallUpdate
  | TerminalUpdate
  | TerminalOutputChunk
  | PlanUpdate
  | AvailableCommandsUpdate
  | ConfigOptionUpdate
  | SessionInfoUpdate
  | UsageUpdate
  | Other24;
/**
 * Unique identifier for a message within a session.
 */
export type MessageId = string;
/**
 * The state of the agent's foreground work has changed.
 *
 * Background activity can continue and emit other `session/update` notifications
 * while `idle`. Those notifications do not change this state.
 */
export type StateUpdate =
  RunningStateUpdate | IdleStateUpdate | RequiresActionStateUpdate | Other19;
/**
 * Reasons why an agent stops active session work.
 *
 * See protocol docs: [Stop Reasons](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#stop-reasons)
 */
export type StopReason =
  | "end_turn"
  | "max_tokens"
  | "max_turn_requests"
  | "refusal"
  | "cancelled"
  | Other18;
/**
 * Custom or future stop reason.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other18 = string;
/**
 * Updated content for a plan.
 */
export type PlanUpdateContent = PlanItems | Other22;
/**
 * Unique identifier for a plan within a session.
 */
export type PlanId = string;
/**
 * Priority levels for plan entries.
 *
 * Used to indicate the relative importance or urgency of different
 * tasks in the execution plan.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/v2/agent-plan#plan-entries)
 */
export type PlanEntryPriority = "high" | "medium" | "low" | Other20;
/**
 * Custom or future plan entry priority.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other20 = string;
/**
 * Status of a plan entry in the execution flow.
 *
 * Tracks the lifecycle of each task from planning through completion.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/v2/agent-plan#plan-entries)
 */
export type PlanEntryStatus =
  "pending" | "in_progress" | "completed" | "cancelled" | Other21;
/**
 * Custom or future plan entry status.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export type Other21 = string;
/**
 * The input specification for a command.
 */
export type AvailableCommandInput = TextCommandInput | Other23;
/**
 * Notification that a URL-based elicitation has completed.
 *
 * See protocol docs: [Elicitation](https://agentclientprotocol.com/protocol/v2/elicitation#url-completion)
 */
export type CompleteElicitationNotification = CompleteElicitationNotification1;
/**
 * Handles extension notifications from the agent.
 *
 * Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
 * Extension notifications provide a way to send one-way messages for custom functionality
 * while maintaining protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
 */
export type ExtNotification = ExtNotification1;
/**
 * A message (request, response, or notification) with `"jsonrpc": "2.0"` specified as
 * [required by JSON-RPC 2.0 Specification][1].
 *
 * [1]: https://www.jsonrpc.org/specification#compatibility
 */
export type Client = Request4 | Response1 | Notification1;
export type Request4 = ClientRequest;
/**
 * Establishes the connection with a client and negotiates protocol capabilities.
 *
 * This method is called once at the beginning of the connection to:
 * - Negotiate the protocol version to use
 * - Exchange capability information between client and agent
 * - Determine available authentication methods
 *
 * The agent should respond with its supported protocol version and capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/v2/initialization)
 */
export type InitializeRequest = InitializeRequest1;
/**
 * Authenticates the client using the specified authentication method.
 *
 * Agents MUST support this method when their `initialize` response advertised
 * at least one valid authentication method. Clients MUST NOT call this method
 * when `authMethods` was omitted or empty.
 *
 * Called when the agent requires authentication before allowing session creation.
 * The client provides the authentication method ID that was advertised during initialization.
 *
 * After successful authentication, the client can proceed to create sessions with
 * `new_session` without receiving an `auth_required` error.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/v2/initialization)
 */
export type LoginAuthRequest = LoginAuthRequest1;
/**
 * Logs out of the current authenticated state.
 *
 * Agents MUST support this method when their `initialize` response advertised
 * at least one valid authentication method. Clients MUST NOT call this method
 * when `authMethods` was omitted or empty.
 *
 * After a successful logout, authentication-gated requests require the client
 * to authenticate again. There is no guarantee about the behavior of already
 * running sessions.
 */
export type LogoutAuthRequest = LogoutAuthRequest1;
/**
 * Creates a new conversation session with the agent.
 *
 * Sessions represent independent conversation contexts with their own history and state.
 *
 * The agent should:
 * - Create a new session context
 * - Connect to any specified MCP servers
 * - Return a unique session ID for future requests
 *
 * May return an `auth_required` error if the agent requires authentication.
 *
 * See protocol docs: [Session Setup](https://agentclientprotocol.com/protocol/v2/session-setup)
 */
export type NewSessionRequest = NewSessionRequest1;
/**
 * Configuration for connecting to an MCP (Model Context Protocol) server.
 *
 * MCP servers provide tools and context that the agent can use when
 * processing prompts.
 *
 * See protocol docs: [MCP Servers](https://agentclientprotocol.com/protocol/v2/session-setup#mcp-servers)
 */
export type McpServer = McpServerHttp | McpServerStdio | Other25;
/**
 * Lists existing sessions known to the agent.
 *
 * The agent should return metadata about sessions with optional filtering and pagination support.
 */
export type ListSessionsRequest = ListSessionsRequest1;
/**
 * Deletes an existing session from `session/list`.
 *
 * This method is only available if the agent advertises the `session.delete` capability.
 */
export type DeleteSessionRequest = DeleteSessionRequest1;
/**
 * Resumes an existing session.
 *
 * The agent should resume the session context, allowing the conversation
 * to continue. If `replayFrom` is set, the agent should replay
 * conversation history before responding.
 */
export type ResumeSessionRequest = ResumeSessionRequest1;
/**
 * Inclusive cursor describing where replayed session history should begin.
 *
 * Replay includes the position identified by the cursor.
 */
export type ReplayFrom = ReplayFromStart | Other26;
/**
 * Closes an active session and frees up any resources associated with it.
 *
 * The agent must cancel any ongoing work (as if `session/cancel` was called)
 * and then free up any resources associated with the session.
 */
export type CloseSessionRequest = CloseSessionRequest1;
/**
 * Sets the current value for a session configuration option.
 */
export type SetSessionConfigOptionRequest = SetSessionConfigOptionRequest1;
/**
 * Request parameters for setting a session configuration option.
 */
export type SetSessionConfigOptionRequest1 = SetSessionConfigOptionRequest2 & {
  /**
   * The ID of the session to set the configuration option for.
   */
  sessionId: SessionId;
  /**
   * The ID of the configuration option to set.
   */
  configId: SessionConfigId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
};
export type SetSessionConfigOptionRequest2 =
  | {
      /**
       * The value ID.
       */
      value: SessionConfigValueId;
      type: "id";
    }
  | {
      /**
       * The boolean value.
       */
      value: boolean;
      type: "boolean";
    }
  | Other27;
/**
 * Processes a user prompt within a session.
 *
 * This request accepts the prompt:
 * - Receives user messages with optional context (files, images, etc.)
 * - Returns once the prompt is accepted
 *
 * After acceptance, the Agent reports the accepted user message,
 * processing state, output, tool calls, and completion through
 * `session/update` notifications.
 *
 * See protocol docs: [Prompt Lifecycle](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle)
 */
export type PromptRequest = PromptRequest1;
/**
 * Handles extension method requests from the client.
 *
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
 */
export type ExtMethodRequest1 = ExtRequest;
export type Response1 = ClientResponse;
/**
 * A JSON-RPC response object.
 */
export type ClientResponse = Result1 | Error2;
/**
 * Successful result returned for a `session/request_permission` request.
 */
export type RequestPermissionResponse = RequestPermissionResponse1;
/**
 * The outcome of a permission request.
 */
export type RequestPermissionOutcome =
  | {
      outcome: "cancelled";
    }
  | SelectedPermissionOutcome
  | Other28;
/**
 * Successful result returned for a `elicitation/create` request.
 */
export type CreateElicitationResponse = CreateElicitationResponse1;
/**
 * Response from the client to an elicitation request.
 */
export type CreateElicitationResponse1 = CreateElicitationResponse2 & {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
};
export type CreateElicitationResponse2 =
  | ElicitationAcceptAction
  | {
      action: "decline";
    }
  | {
      action: "cancel";
    }
  | Other29;
/**
 * Allowed wire representations for [`ElicitationContentValue`].
 */
export type ElicitationContentValue =
  String | Integer | Number1 | Boolean | StringArray;
/**
 * String value accepted in elicitation response content.
 */
export type String = string;
/**
 * Integer value accepted in elicitation response content.
 */
export type Integer = number;
/**
 * Number value accepted in elicitation response content.
 */
export type Number1 = number;
/**
 * Boolean value accepted in elicitation response content.
 */
export type Boolean = boolean;
/**
 * String array value accepted in elicitation response content.
 */
export type StringArray = string[];
/**
 * Successful result returned by an extension method outside the core ACP method set.
 */
export type ExtMethodResponse1 = ExtResponse;
export type Notification1 = ClientNotification;
/**
 * Cancels ongoing operations for a session.
 *
 * This is a notification sent by the client to cancel active work in a
 * session.
 *
 * Upon receiving this notification, the Agent SHOULD:
 * - Stop all language model requests as soon as possible
 * - Abort all tool call invocations in progress
 * - Send any pending `session/update` notifications
 * - Report an idle `state_update` with `StopReason::Cancelled` after
 *   cancellation succeeds
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#cancellation)
 */
export type CancelSessionNotification = CancelSessionNotification1;
/**
 * Handles extension notifications from the client.
 *
 * Extension notifications provide a way to send one-way messages for custom functionality
 * while maintaining protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
 */
export type ExtNotification2 = ExtNotification1;
/**
 * A non-empty JSON-RPC 2.0 batch message.
 *
 * @minItems 1
 */
export type AgentBatchCall = [
  Request5 | Notification2 | ProtocolLevelNotification,
  ...(Request5 | Notification2 | ProtocolLevelNotification)[],
];
export type Request5 = AgentRequest;
export type Notification2 = AgentNotification;
export type ProtocolLevelNotification = ProtocolLevelNotification1;
/**
 * Cancels an ongoing request.
 *
 * This is a notification sent by the side that sent a request to cancel that request.
 *
 * Upon receiving this notification, the receiver:
 *
 * 1. MAY cancel the corresponding request activity and all nested activities
 * 2. MAY send any pending notifications.
 * 3. MUST send one of these responses for the original request:
 *   - Valid response with appropriate data (partial results or cancellation marker)
 *   - Error response with code `-32800` (Cancelled)
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/v2/cancellation)
 */
export type CancelRequestNotification = CancelRequestNotification1;
/**
 * A non-empty JSON-RPC 2.0 batch message.
 *
 * @minItems 1
 */
export type AgentBatchResponse = [Result2 | Error3, ...(Result2 | Error3)[]];
/**
 * Successful result returned for a `initialize` request.
 */
export type InitializeResponse2 = InitializeResponse1;
/**
 * Successful result returned for an `auth/login` request.
 */
export type LoginAuthResponse2 = LoginAuthResponse1;
/**
 * Successful result returned for an `auth/logout` request.
 */
export type LogoutAuthResponse2 = LogoutAuthResponse1;
/**
 * Successful result returned for a `session/new` request.
 */
export type NewSessionResponse2 = NewSessionResponse1;
/**
 * Successful result returned for a `session/list` request.
 */
export type ListSessionsResponse2 = ListSessionsResponse1;
/**
 * Successful result returned for a `session/delete` request.
 */
export type DeleteSessionResponse2 = DeleteSessionResponse1;
/**
 * Successful result returned for a `session/resume` request.
 */
export type ResumeSessionResponse2 = ResumeSessionResponse1;
/**
 * Successful result returned for a `session/close` request.
 */
export type CloseSessionResponse2 = CloseSessionResponse1;
/**
 * Successful result returned for a `session/set_config_option` request.
 */
export type SetSessionConfigOptionResponse2 = SetSessionConfigOptionResponse1;
/**
 * Successful result returned for a `session/prompt` request.
 */
export type PromptResponse2 = PromptResponse1;
/**
 * Successful result returned by an extension method outside the core ACP method set.
 */
export type ExtMethodResponse2 = ExtResponse;
/**
 * A non-empty JSON-RPC 2.0 batch message.
 *
 * @minItems 1
 */
export type ClientBatchCall = [
  Request6 | Notification3 | ProtocolLevelNotification2,
  ...(Request6 | Notification3 | ProtocolLevelNotification2)[],
];
export type Request6 = ClientRequest;
export type Notification3 = ClientNotification;
export type ProtocolLevelNotification2 = ProtocolLevelNotification1;
/**
 * A non-empty JSON-RPC 2.0 batch message.
 *
 * @minItems 1
 */
export type ClientBatchResponse = [Result3 | Error4, ...(Result3 | Error4)[]];
/**
 * Successful result returned for a `session/request_permission` request.
 */
export type RequestPermissionResponse2 = RequestPermissionResponse1;
/**
 * Successful result returned for a `elicitation/create` request.
 */
export type CreateElicitationResponse3 = CreateElicitationResponse1;
/**
 * Successful result returned by an extension method outside the core ACP method set.
 */
export type ExtMethodResponse3 = ExtResponse;
/**
 * Cancels an ongoing request.
 *
 * This is a notification sent by the side that sent a request to cancel that request.
 *
 * Upon receiving this notification, the receiver:
 *
 * 1. MAY cancel the corresponding request activity and all nested activities
 * 2. MAY send any pending notifications.
 * 3. MUST send one of these responses for the original request:
 *   - Valid response with appropriate data (partial results or cancellation marker)
 *   - Error response with code `-32800` (Cancelled)
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/v2/cancellation)
 */
export type CancelRequestNotification2 = CancelRequestNotification1;

/**
 * A JSON-RPC request object.
 */
export interface AgentRequest {
  /**
   * The request id used to correlate the matching response.
   */
  id: RequestId;
  /**
   * The method name to invoke.
   */
  method: string;
  /**
   * Method-specific request parameters.
   */
  params?:
    | (RequestPermissionRequest | CreateElicitationRequest | ExtMethodRequest)
    | null;
}
/**
 * Request for user permission to proceed with an operation.
 *
 * Sent when the agent needs authorization before performing a sensitive operation.
 *
 * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/v2/tool-calls#requesting-permission)
 */
export interface RequestPermissionRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * Human-readable title for the permission prompt.
   *
   * This title is specific to the permission prompt and does not update any
   * subject's displayed title.
   */
  title: string;
  /**
   * Optional human-readable explanation of why permission is needed.
   *
   * This text is specific to the permission prompt and does not update any
   * subject's displayed content. Omitted or `null` both mean no separate
   * permission description was provided.
   */
  description?: string | null;
  /**
   * Optional structured context about the operation requiring permission.
   *
   * Omitted or `null` both mean no structured subject was provided.
   */
  subject?: RequestPermissionSubject | null;
  /**
   * Available permission options for the user to choose from.
   * Must contain at least one option.
   *
   * @minItems 1
   */
  options: [PermissionOption, ...PermissionOption[]];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Permission request details for a tool call.
 */
export interface ToolCallPermissionSubject {
  /**
   * Details about the tool call requiring permission.
   */
  toolCall: ToolCallUpdate;
}
/**
 * Represents an upsert for a tool call that the language model has requested.
 *
 * Tool calls are actions that the agent executes on behalf of the language model,
 * such as reading files, executing code, or fetching data from external sources.
 *
 * Only [`ToolCallUpdate::tool_call_id`] is required. Other fields have patch semantics:
 * omitted fields leave the existing tool call value unchanged, `null` clears or
 * unsets the value, and concrete values replace the previous value. For
 * collection fields, concrete arrays replace the previous collection, and both
 * `null` and `[]` clear the collection. When a client receives a tool call ID it
 * has not seen before, omitted fields use client defaults.
 *
 * See protocol docs: [Tool Calls](https://agentclientprotocol.com/protocol/v2/tool-calls)
 */
export interface ToolCallUpdate {
  /**
   * Unique identifier for this tool call within the session.
   */
  toolCallId: ToolCallId;
  /**
   * Human-readable title describing what the tool is doing.
   */
  title?: string | null;
  /**
   * The category of tool being invoked.
   * Helps clients choose appropriate icons and UI treatment.
   */
  kind?: ToolKind | null;
  /**
   * Current execution status of the tool call.
   */
  status?: ToolCallStatus | null;
  /**
   * Content produced by the tool call.
   * Malformed present values are rejected so they cannot be mistaken for an omitted patch.
   */
  content?: ToolCallContent[] | null;
  /**
   * File locations affected by this tool call.
   * Enables "follow-along" features in clients.
   */
  locations?: ToolCallLocation[] | null;
  /**
   * Raw input parameters sent to the tool.
   */
  rawInput?: {
    [k: string]: unknown;
  };
  /**
   * Raw output returned by the tool.
   */
  rawOutput?: {
    [k: string]: unknown;
  };
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Omitted means no metadata update; `null` is an
   * explicit clear signal. Implementations MUST NOT make assumptions about values at these keys.
   * Malformed extension metadata remains lenient by design because `_meta`
   * is advisory and does not define the canonical tool-call state.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Standard content block (text, images, resources).
 */
export interface Content {
  /**
   * The actual content block.
   */
  content: ContentBlock;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Text provided to or from an LLM.
 */
export interface TextContent {
  /**
   * Text payload carried by this content block.
   */
  text: string;
  /**
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Optional annotations for the client. The client can use annotations to inform how objects are used or displayed
 */
export interface Annotations {
  /**
   * Intended recipients for this content, such as the user or assistant.
   */
  audience?: Role[] | null;
  /**
   * Timestamp indicating when the underlying resource was last modified.
   *
   * Must be an RFC 3339 formatted string (e.g., "2025-01-12T15:00:58Z").
   */
  lastModified?: string | null;
  /**
   * Relative importance of this content when clients choose what to surface.
   */
  priority?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An image provided to or from an LLM.
 */
export interface ImageContent {
  /**
   * Base64-encoded media payload.
   */
  data: string;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType: MediaType;
  /**
   * URI associated with this resource or media payload.
   */
  uri?: string | null;
  /**
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Audio provided to or from an LLM.
 */
export interface AudioContent {
  /**
   * Base64-encoded media payload.
   */
  data: string;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType: MediaType;
  /**
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A resource that the server is capable of reading, included in a prompt or tool call result.
 */
export interface ResourceLink {
  /**
   * Human-readable name shown for this protocol object.
   */
  name: string;
  /**
   * URI associated with this resource or media payload.
   */
  uri: string;
  /**
   * Optional display title for end-user UI.
   */
  title?: string | null;
  /**
   * Optional human-readable details shown with this protocol object.
   */
  description?: string | null;
  /**
   * Optional set of sized icons that the client can display in a user interface.
   */
  icons?: Icon[] | null;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType?: MediaType | null;
  /**
   * Optional size of the linked resource in bytes, if known.
   */
  size?: number | null;
  /**
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An optionally-sized icon that can be displayed in a user interface.
 */
export interface Icon {
  /**
   * A standard URI pointing to an icon resource.
   */
  src: string;
  /**
   * Optional MIME type override if the source MIME type is missing or generic.
   */
  mimeType?: MediaType | null;
  /**
   * Optional array of strings that specify sizes at which the icon can be used.
   * Each string should be in `WxH` format (e.g., `"48x48"`, `"96x96"`) or
   * `"any"` for scalable formats like SVG.
   *
   * If not provided, the client should assume that the icon can be used at any size.
   */
  sizes?: string[] | null;
  /**
   * Optional theme this icon is designed for.
   */
  theme?: IconTheme | null;
}
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export interface EmbeddedResource {
  /**
   * Embedded resource payload, either text or binary data.
   */
  resource: EmbeddedResourceResource;
  /**
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Text-based resource contents.
 */
export interface TextResourceContents1 {
  /**
   * Text payload carried by this content block.
   */
  text: string;
  /**
   * URI associated with this resource or media payload.
   */
  uri: string;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType?: MediaType | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Binary resource contents.
 */
export interface BlobResourceContents1 {
  /**
   * Base64-encoded bytes for a binary resource payload.
   */
  blob: string;
  /**
   * URI associated with this resource or media payload.
   */
  uri: string;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType?: MediaType | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future content block.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Receivers that do not understand this content block type should preserve
 * the raw payload when storing, replaying, proxying, or forwarding content,
 * and otherwise ignore it or display it generically.
 */
export interface Other3 {
  /**
   * Custom or future content block type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * File changes produced by a tool call.
 *
 * `changes` is authoritative for affected absolute paths and operations.
 * `patch` optionally carries renderable text for some or all of those changes
 * and MUST be consistent with `changes`. Agents SHOULD provide `patch` whenever
 * feasible. Clients MUST handle diffs where `patch` is omitted or `null`.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/v2/tool-calls#content)
 */
export interface Diff {
  /**
   * Structured file changes described by this diff.
   *
   * Clients can use this field without parsing patch text to determine affected paths.
   */
  changes: DiffChange[];
  /**
   * Renderable patch text for some or all of the structured changes.
   *
   * Agents SHOULD provide patch text whenever feasible. Omitted or `null`
   * means no renderable patch text was provided.
   */
  patch?: DiffPatch | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Operation metadata for add, delete, and modify changes.
 */
export interface DiffPathChange {
  /**
   * Absolute path for the operation.
   */
  path: AbsolutePath;
}
/**
 * Operation metadata for move and copy changes.
 */
export interface DiffPathPairChange {
  /**
   * Absolute path before the operation.
   */
  oldPath: AbsolutePath;
  /**
   * Absolute path after the operation.
   */
  path: AbsolutePath;
}
/**
 * Custom or future file operation.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export interface Other4 {
  /**
   * Custom or future file operation.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  operation: string;
  [k: string]: unknown;
}
/**
 * Renderable patch text and its format.
 */
export interface DiffPatch {
  /**
   * Patch format. The only ACP-defined value is `git_patch`.
   */
  format: DiffPatchFormat;
  /**
   * Patch text in the format named by `format`.
   */
  text: string;
}
/**
 * A display-only reference to an agent-owned terminal.
 *
 * Terminal state and output are delivered separately through
 * [`TerminalUpdate`] and [`TerminalOutputChunk`].
 */
export interface Terminal {
  /**
   * The ID of the terminal to display.
   */
  terminalId: TerminalId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. This metadata is scoped to the content reference. Omitted
   * and `null` are equivalent and mean no item metadata was provided.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future tool call content.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Receivers that do not understand this content type should preserve the
 * raw payload when storing, replaying, proxying, or forwarding tool call
 * output, and otherwise ignore it or display it generically.
 */
export interface Other7 {
  /**
   * Custom or future tool call content type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * A file location being accessed or modified by a tool.
 *
 * Enables clients to implement "follow-along" features that track
 * which files the agent is working with in real-time.
 *
 * See protocol docs: [Following the Agent](https://agentclientprotocol.com/protocol/v2/tool-calls#following-the-agent)
 */
export interface ToolCallLocation {
  /**
   * The absolute file path being accessed or modified.
   */
  path: AbsolutePath;
  /**
   * Optional line number within the file.
   */
  line?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Permission request details for a command.
 */
export interface CommandPermissionSubject {
  /**
   * The command that would be run if permission is granted.
   */
  command: string;
  /**
   * The absolute working directory for the command.
   */
  cwd: AbsolutePath;
  /**
   * The associated tool call, when known. Omitted and `null` are equivalent.
   */
  toolCallId?: ToolCallId | null;
  /**
   * The associated terminal, when already known. Omitted and `null` are equivalent.
   */
  terminalId?: TerminalId | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. Omitted and `null` are equivalent and mean no subject metadata was provided.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future permission subject.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Clients that do not understand this subject type should preserve the raw
 * payload when storing, replaying, proxying, or forwarding permission
 * requests, and otherwise display a generic permission prompt or decline it
 * according to policy.
 */
export interface Other8 {
  /**
   * Custom or future permission subject type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * An option presented to the user when requesting permission.
 */
export interface PermissionOption {
  /**
   * Unique identifier for this permission option.
   */
  optionId: PermissionOptionId;
  /**
   * Human-readable label to display to the user.
   */
  name: string;
  /**
   * Hint about the nature of this permission option.
   */
  kind: PermissionOptionKind;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Session-scoped elicitation, optionally tied to a specific tool call.
 *
 * When `tool_call_id` is set, the elicitation is tied to a specific tool call.
 * This is useful when an agent receives an elicitation from an MCP server
 * during a tool call and needs to redirect it to the user.
 */
export interface ElicitationSessionScope {
  /**
   * The session this elicitation is tied to.
   */
  sessionId: SessionId;
  /**
   * Optional tool call within the session.
   *
   * Optional. Omitted and `null` are equivalent and mean the elicitation is scoped to the
   * session without a specific tool call.
   */
  toolCallId?: ToolCallId | null;
}
/**
 * Request-scoped elicitation, tied to a specific JSON-RPC request outside of a session
 * (e.g., during auth/configuration phases before any session is started).
 */
export interface ElicitationRequestScope {
  /**
   * The request this elicitation is tied to.
   */
  requestId: RequestId;
}
/**
 * Type-safe elicitation schema for requesting structured user input.
 *
 * This represents a JSON Schema object with primitive-typed properties,
 * as required by the elicitation specification.
 */
export interface ElicitationSchema {
  /**
   * Type discriminator. Always `"object"`.
   */
  type?: ElicitationSchemaType & string;
  /**
   * Optional title for the schema.
   *
   * Optional. Omitted and `null` are equivalent and mean no title is provided.
   */
  title?: string | null;
  /**
   * Property definitions (must be primitive types).
   */
  properties?: {
    [k: string]: ElicitationPropertySchema;
  };
  /**
   * List of required property names.
   *
   * Optional. Omitted and `null` are equivalent and mean no property names are required.
   */
  required?: string[] | null;
  /**
   * Optional description of what this schema represents.
   *
   * Optional. Omitted and `null` are equivalent and mean no schema description is provided.
   */
  description?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Schema for string properties in an elicitation form.
 *
 * When `enum` or `oneOf` is set, this represents a single-select enum
 * with `"type": "string"`.
 */
export interface StringPropertySchema {
  /**
   * Optional title for the property.
   *
   * Optional. Omitted and `null` are equivalent and mean no title is provided.
   */
  title?: string | null;
  /**
   * Human-readable description.
   *
   * Optional. Omitted and `null` are equivalent and mean no description is provided.
   */
  description?: string | null;
  /**
   * Minimum string length.
   *
   * Optional. Omitted and `null` are equivalent and mean there is no minimum length constraint.
   */
  minLength?: number | null;
  /**
   * Maximum string length.
   *
   * Optional. Omitted and `null` are equivalent and mean there is no maximum length constraint.
   */
  maxLength?: number | null;
  /**
   * Pattern the string must match.
   *
   * Optional. Omitted and `null` are equivalent and mean there is no pattern constraint.
   */
  pattern?: string | null;
  /**
   * String format.
   *
   * Optional. Omitted and `null` are equivalent and mean there is no format constraint.
   */
  format?: StringFormat | null;
  /**
   * Default value.
   *
   * Optional. Omitted and `null` are equivalent and mean no default value is provided.
   */
  default?: string | null;
  /**
   * Enum values for untitled single-select enums.
   * Must contain at least one value when present.
   * Optional. Omitted and `null` are equivalent and mean no untitled single-select choices are
   * declared by `enum`.
   *
   * @minItems 1
   */
  enum?: [string, ...string[]] | null;
  /**
   * Titled enum options for titled single-select enums.
   * Must contain at least one option when present.
   * Optional. Omitted and `null` are equivalent and mean no titled single-select choices are
   * declared by `oneOf`.
   *
   * @minItems 1
   */
  oneOf?: [EnumOption, ...EnumOption[]] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A titled enum option with a const value, human-readable title, and optional description.
 */
export interface EnumOption {
  /**
   * The constant value for this option.
   */
  const: string;
  /**
   * Human-readable title for this option.
   */
  title: string;
  /**
   * Human-readable description.
   *
   * Optional. Omitted and `null` are equivalent and mean no description is provided.
   */
  description?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Schema for number (floating-point) properties in an elicitation form.
 */
export interface NumberPropertySchema {
  /**
   * Optional title for the property.
   *
   * Optional. Omitted and `null` are equivalent and mean no title is provided.
   */
  title?: string | null;
  /**
   * Human-readable description.
   *
   * Optional. Omitted and `null` are equivalent and mean no description is provided.
   */
  description?: string | null;
  /**
   * Minimum value (inclusive).
   *
   * Optional. Omitted and `null` are equivalent and mean there is no inclusive lower bound.
   */
  minimum?: number | null;
  /**
   * Maximum value (inclusive).
   *
   * Optional. Omitted and `null` are equivalent and mean there is no inclusive upper bound.
   */
  maximum?: number | null;
  /**
   * Default value.
   *
   * Optional. Omitted and `null` are equivalent and mean no default value is provided.
   */
  default?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Schema for integer properties in an elicitation form.
 */
export interface IntegerPropertySchema {
  /**
   * Optional title for the property.
   *
   * Optional. Omitted and `null` are equivalent and mean no title is provided.
   */
  title?: string | null;
  /**
   * Human-readable description.
   *
   * Optional. Omitted and `null` are equivalent and mean no description is provided.
   */
  description?: string | null;
  /**
   * Minimum value (inclusive).
   *
   * Optional. Omitted and `null` are equivalent and mean there is no inclusive lower bound.
   */
  minimum?: number | null;
  /**
   * Maximum value (inclusive).
   *
   * Optional. Omitted and `null` are equivalent and mean there is no inclusive upper bound.
   */
  maximum?: number | null;
  /**
   * Default value.
   *
   * Optional. Omitted and `null` are equivalent and mean no default value is provided.
   */
  default?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Schema for boolean properties in an elicitation form.
 */
export interface BooleanPropertySchema {
  /**
   * Optional title for the property.
   *
   * Optional. Omitted and `null` are equivalent and mean no title is provided.
   */
  title?: string | null;
  /**
   * Human-readable description.
   *
   * Optional. Omitted and `null` are equivalent and mean no description is provided.
   */
  description?: string | null;
  /**
   * Default value.
   *
   * Optional. Omitted and `null` are equivalent and mean no default value is provided.
   */
  default?: boolean | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Schema for multi-select (array) properties in an elicitation form.
 */
export interface MultiSelectPropertySchema {
  /**
   * Optional title for the property.
   *
   * Optional. Omitted and `null` are equivalent and mean no title is provided.
   */
  title?: string | null;
  /**
   * Human-readable description.
   *
   * Optional. Omitted and `null` are equivalent and mean no description is provided.
   */
  description?: string | null;
  /**
   * Minimum number of items to select.
   *
   * Optional. Omitted and `null` are equivalent and mean there is no minimum selection count.
   */
  minItems?: number | null;
  /**
   * Maximum number of items to select.
   *
   * Optional. Omitted and `null` are equivalent and mean there is no maximum selection count.
   */
  maxItems?: number | null;
  /**
   * The items definition describing allowed values.
   */
  items: MultiSelectItems;
  /**
   * Default selected values.
   *
   * Optional. Omitted and `null` are equivalent and mean no default selections are provided.
   */
  default?: string[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * String item schema for multi-select enum properties.
 */
export interface StringMultiSelectItems {
  /**
   * Allowed enum values. Must contain at least one value.
   *
   * @minItems 1
   */
  enum: [string, ...string[]];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future typed multi-select items.
 */
export interface Other11 {
  /**
   * Custom or future multi-select item type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * Items definition for titled multi-select enum properties.
 */
export interface TitledMultiSelectItems {
  /**
   * Titled enum options. Must contain at least one option.
   *
   * @minItems 1
   */
  anyOf: [EnumOption, ...EnumOption[]];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future elicitation property schema.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Clients that do not understand this property schema type should preserve
 * the raw schema when storing, replaying, proxying, or forwarding
 * elicitation requests. They MUST NOT render it as a known input control.
 */
export interface Other12 {
  /**
   * Custom or future elicitation property schema type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * Allows for sending an arbitrary request that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
 */
export interface ExtRequest {
  [k: string]: unknown;
}
/**
 * A successful JSON-RPC response.
 */
export interface Result {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific response data.
   */
  result:
    | InitializeResponse
    | LoginAuthResponse
    | LogoutAuthResponse
    | NewSessionResponse
    | ListSessionsResponse
    | DeleteSessionResponse
    | ResumeSessionResponse
    | CloseSessionResponse
    | SetSessionConfigOptionResponse
    | PromptResponse
    | ExtMethodResponse;
}
/**
 * Response to the `initialize` method.
 *
 * Contains the negotiated protocol version and agent capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/v2/initialization)
 */
export interface InitializeResponse1 {
  /**
   * The protocol version the client specified if supported by the agent,
   * or the latest protocol version supported by the agent.
   *
   * The client should disconnect, if it doesn't support this version.
   */
  protocolVersion: ProtocolVersion;
  /**
   * Information about the implementation sending this initialize response.
   */
  info: Implementation;
  /**
   * Capabilities supported by the agent.
   */
  capabilities?: AgentCapabilities;
  /**
   * Authentication methods supported by the agent.
   *
   * Optional. Omitted or empty means the agent does not advertise the
   * authentication method surface. Supplying one or more valid methods means
   * the agent MUST support both `auth/login` and `auth/logout`.
   */
  authMethods?: AuthMethod[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Metadata about the implementation of the client or agent.
 * Describes the name and version of an ACP implementation, with an optional
 * title for UI representation.
 */
export interface Implementation {
  /**
   * Intended for programmatic or logical use, but can be used as a display
   * name fallback if title isn’t present.
   */
  name: string;
  /**
   * Intended for UI and end-user contexts — optimized to be human-readable
   * and easily understood.
   *
   * If not provided, the name should be used for display.
   */
  title?: string | null;
  /**
   * Version of the implementation. Can be displayed to the user or used
   * for debugging or metrics purposes. (e.g. "1.0.0").
   */
  version: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities supported by the agent.
 *
 * Advertised during initialization to inform the client about
 * available features and content types.
 *
 * See protocol docs: [Agent Capabilities](https://agentclientprotocol.com/protocol/v2/initialization#agent-capabilities)
 */
export interface AgentCapabilities {
  /**
   * Session capabilities supported by the agent.
   *
   * Optional. Omitted or `null` both mean the agent does not support the
   * `session/*` method surface. Supplying `{}` means the agent supports the
   * baseline session methods: `session/new`, `session/prompt`,
   * `session/cancel`, and `session/update`.
   */
  session?: SessionCapabilities | null;
  /**
   * Authentication-related extension capabilities supported by the agent.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise any
   * authentication-related extensions. This field does not advertise support
   * for `auth/login` or `auth/logout`; those methods are advertised by a
   * non-empty `authMethods` list in the `initialize` response.
   */
  auth?: AgentAuthCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Session capabilities supported by the agent.
 *
 * Supplying `{}` means the agent supports the baseline session methods:
 * `session/new`, `session/list`, `session/resume`, `session/close`,
 * `session/prompt`, `session/cancel`, and `session/update`.
 *
 * Agents that support sessions **MAY** support additional session methods,
 * prompt content types, and MCP transports by specifying additional
 * capabilities.
 *
 * See protocol docs: [Session Capabilities](https://agentclientprotocol.com/protocol/v2/initialization#session-capabilities)
 */
export interface SessionCapabilities {
  /**
   * Prompt capabilities supported by the agent in `session/prompt` requests.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise any
   * prompt extensions beyond the baseline text and resource-link content
   * required by `session/prompt`.
   */
  prompt?: PromptCapabilities | null;
  /**
   * MCP capabilities supported by the agent for session lifecycle requests.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise MCP
   * server transport support for sessions.
   */
  mcp?: McpCapabilities | null;
  /**
   * Whether the agent supports `session/delete`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports deleting sessions from `session/list`.
   */
  delete?: SessionDeleteCapabilities | null;
  /**
   * Whether the agent supports `additionalDirectories` on supported session lifecycle requests.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports `additionalDirectories` on
   * supported session lifecycle requests.
   *
   * Agents may return `SessionInfo.additionalDirectories` to report the
   * complete ordered additional-root list associated with a listed session.
   */
  additionalDirectories?: SessionAdditionalDirectoriesCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Prompt capabilities supported by the agent in `session/prompt` requests.
 *
 * Baseline agent functionality requires support for [`ContentBlock::Text`]
 * and [`ContentBlock::ResourceLink`] in prompt requests.
 *
 * Other variants must be explicitly opted in to.
 * Capabilities for different types of content in prompt requests.
 *
 * Indicates which content types beyond the baseline (text and resource links)
 * the agent can process.
 *
 * See protocol docs: [Prompt Capabilities](https://agentclientprotocol.com/protocol/v2/initialization#prompt-capabilities)
 */
export interface PromptCapabilities {
  /**
   * Agent supports [`ContentBlock::Image`].
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports image content in prompts.
   */
  image?: PromptImageCapabilities | null;
  /**
   * Agent supports [`ContentBlock::Audio`].
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports audio content in prompts.
   */
  audio?: PromptAudioCapabilities | null;
  /**
   * Agent supports embedded context in `session/prompt` requests.
   *
   * When enabled, the Client is allowed to include [`ContentBlock::Resource`]
   * in prompt requests for pieces of context that are referenced in the message.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports embedded context in prompts.
   */
  embeddedContext?: PromptEmbeddedContextCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for image content in prompt requests.
 *
 * Supplying `{}` means the agent supports image content in prompts.
 */
export interface PromptImageCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for audio content in prompt requests.
 *
 * Supplying `{}` means the agent supports audio content in prompts.
 */
export interface PromptAudioCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for embedded context in prompt requests.
 *
 * Supplying `{}` means the agent supports embedded context in prompts.
 */
export interface PromptEmbeddedContextCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * MCP capabilities supported by the agent for session lifecycle requests.
 */
export interface McpCapabilities {
  /**
   * Agent supports [`McpServer::Stdio`].
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports stdio MCP server transports.
   */
  stdio?: McpStdioCapabilities | null;
  /**
   * Agent supports [`McpServer::Http`].
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports HTTP MCP server transports.
   */
  http?: McpHttpCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for stdio MCP server transports.
 *
 * Supplying `{}` means the agent supports stdio MCP server transports.
 */
export interface McpStdioCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for HTTP MCP server transports.
 *
 * Supplying `{}` means the agent supports HTTP MCP server transports.
 */
export interface McpHttpCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for the `session/delete` method.
 *
 * Supplying `{}` means the agent supports deleting sessions from `session/list`.
 */
export interface SessionDeleteCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for additional session directories support.
 *
 * Supplying `{}` means the agent supports the `additionalDirectories` field on
 * supported session lifecycle requests. Agents that also support
 * `session/list` may return `SessionInfo.additionalDirectories` to report the
 * complete ordered additional-root list associated with a listed session.
 */
export interface SessionAdditionalDirectoriesCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Authentication-related extension capabilities supported by the agent.
 *
 * This object does not advertise support for `auth/login` or `auth/logout`.
 * Those methods are advertised by a non-empty `authMethods` list in the
 * `initialize` response.
 */
export interface AgentAuthCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Agent handles authentication itself.
 *
 * The `type` discriminator value is `agent`.
 */
export interface AuthMethodAgent {
  /**
   * Unique identifier for this authentication method.
   */
  methodId: AuthMethodId;
  /**
   * Human-readable name of the authentication method.
   */
  name: string;
  /**
   * Optional description providing more details about this authentication method.
   */
  description?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future authentication method.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Clients that do not understand this method type should preserve the raw
 * payload when storing, replaying, proxying, or forwarding initialization
 * data, and otherwise ignore the method or display it generically.
 */
export interface Other14 {
  /**
   * Custom or future authentication method type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  /**
   * Unique identifier for this authentication method.
   */
  methodId: AuthMethodId;
  /**
   * Human-readable name of the authentication method.
   */
  name: string;
  /**
   * Optional description providing more details about this authentication method.
   */
  description?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * Response to the `auth/login` method.
 */
export interface LoginAuthResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to the `auth/logout` method.
 */
export interface LogoutAuthResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/v2/session-setup#creating-a-session)
 */
export interface NewSessionResponse1 {
  /**
   * Unique identifier for the created session.
   *
   * Used in all subsequent requests for this conversation.
   */
  sessionId: SessionId;
  /**
   * Initial session configuration options.
   */
  configOptions?: SessionConfigOption[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A single-value selector (dropdown) session configuration option payload.
 */
export interface SessionConfigSelect {
  /**
   * The currently selected value.
   */
  currentValue: SessionConfigValueId;
  /**
   * The set of selectable options.
   */
  options: SessionConfigSelectOptions;
}
/**
 * A possible value for a session configuration option.
 */
export interface SessionConfigSelectOption {
  /**
   * Unique identifier for this option value.
   */
  value: SessionConfigValueId;
  /**
   * Human-readable label for this option value.
   */
  name: string;
  /**
   * Optional description for this option value.
   */
  description?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A group of possible values for a session configuration option.
 */
export interface SessionConfigSelectGroup {
  /**
   * Unique identifier for this group.
   */
  groupId: SessionConfigGroupId;
  /**
   * Human-readable label for this group.
   */
  name: string;
  /**
   * The set of option values in this group.
   */
  options: SessionConfigSelectOption[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A boolean on/off toggle session configuration option payload.
 */
export interface SessionConfigBoolean {
  /**
   * The current value of the boolean option.
   */
  currentValue: boolean;
}
/**
 * Custom or future session configuration option payload.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Clients that do not understand this option type should preserve the raw
 * payload when storing, replaying, proxying, or forwarding configuration
 * data, and otherwise ignore the option or display it generically.
 */
export interface Other15 {
  /**
   * Custom or future session configuration option type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * Response from listing sessions.
 */
export interface ListSessionsResponse1 {
  /**
   * Array of session information objects.
   */
  sessions: SessionInfo[];
  /**
   * Opaque cursor token. If present, pass this in the next request's cursor parameter
   * to fetch the next page. If absent, there are no more results.
   */
  nextCursor?: SessionListCursor | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Information about a session returned by session/list
 */
export interface SessionInfo {
  /**
   * Unique identifier for the session
   */
  sessionId: SessionId;
  /**
   * The working directory for this session. Must be an absolute path.
   */
  cwd: AbsolutePath;
  /**
   * Additional workspace roots reported for this session. Each path must be absolute.
   *
   * When present, this is the complete ordered additional-root list reported
   * by the Agent. Omitted and empty values are equivalent: the response
   * reports no additional roots.
   */
  additionalDirectories?: AbsolutePath[];
  /**
   * Human-readable title for the session
   */
  title?: string | null;
  /**
   * RFC 3339 timestamp of last activity.
   */
  updatedAt?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from deleting a session.
 */
export interface DeleteSessionResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from resuming an existing session.
 */
export interface ResumeSessionResponse1 {
  /**
   * Initial session configuration options.
   */
  configOptions?: SessionConfigOption[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from closing a session.
 */
export interface CloseSessionResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to `session/set_config_option` method.
 */
export interface SetSessionConfigOptionResponse1 {
  /**
   * The full set of configuration options and their current values.
   */
  configOptions: SessionConfigOption[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response acknowledging that a user prompt was accepted.
 *
 * This response does not indicate that the agent has finished processing.
 * Processing and completion are reported through `state_update` session updates.
 *
 * See protocol docs: [Prompt Accepted](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#2-prompt-accepted)
 */
export interface PromptResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Allows for sending an arbitrary response to an [`ExtRequest`] that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
 */
export interface ExtResponse {
  [k: string]: unknown;
}
/**
 * A failed JSON-RPC response.
 */
export interface Error {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific error data.
   */
  error: Error1;
}
/**
 * JSON-RPC error object.
 *
 * Represents an error that occurred during method execution, following the
 * JSON-RPC 2.0 error object specification with optional additional data.
 *
 * See protocol docs: [JSON-RPC Error Object](https://www.jsonrpc.org/specification#error_object)
 */
export interface Error1 {
  /**
   * A number indicating the error type that occurred.
   * This must be an integer as defined in the JSON-RPC specification.
   */
  code: ErrorCode;
  /**
   * A string providing a short description of the error.
   * The message should be limited to a concise single sentence.
   */
  message: string;
  /**
   * Optional primitive or structured value that contains additional information about the error.
   * This may include debugging information or context-specific details.
   */
  data?: {
    [k: string]: unknown;
  };
}
/**
 * A JSON-RPC notification object.
 */
export interface AgentNotification {
  /**
   * The notification method name.
   */
  method: string;
  /**
   * Method-specific notification parameters.
   */
  params?:
    | (
        | UpdateSessionNotification
        | CompleteElicitationNotification
        | ExtNotification
      )
    | null;
}
/**
 * Notification containing a session update from the agent.
 *
 * Agents can send session updates at any point while the session exists.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#3-agent-reports-output)
 */
export interface UpdateSessionNotification1 {
  /**
   * The ID of the session this update pertains to.
   */
  sessionId: SessionId;
  /**
   * The actual update content.
   */
  update: SessionUpdate;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A streamed item of message content.
 */
export interface ContentChunk {
  /**
   * A unique identifier for the message this chunk belongs to.
   *
   * All chunks belonging to the same message share the same `messageId`.
   * A change in `messageId` indicates a new message has started.
   */
  messageId: MessageId;
  /**
   * A single item of content
   */
  content: ContentBlock;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. This field is chunk-scoped.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A user message upsert.
 *
 * Only [`UserMessage::message_id`] is required. `content` has patch semantics:
 * an omitted field leaves existing message content unchanged, `null` clears the
 * value, and a concrete array replaces the previous value. For a new
 * `messageId`, omitted fields use client defaults. `content` is replaced as a
 * whole array; send `[]` or `null` to clear it.
 *
 * Message updates and chunks are applied in the order they are received. When
 * a `user_message` update includes `content`, that array replaces any content
 * previously accumulated for the message, including content from earlier
 * chunks. Later chunks with the same `messageId` append to the current
 * content.
 */
export interface UserMessage {
  /**
   * A unique identifier for the message.
   */
  messageId: MessageId;
  /**
   * Complete replacement content for this message.
   * Malformed present values are rejected so they cannot be mistaken for an omitted patch.
   */
  content?: ContentBlock[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. Omitted means no metadata update; `null` is an explicit clear signal.
   * Malformed extension metadata remains lenient by design because `_meta`
   * is advisory, not authoritative message state.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An agent message upsert.
 *
 * Only [`AgentMessage::message_id`] is required. `content` has patch semantics:
 * an omitted field leaves existing message content unchanged, `null` clears the
 * value, and a concrete array replaces the previous value. For a new
 * `messageId`, omitted fields use client defaults. `content` is replaced as a
 * whole array; send `[]` or `null` to clear it.
 *
 * Message updates and chunks are applied in the order they are received. When
 * an `agent_message` update includes `content`, that array replaces any
 * content previously accumulated for the message, including content from
 * earlier chunks. Later chunks with the same `messageId` append to the current
 * content.
 */
export interface AgentMessage {
  /**
   * A unique identifier for the message.
   */
  messageId: MessageId;
  /**
   * Complete replacement content for this message.
   * Malformed present values are rejected so they cannot be mistaken for an omitted patch.
   */
  content?: ContentBlock[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. Omitted means no metadata update; `null` is an explicit clear signal.
   * Malformed extension metadata remains lenient by design because `_meta`
   * is advisory, not authoritative message state.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An agent thought or reasoning message upsert.
 *
 * Only [`AgentThought::message_id`] is required. `content` has patch semantics:
 * an omitted field leaves existing thought content unchanged, `null` clears the
 * value, and a concrete array replaces the previous value. For a new
 * `messageId`, omitted fields use client defaults. `content` is replaced as a
 * whole array; send `[]` or `null` to clear it.
 *
 * Message updates and chunks are applied in the order they are received. When
 * an `agent_thought` update includes `content`, that array replaces any
 * content previously accumulated for the thought, including content from
 * earlier chunks. Later chunks with the same `messageId` append to the current
 * content.
 */
export interface AgentThought {
  /**
   * A unique identifier for the thought message.
   */
  messageId: MessageId;
  /**
   * Complete replacement content for this thought message.
   * Malformed present values are rejected so they cannot be mistaken for an omitted patch.
   */
  content?: ContentBlock[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. Omitted means no metadata update; `null` is an explicit clear signal.
   * Malformed extension metadata remains lenient by design because `_meta`
   * is advisory, not authoritative message state.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Foreground work is in progress.
 */
export interface RunningStateUpdate {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * The agent is ready to process a new prompt.
 */
export interface IdleStateUpdate {
  /**
   * Indicates why foreground work stopped.
   *
   * Optional. Omitted or `null` both mean the agent is not reporting a stop reason.
   * Agents SHOULD include this when the idle transition ends foreground work.
   */
  stopReason?: StopReason | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Foreground work is blocked on user action.
 */
export interface RequiresActionStateUpdate {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future session state.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export interface Other19 {
  /**
   * Custom or future session state.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  state: string;
  [k: string]: unknown;
}
/**
 * A streamed item of tool-call content.
 *
 * Tool-call content chunks append one [`ToolCallContent`] item to the current
 * content for the matching [`ToolCallId`]. Agents can use
 * [`ToolCallUpdate::content`] when they need to replace the whole content
 * collection instead.
 */
export interface ToolCallContentChunk {
  /**
   * The ID of the tool call this content belongs to.
   */
  toolCallId: ToolCallId;
  /**
   * A single item of content produced by the tool call.
   */
  content: ToolCallContent;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. This field is chunk-scoped.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An upsert for the stored state of an agent-owned terminal.
 *
 * Only [`TerminalUpdate::terminal_id`] is required. Other fields have patch
 * semantics: omitted fields leave the stored value unchanged, `null` clears
 * it, and concrete values replace it. When the terminal ID is new, omitted
 * fields start unknown.
 */
export interface TerminalUpdate {
  /**
   * Unique identifier for this terminal within the session.
   */
  terminalId: TerminalId;
  /**
   * The command being run.
   */
  command?: string | null;
  /**
   * The absolute working directory of the command.
   */
  cwd?: AbsolutePath | null;
  /**
   * An authoritative replacement snapshot of terminal output bytes.
   */
  output?: TerminalOutput | null;
  /**
   * Exit information. A concrete object marks the terminal as exited.
   */
  exitStatus?: TerminalExitStatus | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Omitted means no metadata update; `null` is an
   * explicit clear signal. Implementations MUST NOT make assumptions about values at these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An authoritative replacement snapshot of terminal output bytes.
 */
export interface TerminalOutput {
  /**
   * Base64-encoded replacement terminal output bytes.
   */
  data: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. This metadata is scoped to the replacement snapshot. Omitted
   * and `null` are equivalent and mean no snapshot metadata was provided.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Exit information for an agent-owned terminal.
 *
 * The presence of this object marks the terminal as exited, even when neither
 * an exit code nor a signal is known.
 */
export interface TerminalExitStatus {
  /**
   * Process exit code, when known. Omitted and `null` are equivalent.
   */
  exitCode?: number | null;
  /**
   * Signal that terminated the process, when known.
   *
   * Agents should use the conventional platform signal name. POSIX examples
   * include `SIGTERM`, `SIGKILL`, and `SIGINT`. Other platforms may use a
   * platform-specific name. Omitted and `null` are equivalent.
   */
  signal?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. This metadata is scoped to the exit information. Omitted
   * and `null` are equivalent and mean no exit metadata was provided.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A chunk of bytes appended to an agent-owned terminal's output.
 */
export interface TerminalOutputChunk {
  /**
   * The terminal receiving these bytes.
   */
  terminalId: TerminalId;
  /**
   * Independently base64-encoded terminal output bytes.
   */
  data: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys. This field is chunk-scoped. Omitted and `null` are
   * equivalent and mean no chunk metadata was provided.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A content update for a plan identified by ID.
 */
export interface PlanUpdate {
  /**
   * The updated plan content.
   */
  plan: PlanUpdateContent;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A plan represented as structured entries.
 */
export interface PlanItems {
  /**
   * The plan ID to update.
   */
  planId: PlanId;
  /**
   * The list of tasks to be accomplished.
   *
   * When updating an item-based plan, the agent must send a complete list of all entries
   * with their current status. The client replaces that plan with each update.
   */
  entries: PlanEntry[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A single entry in the execution plan.
 *
 * Represents a task or goal that the assistant intends to accomplish
 * as part of fulfilling the user's request.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/v2/agent-plan#plan-entries)
 */
export interface PlanEntry {
  /**
   * Human-readable description of what this task aims to accomplish.
   */
  content: string;
  /**
   * The relative importance of this task.
   * Used to indicate which tasks are most critical to the overall goal.
   */
  priority: PlanEntryPriority;
  /**
   * Current execution status of this task.
   */
  status: PlanEntryStatus;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future plan update content.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Receivers that do not understand this content type should preserve the
 * raw payload when storing, replaying, proxying, or forwarding plans, and
 * otherwise ignore it or display it generically.
 */
export interface Other22 {
  /**
   * Custom or future plan update content type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  /**
   * The plan ID to update.
   */
  planId: PlanId;
  [k: string]: unknown;
}
/**
 * Available commands are ready or have changed
 */
export interface AvailableCommandsUpdate {
  /**
   * Commands the agent can execute.
   */
  availableCommands: AvailableCommand[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Information about a command.
 */
export interface AvailableCommand {
  /**
   * Command name (e.g., `create_plan`, `research_codebase`).
   */
  name: string;
  /**
   * Human-readable description of what the command does.
   */
  description: string;
  /**
   * Input for the command if required
   */
  input?: AvailableCommandInput | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * All text that was typed after the command name is provided as input.
 */
export interface TextCommandInput {
  /**
   * A hint to display when the input hasn't been provided yet
   */
  hint: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future command input specification.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Clients that do not understand this input type should preserve the raw
 * payload when storing, replaying, proxying, or forwarding command
 * metadata, and otherwise ignore the input specification or display the
 * command without structured input.
 */
export interface Other23 {
  /**
   * Custom or future command input type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * Session configuration options have been updated.
 */
export interface ConfigOptionUpdate {
  /**
   * The full set of configuration options and their current values.
   */
  configOptions: SessionConfigOption[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Update to session metadata. All fields are optional to support partial updates.
 *
 * Agents send this notification to update session information like title or custom metadata.
 * This allows clients to display dynamic session names and track session state changes.
 *
 * Omitted fields leave the existing session info unchanged. `null` clears the
 * corresponding value.
 */
export interface SessionInfoUpdate {
  /**
   * Human-readable title for the session. Set to null to clear.
   */
  title?: string | null;
  /**
   * RFC 3339 timestamp of last activity. Set to null to clear.
   */
  updatedAt?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Omitted means no metadata update; `null` is an
   * explicit clear signal. Implementations MUST NOT make assumptions about values at these keys.
   * Malformed extension metadata remains lenient by design because `_meta`
   * is advisory, not authoritative session state.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Context window and cost update for a session.
 */
export interface UsageUpdate {
  /**
   * Tokens currently in context.
   */
  used: number;
  /**
   * Total context window size in tokens.
   */
  size: number;
  /**
   * Cumulative session cost (optional).
   */
  cost?: Cost | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Cost information for a session.
 */
export interface Cost {
  /**
   * Total cumulative cost for session.
   */
  amount: number;
  /**
   * ISO 4217 currency code (e.g., "USD", "EUR").
   */
  currency: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future session update.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Receivers that do not understand this update type should preserve the
 * raw payload when storing, replaying, proxying, or forwarding session
 * history, and otherwise ignore it or display it generically.
 */
export interface Other24 {
  /**
   * Custom or future session update type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  sessionUpdate: string;
  [k: string]: unknown;
}
/**
 * Notification sent by the agent when a URL-based elicitation is complete.
 */
export interface CompleteElicitationNotification1 {
  /**
   * The ID of the elicitation that completed.
   */
  elicitationId: ElicitationId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
 * Extension notifications provide a way to send one-way messages for custom functionality
 * while maintaining protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
 */
export interface ExtNotification1 {
  [k: string]: unknown;
}
/**
 * A JSON-RPC request object.
 */
export interface ClientRequest {
  /**
   * The request id used to correlate the matching response.
   */
  id: RequestId;
  /**
   * The method name to invoke.
   */
  method: string;
  /**
   * Method-specific request parameters.
   */
  params?:
    | (
        | InitializeRequest
        | LoginAuthRequest
        | LogoutAuthRequest
        | NewSessionRequest
        | ListSessionsRequest
        | DeleteSessionRequest
        | ResumeSessionRequest
        | CloseSessionRequest
        | SetSessionConfigOptionRequest
        | PromptRequest
        | ExtMethodRequest1
      )
    | null;
}
/**
 * Request parameters for the initialize method.
 *
 * Sent by the client to establish connection and negotiate capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/v2/initialization)
 */
export interface InitializeRequest1 {
  /**
   * The latest protocol version supported by the client.
   */
  protocolVersion: ProtocolVersion;
  /**
   * Information about the implementation sending this initialize request.
   */
  info: Implementation;
  /**
   * Capabilities supported by the client.
   */
  capabilities?: ClientCapabilities;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities supported by the client.
 *
 * Advertised during initialization to inform the agent about
 * available features and methods.
 *
 * See protocol docs: [Client Capabilities](https://agentclientprotocol.com/protocol/v2/initialization#client-capabilities)
 */
export interface ClientCapabilities {
  /**
   * Elicitation capabilities supported by the client.
   * Determines which elicitation modes the agent may use.
   *
   * Optional. Omitted or `null` both mean the client does not advertise
   * elicitation support.
   */
  elicitation?: ElicitationCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Elicitation capabilities supported by the client.
 */
export interface ElicitationCapabilities {
  /**
   * Whether the client supports form-based elicitation.
   *
   * Optional. Omitted and `null` are equivalent and mean form support is not advertised.
   * Supplying `{}` explicitly advertises form support.
   */
  form?: ElicitationFormCapabilities | null;
  /**
   * Whether the client supports URL-based elicitation.
   *
   * Optional. Omitted or `null` both mean the client does not advertise support.
   * Supplying `{}` means the client supports URL-based elicitation.
   */
  url?: ElicitationUrlCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Form-based elicitation capabilities.
 *
 * Supplying `{}` means the client supports form-based elicitation.
 */
export interface ElicitationFormCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * URL-based elicitation capabilities.
 *
 * Supplying `{}` means the client supports URL-based elicitation.
 */
export interface ElicitationUrlCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for the `auth/login` method.
 *
 * Specifies which authentication method to use.
 *
 * Agents MUST support this method when their `initialize` response advertised
 * at least one valid authentication method. Clients MUST NOT call this method
 * when `authMethods` was omitted or empty.
 */
export interface LoginAuthRequest1 {
  /**
   * The ID of the authentication method to use.
   * Must be one of the methods advertised in the initialize response.
   */
  methodId: AuthMethodId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for the `auth/logout` method.
 *
 * Terminates the current authenticated session.
 *
 * Agents MUST support this method when their `initialize` response advertised
 * at least one valid authentication method. Clients MUST NOT call this method
 * when `authMethods` was omitted or empty.
 */
export interface LogoutAuthRequest1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/v2/session-setup#creating-a-session)
 */
export interface NewSessionRequest1 {
  /**
   * The working directory for this session. Must be an absolute path.
   */
  cwd: AbsolutePath;
  /**
   * Additional workspace roots for this session. Each path must be absolute.
   *
   * These expand the session's workspace scope without changing `cwd`, which
   * remains the base for relative paths. When omitted or empty, no
   * additional roots are activated for the new session.
   */
  additionalDirectories?: AbsolutePath[];
  /**
   * List of MCP (Model Context Protocol) servers the agent should connect to.
   */
  mcpServers?: McpServer[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * HTTP transport configuration for MCP.
 */
export interface McpServerHttp {
  /**
   * Human-readable name identifying this MCP server.
   */
  name: string;
  /**
   * URL to the MCP server.
   */
  url: string;
  /**
   * HTTP headers to set when making requests to the MCP server.
   */
  headers?: HttpHeader[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An HTTP header to set when making requests to the MCP server.
 */
export interface HttpHeader {
  /**
   * The name of the HTTP header.
   */
  name: string;
  /**
   * The value to set for the HTTP header.
   */
  value: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Stdio transport configuration for MCP.
 */
export interface McpServerStdio {
  /**
   * Human-readable name identifying this MCP server.
   */
  name: string;
  /**
   * Absolute path to the MCP server executable.
   */
  command: AbsolutePath;
  /**
   * Command-line arguments to pass to the MCP server.
   */
  args?: string[];
  /**
   * Environment variables to set when launching the MCP server.
   */
  env?: EnvVariable[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An environment variable to set when launching an MCP server.
 */
export interface EnvVariable {
  /**
   * The name of the environment variable.
   */
  name: string;
  /**
   * The value to set for the environment variable.
   */
  value: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future MCP server transport configuration.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Receivers that do not understand this transport should preserve the raw
 * payload when storing, replaying, proxying, or forwarding session setup
 * data, and otherwise ignore it or reject the server configuration.
 */
export interface Other25 {
  /**
   * Custom or future MCP server transport type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  [k: string]: unknown;
}
/**
 * Request parameters for listing existing sessions.
 */
export interface ListSessionsRequest1 {
  /**
   * Filter sessions by working directory. Must be an absolute path.
   */
  cwd?: AbsolutePath | null;
  /**
   * Opaque cursor token from a previous response's nextCursor field for cursor-based pagination
   */
  cursor?: SessionListCursor | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for deleting an existing session from `session/list`.
 *
 * Only available if the Agent supports the `session.delete` capability.
 */
export interface DeleteSessionRequest1 {
  /**
   * The ID of the session to delete.
   */
  sessionId: SessionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for resuming an existing session.
 *
 * Resumes an existing session and optionally replays prior conversation
 * history according to `replayFrom`.
 */
export interface ResumeSessionRequest1 {
  /**
   * The ID of the session to resume.
   */
  sessionId: SessionId;
  /**
   * The working directory for this session. Must be an absolute path.
   */
  cwd: AbsolutePath;
  /**
   * Additional workspace roots to activate for this session. Each path must be absolute.
   *
   * When omitted or empty, no additional roots are activated. When non-empty,
   * this is the complete resulting additional-root list for the resumed
   * session. It may differ from any previously used or reported list as long as
   * the request `cwd` matches the session's `cwd`.
   */
  additionalDirectories?: AbsolutePath[];
  /**
   * List of MCP servers to connect to for this session.
   */
  mcpServers?: McpServer[];
  /**
   * Inclusive cursor describing where conversation replay should begin.
   *
   * Optional. Omitted or `null` both mean the Agent should resume without
   * replaying previous conversation history. Replay cursors are inclusive:
   * replay includes the position identified by the cursor. Supplying
   * `{ "type": "start" }` means the Agent should replay the whole
   * conversation before responding.
   */
  replayFrom?: ReplayFrom | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Inclusive replay cursor requesting replay from the start of the conversation.
 */
export interface ReplayFromStart {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future replay cursor.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Receivers that do not understand this cursor should preserve the raw
 * payload when storing, replaying, proxying, or forwarding requests, and
 * otherwise reject the request rather than guessing where to replay from.
 */
export interface Other26 {
  /**
   * Custom or future replay cursor type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
}
/**
 * Request parameters for closing an active session.
 *
 * The agent **must** cancel any ongoing work related to the session (treat it
 * as if `session/cancel` was called) and then free up any resources associated
 * with the session.
 */
export interface CloseSessionRequest1 {
  /**
   * The ID of the session to close.
   */
  sessionId: SessionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future session configuration option value payload.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 */
export interface Other27 {
  /**
   * Custom or future session configuration option value type.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  type: string;
  /**
   * Raw value payload for the custom or future value type.
   */
  value: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Request parameters for sending a user prompt to the agent.
 *
 * Contains the user's message and any additional context.
 *
 * See protocol docs: [User Message](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#1-user-message)
 */
export interface PromptRequest1 {
  /**
   * The ID of the session to send this user message to
   */
  sessionId: SessionId;
  /**
   * The blocks of content that compose the user's message.
   *
   * As a baseline, the Agent MUST support [`ContentBlock::Text`] and [`ContentBlock::ResourceLink`],
   * while other variants are optionally enabled via [`PromptCapabilities`].
   *
   * The Client MUST adapt its interface according to [`PromptCapabilities`].
   *
   * The client MAY include referenced pieces of context as either
   * [`ContentBlock::Resource`] or [`ContentBlock::ResourceLink`].
   *
   * When available, [`ContentBlock::Resource`] is preferred
   * as it avoids extra round-trips and allows the message to include
   * pieces of context from sources the agent may not have access to.
   */
  prompt: ContentBlock[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A successful JSON-RPC response.
 */
export interface Result1 {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific response data.
   */
  result:
    RequestPermissionResponse | CreateElicitationResponse | ExtMethodResponse1;
}
/**
 * Response to a permission request.
 */
export interface RequestPermissionResponse1 {
  /**
   * The user's decision on the permission request.
   */
  outcome: RequestPermissionOutcome;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * The user selected one of the provided options.
 */
export interface SelectedPermissionOutcome {
  /**
   * The ID of the option the user selected.
   */
  optionId: PermissionOptionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future permission outcome.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Agents that do not understand this outcome MUST NOT treat it as approval.
 * They should preserve the raw payload when storing, replaying, proxying, or
 * forwarding permission responses, and otherwise fail or decline the
 * permission request according to policy.
 */
export interface Other28 {
  /**
   * Custom or future permission outcome.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  outcome: string;
  [k: string]: unknown;
}
/**
 * The user accepted the elicitation and provided content.
 */
export interface ElicitationAcceptAction {
  /**
   * The user-provided content, if any, as an object matching the requested schema.
   */
  content?: {
    [k: string]: ElicitationContentValue;
  } | null;
}
/**
 * Custom or future elicitation action.
 *
 * Values beginning with `_` are reserved for implementation-specific
 * extensions. Unknown values that do not begin with `_` are reserved for
 * future ACP variants.
 *
 * Agents that do not understand this action should preserve the raw
 * payload when storing, replaying, proxying, or forwarding elicitation
 * responses. They MUST NOT treat it as a known elicitation action.
 */
export interface Other29 {
  /**
   * Custom or future elicitation action.
   *
   * Values beginning with `_` are reserved for implementation-specific
   * extensions. Unknown values that do not begin with `_` are reserved for
   * future ACP variants.
   */
  action: string;
  [k: string]: unknown;
}
/**
 * A failed JSON-RPC response.
 */
export interface Error2 {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific error data.
   */
  error: Error1;
}
/**
 * A JSON-RPC notification object.
 */
export interface ClientNotification {
  /**
   * The notification method name.
   */
  method: string;
  /**
   * Method-specific notification parameters.
   */
  params?: (CancelSessionNotification | ExtNotification2) | null;
}
/**
 * Notification to cancel ongoing operations for a session.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/v2/prompt-lifecycle#cancellation)
 */
export interface CancelSessionNotification1 {
  /**
   * The ID of the session to cancel operations for.
   */
  sessionId: SessionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A JSON-RPC notification object.
 */
export interface ProtocolLevelNotification1 {
  /**
   * The notification method name.
   */
  method: string;
  /**
   * Method-specific notification parameters.
   */
  params?: CancelRequestNotification | null;
}
/**
 * Notification to cancel an ongoing request.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/v2/cancellation)
 */
export interface CancelRequestNotification1 {
  /**
   * The ID of the request to cancel.
   */
  requestId: RequestId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/v2/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A successful JSON-RPC response.
 */
export interface Result2 {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific response data.
   */
  result:
    | InitializeResponse2
    | LoginAuthResponse2
    | LogoutAuthResponse2
    | NewSessionResponse2
    | ListSessionsResponse2
    | DeleteSessionResponse2
    | ResumeSessionResponse2
    | CloseSessionResponse2
    | SetSessionConfigOptionResponse2
    | PromptResponse2
    | ExtMethodResponse2;
}
/**
 * A failed JSON-RPC response.
 */
export interface Error3 {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific error data.
   */
  error: Error1;
}
/**
 * A successful JSON-RPC response.
 */
export interface Result3 {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific response data.
   */
  result:
    | RequestPermissionResponse2
    | CreateElicitationResponse3
    | ExtMethodResponse3;
}
/**
 * A failed JSON-RPC response.
 */
export interface Error4 {
  /**
   * The id of the request this response answers.
   */
  id: RequestId;
  /**
   * Method-specific error data.
   */
  error: Error1;
}
/**
 * A message (request, response, or notification) with `"jsonrpc": "2.0"` specified as
 * [required by JSON-RPC 2.0 Specification][1].
 *
 * [1]: https://www.jsonrpc.org/specification#compatibility
 */
export interface ProtocolLevel {
  jsonrpc: "2.0";
  /**
   * The notification method name.
   */
  method: string;
  /**
   * Method-specific notification parameters.
   */
  params?: CancelRequestNotification2 | null;
}
