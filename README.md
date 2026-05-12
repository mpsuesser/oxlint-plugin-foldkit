# oxlint-plugin-foldkit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

An opinionated [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin for [Foldkit](https://github.com/foldkit/foldkit) that codifies framework conventions — message naming, command identity, view-layer accessibility, Schema shapes, and Effect-flavored idioms — as lint rules.

The plugin ships **23 rules** grouped under six framework concerns (FK-1 through FK-6). Rules are implemented with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK and run as standard oxlint custom rules.

## Installation

```sh
npm install oxlint-plugin-foldkit
# or
bun add oxlint-plugin-foldkit
```

Register the plugin and enable the recommended category in your oxlint config:

```jsonc
// oxlint.json
{
	"plugins": ["oxlint-plugin-foldkit"],
	"categories": {
		"recommended": "error"
	}
}
```

All 23 rules ship in the `recommended` category, so the snippet above turns the whole rule set on at once. To switch the severity, change `"error"` to `"warn"`.

To turn an individual rule off, set it to `"off"` in the `rules` block:

```jsonc
{
	"plugins": ["oxlint-plugin-foldkit"],
	"categories": {
		"recommended": "error"
	},
	"rules": {
		"foldkit/no-hand-rolled-form-controls": "off"
	}
}
```

To suppress a rule at a specific call site, use oxlint's native disable directive:

```ts
// oxlint-disable-next-line foldkit/no-hand-rolled-form-controls -- third-party widget needs raw <button>
button([Ui.OnClick(Submit())], [t('Submit')]);
```

## Rules at a glance

| Group                                   | Rule                                                                                                         | What it catches                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **FK-1** Message naming                 | [`require-past-tense-message-names`](#fk-1-1-require-past-tense-message-names)                               | Message tags that are not verb-first past tense                                |
|                                         | [`no-changed-message-prefix`](#fk-1-2-no-changed-message-prefix)                                             | `Changed*` instead of `Updated*`                                               |
|                                         | [`require-succeeded-failed-pair`](#fk-1-3-require-succeeded-failed-pair)                                     | `Succeeded*` without a matching `Failed*`                                      |
|                                         | [`require-completed-mirrors-command`](#fk-1-4-require-completed-mirrors-command)                             | `Completed*` Message that doesn't mirror a local `Command.define(...)`         |
| **FK-2** Command / construction shape   | [`command-define-pascal-const`](#fk-2-1-command-define-pascal-const)                                         | `Command.define('Foo', ...)` not bound to `const Foo`                          |
|                                         | [`no-empty-object-tagged-call`](#fk-2-2-no-empty-object-tagged-call)                                         | `Idle({})` instead of `Idle()`                                                 |
|                                         | [`no-spread-in-evo`](#fk-2-3-no-spread-in-evo)                                                               | `{ ...obj, x }` spread inside an `evo` updater                                 |
|                                         | [`no-explicit-command-type-annotation`](#fk-2-4-no-explicit-command-type-annotation)                         | Redundant `: Command<...>` annotation                                          |
| **FK-3** Effect / Option / Array idioms | [`prefer-option-match-over-map-getorelse`](#fk-3-1-prefer-option-match-over-map-getorelse)                   | `Option.map(...).pipe(Option.getOrElse(...))`                                  |
|                                         | [`prefer-option-when-over-ternary`](#fk-3-2-prefer-option-when-over-ternary)                                 | `cond ? Option.some(x) : Option.none()`                                        |
|                                         | [`prefer-array-fromoption-over-option-match-empty`](#fk-3-3-prefer-array-fromoption-over-option-match-empty) | `Option.match` that produces `[]` / `[v]`                                      |
|                                         | [`no-length-comparison`](#fk-3-4-no-length-comparison)                                                       | `.length === 0` and friends                                                    |
|                                         | [`no-effect-ignore-then-as`](#fk-3-5-no-effect-ignore-then-as)                                               | Redundant `Effect.ignore` before `Effect.as`, or on infallible primitives      |
| **FK-4** Routing                        | [`no-hardcoded-route-strings`](#fk-4-1-no-hardcoded-route-strings)                                           | Path literals passed to `Href` / `navigateInternal` / `loadExternalUrl`        |
| **FK-5** View / accessibility           | [`require-rel-for-external-link`](#fk-5-1-require-rel-for-external-link)                                     | `Target('_blank')` without `Rel('noopener noreferrer')`                        |
|                                         | [`prefer-empty-over-empty-element`](#fk-5-2-prefer-empty-over-empty-element)                                 | `span([], [])` / `div([], [])`                                                 |
|                                         | [`label-requires-for`](#fk-5-3-label-requires-for)                                                           | `label(...)` with no `For(id)`                                                 |
|                                         | [`no-hand-rolled-form-controls`](#fk-5-4-no-hand-rolled-form-controls)                                       | Bare `input` / `textarea` / `button`                                           |
|                                         | [`keyed-required-for-mapped-rows`](#fk-5-5-keyed-required-for-mapped-rows)                                   | `items.map((item) => li(...))` over identity-bearing rows without `keyed(...)` |
| **FK-6** Schema / type shape            | [`require-capitalized-schema-literals`](#fk-6-1-require-capitalized-schema-literals)                         | Lowercase `Schema.Literals(['foo'])`                                           |
|                                         | [`require-is-prefix-for-boolean-schema-field`](#fk-6-2-require-is-prefix-for-boolean-schema-field)           | `S.Boolean` field without an `is*` / `has*` / `can*` / ... prefix              |
|                                         | [`no-array-shorthand-type`](#fk-6-3-no-array-shorthand-type)                                                 | `T[]` syntax                                                                   |
|                                         | [`maybe-prefix-requires-option`](#fk-6-4-maybe-prefix-requires-option)                                       | `maybe*` named field that is not an `Option<T>`                                |

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

The allow-listed prefixes are: `Loaded`, `Clicked`, `Submitted`, `Updated`, `Saved`, `Deleted`, `Created`, `Selected`, `Toggled`, `Opened`, `Closed`, `Failed`, `Succeeded`, `Completed`, `Started`, `Stopped`, `Pressed`, `Typed`, `Focused`, `Blurred`, `Hovered`, `Dropped`, `Dragged`, `Scrolled`, `Resized`, `Received`, `Sent`, `Initialized`, `Tick`, `Got`, `Returned`.

### FK-1.2 · `no-changed-message-prefix`

`Changed*` is split across two intents — DOM-input changes and external state updates — both of which Foldkit collapses under `Updated*`.

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

## FK-3 · Effect, Option, and Array idioms

Five rules that flag fluent patterns where Foldkit's exemplars consistently prefer a more direct combinator.

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

### FK-3.2 · `prefer-option-when-over-ternary`

Ternary expressions that branch into `Option.some` / `Option.none` are exactly what `Option.when` (or `Option.unless`) expresses.

```ts
// ❌
const maybeName = user.isAdmin ? Option.some(user.name) : Option.none();

const maybeName = !user.isBlocked ? Option.some(user.name) : Option.none();

// ✅
const maybeName = Option.when(user.isAdmin, () => user.name);
const maybeName = Option.unless(user.isBlocked, () => user.name);
```

### FK-3.3 · `prefer-array-fromoption-over-option-match-empty`

`Option<A>` → `Array<A>` is `Array.fromOption`. Spelling that as `Option.match` with `[]` / `[v]` branches obscures the intent.

```ts
// ❌
const items = Option.match(maybeUser, {
	onNone: () => [],
	onSome: (u) => [u]
});

// ✅
const items = Array.fromOption(maybeUser);
```

### FK-3.4 · `no-length-comparison`

`.length === 0` (and the various `> 0`, `!== 0`, `>= 1` variants) over-indexes on JavaScript's array shape. Use the named predicates so the intent is on the page.

```ts
// ❌
if (users.length === 0) return placeholder;
if (name.length > 0) submit(name);
if (xs.length !== 0) {
	/* ... */
}

// ✅
if (Array.isEmptyArray(users)) return placeholder;
if (String.isNonEmpty(name)) submit(name);
if (Array.isNonEmptyArray(xs)) {
	/* ... */
}

// For branching:
Array.match(xs, {
	onEmpty: () => placeholder,
	onNonEmpty: (items) => list(items)
});
```

### FK-3.5 · `no-effect-ignore-then-as`

`Effect.ignore` discards both the success value and the error channel. Two common misuses:

- **Adjacent to `Effect.as`** — `as` already discards the success, so `ignore` only erases the errors silently.
- **On an infallible primitive** (`Effect.succeed`, `Effect.sync`, `Effect.void`, etc.) — there's nothing to ignore.

```ts
// ❌
const program = pipe(fetchUser(id), Effect.ignore, Effect.as('done'));

// ❌  Effect.succeed cannot fail; Effect.ignore is a no-op.
const ready = pipe(Effect.succeed(42), Effect.ignore);

// ✅  Either drop the ignore (if infallible)…
const program = pipe(fetchUser(id), Effect.as('done'));

// …or handle errors explicitly.
const program = pipe(
	fetchUser(id),
	Effect.catchAll(() => Effect.void),
	Effect.as('done')
);
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
// oxlint-disable-next-line foldkit/no-hand-rolled-form-controls -- third-party autocomplete library
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

## FK-6 · Schema and type shape

Four rules that enforce Foldkit's conventions for Schema field naming and TypeScript type-shape preferences.

### FK-6.1 · `require-capitalized-schema-literals`

Schema literals are rendered in error messages and API responses. Capitalizing them at the source removes a class of cosmetic display bugs and keeps tag values consistent with how they're named in code.

```ts
// ❌
const Status = Schema.Literals(['pending', 'active', 'archived']);

// ✅
const Status = Schema.Literals(['Pending', 'Active', 'Archived']);
```

### FK-6.2 · `require-is-prefix-for-boolean-schema-field`

Boolean fields read better when their name is a predicate: `isActive`, `hasPaid`, `canEdit`. Naked nouns (`active`, `paid`, `edit`) are ambiguous at the call site.

```ts
// ❌
const User = Schema.Struct({
	active: Schema.Boolean,
	paid: Schema.Boolean,
	edit: Schema.Boolean
});

// ✅
const User = Schema.Struct({
	isActive: Schema.Boolean,
	hasPaid: Schema.Boolean,
	canEdit: Schema.Boolean
});
```

Allowed prefixes: `is*`, `has*`, `can*`, `should*`, `was*`, `will*`.

### FK-6.3 · `no-array-shorthand-type`

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

### FK-6.4 · `maybe-prefix-requires-option`

A field named `maybeX` is a contract that the value is an `Option<X>`. Using the prefix with a plain `T | null` (or a `S.optional` field) breaks reader expectations.

```ts
// ❌  TS: maybeName is not Option<…>
function greet(maybeName: string | null) { ... }
function greet(maybeName: string | undefined) { ... }

// ❌  Schema: maybeAvatar is S.optional, not S.Option
const User = Schema.Struct({
	maybeAvatar: Schema.optional(Schema.String)
});

// ✅  TS
function greet(maybeName: Option<string>) { ... }

// ✅  Schema
const User = Schema.Struct({
	maybeAvatar: Schema.Option(Schema.String),
	// or, for wire formats that send `null`:
	maybeAvatar: Schema.OptionFromNullishOr(Schema.String)
});
```

If the value really is nullable (not optional), the rule suggests renaming to `nullableX` instead.

---

## Suppression

All rules respect oxlint's standard disable directives:

```ts
// oxlint-disable-next-line foldkit/<rule-name> -- reason

/* oxlint-disable foldkit/<rule-name> -- reason */
// ... block ...
/* oxlint-enable foldkit/<rule-name> */
```

A trailing `-- <reason>` comment is encouraged for any suppression that lives longer than a single PR review.

## Development

```sh
bun install
bun test          # run the test suite (224 tests across 23 rules)
bun run typecheck # tsgo
bun run check     # format + lint
```

Each rule lives in `src/rules/<rule-name>.ts` with a sibling test in `test/rules/<rule-name>.test.ts`. The rule SDK is documented at [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint).

## License

MIT
