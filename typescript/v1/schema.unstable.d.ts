// Code generated from the ACP JSON Schema by typescript/generate-types.mjs.
// DO NOT EDIT BY HAND. Run `npm run generate` to regenerate.
// Source of truth: the sibling schema.json under schema/.

export type AgentClientProtocol = Agent | Client | ProtocolLevel;
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
 * Writes content to a text file in the client's file system.
 *
 * Only available if the client advertises the `fs.writeTextFile` capability.
 * Allows the agent to create or modify files within the client's environment.
 *
 * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
 */
export type WriteTextFileRequest = WriteTextFileRequest1;
/**
 * A unique identifier for a conversation session between a client and agent.
 *
 * Sessions maintain their own context, conversation history, and state,
 * allowing multiple independent interactions with the same agent.
 *
 * See protocol docs: [Session ID](https://agentclientprotocol.com/protocol/session-setup#session-id)
 */
export type SessionId = string;
/**
 * Reads content from a text file in the client's file system.
 *
 * Only available if the client advertises the `fs.readTextFile` capability.
 * Allows the agent to access file contents within the client's environment.
 *
 * See protocol docs: [Client](https://agentclientprotocol.com/protocol/overview#client)
 */
export type ReadTextFileRequest = ReadTextFileRequest1;
/**
 * Requests permission from the user for a tool call operation.
 *
 * Called by the agent when it needs user authorization before executing
 * a potentially sensitive operation. The client should present the options
 * to the user and return their decision.
 *
 * If the client cancels the prompt turn via `session/cancel`, it MUST
 * respond to this request with `RequestPermissionOutcome::Cancelled`.
 *
 * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/tool-calls#requesting-permission)
 */
