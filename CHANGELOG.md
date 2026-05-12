# Changelog

## 0.1.0 — 2026-05-10

Initial public release. Ships 23 lint rules grouped under six framework concerns (FK-1 through FK-6). All rules are part of the `recommended` category, so enabling them is one line in `oxlint.json`:

```jsonc
{
	"plugins": ["@mpsuesser/oxlint-plugin-foldkit"],
	"categories": { "recommended": "error" }
}
```

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
