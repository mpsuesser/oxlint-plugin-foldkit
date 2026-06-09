# oxlint-plugin-foldkit

[![npm](https://img.shields.io/npm/v/@mpsuesser/oxlint-plugin-foldkit)](https://www.npmjs.com/package/@mpsuesser/oxlint-plugin-foldkit)
[![JSR](https://jsr.io/badges/@mpsuesser/oxlint-plugin-foldkit)](https://jsr.io/@mpsuesser/oxlint-plugin-foldkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

An opinionated [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin for [Foldkit](https://github.com/foldkit/foldkit) that codifies framework conventions — message naming, command identity, routing, view-layer accessibility, and Foldkit-specific type-shape conventions — as lint rules.

> This is an unofficial, personal ruleset published under `@mpsuesser/*` so the canonical `oxlint-plugin-foldkit` / `foldkit/*` namespace remains available for the Foldkit project itself.

The plugin ships **16 rules** grouped under six framework concerns (FK-1 through FK-6). Rules are implemented with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK and run as standard oxlint custom rules.

## Installation

```sh
npm install @mpsuesser/oxlint-plugin-foldkit
# or
bun add @mpsuesser/oxlint-plugin-foldkit
```

Use the generated recommended config from `oxlint.config.ts`:

```ts
import { defineConfig } from 'oxlint';
import foldkit from '@mpsuesser/oxlint-plugin-foldkit';

export default defineConfig({
	extends: [foldkit.configs.recommended]
});
```

`configs.recommended` registers the package through oxlint's `jsPlugins` field and enables all 16 rules at `error` severity.

To override an individual rule, add a `rules` entry after the `extends` block:

```ts
import { defineConfig } from 'oxlint';
import foldkit from '@mpsuesser/oxlint-plugin-foldkit';

export default defineConfig({
	extends: [foldkit.configs.recommended],
	rules: {
		'@mpsuesser/foldkit/no-hand-rolled-form-controls': 'off',
		'@mpsuesser/foldkit/no-hand-rolled-form-controls': 'warn'
	}
});
```

If you use `.oxlintrc.json`, oxlint cannot import a package config object. Configure the JS plugin and any rules you want explicitly:

```jsonc
{
	"jsPlugins": ["@mpsuesser/oxlint-plugin-foldkit"],
	"rules": {
		"@mpsuesser/foldkit/no-hand-rolled-form-controls": "error"
	}
}
```

Use `oxlint.config.ts` when you want the full generated recommended config.

## Rules at a glance

| Rule                                                                                                         | What it catches                                                                |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [`require-past-tense-message-names`](#fk-1-1-require-past-tense-message-names)                               | Message tags that are not verb-first past tense                                |
| [`no-changed-message-prefix`](#fk-1-2-no-changed-message-prefix)                                             | `Changed*` instead of `Updated*`, except `ChangedRoute` / `ChangedUrl`         |
| [`require-succeeded-failed-pair`](#fk-1-3-require-succeeded-failed-pair)                                     | `Succeeded*` without a matching `Failed*`                                      |
| [`require-completed-mirrors-command`](#fk-1-4-require-completed-mirrors-command)                             | `Completed*` Message that doesn't mirror a local `Command.define(...)`         |
| [`command-define-pascal-const`](#fk-2-1-command-define-pascal-const)                                         | `Command.define('Foo', ...)` not bound to `const Foo`                          |
| [`no-empty-object-tagged-call`](#fk-2-2-no-empty-object-tagged-call)                                         | `Idle({})` instead of `Idle()`                                                 |
| [`no-spread-in-evo`](#fk-2-3-no-spread-in-evo)                                                               | `{ ...obj, x }` spread inside an `evo` updater                                 |
| [`no-explicit-command-type-annotation`](#fk-2-4-no-explicit-command-type-annotation)                         | Redundant `: Command<...>` annotation                                          |
| [`prefer-option-match-over-map-getorelse`](#fk-3-1-prefer-option-match-over-map-getorelse)                   | `Option.map(...).pipe(Option.getOrElse(...))`                                  |
| [`no-hardcoded-route-strings`](#fk-4-1-no-hardcoded-route-strings)                                           | Path literals passed to `Href` / `navigateInternal` / `loadExternalUrl`        |
| [`require-rel-for-external-link`](#fk-5-1-require-rel-for-external-link)                                     | `Target('_blank')` without `Rel('noopener noreferrer')`                        |
| [`prefer-empty-over-empty-element`](#fk-5-2-prefer-empty-over-empty-element)                                 | `span([], [])` / `div([], [])`                                                 |
| [`label-requires-for`](#fk-5-3-label-requires-for)                                                           | `label(...)` with no `For(id)`                                                 |
| [`no-hand-rolled-form-controls`](#fk-5-4-no-hand-rolled-form-controls)                                       | Bare `input` / `textarea` / `button`                                           |
| [`keyed-required-for-mapped-rows`](#fk-5-5-keyed-required-for-mapped-rows)                                   | `items.map((item) => li(...))` over identity-bearing rows without `keyed(...)` |
| [`no-array-shorthand-type`](#fk-6-1-no-array-shorthand-type)                                                 | `T[]` syntax                                                                   |

---

## FK-1 · Message naming

Foldkit's Elm-style architecture leans heavily on Messages as a self-documenting log of what happened in the program. The naming grammar is verb-first past tense: `Loaded`, `Clicked`, `Updated`, `Submitted`. The four rules in this group enforce that grammar and keep Messages structurally paired with the Commands that produce them.

### FK-1.1 · `require-past-tense-message-names`

Message tags that don't start with an allow-listed past-tense verb prefix.

```ts
// ❌
type Msg =
	| { _tag: 'LoadingUser' } // present participle
	| { _tag: 'Save' } // imperative
	| { _tag: 'UserClick' }; // noun-first

// ✅
type Msg = { _tag: 'LoadedUser' } | { _tag: 'Saved' } | { _tag: 'ClickedUser' };
```

The allow-listed prefixes include verbs such as `Applied`, `Loaded`, `Clicked`, `Submitted`, `Updated`, `Saved`, `Deleted`, `Created`, `Selected`, `Toggled`, `Opened`, `Closed`, `Failed`, `Succeeded`, `Completed`, `Started`, `Stopped`, `Pressed`, `Typed`, `Focused`, `Blurred`, `Hovered`, `Dropped`, `Dragged`, `Scrolled`, `Resized`, `Received`, `Sent`, `Initialized`, `Tick`, `Got`, and `Returned`.

### FK-1.2 · `no-changed-message-prefix`

`Changed*` is split across two intents — DOM-input changes and external state updates — both of which Foldkit usually collapses under `Updated*`. Route and URL events are the exception: `ChangedRoute` and `ChangedUrl` describe navigation facts, so the rule allows those two tags.

```ts
// ❌
type Msg =
	| { _tag: 'ChangedName'; value: string }
	| { _tag: 'ChangedConnectionStatus'; status: Status };

// ✅
type Msg =
	| { _tag: 'UpdatedName'; value: string }
	| { _tag: 'UpdatedConnectionStatus'; status: Status };
```

### FK-1.3 · `require-succeeded-failed-pair`

Every fallible Command emits two Messages: one for success, one for failure. Shipping only the happy path is almost always a bug — the `Failed*` branch is what tells `update` how to surface the error to the user.

```ts
// ❌  Only the success Message is declared.
type Msg = { _tag: 'SucceededFetchUser'; user: User };

// ✅
type Msg =
	| { _tag: 'SucceededFetchUser'; user: User }
	| { _tag: 'FailedFetchUser'; error: ApiError };
```

The rule is per-file: as long as both tags appear somewhere in the same module, it's satisfied.

### FK-1.4 · `require-completed-mirrors-command`

`Completed<Action>` Messages must repeat the Command's name verb-first. This makes the Message ↔ Command relationship grep-able and keeps the `update` switch readable.

```ts
const FocusInput = Command.define('FocusInput', ...);

// ❌  Reordered words — `Completed` no longer mirrors the Command.
type Msg = { _tag: 'CompletedInputFocus' };

// ✅
type Msg = { _tag: 'CompletedFocusInput' };
```

---

## FK-2 · Command identity and construction shape

These rules pin down how Commands are declared and how tagged-struct constructors are called. The goal is one canonical shape per concept so that find-references and `grep` always work the same way.

### FK-2.1 · `command-define-pascal-const`

`Command.define('Foo', ...)` must be bound to a top-level `const Foo`. Two reasons: the variable name and the string tag stay in sync, and there's exactly one place to find references to a Command.

```ts
// ❌  Lowercase const, or no const at all.
const focusInput = Command.define('FocusInput', focusInputEffect);
pipe(model, evo({ pending: () => Command.define('Sync', syncEffect) }));

// ❌  Variable name doesn't match the tag.
const Focus = Command.define('FocusInput', focusInputEffect);

// ✅
const FocusInput = Command.define('FocusInput', focusInputEffect);
```

### FK-2.2 · `no-empty-object-tagged-call`

`Data.TaggedEnum` / `Schema.TaggedStruct` constructors accept zero arguments when the variant has no fields. Calling them with `{}` is a stylistic relic from a different ADT library.

```ts
// ❌
const initial = Idle({});
return Failed({});

// ✅
const initial = Idle();
return Failed();
```

### FK-2.3 · `no-spread-in-evo`

Inside an `evo` updater, a spread (`...`) on a nested record sneaks past Foldkit's canonical update path and makes nested updates hard to reason about. Use a nested `evo` instead.

```ts
// ❌
const next = evo(model, {
	form: () => ({ ...model.form, name: newName })
});

// ✅
const next = evo(model, {
	form: () => evo(model.form, { name: newName })
});
```

### FK-2.4 · `no-explicit-command-type-annotation`

The return type of `Command.define(...)` already encodes the Command identity at the type level. Annotating the binding with `: Command<...>` adds noise that TypeScript would have inferred anyway.

```ts
// ❌
const FetchUser: Command<User, ApiError, UserRepo> = Command.define(
	'FetchUser',
	fetchUserEffect
);

// ✅
const FetchUser = Command.define('FetchUser', fetchUserEffect);
```

---

## FK-3 · Option idiom

One rule that flags a fluent Option pattern where Foldkit's exemplars consistently prefer a more direct combinator.

### FK-3.1 · `prefer-option-match-over-map-getorelse`

`Option.map` followed by `Option.getOrElse` is the same shape as `Option.match`, but with anonymous lambdas instead of labeled branches.

```ts
// ❌
const label = maybeUser.pipe(
	Option.map((u) => u.name),
	Option.getOrElse(() => 'Guest')
);

// ✅
const label = Option.match(maybeUser, {
	onNone: () => 'Guest',
	onSome: (u) => u.name
});
```

---

## FK-4 · Routing

### FK-4.1 · `no-hardcoded-route-strings`

Foldkit routers are bidirectional: the same route definition is used to parse URLs _and_ print them. Hand-rolling path strings duplicates that knowledge and breaks the moment a route signature changes.

```ts
// ❌
a([Href('/users/123')], [t('Profile')]);
navigateInternal('/users/123');
loadExternalUrl('/checkout/success');

// ❌  Template literals don't help — still hardcoded shape.
a([Href(`/users/${user.id}`)], [t('Profile')]);

// ✅
a([Href(Routes.userProfile(user.id))], [t('Profile')]);
navigateInternal(Routes.userProfile(user.id));
loadExternalUrl(Routes.checkoutSuccess());
```

---

## FK-5 · View and accessibility

Five rules that catch view-layer mistakes that compile cleanly but break accessibility, semantic HTML, or snabbdom's vdom patching.

### FK-5.1 · `require-rel-for-external-link`

Opening a link in a new tab without `rel="noopener noreferrer"` exposes the parent page to tabnabbing and leaks the referrer.

```ts
// ❌
a([Href(url), Target('_blank')], [t('Open')]);

// ✅
a([Href(url), Target('_blank'), Rel('noopener noreferrer')], [t('Open')]);
```

### FK-5.2 · `prefer-empty-over-empty-element`

`span([], [])` and `div([], [])` render an empty DOM node that contributes nothing to layout or semantics. Foldkit ships a dedicated `empty` constant for the "nothing here" branch.

```ts
// ❌
return condition ? span([], []) : someContent;

// ❌  Common in JSX-style namespace import:
return condition ? h.div([], []) : someContent;

// ✅
return condition ? empty : someContent;
return condition ? h.empty : someContent;
```

### FK-5.3 · `label-requires-for`

A `<label>` without a `for` attribute is invisible to screen readers and to click-the-label-to-focus-the-input behavior. Either add `For(id)` or use `Ui.Input.view`, which wires the association automatically.

```ts
// ❌
label([], [t('Name')]);
label([Class('field-label')], [t('Name')]);

// ✅
label([For('user-name')], [t('Name')]);
input([Id('user-name'), Type('text')]);

// ✅  Or let Ui.Input own the wiring.
Ui.Input.view({ label: 'Name', value: model.name, onChange: UpdatedName });
```

### FK-5.4 · `no-hand-rolled-form-controls`

Bare `input`, `textarea`, and `button` skip the accessibility wiring, validation hooks, and ARIA states that the Foldkit `Ui.*` widgets ship by default.

```ts
// ❌
input([Type('text'), Value(model.name), OnInput(UpdatedName)]);
button([OnClick(Submit())], [t('Submit')]);
textarea([Value(model.notes), OnInput(UpdatedNotes)]);

// ✅
Ui.Input.view({ value: model.name, onChange: UpdatedName, label: 'Name' });
Ui.Button.view({ label: 'Submit', onClick: Submit() });
Ui.Textarea.view({ value: model.notes, onChange: UpdatedNotes });
```

Spreading the attributes passed to a `Ui.*.toView` callback is permitted — that's the documented escape hatch for custom looks. For any other reason, suppress with a directive:

```ts
// oxlint-disable-next-line @mpsuesser/foldkit/no-hand-rolled-form-controls -- third-party autocomplete library
input([Type('text'), Id('places-autocomplete')]);
```

### FK-5.5 · `keyed-required-for-mapped-rows`

Snabbdom patches the existing vdom into the new one positionally unless rows are keyed. When a list mutates — delete-mid-list, reorder, filter — unkeyed rows can pick up handlers, focus, and state from a sibling row.

The rule only fires when the callback body references `<param>.id`, so static literal lists (`['Red', 'Green', 'Blue'].map(...)`) are passed through.

```ts
// ❌
ul(
	[],
	items.map((item) =>
		li([OnClick(ClickedDelete({ id: item.id }))], [t(item.title)])
	)
);

// ❌  Destructured params are assumed identity-bearing.
items.map(({ id, title }) => tr([Class('row')], [td([], [t(title)])]));

// ✅
ul(
	[],
	items.map((item) =>
		keyed('li')(
			item.id,
			[OnClick(ClickedDelete({ id: item.id }))],
			[t(item.title)]
		)
	)
);
```

Row tags considered "identity-bearing" by the rule: `li`, `div`, `tr`, `article`, `section`.

---

## FK-6 · Type shape

One rule that enforces Foldkit's TypeScript type-shape preference.

### FK-6.1 · `no-array-shorthand-type`

`T[]` and `Array<T>` are equivalent to TypeScript, but Foldkit consistently uses the generic form (and `ReadonlyArray<T>` for read-only). This keeps `readonly` upgrades a one-character change instead of a syntax migration.

```ts
// ❌
type Users = User[];
type ReadonlyUsers = readonly User[];

function names(users: User[]): string[] { ... }

// ✅
type Users = Array<User>;
type ReadonlyUsers = ReadonlyArray<User>;

function names(users: ReadonlyArray<User>): Array<string> { ... }
```

---

## Suppression

All rules respect oxlint's standard disable directives:

```ts
// oxlint-disable-next-line @mpsuesser/foldkit/<rule-name> -- reason

/* oxlint-disable @mpsuesser/foldkit/<rule-name> -- reason */
// ... block ...
/* oxlint-enable @mpsuesser/foldkit/<rule-name> */
```

A trailing `-- <reason>` comment is encouraged for any suppression that lives longer than a single PR review.

## Development

```sh
bun install
bun test          # run the test suite (168 tests across 16 rules)
bun run typecheck # tsgo
bun run check     # format + lint
```

Each rule lives in `src/rules/<rule-name>.ts` with a sibling test in `test/rules/<rule-name>.test.ts`. The rule SDK is documented at [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint).

## License

MIT