export type RequestPermissionRequest = RequestPermissionRequest1;
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
 * v1 keeps this enum decode-open so newer peers can introduce additional tool
 * kinds without breaking older implementations. Unknown values deserialize to
 * `Other`.
 *
 * See protocol docs: [Creating](https://agentclientprotocol.com/protocol/tool-calls#creating)
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
  | "other";
/**
 * Execution status of a tool call.
 *
 * Tool calls progress through different statuses during their lifecycle.
 *
 * v1 intentionally keeps this enum decode-closed. Unknown lifecycle states are
 * rejected rather than silently coerced because v1 has no lossless
 * preservation form for unrecognized statuses.
 *
 * See protocol docs: [Status](https://agentclientprotocol.com/protocol/tool-calls#status)
 */
export type ToolCallStatus = "pending" | "in_progress" | "completed" | "failed";
/**
 * Content produced by a tool call.
 *
 * Tool calls can produce different types of content including
 * standard content blocks (text, images) or file diffs.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/tool-calls#content)
 */
export type ToolCallContent = Content | Diff | Terminal;
/**
 * Content blocks represent displayable information in the Agent Client Protocol.
 *
 * They provide a structured way to handle various types of user-facing content—whether
 * it's text from language models, images for analysis, or embedded resources for context.
 *
 * Content blocks appear in:
 * - User prompts sent via `session/prompt`
 * - Language model output streamed through `session/update` notifications
 * - Progress updates and results from tool calls
 *
 * This structure is compatible with the Model Context Protocol (MCP), enabling
 * agents to seamlessly forward content from MCP tool outputs without transformation.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/content)
 */
export type ContentBlock =
  TextContent | ImageContent | AudioContent | ResourceLink | EmbeddedResource;
/**
 * The sender or recipient of messages and data in a conversation.
 */
export type Role = "assistant" | "user";
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
 * Typed identifier used for terminal values on the wire.
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
  "allow_once" | "allow_always" | "reject_once" | "reject_always";
/**
 * Executes a command in a new terminal
 *
 * Only available if the `terminal` Client capability is set to `true`.
 *
 * Returns a `TerminalId` that can be used with other terminal methods
 * to get the current output, wait for exit, and kill the command.
 *
 * The `TerminalId` can also be used to embed the terminal in a tool call
 * by using the `ToolCallContent::Terminal` variant.
 *
 * The Agent is responsible for releasing the terminal by using the `terminal/release`
 * method.
 *
 * See protocol docs: [Terminals](https://agentclientprotocol.com/protocol/terminals)
 */
export type CreateTerminalRequest = CreateTerminalRequest1;
/**
 * Gets the terminal output and exit status
 *
 * Returns the current content in the terminal without waiting for the command to exit.
 * If the command has already exited, the exit status is included.
 *
 * See protocol docs: [Terminals](https://agentclientprotocol.com/protocol/terminals)
 */
export type TerminalOutputRequest = TerminalOutputRequest1;
/**
 * Releases a terminal
 *
 * The command is killed if it hasn't exited yet. Use `terminal/wait_for_exit`
 * to wait for the command to exit before releasing the terminal.
 *
 * After release, the `TerminalId` can no longer be used with other `terminal/*` methods,
 * but tool calls that already contain it, continue to display its output.
 *
 * The `terminal/kill` method can be used to terminate the command without releasing
 * the terminal, allowing the Agent to call `terminal/output` and other methods.
 *
 * See protocol docs: [Terminals](https://agentclientprotocol.com/protocol/terminals)
 */
export type ReleaseTerminalRequest = ReleaseTerminalRequest1;
/**
 * Waits for the terminal command to exit and return its exit status
 *
 * See protocol docs: [Terminals](https://agentclientprotocol.com/protocol/terminals)
 */
export type WaitForTerminalExitRequest = WaitForTerminalExitRequest1;
/**
 * Kills the terminal command without releasing the terminal
 *
 * While `terminal/release` will also kill the command, this method will keep
 * the `TerminalId` valid so it can be used with other methods.
 *
 * This method can be helpful when implementing command timeouts which terminate
 * the command as soon as elapsed, and then get the final output so it can be sent
 * to the model.
 *
 * Note: Call `terminal/release` when `TerminalId` is no longer needed.
 *
 * See protocol docs: [Terminals](https://agentclientprotocol.com/protocol/terminals)
 */
export type KillTerminalRequest = KillTerminalRequest1;
/**
 * Requests structured user input via a form or URL.
 *
 * See protocol docs: [Elicitation](https://agentclientprotocol.com/protocol/elicitation)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
};
export type CreateElicitationRequest2 =
  ElicitationFormMode | ElicitationUrlMode | Other2;
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
  | Other1;
/**
 * String format types for string properties in elicitation schemas.
 */
export type StringFormat = "email" | "uri" | "date" | "date-time";
/**
 * Items for a multi-select (array) property schema.
 */
export type MultiSelectItems = StringMultiSelectItems | Other | Titled;
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
export type Other2 = Session2 | Request3;
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
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Opens an MCP-over-ACP connection.
 */
export type ConnectMcpRequest = ConnectMcpRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for an MCP server using the ACP transport.
 *
 * The value is opaque and generated by the ACP component providing the MCP server. It is
 * used by `mcp/connect` to route connection requests back to the component that declared the
 * server.
 */
export type McpServerAcpId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Exchanges an MCP-over-ACP message.
 */
export type MessageMcpRequest = MessageMcpRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A unique identifier for an active MCP-over-ACP connection.
 */
export type McpConnectionId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Closes an MCP-over-ACP connection.
 */
export type DisconnectMcpRequest = DisconnectMcpRequest1;
/**
 * Handles extension method requests from the agent.
 *
 * Allows the Agent to send an arbitrary request that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * How the agent wants document changes delivered.
 */
export type TextDocumentSyncKind = "full" | "incremental";
/**
 * The encoding used for character offsets in positions.
 *
 * Follows the same conventions as LSP 3.17. The default is UTF-16.
 */
export type PositionEncodingKind = "utf-16" | "utf-32" | "utf-8";
/**
 * Describes an available authentication method.
 *
 * The `type` field acts as the discriminator in the serialized JSON form.
 * When no `type` is present, the method is treated as `agent`.
 */
export type AuthMethod = AuthMethodEnvVar | AuthMethodTerminal | Agent1;
/**
 * Typed identifier used for auth method values on the wire.
 */
export type AuthMethodId = string;
/**
 * Agent handles authentication itself.
 *
 * This is the default when no `type` is specified.
 */
export type Agent1 = AuthMethodAgent;
/**
 * Successful result returned for a `authenticate` request.
 */
export type AuthenticateResponse = AuthenticateResponse1;
/**
 * Successful result returned for a `providers/list` request.
 */
export type ListProvidersResponse = ListProvidersResponse1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a configurable LLM provider.
 */
export type ProviderId = string;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Well-known API protocol identifiers for LLM providers.
 *
 * Agents and clients MUST handle unknown protocol identifiers gracefully.
 *
 * Protocol names beginning with `_` are free for custom use, like other ACP extension methods.
 * Protocol names that do not begin with `_` are reserved for the ACP spec.
 */
export type LlmProtocol =
  "anthropic" | "openai" | "azure" | "vertex" | "bedrock" | Other3;
/**
 * Unknown or custom protocol.
 */
export type Other3 = string;
/**
 * Successful result returned for a `providers/set` request.
 */
export type SetProviderResponse = SetProviderResponse1;
/**
 * Successful result returned for a `providers/disable` request.
 */
export type DisableProviderResponse = DisableProviderResponse1;
/**
 * Successful result returned for a `logout` request.
 */
export type LogoutResponse = LogoutResponse1;
/**
 * Successful result returned for a `session/new` request.
 */
export type NewSessionResponse = NewSessionResponse1;
/**
 * Unique identifier for a Session Mode.
 */
export type SessionModeId = string;
/**
 * A session configuration option selector and its current state.
 */
export type SessionConfigOption = {
  /**
   * Unique identifier for the configuration option.
   */
  id: SessionConfigId;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
} & SessionConfigOption1;
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
  "mode" | "model" | "model_config" | "thought_level" | Other4;
/**
 * Unknown / uncategorized selector.
 */
export type Other4 = string;
export type SessionConfigOption1 = SessionConfigSelect | SessionConfigBoolean;
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
 * Successful result returned for a `session/load` request.
 */
export type LoadSessionResponse = LoadSessionResponse1;
/**
 * Successful result returned for a `session/list` request.
 */
export type ListSessionsResponse = ListSessionsResponse1;
/**
 * Successful result returned for a `session/delete` request.
 */
export type DeleteSessionResponse = DeleteSessionResponse1;
/**
 * Successful result returned for a `session/fork` request.
 */
export type ForkSessionResponse = ForkSessionResponse1;
/**
 * Successful result returned for a `session/resume` request.
 */
export type ResumeSessionResponse = ResumeSessionResponse1;
/**
 * Successful result returned for a `session/close` request.
 */
export type CloseSessionResponse = CloseSessionResponse1;
/**
 * Successful result returned for a `session/set_mode` request.
 */
export type SetSessionModeResponse = SetSessionModeResponse1;
/**
 * Successful result returned for a `session/set_config_option` request.
 */
export type SetSessionConfigOptionResponse = SetSessionConfigOptionResponse1;
/**
 * Successful result returned for a `session/prompt` request.
 */
export type PromptResponse = PromptResponse1;
/**
 * Reasons why an agent stops processing a prompt turn.
 *
 * See protocol docs: [Stop Reasons](https://agentclientprotocol.com/protocol/prompt-turn#stop-reasons)
 */
export type StopReason =
  "end_turn" | "max_tokens" | "max_turn_requests" | "refusal" | "cancelled";
/**
 * Successful result returned for a `nes/start` request.
 */
export type StartNesResponse = StartNesResponse1;
/**
 * Successful result returned for a `nes/suggest` request.
 */
export type SuggestNesResponse = SuggestNesResponse1;
/**
 * A suggestion returned by the agent.
 */
export type NesSuggestion =
  | NesEditSuggestion
  | NesJumpSuggestion
  | NesRenameSuggestion
  | NesSearchAndReplaceSuggestion;
/**
 * Unique identifier for a next edit suggestion.
 */
export type NesSuggestionId = string;
/**
 * Successful result returned for a `nes/close` request.
 */
export type CloseNesResponse = CloseNesResponse1;
/**
 * Successful result returned by an extension method outside the core ACP method set.
 */
export type ExtMethodResponse = ExtResponse;
/**
 * Successful result returned by an MCP-over-ACP `mcp/message` request.
 */
export type MessageMcpResponse = MessageMcpResponse1;
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
  | Other5;
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
export type Other5 = number;
export type Notification = AgentNotification;
/**
 * Handles session update notifications from the agent.
 *
 * This is a notification endpoint (no response expected) that receives
 * real-time updates about session progress, including message chunks,
 * tool calls, and execution plans.
 *
 * Note: Clients SHOULD continue accepting tool call updates even after
 * sending a `session/cancel` notification, as the agent may send final
 * updates before responding with the cancelled stop reason.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
 */
export type SessionNotification = SessionNotification1;
/**
 * Different types of updates that can be sent during session processing.
 *
 * These updates provide real-time feedback about the agent's progress.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
 */
export type SessionUpdate =
  | ContentChunk
  | ToolCall
  | ToolCallUpdate
  | Plan
  | PlanUpdate
  | PlanRemoved
  | AvailableCommandsUpdate
  | CurrentModeUpdate
  | ConfigOptionUpdate
  | SessionInfoUpdate
  | UsageUpdate;
/**
 * Unique identifier for a message within a session.
 */
export type MessageId = string;
/**
 * Priority levels for plan entries.
 *
 * Used to indicate the relative importance or urgency of different
 * tasks in the execution plan.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export type PlanEntryPriority = "high" | "medium" | "low";
/**
 * Status of a plan entry in the execution flow.
 *
 * Tracks the lifecycle of each task from planning through completion.
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
 */
export type PlanEntryStatus = "pending" | "in_progress" | "completed";
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Updated content for a plan.
 */
export type PlanUpdateContent = PlanItems | PlanFile | PlanMarkdown;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Unique identifier for a plan within a session.
 */
export type PlanId = string;
/**
 * The input specification for a command.
 */
export type AvailableCommandInput = Unstructured;
/**
 * All text that was typed after the command name is provided as input.
 */
export type Unstructured = UnstructuredCommandInput;
/**
 * Notification that a URL-based elicitation has completed.
 *
 * See protocol docs: [Elicitation](https://agentclientprotocol.com/protocol/elicitation#url-completion)
 */
export type CompleteElicitationNotification = CompleteElicitationNotification1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Receives an MCP-over-ACP notification.
 */
export type MessageMcpNotification = MessageMcpNotification1;
/**
 * Handles extension notifications from the agent.
 *
 * Allows the Agent to send an arbitrary notification that is not part of the ACP spec.
 * Extension notifications provide a way to send one-way messages for custom functionality
 * while maintaining protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
 */
export type InitializeRequest = InitializeRequest1;
/**
 * Authenticates the client using the specified authentication method.
 *
 * Called when the agent requires authentication before allowing session creation.
 * The client provides the authentication method ID that was advertised during initialization.
 *
 * After successful authentication, the client can proceed to create sessions with
 * `new_session` without receiving an `auth_required` error.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
 */
export type AuthenticateRequest = AuthenticateRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Lists providers that can be configured by the client.
 */
export type ListProvidersRequest = ListProvidersRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Replaces the configuration for a provider.
 */
export type SetProviderRequest = SetProviderRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Disables a provider.
 */
export type DisableProviderRequest = DisableProviderRequest1;
/**
 * Logs out of the current authenticated state.
 *
 * After a successful logout, all new sessions will require authentication.
 * There is no guarantee about the behavior of already running sessions.
 */
export type LogoutRequest = LogoutRequest1;
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
 * See protocol docs: [Session Setup](https://agentclientprotocol.com/protocol/session-setup)
 */
export type NewSessionRequest = NewSessionRequest1;
/**
 * Configuration for connecting to an MCP (Model Context Protocol) server.
 *
 * MCP servers provide tools and context that the agent can use when
 * processing prompts.
 *
 * See protocol docs: [MCP Servers](https://agentclientprotocol.com/protocol/session-setup#mcp-servers)
 */
export type McpServer = McpServerHttp | McpServerSse | McpServerAcp | Stdio;
/**
 * Stdio transport configuration
 *
 * All Agents MUST support this transport.
 */
export type Stdio = McpServerStdio;
/**
 * Loads an existing session to resume a previous conversation.
 *
 * This method is only available if the agent advertises the `loadSession` capability.
 *
 * The agent should:
 * - Restore the session context and conversation history
 * - Connect to the specified MCP servers
 * - Stream the entire conversation history back to the client via notifications
 *
 * See protocol docs: [Loading Sessions](https://agentclientprotocol.com/protocol/session-setup#loading-sessions)
 */
export type LoadSessionRequest = LoadSessionRequest1;
/**
 * Lists existing sessions known to the agent.
 *
 * This method is only available if the agent advertises the `sessionCapabilities.list` capability.
 *
 * The agent should return metadata about sessions with optional filtering and pagination support.
 */
export type ListSessionsRequest = ListSessionsRequest1;
/**
 * Deletes an existing session from `session/list`.
 *
 * This method is only available if the agent advertises the `sessionCapabilities.delete` capability.
 */
export type DeleteSessionRequest = DeleteSessionRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Forks an existing session to create a new independent session.
 *
 * This method is only available if the agent advertises the `session.fork` capability.
 *
 * The agent should create a new session with the same conversation context as the
 * original, allowing operations like generating summaries without affecting the
 * original session's history.
 */
export type ForkSessionRequest = ForkSessionRequest1;
/**
 * Resumes an existing session without returning previous messages.
 *
 * This method is only available if the agent advertises the `sessionCapabilities.resume` capability.
 *
 * The agent should resume the session context, allowing the conversation to continue
 * without replaying the message history (unlike `session/load`).
 */
export type ResumeSessionRequest = ResumeSessionRequest1;
/**
 * Closes an active session and frees up any resources associated with it.
 *
 * This method is only available if the agent advertises the `sessionCapabilities.close` capability.
 *
 * The agent must cancel any ongoing work (as if `session/cancel` was called)
 * and then free up any resources associated with the session.
 */
export type CloseSessionRequest = CloseSessionRequest1;
/**
 * Sets the current mode for a session.
 *
 * Allows switching between different agent modes (e.g., "ask", "architect", "code")
 * that affect system prompts, tool availability, and permission behaviors.
 *
 * The mode must be one of the modes advertised in `availableModes` during session
 * creation or loading. Agents may also change modes autonomously and notify the
 * client via `current_mode_update` notifications.
 *
 * This method can be called at any time during a session, whether the Agent is
 * idle or actively generating a response.
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export type SetSessionModeRequest = SetSessionModeRequest1;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
};
export type SetSessionConfigOptionRequest2 =
  | {
      /**
       * The boolean value.
       */
      value: boolean;
      type: "boolean";
    }
  | ValueId;
/**
 * Processes a user prompt within a session.
 *
 * This method handles the whole lifecycle of a prompt:
 * - Receives user messages with optional context (files, images, etc.)
 * - Processes the prompt using language models
 * - Reports language model content and tool calls to the Clients
 * - Requests permission to run tools
 * - Executes any requested tool calls
 * - Returns when the turn is complete with a stop reason
 *
 * See protocol docs: [Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
 */
export type PromptRequest = PromptRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Starts an NES session.
 */
export type StartNesRequest = StartNesRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Requests a code suggestion.
 */
export type SuggestNesRequest = SuggestNesRequest1;
/**
 * What triggered the suggestion request.
 */
export type NesTriggerKind = "automatic" | "diagnostic" | "manual";
/**
 * Severity of a diagnostic.
 */
export type NesDiagnosticSeverity =
  "error" | "warning" | "information" | "hint";
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Closes an active NES session and frees up any resources associated with it.
 *
 * The agent must cancel any ongoing work and then free up any resources
 * associated with the NES session.
 */
export type CloseNesRequest = CloseNesRequest1;
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Exchanges an MCP-over-ACP message.
 */
export type MessageMcpRequest2 = MessageMcpRequest1;
/**
 * Handles extension method requests from the client.
 *
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export type ExtMethodRequest1 = ExtRequest;
export type Response1 = ClientResponse;
/**
 * A JSON-RPC response object.
 */
export type ClientResponse = Result1 | Error2;
/**
 * Successful result returned for a `fs/write_text_file` request.
 */
export type WriteTextFileResponse = WriteTextFileResponse1;
/**
 * Successful result returned for a `fs/read_text_file` request.
 */
export type ReadTextFileResponse = ReadTextFileResponse1;
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
  | SelectedPermissionOutcome;
/**
 * Successful result returned for a `terminal/create` request.
 */
export type CreateTerminalResponse = CreateTerminalResponse1;
/**
 * Successful result returned for a `terminal/output` request.
 */
export type TerminalOutputResponse = TerminalOutputResponse1;
/**
 * Successful result returned for a `terminal/release` request.
 */
export type ReleaseTerminalResponse = ReleaseTerminalResponse1;
/**
 * Successful result returned for a `terminal/wait_for_exit` request.
 */
export type WaitForTerminalExitResponse = WaitForTerminalExitResponse1;
/**
 * Successful result returned for a `terminal/kill` request.
 */
export type KillTerminalResponse = KillTerminalResponse1;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
  | Other6;
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
 * Successful result returned for a `mcp/connect` request.
 */
export type ConnectMcpResponse = ConnectMcpResponse1;
/**
 * Successful result returned for a `mcp/disconnect` request.
 */
export type DisconnectMcpResponse = DisconnectMcpResponse1;
/**
 * Successful result returned by an MCP-over-ACP `mcp/message` request.
 */
export type MessageMcpResponse2 = MessageMcpResponse1;
/**
 * Successful result returned by an extension method outside the core ACP method set.
 */
export type ExtMethodResponse1 = ExtResponse;
export type Notification1 = ClientNotification;
/**
 * Cancels ongoing operations for a session.
 *
 * This is a notification sent by the client to cancel an ongoing prompt turn.
 *
 * Upon receiving this notification, the Agent SHOULD:
 * - Stop all language model requests as soon as possible
 * - Abort all tool call invocations in progress
 * - Send any pending `session/update` notifications
 * - Respond to the original `session/prompt` request with `StopReason::Cancelled`
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/prompt-turn#cancellation)
 */
export type CancelNotification = CancelNotification1;
/**
 * **UNSTABLE**
 *
 * Notification sent when a file is opened in the editor.
 */
export type DidOpenDocumentNotification = DidOpenDocumentNotification1;
/**
 * **UNSTABLE**
 *
 * Notification sent when a file is edited.
 */
export type DidChangeDocumentNotification = DidChangeDocumentNotification1;
/**
 * **UNSTABLE**
 *
 * Notification sent when a file is closed.
 */
export type DidCloseDocumentNotification = DidCloseDocumentNotification1;
/**
 * **UNSTABLE**
 *
 * Notification sent when a file is saved.
 */
export type DidSaveDocumentNotification = DidSaveDocumentNotification1;
/**
 * **UNSTABLE**
 *
 * Notification sent when a file becomes the active editor tab.
 */
export type DidFocusDocumentNotification = DidFocusDocumentNotification1;
/**
 * **UNSTABLE**
 *
 * Notification sent when a suggestion is accepted.
 */
export type AcceptNesNotification = AcceptNesNotification1;
/**
 * **UNSTABLE**
 *
 * Notification sent when a suggestion is rejected.
 */
export type RejectNesNotification = RejectNesNotification1;
/**
 * The reason a suggestion was rejected.
 */
export type NesRejectReason = "rejected" | "ignored" | "replaced" | "cancelled";
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Sends an MCP-over-ACP notification.
 */
export type MessageMcpNotification2 = MessageMcpNotification1;
/**
 * Handles extension notifications from the client.
 *
 * Extension notifications provide a way to send one-way messages for custom functionality
 * while maintaining protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export type ExtNotification2 = ExtNotification1;
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
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/cancellation)
 */
export type CancelRequestNotification = CancelRequestNotification1;

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
    | (
        | WriteTextFileRequest
        | ReadTextFileRequest
        | RequestPermissionRequest
        | CreateTerminalRequest
        | TerminalOutputRequest
        | ReleaseTerminalRequest
        | WaitForTerminalExitRequest
        | KillTerminalRequest
        | CreateElicitationRequest
        | ConnectMcpRequest
        | MessageMcpRequest
        | DisconnectMcpRequest
        | ExtMethodRequest
      )
    | null;
}
/**
 * Request to write content to a text file.
 *
 * Only available if the client supports the `fs.writeTextFile` capability.
 */
