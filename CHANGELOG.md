# Changelog

## Unreleased

## 0.2.3 — Effect 4.0.0-beta.78

### Changed

- Updated `effect` (and `@effect/vitest`) to `4.0.0-beta.78` and `effect-oxlint` to `^0.3.2`.
- Switched the npm publish workflow to OIDC trusted publishing (no `NPM_TOKEN`): Node 24 plus `npm@latest` for npm >= 11.5.1.

## 0.2.2 — JSR default export docs

### Fixed

- Attached JSR symbol documentation to the exported plugin value so the generated docs no longer show the default export as undocumented.

## 0.2.1 — JSR score improvements

### Changed

- Removed JSR slow-type diagnostics by giving each rule module an explicit `CreateRule` export boundary.
- Documented the default plugin export for generated JSR symbol docs.
- Updated the JSR publish workflow to pass fast-check and rely on GitHub Actions provenance without `--allow-slow-types`.

## 0.2.0 — Generated config presets

### Changed

- Published package exports now point at built `dist/` files instead of raw TypeScript source, so oxlint can load the plugin from `node_modules` without Node type-stripping failures.
- Added a generated `configs.recommended` config for `oxlint.config.ts`; importing the plugin and extending this config now registers the JS plugin and enables all 23 rules at `error` severity.
- Replaced the old native-plugin-style `plugins` / `categories.recommended` documentation with oxlint JS plugin configuration using `jsPlugins` and explicit rule IDs.
- Updated to `effect-oxlint@0.3.0`, Effect `4.0.0-beta.70`, Bun `1.3.14`, and current supporting tool versions.

## 0.1.0 — 2026-05-10

Initial public release. Ships 23 lint rules grouped under six framework concerns (FK-1 through FK-6). All rules ship in the generated `configs.recommended` config for `oxlint.config.ts`.

### Added

**FK-1 · Message naming**

- `require-past-tense-message-names` — enforces verb-first past-tense Message tags from an allow-list.
- `no-changed-message-prefix` — flags `Changed*` Messages; suggests `Updated*` instead.
- `require-succeeded-failed-pair` — every `Succeeded*` Message must have a paired `Failed*` in the same file.
- `require-completed-mirrors-command` — `Completed<Action>` must mirror the verb order of a matching `Command.define(...)` in the file.

**FK-2 · Command identity and construction shape**

- `command-define-pascal-const` — `Command.define('Foo', ...)` must be bound to a top-level `const Foo`.
- `no-empty-object-tagged-call` — flags `Idle({})` for no-field tagged-struct constructors; suggests `Idle()`.
- `no-spread-in-evo` — flags `{ ...obj, x }` spread inside an `evo` updater; suggests a nested `evo`.
- `no-explicit-command-type-annotation` — flags redundant `: Command<...>` annotations.

**FK-3 · Effect, Option, and Array idioms**

- `prefer-option-match-over-map-getorelse` — flags `Option.map(...).pipe(Option.getOrElse(...))`; suggests `Option.match`.
- `prefer-option-when-over-ternary` — flags `cond ? Option.some(x) : Option.none()`; suggests `Option.when` / `Option.unless`.
- `prefer-array-fromoption-over-option-match-empty` — flags `Option.match` that produces `[]` / `[v]`; suggests `Array.fromOption`.
- `no-length-comparison` — flags `.length === 0` and related shapes; suggests `Array.isEmptyArray` / `Array.isNonEmptyArray` / `String.isNonEmpty` / `Array.match`.
- `no-effect-ignore-then-as` — flags redundant `Effect.ignore` before `Effect.as`, and `Effect.ignore` on infallible primitives.

**FK-4 · Routing**

- `no-hardcoded-route-strings` — flags path literals passed to `Href` / `navigateInternal` / `loadExternalUrl`; suggests the matching router function.

**FK-5 · View and accessibility**

- `require-rel-for-external-link` — `Target('_blank')` must be paired with `Rel('noopener noreferrer')`.
- `prefer-empty-over-empty-element` — flags `span([], [])` / `div([], [])`; suggests `empty` / `h.empty`.
- `label-requires-for` — `label(...)` must include `For(id)`.
- `no-hand-rolled-form-controls` — flags bare `input` / `textarea` / `button`; suggests the matching `Ui.*` widget. Spreading attributes passed to a `Ui.*.toView` callback is allowed.
- `keyed-required-for-mapped-rows` — identity-bearing `.map` rows (callbacks that reference `<param>.id`) must wrap with `keyed(...)`. Row tags: `li`, `div`, `tr`, `article`, `section`.

**FK-6 · Schema and type shape**

- `require-capitalized-schema-literals` — `Schema.Literals([...])` entries must be capitalized.
- `require-is-prefix-for-boolean-schema-field` — `Schema.Boolean` fields need an `is*` / `has*` / `can*` / `should*` / `was*` / `will*` prefix.
- `no-array-shorthand-type` — flags `T[]`; suggests `Array<T>` / `ReadonlyArray<T>`.
- `maybe-prefix-requires-option` — `maybe*` named fields must be `Option<T>` (TS) or `Schema.Option(...)` (Schema).
