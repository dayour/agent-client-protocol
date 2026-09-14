All paths in the protocol should be absolute

## Adding new methods

- Create empty params and output structs in src/client.rs or src/agent.rs under the corresponding section. I'll add the fields myself.
- If the protocol method name is `noun/verb`, use `verb_noun` for the user facing methods and structs.

  Example 1 (`noun/noun`):
  Protocol method: `terminal/output`
  Trait method name: `terminal_output`
  Request/Response structs: `TerminalOutputRequest` / `TerminalOutputResponse`
  Method names struct: `terminal_output: &'static str`

  Example 2 (`noun/verb`):
  Protocol method: `terminal/new`
  Trait method name: `new_terminal`
  Request/Response structs: `NewTerminalRequest` / `NewTerminalResponse`
  Method names struct: `terminal_new: &'static str`

- Add constants for the method names
- Add variants to {Agent|Client}{Request|Response} enums
- Add the method to src/bin/generate.rs SideDocs functions
- Run `npm run generate` and fix any issues that appear
- Run `npm run check`
- Update the example agents and clients in tests and examples in both libraries
- On Windows, run npm-backed commands from a drive-backed working directory instead of a UNC current directory. `cmd.exe`/`npm` can fail before repository scripts start when the current directory is a UNC path such as `\\server\share\repo`.

## Schema rules

- For any nullable field, explicitly define whether it is required or optional and whether `null` is equivalent to an omitted key before running schema generation.

## Generated TypeScript types

- `npm run generate` emits TypeScript declaration files under `typescript/`
  (`v1/schema.d.ts`, `v1/schema.unstable.d.ts`, `v2/schema.d.ts`,
  `v2/schema.unstable.d.ts`). They are produced by `typescript/generate-types.mjs`
  directly from the JSON Schema in the same `generate` run, so the types cannot
  drift from the schema.
- These files are generated, never hand-edited. To change a type, change the
  Rust source and regenerate. CI runs `npm run generate` followed by
  `git diff --exit-code`, so any manual edit or stale output fails the build.
- There is no generated zod (or other runtime-validator) schema in this
  repository. Consumers that need runtime validation should validate against the
  published JSON Schema under `schema/` with a standard JSON Schema validator
  (for example `ajv`), which is the source of truth the `.d.ts` types are
  derived from.

## Updating existing methods, their params, or output

- Update the mintlify docs and guides in the `docs` directory
- Run `npm run generate` to regenerate the JSON Schema and the TypeScript
  declaration types, then run `npm run check` to lint, format-check, spellcheck,
  and test. `npm run generate` writes the schema artifacts under `schema/`, the
  markdown docs under `docs/protocol/`, and the `.d.ts` types under
  `typescript/`; `npm run check` does not regenerate them, so run `generate`
  first whenever you change methods, params, or output.

Never write readme files related to the conversation unless explicitly asked to.

## Conventional Commits

This repository uses **Conventional Commits** for automated releases via release-plz. All commit messages should follow this format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat:** A new feature (triggers minor version bump)
- **fix:** A bug fix (triggers patch version bump)
- **docs:** Documentation only changes
- **style:** Code style changes (formatting, missing semicolons, etc.)
- **refactor:** Code changes that neither fix bugs nor add features
- **perf:** Performance improvements
- **test:** Adding or updating tests
- **chore:** Maintenance tasks, dependency updates, etc.
- **ci:** CI/CD configuration changes
- **build:** Build system or external dependency changes

### Examples

```
feat(schema): add support for dynamic proxy chains
fix(unstable): resolve deadlock in message routing
docs(rfd): update README with installation instructions
chore: bump tokio to 1.40
```

### Scope Guidelines

Common scopes for this repository:

- `schema` - Anything that touches the actual generated schema
- `unstable` - Any changes that would only touch unstable features
- `unstable-v2` - Any changes that would only touch v2
- `rust` - Any changes that only touch Rust code and how Rust handles the data with no changes to the schema
- `rfd` - Any changes that only touch RFD documentation