export interface WriteTextFileRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * Absolute path to the file to write.
   */
  path: string;
  /**
   * The text content to write to the file.
   */
  content: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to read content from a text file.
 *
 * Only available if the client supports the `fs.readTextFile` capability.
 */
export interface ReadTextFileRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * Absolute path to the file to read.
   */
  path: string;
  /**
   * Line number to start reading from (1-based).
   */
  line?: number | null;
  /**
   * Maximum number of lines to read.
   */
  limit?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request for user permission to execute a tool call.
 *
 * Sent when the agent needs authorization before performing a sensitive operation.
 *
 * See protocol docs: [Requesting Permission](https://agentclientprotocol.com/protocol/tool-calls#requesting-permission)
 */
export interface RequestPermissionRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * Details about the tool call requiring permission.
   */
  toolCall: ToolCallUpdate;
  /**
   * Available permission options for the user to choose from.
   */
  options: PermissionOption[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An update to an existing tool call.
 *
 * Used to report progress and results as tools execute. All fields except
 * the tool call ID are optional - only changed fields need to be included.
 *
 * See protocol docs: [Updating](https://agentclientprotocol.com/protocol/tool-calls#updating)
 */
export interface ToolCallUpdate {
  /**
   * The ID of the tool call being updated.
   */
  toolCallId: ToolCallId;
  /**
   * Update the tool kind.
   */
  kind?: ToolKind | null;
  /**
   * Update the execution status.
   */
  status?: ToolCallStatus | null;
  /**
   * Update the human-readable title.
   */
  title?: string | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Update the programmatic name of the tool being invoked.
   *
   * This field is optional. Omitting it or sending `null` both mean that
   * the existing name is left unchanged.
   */
  name?: string | null;
  /**
   * Replace the content collection.
   */
  content?: ToolCallContent[] | null;
  /**
   * Replace the locations collection.
   */
  locations?: ToolCallLocation[] | null;
  /**
   * Update the raw input.
   */
  rawInput?: {
    [k: string]: unknown;
  };
  /**
   * Update the raw output.
   */
  rawOutput?: {
    [k: string]: unknown;
  };
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * Text payload carried by this content block.
   */
  text: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * Base64-encoded media payload.
   */
  data: string;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType: string;
  /**
   * URI associated with this resource or media payload.
   */
  uri?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * Base64-encoded media payload.
   */
  data: string;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * Optional human-readable details shown with this protocol object.
   */
  description?: string | null;
  /**
   * MIME type describing the encoded media payload.
   */
  mimeType?: string | null;
  /**
   * Human-readable name shown for this protocol object.
   */
  name: string;
  /**
   * Optional size of the linked resource in bytes, if known.
   */
  size?: number | null;
  /**
   * Optional display title for end-user UI.
   */
  title?: string | null;
  /**
   * URI associated with this resource or media payload.
   */
  uri: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * The contents of a resource, embedded into a prompt or tool call result.
 */
export interface EmbeddedResource {
  /**
   * Optional annotations that help clients decide how to display or route this content.
   */
  annotations?: Annotations | null;
  /**
   * Embedded resource payload, either text or binary data.
   */
  resource: EmbeddedResourceResource;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * MIME type describing the encoded media payload.
   */
  mimeType?: string | null;
  /**
   * Text payload carried by this content block.
   */
  text: string;
  /**
   * URI associated with this resource or media payload.
   */
  uri: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * MIME type describing the encoded media payload.
   */
  mimeType?: string | null;
  /**
   * URI associated with this resource or media payload.
   */
  uri: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A diff representing file modifications.
 *
 * Shows changes to files in a format suitable for display in the client UI.
 *
 * See protocol docs: [Content](https://agentclientprotocol.com/protocol/tool-calls#content)
 */
export interface Diff {
  /**
   * The absolute file path being modified.
   */
  path: string;
  /**
   * The original content (None for new files).
   */
  oldText?: string | null;
  /**
   * The new content after modification.
   */
  newText: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Embed a terminal created with `terminal/create` by its id.
 *
 * The terminal must be added before calling `terminal/release`.
 *
 * See protocol docs: [Terminal](https://agentclientprotocol.com/protocol/terminals)
 */
export interface Terminal {
  /**
   * Identifier of the terminal instance to embed in the content stream.
   */
  terminalId: TerminalId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A file location being accessed or modified by a tool.
 *
 * Enables clients to implement "follow-along" features that track
 * which files the agent is working with in real-time.
 *
 * See protocol docs: [Following the Agent](https://agentclientprotocol.com/protocol/tool-calls#following-the-agent)
 */
export interface ToolCallLocation {
  /**
   * The absolute file path being accessed or modified.
   */
  path: string;
  /**
   * Optional line number within the file.
   */
  line?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to create a new terminal and execute a command.
 */
export interface CreateTerminalRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * The command to execute.
   */
  command: string;
  /**
   * Array of command arguments.
   */
  args?: string[];
  /**
   * Environment variables for the command.
   */
  env?: EnvVariable[];
  /**
   * Working directory for the command. Must be an absolute path.
   */
  cwd?: string | null;
  /**
   * Maximum number of output bytes to retain.
   *
   * When the limit is exceeded, the Client truncates from the beginning of the output
   * to stay within the limit.
   *
   * The Client MUST ensure truncation happens at a character boundary to maintain valid
   * string output, even if this means the retained output is slightly less than the
   * specified limit.
   */
  outputByteLimit?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to get the current output and status of a terminal.
 */
export interface TerminalOutputRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * The ID of the terminal to get output from.
   */
  terminalId: TerminalId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to release a terminal and free its resources.
 */
export interface ReleaseTerminalRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * The ID of the terminal to release.
   */
  terminalId: TerminalId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to wait for a terminal command to exit.
 */
export interface WaitForTerminalExitRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * The ID of the terminal to wait for.
   */
  terminalId: TerminalId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to kill a terminal without releasing it.
 */
export interface KillTerminalRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * The ID of the terminal to kill.
   */
  terminalId: TerminalId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * Optional. Omitted and `null` are equivalent and mean no untitled single-select choices are
   * declared by `enum`.
   */
  enum?: string[] | null;
  /**
   * Titled enum options for titled single-select enums.
   * Optional. Omitted and `null` are equivalent and mean no titled single-select choices are
   * declared by `oneOf`.
   */
  oneOf?: EnumOption[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * Allowed enum values.
   */
  enum: string[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Custom or future typed multi-select items.
 */
export interface Other {
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
   * Titled enum options.
   */
  anyOf: EnumOption[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * Optional. Omitted and `null` are equivalent and mean no metadata.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
export interface Other1 {
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
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/connect`.
 */
export interface ConnectMcpRequest1 {
  /**
   * The ACP MCP server ID that was provided by the component declaring the MCP server.
   */
  serverId: McpServerAcpId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/message`.
 */
export interface MessageMcpRequest1 {
  /**
   * The MCP-over-ACP connection this message is sent on.
   */
  connectionId: McpConnectionId;
  /**
   * The inner MCP method name.
   */
  method: string;
  /**
   * Optional inner MCP params.
   *
   * If omitted or set to `null`, the inner MCP message has no params.
   */
  params?: {
    [k: string]: unknown;
  } | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `mcp/disconnect`.
 */
export interface DisconnectMcpRequest1 {
  /**
   * The MCP-over-ACP connection to close.
   */
  connectionId: McpConnectionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Allows for sending an arbitrary request that is not part of the ACP spec.
 * Extension methods provide a way to add custom functionality while maintaining
 * protocol compatibility.
 *
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
    | AuthenticateResponse
    | ListProvidersResponse
    | SetProviderResponse
    | DisableProviderResponse
    | LogoutResponse
    | NewSessionResponse
    | LoadSessionResponse
    | ListSessionsResponse
    | DeleteSessionResponse
    | ForkSessionResponse
    | ResumeSessionResponse
    | CloseSessionResponse
    | SetSessionModeResponse
    | SetSessionConfigOptionResponse
    | PromptResponse
    | StartNesResponse
    | SuggestNesResponse
    | CloseNesResponse
    | ExtMethodResponse
    | MessageMcpResponse;
}
/**
 * Response to the `initialize` method.
 *
 * Contains the negotiated protocol version and agent capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
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
   * Capabilities supported by the agent.
   */
  agentCapabilities?: AgentCapabilities;
  /**
   * Authentication methods supported by the agent.
   */
  authMethods?: AuthMethod[];
  /**
   * Information about the Agent name and version sent to the Client.
   *
   * Note: in future versions of the protocol, this will be required.
   */
  agentInfo?: Implementation | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * See protocol docs: [Agent Capabilities](https://agentclientprotocol.com/protocol/initialization#agent-capabilities)
 */
export interface AgentCapabilities {
  /**
   * Whether the agent supports `session/load`.
   */
  loadSession?: boolean;
  /**
   * Prompt capabilities supported by the agent.
   */
  promptCapabilities?: PromptCapabilities;
  /**
   * MCP capabilities supported by the agent.
   */
  mcpCapabilities?: McpCapabilities;
  /**
   * Session lifecycle and prompt capabilities advertised by the agent.
   */
  sessionCapabilities?: SessionCapabilities;
  /**
   * Authentication-related capabilities supported by the agent.
   */
  auth?: AgentAuthCapabilities;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Provider configuration capabilities supported by the agent.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports provider configuration methods.
   */
  providers?: ProvidersCapabilities | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * NES (Next Edit Suggestions) capabilities supported by the agent.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support
   * for NES methods.
   */
  nes?: NesCapabilities | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * The position encoding selected by the agent from the client's supported encodings.
   */
  positionEncoding?: PositionEncodingKind | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * See protocol docs: [Prompt Capabilities](https://agentclientprotocol.com/protocol/initialization#prompt-capabilities)
 */
export interface PromptCapabilities {
  /**
   * Agent supports [`ContentBlock::Image`].
   */
  image?: boolean;
  /**
   * Agent supports [`ContentBlock::Audio`].
   */
  audio?: boolean;
  /**
   * Agent supports embedded context in `session/prompt` requests.
   *
   * When enabled, the Client is allowed to include [`ContentBlock::Resource`]
   * in prompt requests for pieces of context that are referenced in the message.
   */
  embeddedContext?: boolean;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * MCP capabilities supported by the agent
 */
export interface McpCapabilities {
  /**
   * Agent supports [`McpServer::Http`].
   */
  http?: boolean;
  /**
   * Agent supports [`McpServer::Sse`].
   */
  sse?: boolean;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Agent supports [`McpServer::Acp`].
   */
  acp?: boolean;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Session capabilities supported by the agent.
 *
 * As a baseline, all Agents **MUST** support `session/new`, `session/prompt`, `session/cancel`, and `session/update`.
 *
 * Optionally, they **MAY** support other session methods and notifications by specifying additional capabilities.
 *
 * Note: `session/load` is still handled by the top-level `load_session` capability. This will be unified in future versions of the protocol.
 *
 * See protocol docs: [Session Capabilities](https://agentclientprotocol.com/protocol/initialization#session-capabilities)
 */
export interface SessionCapabilities {
  /**
   * Whether the agent supports `session/list`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports listing sessions.
   */
  list?: SessionListCapabilities | null;
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
   * Agents that also support `session/list` may return
   * `SessionInfo.additionalDirectories` to report the complete ordered
   * additional-root list associated with a listed session.
   */
  additionalDirectories?: SessionAdditionalDirectoriesCapabilities | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Whether the agent supports `session/fork`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports forking sessions.
   */
  fork?: SessionForkCapabilities | null;
  /**
   * Whether the agent supports `session/resume`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports resuming sessions.
   */
  resume?: SessionResumeCapabilities | null;
  /**
   * Whether the agent supports `session/close`.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports closing sessions.
   */
  close?: SessionCloseCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for the `session/list` method.
 *
 * Supplying `{}` means the agent supports listing sessions.
 */
export interface SessionListCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Capabilities for the `session/fork` method.
 *
 * Supplying `{}` means the agent supports forking sessions.
 */
export interface SessionForkCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for the `session/resume` method.
 *
 * Supplying `{}` means the agent supports resuming sessions.
 */
export interface SessionResumeCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for the `session/close` method.
 *
 * Supplying `{}` means the agent supports closing sessions.
 */
export interface SessionCloseCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Authentication-related capabilities supported by the agent.
 */
export interface AgentAuthCapabilities {
  /**
   * Whether the agent supports the logout method.
   *
   * Optional. Omitted or `null` both mean the agent does not advertise support.
   * Supplying `{}` means the agent supports the logout method.
   */
  logout?: LogoutCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Logout capabilities supported by the agent.
 *
 * Supplying `{}` means the agent supports the logout method.
 */
export interface LogoutCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Provider configuration capabilities supported by the agent.
 *
 * Supplying `{}` means the agent supports provider configuration methods.
 */
export interface ProvidersCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * NES capabilities advertised by the agent during initialization.
 */
export interface NesCapabilities {
  /**
   * Events the agent wants to receive.
   */
  events?: NesEventCapabilities | null;
  /**
   * Context the agent wants attached to each suggestion request.
   */
  context?: NesContextCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Event capabilities the agent can consume.
 */
export interface NesEventCapabilities {
  /**
   * Document event capabilities.
   */
  document?: NesDocumentEventCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Document event capabilities the agent wants to receive.
 */
export interface NesDocumentEventCapabilities {
  /**
   * Whether the agent wants `document/didOpen` events.
   */
  didOpen?: NesDocumentDidOpenCapabilities | null;
  /**
   * Whether the agent wants `document/didChange` events, and the sync kind.
   */
  didChange?: NesDocumentDidChangeCapabilities | null;
  /**
   * Whether the agent wants `document/didClose` events.
   */
  didClose?: NesDocumentDidCloseCapabilities | null;
  /**
   * Whether the agent wants `document/didSave` events.
   */
  didSave?: NesDocumentDidSaveCapabilities | null;
  /**
   * Whether the agent wants `document/didFocus` events.
   */
  didFocus?: NesDocumentDidFocusCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Marker for `document/didOpen` capability support.
 */
export interface NesDocumentDidOpenCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for `document/didChange` events.
 */
export interface NesDocumentDidChangeCapabilities {
  /**
   * The sync kind the agent wants: `"full"` or `"incremental"`.
   */
  syncKind: TextDocumentSyncKind;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Marker for `document/didClose` capability support.
 */
export interface NesDocumentDidCloseCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Marker for `document/didSave` capability support.
 */
export interface NesDocumentDidSaveCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Marker for `document/didFocus` capability support.
 */
export interface NesDocumentDidFocusCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Context capabilities the agent wants attached to each suggestion request.
 */
export interface NesContextCapabilities {
  /**
   * Whether the agent wants recent files context.
   */
  recentFiles?: NesRecentFilesCapabilities | null;
  /**
   * Whether the agent wants related snippets context.
   */
  relatedSnippets?: NesRelatedSnippetsCapabilities | null;
  /**
   * Whether the agent wants edit history context.
   */
  editHistory?: NesEditHistoryCapabilities | null;
  /**
   * Whether the agent wants user actions context.
   */
  userActions?: NesUserActionsCapabilities | null;
  /**
   * Whether the agent wants open files context.
   */
  openFiles?: NesOpenFilesCapabilities | null;
  /**
   * Whether the agent wants diagnostics context.
   */
  diagnostics?: NesDiagnosticsCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for recent files context.
 */
export interface NesRecentFilesCapabilities {
  /**
   * Maximum number of recent files the agent can use.
   */
  maxCount?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for related snippets context.
 */
export interface NesRelatedSnippetsCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for edit history context.
 */
export interface NesEditHistoryCapabilities {
  /**
   * Maximum number of edit history entries the agent can use.
   */
  maxCount?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for user actions context.
 */
export interface NesUserActionsCapabilities {
  /**
   * Maximum number of user actions the agent can use.
   */
  maxCount?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for open files context.
 */
export interface NesOpenFilesCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for diagnostics context.
 */
export interface NesDiagnosticsCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Environment variable authentication method.
 *
 * The user provides credentials that the client passes to the agent as environment variables.
 */
export interface AuthMethodEnvVar {
  /**
   * Unique identifier for this authentication method.
   */
  id: AuthMethodId;
  /**
   * Human-readable name of the authentication method.
   */
  name: string;
  /**
   * Optional description providing more details about this authentication method.
   */
  description?: string | null;
  /**
   * The environment variables the client should set.
   */
  vars: AuthEnvVar[];
  /**
   * Optional link to a page where the user can obtain their credentials.
   */
  link?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Describes a single environment variable for an [`AuthMethodEnvVar`] authentication method.
 */
export interface AuthEnvVar {
  /**
   * The environment variable name (e.g. `"OPENAI_API_KEY"`).
   */
  name: string;
  /**
   * Human-readable label for this variable, displayed in client UI.
   */
  label?: string | null;
  /**
   * Whether this value is a secret (e.g. API key, token).
   * Clients should use a password-style input for secret vars.
   *
   * Defaults to `true`.
   */
  secret?: boolean;
  /**
   * Whether this variable is optional.
   *
   * Defaults to `false`.
   */
  optional?: boolean;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Terminal-based authentication method.
 *
 * The client runs an interactive terminal for the user to authenticate via a TUI.
 */
export interface AuthMethodTerminal {
  /**
   * Unique identifier for this authentication method.
   */
  id: AuthMethodId;
  /**
   * Human-readable name of the authentication method.
   */
  name: string;
  /**
   * Optional description providing more details about this authentication method.
   */
  description?: string | null;
  /**
   * Additional arguments to pass when running the agent binary for terminal auth.
   */
  args?: string[];
  /**
   * Additional environment variables to set when running the agent binary for terminal auth.
   */
  env?: {
    [k: string]: string;
  };
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Agent handles authentication itself.
 *
 * This is the default authentication method type.
 */
export interface AuthMethodAgent {
  /**
   * Unique identifier for this authentication method.
   */
  id: AuthMethodId;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to the `authenticate` method.
 */
export interface AuthenticateResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/list`.
 */
export interface ListProvidersResponse1 {
  /**
   * Configurable providers with current routing info suitable for UI display.
   */
  providers: ProviderInfo[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Information about a configurable LLM provider.
 */
export interface ProviderInfo {
  /**
   * Provider identifier, for example "main" or "openai".
   */
  providerId: ProviderId;
  /**
   * Supported protocol types for this provider.
   */
  supported: LlmProtocol[];
  /**
   * Whether this provider is mandatory and cannot be disabled via `providers/disable`.
   * If true, clients must not call `providers/disable` for this provider ID.
   */
  required: boolean;
  /**
   * Current effective non-secret routing config.
   * Null or omitted means provider is disabled.
   */
  current?: ProviderCurrentConfig | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Current effective non-secret routing configuration for a provider.
 */
export interface ProviderCurrentConfig {
  /**
   * Protocol currently used by this provider.
   */
  apiType: LlmProtocol;
  /**
   * Base URL currently used by this provider.
   */
  baseUrl: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/set`.
 */
export interface SetProviderResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `providers/disable`.
 */
export interface DisableProviderResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to the `logout` method.
 */
export interface LogoutResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/session-setup#creating-a-session)
 */
export interface NewSessionResponse1 {
  /**
   * Unique identifier for the created session.
   *
   * Used in all subsequent requests for this conversation.
   */
  sessionId: SessionId;
  /**
   * Initial mode state if supported by the Agent
   *
   * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
   */
  modes?: SessionModeState | null;
  /**
   * Initial session configuration options if supported by the Agent.
   */
  configOptions?: SessionConfigOption[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * The set of modes and the one currently active.
 */
export interface SessionModeState {
  /**
   * The current mode the Agent is in.
   */
  currentModeId: SessionModeId;
  /**
   * The set of modes that the Agent can operate in
   */
  availableModes: SessionMode[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A mode the agent can operate in.
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export interface SessionMode {
  /**
   * Stable identifier used to refer to this protocol object in later messages.
   */
  id: SessionModeId;
  /**
   * Human-readable name shown for this protocol object.
   */
  name: string;
  /**
   * Optional human-readable details shown with this protocol object.
   */
  description?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
  group: SessionConfigGroupId;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * Response from loading an existing session.
 */
export interface LoadSessionResponse1 {
  /**
   * Initial mode state if supported by the Agent
   *
   * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
   */
  modes?: SessionModeState | null;
  /**
   * Initial session configuration options if supported by the Agent.
   */
  configOptions?: SessionConfigOption[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from listing sessions.
 */
export interface ListSessionsResponse1 {
  /**
   * Array of session information objects
   */
  sessions: SessionInfo[];
  /**
   * Opaque cursor token. If present, pass this in the next request's cursor parameter
   * to fetch the next page. If absent, there are no more results.
   */
  nextCursor?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
  cwd: string;
  /**
   * Additional workspace roots reported for this session. Each path must be absolute.
   *
   * When present, this is the complete ordered additional-root list reported
   * by the Agent. Omitted and empty values are equivalent: the response
   * reports no additional roots.
   */
  additionalDirectories?: string[];
  /**
   * Human-readable title for the session
   */
  title?: string | null;
  /**
   * ISO 8601 timestamp of last activity
   */
  updatedAt?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response from forking an existing session.
 */
export interface ForkSessionResponse1 {
  /**
   * Unique identifier for the newly created forked session.
   */
  sessionId: SessionId;
  /**
   * Initial mode state if supported by the Agent
   *
   * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
   */
  modes?: SessionModeState | null;
  /**
   * Initial session configuration options if supported by the Agent.
   */
  configOptions?: SessionConfigOption[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * Initial mode state if supported by the Agent
   *
   * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
   */
  modes?: SessionModeState | null;
  /**
   * Initial session configuration options if supported by the Agent.
   */
  configOptions?: SessionConfigOption[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to `session/set_mode` method.
 */
export interface SetSessionModeResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from processing a user prompt.
 *
 * See protocol docs: [Check for Completion](https://agentclientprotocol.com/protocol/prompt-turn#4-check-for-completion)
 */
export interface PromptResponse1 {
  /**
   * Indicates why the agent stopped processing the turn.
   */
  stopReason: StopReason;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Token usage for this turn (optional).
   */
  usage?: Usage | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Token usage information for a prompt turn.
 */
export interface Usage {
  /**
   * Sum of all token types across session.
   */
  totalTokens: number;
  /**
   * Total input tokens across all turns.
   */
  inputTokens: number;
  /**
   * Total output tokens across all turns.
   */
  outputTokens: number;
  /**
   * Total thought/reasoning tokens
   */
  thoughtTokens?: number | null;
  /**
   * Total cache read tokens.
   */
  cachedReadTokens?: number | null;
  /**
   * Total cache write tokens.
   */
  cachedWriteTokens?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to `nes/start`.
 */
export interface StartNesResponse1 {
  /**
   * The session ID for the newly started NES session.
   */
  sessionId: SessionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to `nes/suggest`.
 */
export interface SuggestNesResponse1 {
  /**
   * The list of suggestions.
   */
  suggestions: NesSuggestion[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A text edit suggestion.
 */
export interface NesEditSuggestion {
  /**
   * Unique identifier for accept/reject tracking.
   */
  id: NesSuggestionId;
  /**
   * The URI of the file to edit.
   */
  uri: string;
  /**
   * The text edits to apply.
   */
  edits: NesTextEdit[];
  /**
   * Optional suggested cursor position after applying edits.
   */
  cursorPosition?: Position | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A text edit within a suggestion.
 */
export interface NesTextEdit {
  /**
   * The range to replace.
   */
  range: Range;
  /**
   * The replacement text.
   */
  newText: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A range in a text document, expressed as start and end positions.
 */
export interface Range {
  /**
   * The start position (inclusive).
   */
  start: Position;
  /**
   * The end position (exclusive).
   */
  end: Position;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A zero-based position in a text document.
 *
 * The meaning of `character` depends on the negotiated position encoding.
 */
export interface Position {
  /**
   * Zero-based line number.
   */
  line: number;
  /**
   * Zero-based character offset (encoding-dependent).
   */
  character: number;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A jump-to-location suggestion.
 */
export interface NesJumpSuggestion {
  /**
   * Unique identifier for accept/reject tracking.
   */
  id: NesSuggestionId;
  /**
   * The file to navigate to.
   */
  uri: string;
  /**
   * The target position within the file.
   */
  position: Position;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A rename symbol suggestion.
 */
export interface NesRenameSuggestion {
  /**
   * Unique identifier for accept/reject tracking.
   */
  id: NesSuggestionId;
  /**
   * The file URI containing the symbol.
   */
  uri: string;
  /**
   * The position of the symbol to rename.
   */
  position: Position;
  /**
   * The new name for the symbol.
   */
  newName: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A search-and-replace suggestion.
 */
export interface NesSearchAndReplaceSuggestion {
  /**
   * Unique identifier for accept/reject tracking.
   */
  id: NesSuggestionId;
  /**
   * The file URI to search within.
   */
  uri: string;
  /**
   * The text or pattern to find.
   */
  search: string;
  /**
   * The replacement text.
   */
  replace: string;
  /**
   * Whether `search` is a regular expression. Defaults to `false`.
   */
  isRegex?: boolean | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response from closing an NES session.
 */
export interface CloseNesResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
 */
export interface ExtResponse {
  [k: string]: unknown;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/message`.
 *
 * This is the inner MCP response result payload. Any JSON value is valid.
 */
export interface MessageMcpResponse1 {
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
        | SessionNotification
        | CompleteElicitationNotification
        | MessageMcpNotification
        | ExtNotification
      )
    | null;
}
/**
 * Notification containing a session update from the agent.
 *
 * Used to stream real-time progress and results during prompt processing.
 *
 * See protocol docs: [Agent Reports Output](https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output)
 */
export interface SessionNotification1 {
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A streamed item of content
 */
export interface ContentChunk {
  /**
   * A single item of content
   */
  content: ContentBlock;
  /**
   * A unique identifier for the message this chunk belongs to.
   *
   * All chunks belonging to the same message share the same `messageId`.
   * A change in `messageId` indicates a new message has started.
   */
  messageId?: MessageId | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Represents a tool call that the language model has requested.
 *
 * Tool calls are actions that the agent executes on behalf of the language model,
 * such as reading files, executing code, or fetching data from external sources.
 *
 * See protocol docs: [Tool Calls](https://agentclientprotocol.com/protocol/tool-calls)
 */
export interface ToolCall {
  /**
   * Unique identifier for this tool call within the session.
   */
  toolCallId: ToolCallId;
  /**
   * Human-readable title describing what the tool is doing.
   */
  title: string;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Programmatic name of the tool being invoked.
   *
   * This field is optional. Omitting it or sending `null` both mean that no
   * tool name is available.
   */
  name?: string | null;
  /**
   * The category of tool being invoked.
   * Helps clients choose appropriate icons and UI treatment.
   */
  kind?: ToolKind;
  /**
   * Current execution status of the tool call.
   */
  status?: ToolCallStatus;
  /**
   * Content produced by the tool call.
   */
  content?: ToolCallContent[];
  /**
   * File locations affected by this tool call.
   * Enables "follow-along" features in clients.
   */
  locations?: ToolCallLocation[];
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
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An execution plan for accomplishing complex tasks.
 *
 * Plans consist of multiple entries representing individual tasks or goals.
 * Agents report plans to clients to provide visibility into their execution strategy.
 * Plans can evolve during execution as the agent discovers new requirements or completes tasks.
 *
 * See protocol docs: [Agent Plan](https://agentclientprotocol.com/protocol/agent-plan)
 */
export interface Plan {
  /**
   * The list of tasks to be accomplished.
   *
   * When updating a plan, the agent must send a complete list of all entries
   * with their current status. The client replaces the entire plan with each update.
   */
  entries: PlanEntry[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * See protocol docs: [Plan Entries](https://agentclientprotocol.com/protocol/agent-plan#plan-entries)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented by a file URI.
 */
export interface PlanFile {
  /**
   * The plan ID to update.
   */
  planId: PlanId;
  /**
   * The URI of the file containing the plan.
   */
  uri: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * A plan represented as raw markdown content.
 */
export interface PlanMarkdown {
  /**
   * The plan ID to update.
   */
  planId: PlanId;
  /**
   * Markdown content for the plan.
   */
  content: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Removal notice for a plan identified by ID.
 */
export interface PlanRemoved {
  /**
   * The plan ID to remove.
   */
  planId: PlanId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Available commands are ready or have changed
 */
export interface AvailableCommandsUpdate {
  /**
   * Commands the agent can execute
   */
  availableCommands: AvailableCommand[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * All text that was typed after the command name is provided as input.
 */
export interface UnstructuredCommandInput {
  /**
   * A hint to display when the input hasn't been provided yet
   */
  hint: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * The current mode of the session has changed
 *
 * See protocol docs: [Session Modes](https://agentclientprotocol.com/protocol/session-modes)
 */
export interface CurrentModeUpdate {
  /**
   * The ID of the current mode
   */
  currentModeId: SessionModeId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 */
export interface SessionInfoUpdate {
  /**
   * Human-readable title for the session. Set to null to clear.
   */
  title?: string | null;
  /**
   * ISO 8601 timestamp of last activity. Set to null to clear.
   */
  updatedAt?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Notification parameters for `mcp/message`.
 *
 * This is used when the wrapped MCP message is a notification and the outer JSON-RPC
 * envelope has no `id`.
 */
export interface MessageMcpNotification1 {
  /**
   * The MCP-over-ACP connection this message is sent on.
   */
  connectionId: McpConnectionId;
  /**
   * The inner MCP method name.
   */
  method: string;
  /**
   * Optional inner MCP params.
   *
   * If omitted or set to `null`, the inner MCP message has no params.
   */
  params?: {
    [k: string]: unknown;
  } | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
        | AuthenticateRequest
        | ListProvidersRequest
        | SetProviderRequest
        | DisableProviderRequest
        | LogoutRequest
        | NewSessionRequest
        | LoadSessionRequest
        | ListSessionsRequest
        | DeleteSessionRequest
        | ForkSessionRequest
        | ResumeSessionRequest
        | CloseSessionRequest
        | SetSessionModeRequest
        | SetSessionConfigOptionRequest
        | PromptRequest
        | StartNesRequest
        | SuggestNesRequest
        | CloseNesRequest
        | MessageMcpRequest2
        | ExtMethodRequest1
      )
    | null;
}
/**
 * Request parameters for the initialize method.
 *
 * Sent by the client to establish connection and negotiate capabilities.
 *
 * See protocol docs: [Initialization](https://agentclientprotocol.com/protocol/initialization)
 */
export interface InitializeRequest1 {
  /**
   * The latest protocol version supported by the client.
   */
  protocolVersion: ProtocolVersion;
  /**
   * Capabilities supported by the client.
   */
  clientCapabilities?: ClientCapabilities;
  /**
   * Information about the Client name and version sent to the Agent.
   *
   * Note: in future versions of the protocol, this will be required.
   */
  clientInfo?: Implementation | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
 * See protocol docs: [Client Capabilities](https://agentclientprotocol.com/protocol/initialization#client-capabilities)
 */
export interface ClientCapabilities {
  /**
   * File system capabilities supported by the client.
   * Determines which file operations the agent can request.
   */
  fs?: FileSystemCapabilities;
  /**
   * Whether the Client support all `terminal/*` methods.
   */
  terminal?: boolean;
  /**
   * Session-related capabilities supported by the client.
   *
   * Optional. Omitted or `null` both mean the client does not advertise any
   * session-related extensions.
   */
  session?: ClientSessionCapabilities | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Whether the client supports `plan_update` and `plan_removed` session updates.
   *
   * Optional. Omitted or `null` both mean the client does not advertise support.
   * Supplying `{}` means the client can receive both update types.
   */
  plan?: PlanCapabilities | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * Authentication capabilities supported by the client.
   * Determines which authentication method types the agent may include
   * in its `InitializeResponse`.
   */
  auth?: AuthCapabilities;
  /**
   * Elicitation capabilities supported by the client.
   * Determines which elicitation modes the agent may use.
   *
   * Optional. Omitted or `null` both mean the client does not advertise
   * elicitation support.
   */
  elicitation?: ElicitationCapabilities | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * NES (Next Edit Suggestions) capabilities supported by the client.
   *
   * Optional. Omitted or `null` both mean the client does not advertise any
   * NES suggestion-kind extensions.
   */
  nes?: ClientNesCapabilities | null;
  /**
   * **UNSTABLE**
   *
   * This capability is not part of the spec yet, and may be removed or changed at any point.
   *
   * The position encodings supported by the client, in order of preference.
   */
  positionEncodings?: PositionEncodingKind[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * File system capabilities that a client may support.
 *
 * See protocol docs: [FileSystem](https://agentclientprotocol.com/protocol/initialization#filesystem)
 */
export interface FileSystemCapabilities {
  /**
   * Whether the Client supports `fs/read_text_file` requests.
   */
  readTextFile?: boolean;
  /**
   * Whether the Client supports `fs/write_text_file` requests.
   */
  writeTextFile?: boolean;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Session-related capabilities supported by the client.
 */
export interface ClientSessionCapabilities {
  /**
   * Config option capabilities supported by the client.
   *
   * Omitted or `null` both mean the client does not advertise support for any
   * config option extensions.
   */
  configOptions?: SessionConfigOptionsCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Session configuration option capabilities supported by the client.
 */
export interface SessionConfigOptionsCapabilities {
  /**
   * Whether the client supports boolean session configuration options.
   *
   * Optional. Omitted or `null` both mean the client does not advertise support.
   * Supplying `{}` means agents may include `type: "boolean"` entries in
   * `configOptions`, and the client may send `session/set_config_option`
   * requests with `type: "boolean"` and a boolean `value`.
   */
  boolean?: BooleanConfigOptionCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Capabilities for boolean session configuration options.
 *
 * Supplying `{}` means the client supports boolean session configuration options.
 */
export interface BooleanConfigOptionCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Capabilities for receiving `plan_update` and `plan_removed` session updates.
 */
export interface PlanCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Authentication capabilities supported by the client.
 *
 * Advertised during initialization to inform the agent which authentication
 * method types the client can handle. This governs opt-in types that require
 * additional client-side support.
 */
export interface AuthCapabilities {
  /**
   * Whether the client supports `terminal` authentication methods.
   *
   * When `true`, the agent may include `terminal` entries in its authentication methods.
   */
  terminal?: boolean;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * NES capabilities advertised by the client during initialization.
 */
export interface ClientNesCapabilities {
  /**
   * Whether the client supports the `jump` suggestion kind.
   */
  jump?: NesJumpCapabilities | null;
  /**
   * Whether the client supports the `rename` suggestion kind.
   */
  rename?: NesRenameCapabilities | null;
  /**
   * Whether the client supports the `searchAndReplace` suggestion kind.
   */
  searchAndReplace?: NesSearchAndReplaceCapabilities | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Marker for jump suggestion support.
 */
export interface NesJumpCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Marker for rename suggestion support.
 */
export interface NesRenameCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Marker for search and replace suggestion support.
 */
export interface NesSearchAndReplaceCapabilities {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for the authenticate method.
 *
 * Specifies which authentication method to use.
 */
export interface AuthenticateRequest1 {
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/list`.
 */
export interface ListProvidersRequest1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/set`.
 *
 * Replaces the full configuration for one provider ID.
 */
export interface SetProviderRequest1 {
  /**
   * Provider ID to configure.
   */
  providerId: ProviderId;
  /**
   * Protocol type for this provider.
   */
  apiType: LlmProtocol;
  /**
   * Base URL for requests sent through this provider.
   */
  baseUrl: string;
  /**
   * Full headers map for this provider.
   * May include authorization, routing, or other integration-specific headers.
   */
  headers?: {
    [k: string]: string;
  };
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for `providers/disable`.
 */
export interface DisableProviderRequest1 {
  /**
   * Provider ID to disable.
   */
  providerId: ProviderId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for the logout method.
 *
 * Terminates the current authenticated session.
 */
export interface LogoutRequest1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for creating a new session.
 *
 * See protocol docs: [Creating a Session](https://agentclientprotocol.com/protocol/session-setup#creating-a-session)
 */
export interface NewSessionRequest1 {
  /**
   * The working directory for this session. Must be an absolute path.
   */
  cwd: string;
  /**
   * Additional workspace roots for this session. Each path must be absolute.
   *
   * These expand the session's filesystem scope without changing `cwd`, which
   * remains the base for relative paths. When omitted or empty, no
   * additional roots are activated for the new session.
   */
  additionalDirectories?: string[];
  /**
   * List of MCP (Model Context Protocol) servers the agent should connect to.
   */
  mcpServers: McpServer[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
  headers: HttpHeader[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * SSE transport configuration for MCP.
 */
export interface McpServerSse {
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
  headers: HttpHeader[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * ACP transport configuration for MCP.
 *
 * The MCP server is provided by an ACP component and communicates over the ACP channel
 * using `mcp/connect`, `mcp/message`, and `mcp/disconnect`.
 */
export interface McpServerAcp {
  /**
   * Human-readable name identifying this MCP server.
   */
  name: string;
  /**
   * Unique identifier for this MCP server, generated by the component providing it.
   *
   * Providers MUST NOT reuse an ID for multiple ACP-transport MCP servers that are visible
   * on the same ACP connection.
   */
  serverId: McpServerAcpId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
  command: string;
  /**
   * Command-line arguments to pass to the MCP server.
   */
  args: string[];
  /**
   * Environment variables to set when launching the MCP server.
   */
  env: EnvVariable[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for loading an existing session.
 *
 * Only available if the Agent supports the `loadSession` capability.
 *
 * See protocol docs: [Loading Sessions](https://agentclientprotocol.com/protocol/session-setup#loading-sessions)
 */
export interface LoadSessionRequest1 {
  /**
   * List of MCP servers to connect to for this session.
   */
  mcpServers: McpServer[];
  /**
   * The working directory for this session. Must be an absolute path.
   */
  cwd: string;
  /**
   * Additional workspace roots to activate for this session. Each path must be absolute.
   *
   * When omitted or empty, no additional roots are activated. When non-empty,
   * this is the complete resulting additional-root list for the loaded
   * session. It may differ from any previously used or reported list as long as
   * the request `cwd` matches the session's `cwd`.
   */
  additionalDirectories?: string[];
  /**
   * The ID of the session to load.
   */
  sessionId: SessionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for listing existing sessions.
 *
 * Only available if the Agent supports the `sessionCapabilities.list` capability.
 */
export interface ListSessionsRequest1 {
  /**
   * Filter sessions by working directory. Must be an absolute path.
   */
  cwd?: string | null;
  /**
   * Opaque cursor token from a previous response's nextCursor field for cursor-based pagination
   */
  cursor?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for deleting an existing session from `session/list`.
 *
 * Only available if the Agent supports the `sessionCapabilities.delete` capability.
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Request parameters for forking an existing session.
 *
 * Creates a new session based on the context of an existing one, allowing
 * operations like generating summaries without affecting the original session's history.
 *
 * Only available if the Agent supports the `session.fork` capability.
 */
export interface ForkSessionRequest1 {
  /**
   * The ID of the session to fork.
   */
  sessionId: SessionId;
  /**
   * The working directory for this session. Must be an absolute path.
   */
  cwd: string;
  /**
   * Additional workspace roots to activate for this session. Each path must be absolute.
   *
   * When omitted or empty, no additional roots are activated. When non-empty,
   * this is the complete resulting additional-root list for the forked
   * session.
   */
  additionalDirectories?: string[];
  /**
   * List of MCP servers to connect to for this session.
   */
  mcpServers?: McpServer[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for resuming an existing session.
 *
 * Resumes an existing session without returning previous messages (unlike `session/load`).
 * This is useful for agents that can resume sessions but don't implement full session loading.
 *
 * Only available if the Agent supports the `sessionCapabilities.resume` capability.
 */
export interface ResumeSessionRequest1 {
  /**
   * The ID of the session to resume.
   */
  sessionId: SessionId;
  /**
   * The working directory for this session. Must be an absolute path.
   */
  cwd: string;
  /**
   * Additional workspace roots to activate for this session. Each path must be absolute.
   *
   * When omitted or empty, no additional roots are activated. When non-empty,
   * this is the complete resulting additional-root list for the resumed
   * session. It may differ from any previously used or reported list as long as
   * the request `cwd` matches the session's `cwd`.
   */
  additionalDirectories?: string[];
  /**
   * List of MCP servers to connect to for this session.
   */
  mcpServers?: McpServer[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for closing an active session.
 *
 * If supported, the agent **must** cancel any ongoing work related to the session
 * (treat it as if `session/cancel` was called) and then free up any resources
 * associated with the session.
 *
 * Only available if the Agent supports the `sessionCapabilities.close` capability.
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request parameters for setting a session mode.
 */
export interface SetSessionModeRequest1 {
  /**
   * The ID of the session to set the mode for.
   */
  sessionId: SessionId;
  /**
   * The ID of the mode to set.
   */
  modeId: SessionModeId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A [`SessionConfigValueId`] string value.
 *
 * This is the default when `type` is absent on the wire. Unknown `type`
 * values with string payloads also gracefully deserialize into this
 * variant.
 */
export interface ValueId {
  /**
   * The value ID.
   */
  value: SessionConfigValueId;
}
/**
 * Request parameters for sending a user prompt to the agent.
 *
 * Contains the user's message and any additional context.
 *
 * See protocol docs: [User Message](https://agentclientprotocol.com/protocol/prompt-turn#1-user-message)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to start an NES session.
 */
export interface StartNesRequest1 {
  /**
   * The root URI of the workspace.
   */
  workspaceUri?: string | null;
  /**
   * The workspace folders.
   */
  workspaceFolders?: WorkspaceFolder[] | null;
  /**
   * Repository metadata, if the workspace is a git repository.
   */
  repository?: NesRepository | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A workspace folder.
 */
export interface WorkspaceFolder {
  /**
   * The URI of the folder.
   */
  uri: string;
  /**
   * The display name of the folder.
   */
  name: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Repository metadata for an NES session.
 */
export interface NesRepository {
  /**
   * The repository name.
   */
  name: string;
  /**
   * The repository owner.
   */
  owner: string;
  /**
   * The remote URL of the repository.
   */
  remoteUrl: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request for a code suggestion.
 */
export interface SuggestNesRequest1 {
  /**
   * The session ID for this request.
   */
  sessionId: SessionId;
  /**
   * The URI of the document to suggest for.
   */
  uri: string;
  /**
   * The version number of the document.
   */
  version: number;
  /**
   * The current cursor position.
   */
  position: Position;
  /**
   * The current text selection range, if any.
   */
  selection?: Range | null;
  /**
   * What triggered this suggestion request.
   */
  triggerKind: NesTriggerKind;
  /**
   * Context for the suggestion, included based on agent capabilities.
   */
  context?: NesSuggestContext | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Context attached to a suggestion request.
 */
export interface NesSuggestContext {
  /**
   * Recently accessed files.
   */
  recentFiles?: NesRecentFile[] | null;
  /**
   * Related code snippets.
   */
  relatedSnippets?: NesRelatedSnippet[] | null;
  /**
   * Recent edit history.
   */
  editHistory?: NesEditHistoryEntry[] | null;
  /**
   * Recent user actions (typing, navigation, etc.).
   */
  userActions?: NesUserAction[] | null;
  /**
   * Currently open files in the editor.
   */
  openFiles?: NesOpenFile[] | null;
  /**
   * Current diagnostics (errors, warnings).
   */
  diagnostics?: NesDiagnostic[] | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A recently accessed file.
 */
export interface NesRecentFile {
  /**
   * The URI of the file.
   */
  uri: string;
  /**
   * The language identifier.
   */
  languageId: string;
  /**
   * The full text content of the file.
   */
  text: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A related code snippet from a file.
 */
export interface NesRelatedSnippet {
  /**
   * The URI of the file containing the snippets.
   */
  uri: string;
  /**
   * The code excerpts.
   */
  excerpts: NesExcerpt[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A code excerpt from a file.
 */
export interface NesExcerpt {
  /**
   * The start line of the excerpt (zero-based).
   */
  startLine: number;
  /**
   * The end line of the excerpt (zero-based).
   */
  endLine: number;
  /**
   * The text content of the excerpt.
   */
  text: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An entry in the edit history.
 */
export interface NesEditHistoryEntry {
  /**
   * The URI of the edited file.
   */
  uri: string;
  /**
   * A diff representing the edit.
   */
  diff: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A user action (typing, cursor movement, etc.).
 */
export interface NesUserAction {
  /**
   * The kind of action (e.g., "insertChar", "cursorMovement").
   */
  action: string;
  /**
   * The URI of the file where the action occurred.
   */
  uri: string;
  /**
   * The position where the action occurred.
   */
  position: Position;
  /**
   * Timestamp in milliseconds since epoch.
   */
  timestampMs: number;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * An open file in the editor.
 */
export interface NesOpenFile {
  /**
   * The URI of the file.
   */
  uri: string;
  /**
   * The language identifier.
   */
  languageId: string;
  /**
   * The visible range in the editor, if any.
   */
  visibleRange?: Range | null;
  /**
   * Timestamp in milliseconds since epoch of when the file was last focused.
   */
  lastFocusedMs?: number | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A diagnostic (error, warning, etc.).
 */
export interface NesDiagnostic {
  /**
   * The URI of the file containing the diagnostic.
   */
  uri: string;
  /**
   * The range of the diagnostic.
   */
  range: Range;
  /**
   * The severity of the diagnostic.
   */
  severity: NesDiagnosticSeverity;
  /**
   * The diagnostic message.
   */
  message: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Request to close an NES session.
 *
 * The agent **must** cancel any ongoing work related to the NES session
 * and then free up any resources associated with the session.
 */
export interface CloseNesRequest1 {
  /**
   * The ID of the NES session to close.
   */
  sessionId: SessionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
    | WriteTextFileResponse
    | ReadTextFileResponse
    | RequestPermissionResponse
    | CreateTerminalResponse
    | TerminalOutputResponse
    | ReleaseTerminalResponse
    | WaitForTerminalExitResponse
    | KillTerminalResponse
    | CreateElicitationResponse
    | ConnectMcpResponse
    | DisconnectMcpResponse
    | MessageMcpResponse2
    | ExtMethodResponse1;
}
/**
 * Response to `fs/write_text_file`
 */
export interface WriteTextFileResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response containing the contents of a text file.
 */
export interface ReadTextFileResponse1 {
  /**
   * Content payload returned by this response.
   */
  content: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response containing the ID of the created terminal.
 */
export interface CreateTerminalResponse1 {
  /**
   * The unique identifier for the created terminal.
   */
  terminalId: TerminalId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response containing the terminal output and exit status.
 */
export interface TerminalOutputResponse1 {
  /**
   * The terminal output captured so far.
   */
  output: string;
  /**
   * Whether the output was truncated due to byte limits.
   */
  truncated: boolean;
  /**
   * Exit status if the command has completed.
   */
  exitStatus?: TerminalExitStatus | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Exit status of a terminal command.
 */
export interface TerminalExitStatus {
  /**
   * The process exit code (may be null if terminated by signal).
   */
  exitCode?: number | null;
  /**
   * The signal that terminated the process (may be null if exited normally).
   */
  signal?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to terminal/release method
 */
export interface ReleaseTerminalResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response containing the exit status of a terminal command.
 */
export interface WaitForTerminalExitResponse1 {
  /**
   * The process exit code (may be null if terminated by signal).
   */
  exitCode?: number | null;
  /**
   * The signal that terminated the process (may be null if exited normally).
   */
  signal?: string | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Response to `terminal/kill` method
 */
export interface KillTerminalResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
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
export interface Other6 {
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
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/connect`.
 */
export interface ConnectMcpResponse1 {
  /**
   * The unique identifier for this MCP-over-ACP connection.
   */
  connectionId: McpConnectionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * **UNSTABLE**
 *
 * This capability is not part of the spec yet, and may be removed or changed at any point.
 *
 * Response to `mcp/disconnect`.
 */
export interface DisconnectMcpResponse1 {
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
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
  params?:
    | (
        | CancelNotification
        | DidOpenDocumentNotification
        | DidChangeDocumentNotification
        | DidCloseDocumentNotification
        | DidSaveDocumentNotification
        | DidFocusDocumentNotification
        | AcceptNesNotification
        | RejectNesNotification
        | MessageMcpNotification2
        | ExtNotification2
      )
    | null;
}
/**
 * Notification to cancel ongoing operations for a session.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/prompt-turn#cancellation)
 */
export interface CancelNotification1 {
  /**
   * The ID of the session to cancel operations for.
   */
  sessionId: SessionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Notification sent when a file is opened in the editor.
 */
export interface DidOpenDocumentNotification1 {
  /**
   * The session ID for this notification.
   */
  sessionId: SessionId;
  /**
   * The URI of the opened document.
   */
  uri: string;
  /**
   * The language identifier of the document (e.g., "rust", "python").
   */
  languageId: string;
  /**
   * The version number of the document.
   */
  version: number;
  /**
   * The full text content of the document.
   */
  text: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Notification sent when a file is edited.
 */
export interface DidChangeDocumentNotification1 {
  /**
   * The session ID for this notification.
   */
  sessionId: SessionId;
  /**
   * The URI of the changed document.
   */
  uri: string;
  /**
   * The new version number of the document.
   */
  version: number;
  /**
   * The content changes.
   */
  contentChanges: TextDocumentContentChangeEvent[];
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * A content change event for a document.
 *
 * When `range` is `None`, `text` is the full content of the document.
 * When `range` is `Some`, `text` replaces the given range.
 */
export interface TextDocumentContentChangeEvent {
  /**
   * The range of the document that changed. If `None`, the entire content is replaced.
   */
  range?: Range | null;
  /**
   * The new text for the range, or the full document content if `range` is `None`.
   */
  text: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Notification sent when a file is closed.
 */
export interface DidCloseDocumentNotification1 {
  /**
   * The session ID for this notification.
   */
  sessionId: SessionId;
  /**
   * The URI of the closed document.
   */
  uri: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Notification sent when a file is saved.
 */
export interface DidSaveDocumentNotification1 {
  /**
   * The session ID for this notification.
   */
  sessionId: SessionId;
  /**
   * The URI of the saved document.
   */
  uri: string;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Notification sent when a file becomes the active editor tab.
 */
export interface DidFocusDocumentNotification1 {
  /**
   * The session ID for this notification.
   */
  sessionId: SessionId;
  /**
   * The URI of the focused document.
   */
  uri: string;
  /**
   * The version number of the document.
   */
  version: number;
  /**
   * The current cursor position.
   */
  position: Position;
  /**
   * The portion of the file currently visible in the editor viewport.
   */
  visibleRange: Range;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Notification sent when a suggestion is accepted.
 */
export interface AcceptNesNotification1 {
  /**
   * The session ID for this notification.
   */
  sessionId: SessionId;
  /**
   * The ID of the accepted suggestion.
   */
  id: NesSuggestionId;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
/**
 * Notification sent when a suggestion is rejected.
 */
export interface RejectNesNotification1 {
  /**
   * The session ID for this notification.
   */
  sessionId: SessionId;
  /**
   * The ID of the rejected suggestion.
   */
  id: NesSuggestionId;
  /**
   * The reason for rejection.
   */
  reason?: NesRejectReason | null;
  /**
   * The _meta property is reserved by ACP to allow clients and agents to attach additional
   * metadata to their interactions. Implementations MUST NOT make assumptions about values at
   * these keys.
   *
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
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
  params?: CancelRequestNotification | null;
}
/**
 * Notification to cancel an ongoing request.
 *
 * See protocol docs: [Cancellation](https://agentclientprotocol.com/protocol/cancellation)
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
   * See protocol docs: [Extensibility](https://agentclientprotocol.com/protocol/extensibility)
   */
  _meta?: {
    [k: string]: unknown;
  } | null;
}
