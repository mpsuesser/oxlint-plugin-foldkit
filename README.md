# oxlint-plugin-foldkit

[![npm](https://img.shields.io/npm/v/@mpsuesser/oxlint-plugin-foldkit)](https://www.npmjs.com/package/@mpsuesser/oxlint-plugin-foldkit)
[![JSR](https://jsr.io/badges/@mpsuesser/oxlint-plugin-foldkit)](https://jsr.io/@mpsuesser/oxlint-plugin-foldkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

An opinionated [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin for [Foldkit](https://github.com/foldkit/foldkit) that codifies framework conventions as lint rules.

The plugin focuses on the parts of Foldkit code that TypeScript cannot fully protect on its own: message grammar, command identity, pure update/view boundaries, route registration, keyed view identity, accessibility wiring, resource lifecycles, subscriptions, and Story/Scene testing patterns.

> This is an unofficial, personal ruleset published under `@mpsuesser/*` so the canonical `oxlint-plugin-foldkit` / `foldkit/*` namespace remains available for the Foldkit project itself.

The package currently ships **40 rules**. They are implemented with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK and run as standard oxlint JavaScript plugin rules.

## Installation

```sh
npm install --save-dev @mpsuesser/oxlint-plugin-foldkit
# or
bun add --dev @mpsuesser/oxlint-plugin-foldkit
```

Use the generated recommended config from `oxlint.config.ts`:

```ts
import { defineConfig } from 'oxlint';
import foldkit from '@mpsuesser/oxlint-plugin-foldkit';

export default defineConfig({
	extends: [foldkit.configs.recommended]
});
```

`configs.recommended` registers the package through oxlint's `jsPlugins` field and enables all 40 rules at `error` severity. Several rules are path-aware, so they only report in files where the convention applies.

To override an individual rule, add a `rules` entry after the `extends` block:

```ts
import { defineConfig } from 'oxlint';
import foldkit from '@mpsuesser/oxlint-plugin-foldkit';

export default defineConfig({
	extends: [foldkit.configs.recommended],
	rules: {
		'@mpsuesser/foldkit/no-hand-rolled-form-controls': 'warn',
		'@mpsuesser/foldkit/prefer-story-command-matchers': 'off'
	}
});
```

If you use `.oxlintrc.json`, oxlint cannot import a package config object. Configure the JS plugin and any rules you want explicitly:

```jsonc
{
	"jsPlugins": ["@mpsuesser/oxlint-plugin-foldkit"],
	"rules": {
		"@mpsuesser/foldkit/no-hand-rolled-form-controls": "error",
		"@mpsuesser/foldkit/no-impure-calls-in-pure-layer": "error"
	}
}
```

Use `oxlint.config.ts` when you want the full generated recommended config.

## How to read diagnostics

Each diagnostic explains the Foldkit convention it protects. Most rules do not auto-fix because the correct repair usually depends on the program model, route shape, or child module API. Use the examples below as the canonical repair direction.

Some rules intentionally activate only in certain file roles:

- pure-layer files: `init.ts`, `model.ts`, `message.ts`, `update.ts`, `view.ts`, and files under `update/` or `view/`
- command and subscription files: files whose basename starts with `command` or `subscription`
- subscription role files: files named `subscription.ts`
- tests: files under `/apps/ui/test/`

## Rules at a glance

| Rule                                                                                        | What it catches                                                               |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`require-past-tense-message-names`](#require-past-tense-message-names)                     | Message tags that are not verb-first past tense                               |
| [`no-changed-message-prefix`](#no-changed-message-prefix)                                   | `Changed*` instead of `Updated*`, except `ChangedRoute` / `ChangedUrl`        |
| [`require-succeeded-failed-pair`](#require-succeeded-failed-pair)                           | `Succeeded*` without a matching `Failed*`                                     |
| [`require-completed-mirrors-command`](#require-completed-mirrors-command)                   | `Completed*` Message that does not mirror a local `Command.define(...)`       |
| [`got-wrapper-carries-only-routing`](#got-wrapper-carries-only-routing)                     | `Got*` wrapper Messages with the wrong name or payload shape                  |
| [`wrap-child-output-in-got-message`](#wrap-child-output-in-got-message)                     | child output mappers that bypass `Got*Message` wrappers                       |
| [`no-child-message-construction-in-root`](#no-child-message-construction-in-root)           | parent code directly calling `Child.Message.SomeVariant(...)`                 |
| [`no-impure-calls-in-pure-layer`](#no-impure-calls-in-pure-layer)                           | time, randomness, DOM, and browser side effects in pure Foldkit files         |
| [`no-module-level-mutable-state`](#no-module-level-mutable-state)                           | top-level `let` / `var` hidden state                                          |
| [`no-disabling-dev-guardrails`](#no-disabling-dev-guardrails)                               | `slowView: false` or `freezeModel: false`                                     |
| [`command-failed-result-requires-catch`](#command-failed-result-requires-catch)             | Failed-result Commands whose Effects do not catch failures                    |
| [`command-define-pascal-const`](#command-define-pascal-const)                               | `Command.define('Foo', ...)` not bound to `const Foo`                         |
| [`foldkit-primitives-declared-in-role-files`](#foldkit-primitives-declared-in-role-files)   | Messages, Commands, or Subscriptions declared outside their role files        |
| [`no-hand-rolled-command-struct`](#no-hand-rolled-command-struct)                           | object literals shaped like raw Foldkit Command structs                       |
| [`no-empty-object-tagged-call`](#no-empty-object-tagged-call)                               | `Idle({})` instead of `Idle()`                                                |
| [`no-spread-in-evo`](#no-spread-in-evo)                                                     | object spread inside an `evo` updater                                         |
| [`prefer-evo-over-model-spread`](#prefer-evo-over-model-spread)                             | `{ ...model, ... }` in update functions                                       |
| [`no-explicit-command-type-annotation`](#no-explicit-command-type-annotation)               | redundant `: Command<...>` annotations                                        |
| [`prefer-option-match-over-map-getorelse`](#prefer-option-match-over-map-getorelse)         | `Option.map(...).pipe(Option.getOrElse(...))`                                 |
| [`no-hardcoded-route-strings`](#no-hardcoded-route-strings)                                 | hard-coded paths passed to route/navigation helpers                           |
| [`route-union-parser-registration`](#route-union-parser-registration)                       | route union, `Route.mapTo`, and `Route.oneOf` drift                           |
| [`route-oneof-shadowing-order`](#route-oneof-shadowing-order)                               | broad routers placed before more-specific routers                             |
| [`require-rel-for-external-link`](#require-rel-for-external-link)                           | `Target('_blank')` without `Rel('noopener noreferrer')`                       |
| [`prefer-empty-over-empty-element`](#prefer-empty-over-empty-element)                       | empty `span([], [])` / `div([], [])` nodes                                    |
| [`label-requires-for`](#label-requires-for)                                                 | `label(...)` without `For(id)`                                                |
| [`no-hand-rolled-form-controls`](#no-hand-rolled-form-controls)                             | bare `input`, `textarea`, or `button` calls                                   |
| [`keyed-required-for-mapped-rows`](#keyed-required-for-mapped-rows)                         | identity-bearing mapped rows rendered without `keyed(...)`                    |
| [`no-array-index-view-keys`](#no-array-index-view-keys)                                     | array index parameters used as view keys or submodel slot ids                 |
| [`no-raw-dom-event-attributes`](#no-raw-dom-event-attributes)                               | raw `on*` DOM attributes outside crash views                                  |
| [`prefer-dom-helpers-for-element-ops`](#prefer-dom-helpers-for-element-ops)                 | direct focus/scroll/click/dialog calls on queried DOM elements                |
| [`managed-resource-for-stateful-handles`](#managed-resource-for-stateful-handles)           | direct `WebSocket`, `Worker`, media recorder, or media stream acquisition     |
| [`mount-factory-must-use-element`](#mount-factory-must-use-element)                         | `Mount.define` factories that ignore their element                            |
| [`no-duplicate-onmount-per-element`](#no-duplicate-onmount-per-element)                     | multiple top-level `OnMount(...)` attributes on one element                   |
| [`ui-toview-must-spread-attribute-bundles`](#ui-toview-must-spread-attribute-bundles)       | custom `Ui.*.view` renderers that drop Foldkit-provided attributes            |
| [`subscription-file-canonical-shape`](#subscription-file-canonical-shape)                   | non-canonical `subscription.ts` exports or spread-merged subscription records |
| [`selection-submodel-factory-at-module-scope`](#selection-submodel-factory-at-module-scope) | inline `Ui.Listbox` / `Ui.Combobox` / selection factory creation              |
| [`lazy-view-stable-references`](#lazy-view-stable-references)                               | lazy slots or lazy view functions with unstable references                    |
| [`prefer-story-command-matchers`](#prefer-story-command-matchers)                           | hand-rolled Story command assertions in tests                                 |
| [`scene-tests-run-from-root`](#scene-tests-run-from-root)                                   | Scene tests isolated to page/widget update and view pairs                     |
| [`no-array-shorthand-type`](#no-array-shorthand-type)                                       | `T[]` syntax                                                                  |

---

## Message and submodel rules

Foldkit Messages describe facts that happened. These rules keep the event log readable, grep-able, and aligned with child module boundaries.

### `require-past-tense-message-names`

Message tags must start with an allowed verb-first past-tense prefix such as `Loaded`, `Clicked`, `Updated`, `Submitted`, `Failed`, `Succeeded`, or `Completed`.

```ts
// ❌
type Msg = { _tag: 'LoadingUser' } | { _tag: 'Save' } | { _tag: 'UserClick' };

// ✅
type Msg = { _tag: 'LoadedUser' } | { _tag: 'Saved' } | { _tag: 'ClickedUser' };
```

This makes the `update` switch read as a history of user and runtime events instead of commands to perform.

### `no-changed-message-prefix`

Use `Updated*` for model/input changes. `ChangedRoute` and `ChangedUrl` are allowed because they describe navigation facts.

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

### `require-succeeded-failed-pair`

Every `Succeeded<Action>` Message needs a matching `Failed<Action>` Message in the same file.

```ts
// ❌
type Msg = { _tag: 'SucceededFetchUser'; user: User };

// ✅
type Msg =
	| { _tag: 'SucceededFetchUser'; user: User }
	| { _tag: 'FailedFetchUser'; error: ApiError };
```

This catches happy-path-only command wiring before the first production failure path is missed.

### `require-completed-mirrors-command`

`Completed<Action>` Messages must mirror a `Command.define('<Action>', ...)` in the same file.

```ts
const FocusInput = Command.define(
	'FocusInput',
	Msg.CompletedFocusInput
)(effect);

// ❌
type Msg = { _tag: 'CompletedInputFocus' };

// ✅
type Msg = { _tag: 'CompletedFocusInput' };
```

The Message and Command names stay mechanically linked, so `grep CompletedFocusInput` and `grep FocusInput` both point at the same behavior.

### `got-wrapper-carries-only-routing`

Submodel wrapper Messages must use the full `Got*Message` name and carry only child output plus routing context: `message`, `id`, or fields ending in `Id`.

```ts
// ❌
export const GotChatUpdates = m('GotChatUpdates', {
	message: Chat.Message,
	thought: S.String
});

// ✅
export const GotChatMessage = m('GotChatMessage', {
	message: Chat.Message,
	sessionId: S.String
});
```

The rule protects DevTools filtering and prevents parent modules from smuggling child-specific state through wrapper payloads.

### `wrap-child-output-in-got-message`

Child output lifted through `Command.mapMessage(s)`, `Subscription.lift`, `delegatePage`, or `delegatePageWithOutMessage` must return a `Got*Message` constructor.

```ts
// ❌
Command.mapMessages(childCommands, (message) =>
	Msg.ReceivedChatEvent({ message })
);

// ✅
Command.mapMessages(childCommands, (message) =>
	Msg.GotChatMessage({ message })
);
```

This enforces Foldkit's one-wrap-per-level convention, so submodel output remains identifiable as it moves up the tree.

### `no-child-message-construction-in-root`

Parent modules should not construct private child Message variants directly with `Child.Message.SomeVariant(...)`.

```ts
// ❌
return delegatePage(
	model,
	Chat.update(model.chat, Chat.Message.ClickedOpen()),
	setChat,
	(message) => Msg.GotChatMessage({ message })
);

// ✅
return Chat.open(model.chat).pipe(
	Command.mapMessage((message) => Msg.GotChatMessage({ message }))
);
```

Call child-exported helper verbs instead. The parent should know how to route child output, not how to construct the child's internal events.

---

## Purity and side-effect boundary rules

Foldkit's replayability depends on deterministic `init`, `model`, `message`, `update`, and `view` code. Side effects belong in Commands, Mounts, Subscriptions, ManagedResources, runtime entry code, or other explicit framework seams.

### `no-impure-calls-in-pure-layer`

In pure-layer files, the rule flags:

- time and randomness: `Date.now()`, zero-argument `new Date()`, `Math.random()`, `performance.now()`, `crypto.randomUUID()`, `crypto.getRandomValues()`
- browser and process globals such as `window`, `document`, `localStorage`, `fetch`, `navigator`, timers, and `console`
- any `.addEventListener(...)` call

```ts
// ❌ update.ts
const update = (model: Model, message: Msg): Model =>
	evo(model, {
		id: () => crypto.randomUUID(),
		seenAt: () => Date.now()
	});

// ✅ command.ts
const GenerateId = Command.define(
	'GenerateId',
	Msg.CompletedGenerateId
)(Effect.sync(() => ({ id: crypto.randomUUID(), seenAt: Date.now() })));
```

The rule does not report inside `Command.define`, `Mount.define`, `Mount.defineStream`, or `Subscription.make` factories, where effects are allowed.

### `no-module-level-mutable-state`

Top-level `let` and `var` declarations create state outside Foldkit's single Model tree.

```ts
// ❌
let inFlightRequest = false;

export const update = (model: Model, message: Msg) => { ... };

// ✅
export const Model = S.Struct({
	inFlightRequest: S.Boolean
});
```

Function-local `let` remains legal. The rule only targets module-scope mutable state.

### `no-disabling-dev-guardrails`

Do not set Foldkit runtime guardrails `slowView` or `freezeModel` to `false`.

```ts
// ❌
makeProgram({
	update,
	view,
	slowView: false,
	freezeModel: false
});

// ✅
makeProgram({
	update,
	view
});
```

If a view is slow or a model mutation throws, fix the code path. The guardrail warning is doing its job.

---

## Command and construction-shape rules

These rules make command declarations, tagged constructors, and model updates use one canonical shape.

### `command-failed-result-requires-catch`

A Command that declares any `Failed*` result must catch failures inside the applied Effect and convert them into that Failed result.

```ts
// ❌
const FetchUser = Command.define(
	'FetchUser',
	Msg.SucceededFetchUser,
	Msg.FailedFetchUser
)(
	Effect.gen(function* () {
		const user = yield* Api.fetchUser;
		return Msg.SucceededFetchUser({ user });
	})
);

// ✅
const FetchUser = Command.define(
	'FetchUser',
	Msg.SucceededFetchUser,
	Msg.FailedFetchUser
)(
	Api.fetchUser.pipe(
		Effect.match({
			onFailure: (error) => Msg.FailedFetchUser({ error }),
			onSuccess: (user) => Msg.SucceededFetchUser({ user })
		})
	)
);
```

Accepted handlers include `Effect.catch*` and `Effect.match*`. The rule also reports Failed-result `Command.define` calls that are not immediately applied to an Effect.

### `command-define-pascal-const`

`Command.define('Foo', ...)` must be assigned to a PascalCase `const Foo`.

```ts
// ❌
const fetchUser = Command.define('FetchUser', Msg.CompletedFetchUser)(effect);
const Focus = Command.define('FocusInput', Msg.CompletedFocusInput)(effect);

// ✅
const FetchUser = Command.define('FetchUser', Msg.CompletedFetchUser)(effect);
const FocusInput = Command.define(
	'FocusInput',
	Msg.CompletedFocusInput
)(effect);
```

This keeps the runtime command name, the binding name, and find-references aligned.

### `foldkit-primitives-declared-in-role-files`

Keep primitive declarations in their role files:

- Message constructors from `foldkit/message` or the `m` specifier from `foldkit/schema` belong in `message.ts` or a `message/` folder.
- `Command.define(...)` belongs in `command.ts` or a `command/` folder.
- `Subscription.make`, `Subscription.lift`, `Subscription.aggregate`, and `Subscription.persistent` belong in `subscription.ts` or a `subscription/` folder.

```ts
// ❌ update.ts
import { m } from 'foldkit/schema';
const LocalMessage = m('UpdatedLocal');
const Save = Command.define('Save', Msg.CompletedSave)(effect);

// ✅ message.ts
export const UpdatedLocal = m('UpdatedLocal');

// ✅ command.ts
export const Save = Command.define('Save', Msg.CompletedSave)(effect);
```

The rule keeps each module's event catalog, command catalog, and subscription catalog easy to find.

### `no-hand-rolled-command-struct`

Do not create Command-shaped object literals manually.

```ts
// ❌
const command = {
	name: 'SaveDraft',
	args: { id },
	effect: saveDraft(id)
};

const rewritten = { ...command, effect: traced(command.effect) };

// ✅
const SaveDraft = Command.define(
	'SaveDraft',
	Args,
	Msg.CompletedSaveDraft
)(saveDraft);

const rewritten = Command.mapEffect(command, traced);
```

Commands should be created with `Command.define` and transformed with `Command.map*` helpers so runtime identity and trace attribution are preserved.

### `no-empty-object-tagged-call`

No-field tagged-struct constructors should be called with no argument.

```ts
// ❌
const initial = Idle({});
return Failed({});

// ✅
const initial = Idle();
return Failed();
```

### `no-spread-in-evo`

Object spread inside an `evo` updater bypasses the nested update path.

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

### `prefer-evo-over-model-spread`

In update files, do not return a new model with `{ ...model, ... }`. Use `evo(model, ...)`.

```ts
// ❌ update.ts
const update = (model: Model, message: Msg) => [
	{ ...model, selectedId: message.id },
	[]
];

// ✅ update.ts
const update = (model: Model, message: Msg) => [
	evo(model, { selectedId: message.id }),
	[]
];
```

Array spreads such as `[...model.items, item]` are not reported. The rule only targets object spreads of a function parameter named `model` in `update.ts` or `update/` files.

### `no-explicit-command-type-annotation`

Let `Command.define(...)` infer its own `Command<...>` type.

```ts
// ❌
const FetchUser: Command<User, ApiError, UserRepo> = Command.define(
	'FetchUser',
	Msg.CompletedFetchUser
)(effect);

// ✅
const FetchUser = Command.define('FetchUser', Msg.CompletedFetchUser)(effect);
```

The inferred type already carries the command identity. A manual annotation adds noise and can drift.

---

## Effect and Option idiom rules

### `prefer-option-match-over-map-getorelse`

Prefer `Option.match` when the code maps an `Option` and immediately supplies a fallback.

```ts
// ❌
const label = pipe(
	maybeUser,
	Option.map((user) => user.name),
	Option.getOrElse(() => 'Guest')
);

// ✅
const label = Option.match(maybeUser, {
	onNone: () => 'Guest',
	onSome: (user) => user.name
});
```

The labeled branches are easier to scan in Foldkit view and update code.

---

## Routing rules

Foldkit routes are bidirectional. These rules keep route declarations, parsers, printers, and parser order in sync.

### `no-hardcoded-route-strings`

Do not pass path literals to `Href`, `navigateInternal`, or `loadExternalUrl`.

```ts
// ❌
a([Href('/users/123')], [t('Profile')]);
navigateInternal(`/users/${user.id}`);
loadExternalUrl('/checkout/success');

// ✅
a([Href(Routes.userProfile(user.id))], [t('Profile')]);
navigateInternal(Routes.userProfile(user.id));
loadExternalUrl(Routes.checkoutSuccess());
```

Route printers keep links correct when a route shape changes.

### `route-union-parser-registration`

Route union members, `Route.mapTo(...)` routers, and the `Route.oneOf(...)` parser list must stay in sync.

```ts
const HomeRoute = r('HomeRoute');
const UserRoute = r('UserRoute');
const NotFoundRoute = r('NotFoundRoute');

export const AppRoute = S.Union([HomeRoute, UserRoute, NotFoundRoute]);

const homeRouter = pipe(root, Route.mapTo(HomeRoute));

// ❌ UserRoute has no parser.
const routeParser = Route.oneOf(homeRouter);

// ✅
const userRouter = pipe(
	literal('users'),
	slash(string('id')),
	Route.mapTo(UserRoute)
);
const routeParser = Route.oneOf(homeRouter, userRouter);
```

The fallback route used by `Route.parseUrlWithFallback(...)` is exempt because it intentionally has no parser.

### `route-oneof-shadowing-order`

Put more-specific routers before broader routers in `Route.oneOf(...)`.

```ts
const taskArchiveRouter = pipe(
	literal('tasks'),
	slash(literal('archive')),
	Route.mapTo(TaskArchiveRoute)
);

const taskRouter = pipe(
	literal('tasks'),
	slash(string('id')),
	Route.mapTo(TaskRoute)
);

// ❌ `/tasks/archive` is parsed as TaskRoute with id "archive".
const routeParser = Route.oneOf(taskRouter, taskArchiveRouter);

// ✅
const routeParser = Route.oneOf(taskArchiveRouter, taskRouter);
```

The rule understands literal segments, string and int parameters, root routes, and query-guarded routes well enough to catch common shadowing mistakes.

---

## View, UI, and lifecycle rules

These rules catch code that compiles but breaks accessibility, virtual DOM identity, resource cleanup, or framework-provided UI wiring.

### `require-rel-for-external-link`

Any attribute array containing `Target('_blank')` must also contain `Rel('noopener noreferrer')`.

```ts
// ❌
a([Href(url), Target('_blank')], [t('Open')]);

// ✅
a([Href(url), Target('_blank'), Rel('noopener noreferrer')], [t('Open')]);
```

### `prefer-empty-over-empty-element`

Use Foldkit's `empty` value instead of rendering an empty element.

```ts
// ❌
return condition ? span([], []) : content;
return condition ? h.div([], []) : content;

// ✅
return condition ? empty : content;
return condition ? h.empty : content;
```

### `label-requires-for`

A `label(...)` must include a `For(id)` attribute.

```ts
// ❌
label([], [t('Name')]);
label([Class('field-label')], [t('Name')]);

// ✅
label([For('user-name')], [t('Name')]);
input([Id('user-name'), Type('text')]);

// ✅ Prefer Ui.Input when possible.
Ui.Input.view({ label: 'Name', value: model.name, onChange: Msg.UpdatedName });
```

### `no-hand-rolled-form-controls`

Use Foldkit `Ui.*` controls instead of bare `input`, `textarea`, or `button` elements.

```ts
// ❌
input([Type('text'), Value(model.name), OnInput(Msg.UpdatedName)]);
button([OnClick(Msg.SubmittedForm())], [t('Submit')]);
textarea([Value(model.notes), OnInput(Msg.UpdatedNotes)]);

// ✅
Ui.Input.view({ value: model.name, onChange: Msg.UpdatedName, label: 'Name' });
Ui.Button.view({ label: 'Submit', onClick: Msg.SubmittedForm() });
Ui.Textarea.view({ value: model.notes, onChange: Msg.UpdatedNotes });
```

Spreading the `attributes.<tag>` bundle into the attribute array supplied to a `Ui.*.toView` callback is allowed; that is Foldkit's documented customization seam.

### `keyed-required-for-mapped-rows`

Rows rendered from identity-bearing domain objects must be keyed.

```ts
// ❌
ul(
	[],
	items.map((item) =>
		li([OnClick(Msg.ClickedDelete({ id: item.id }))], [t(item.title)])
	)
);

// ✅
ul(
	[],
	items.map((item) =>
		keyed('li')(
			item.id,
			[OnClick(Msg.ClickedDelete({ id: item.id }))],
			[t(item.title)]
		)
	)
);
```

The rule only fires when the mapper references `<param>.id`, so static literal lists are not forced to use keys. It checks common row tags such as `li`, `div`, `tr`, `article`, and `section`.

### `no-array-index-view-keys`

Never use a map callback's second parameter as a Foldkit view key.

```ts
// ❌
items.map((item, index) => keyed('li')(index, [], [t(item.title)]));
items.map((item, i) => li([h.Key(i)], [t(item.title)]));
items.map((item, i) => h.submodel({ slotId: i, ... }));

// ✅
items.map((item) => keyed('li')(item.id, [], [t(item.title)]));
items.map((item) => h.submodel({ slotId: item.id, ... }));
```

The rule also checks `Arr.map` in data-first and data-last forms, `h.Key(...)`, `h.submodel({ slotId })`, and `createKeyedLazy()` slot calls. `Arr.makeBy` is excluded because its index creates synthetic placeholders rather than preserving row identity.

### `no-raw-dom-event-attributes`

Use typed `On*` constructors instead of raw `Attribute('onclick', ...)` or `Prop('onInput', ...)` calls.

```ts
// ❌
div([Attribute('onclick', 'save()')], [t('Save')]);
div([h.Prop('onInput', handler)], []);

// ✅
div([OnClick(Msg.ClickedSave())], [t('Save')]);
```

`crash-view.ts` is the only allowed place for raw DOM event attributes, and in that file `html` must be bound as `html<never>()` so the crash view cannot dispatch application Messages.

### `prefer-dom-helpers-for-element-ops`

In command and subscription files, prefer Foldkit `Dom` helpers over querying the document and calling element methods directly.

```ts
// ❌ command.ts
Effect.sync(() => {
	document.getElementById('search')?.focus();
});

// ✅ command.ts
Dom.focus('search');
```

The rule catches direct or variable-based `focus`, `scrollIntoView`, `click`, `showModal`, and `close` calls on `document.getElementById(...)` / `document.querySelector(...)` results when the variable is only used for that DOM operation. Foldkit `Dom` helpers wait for the next render commit and fail through typed errors.

### `managed-resource-for-stateful-handles`

Stateful browser handles must be acquired through `ManagedResource`, not directly inside model-tied code.

```ts
// ❌
const socket = new WebSocket(url);
const stream =
	yield *
	Effect.promise(() => navigator.mediaDevices.getUserMedia({ audio: true }));

// ✅
const LiveAudio = ManagedResource.tag('LiveAudio');

export const liveAudio = ManagedResource.make(LiveAudio, {
	acquire: Effect.promise(() =>
		navigator.mediaDevices.getUserMedia({ audio: true })
	),
	release: (stream) =>
		Effect.sync(() => stream.getTracks().forEach((t) => t.stop()))
});
```

The rule flags global `WebSocket`, `MediaRecorder`, `Worker`, `SharedWorker`, `RTCPeerConnection`, `navigator.mediaDevices.getUserMedia`, and `navigator.mediaDevices.getDisplayMedia` outside managed-resource, subscription, and client files.

### `mount-factory-must-use-element`

A `Mount.define` or `Mount.defineStream` factory must accept and use its live element parameter.

```ts
// ❌
const TrackVisible = Mount.define(
	'TrackVisible',
	Msg.CompletedTrackVisible
)(() => Analytics.track('visible'));

// ❌ explicit ignore is also rejected
const TrackVisible = Mount.define(
	'TrackVisible',
	Msg.CompletedTrackVisible
)((_element) => Analytics.track('visible'));

// ✅
const FocusInput = Mount.define(
	'FocusInput',
	Msg.CompletedFocusInput
)((element) => Dom.focusElement(element));
```

If the work is not caused by and targeted at the mounted element, use a Command, Subscription, or ManagedResource instead.

### `no-duplicate-onmount-per-element`

Only one top-level `OnMount(...)` attribute may appear in a single attribute array.

```ts
// ❌
div([OnMount(InitChart), OnMount(TrackVisible)], []);

// ✅ bundle the work into one Mount
div([OnMount(InitChartAndTrackVisible)], []);

// ✅ conditional alternatives are fine
div([condition ? OnMount(InitA) : OnMount(InitB)], []);
```

Foldkit can attach only one Mount per element. A second one silently replaces the first.

### `ui-toview-must-spread-attribute-bundles`

Custom `Ui.*.view` `toView` callbacks must spread or pass through Foldkit-provided attribute bundles. `Ui.Dialog` custom views must render `h.dialog`.

```ts
// ❌ drops handlers, ARIA, disabled state, and component wiring
Ui.Button.view({
	label: 'Save',
	onClick: Msg.ClickedSave(),
	toView: (attributes) => h.button([h.Class('primary')], [t('Save')])
});

// ✅
Ui.Button.view({
	label: 'Save',
	onClick: Msg.ClickedSave(),
	toView: (attributes) =>
		h.button([...attributes.button, h.Class('primary')], [t('Save')])
});

// ✅ passing a bundle directly is also accepted
Ui.Checkbox.view({
	label: 'Done',
	value: model.done,
	onChange: Msg.UpdatedDone,
	toView: (attributes) => h.span(attributes.label, [t('Done')])
});
```

This rule also checks `viewInputs.toView` inside `h.submodel(...)` when the submodel view is a `Ui.*.view` function.

### `subscription-file-canonical-shape`

Each `subscription.ts` file should export one canonical `subscriptions` const rooted at `Subscription.make(...)` or `Subscription.aggregate(...)`.

```ts
// ❌
export const keyboard = Subscription.make(...);
export const subscriptions = Subscription.lift(Child.subscriptions)(...);

// ✅
const keyboard = Subscription.make(...);
const childSubscriptions = Subscription.lift(Child.subscriptions)(...);

export const subscriptions = Subscription.aggregate(
	keyboard,
	childSubscriptions
);
```

Do not export extra subscription records, and do not spread subscription records into object literals:

```ts
// ❌ duplicate keys can be overwritten silently
export const subscriptions = Subscription.aggregate({
	...localSubscriptions,
	...Child.subscriptions
});

// ✅ aggregate records explicitly
export const subscriptions = Subscription.aggregate(
	localSubscriptions,
	Child.subscriptions
);
```

### `selection-submodel-factory-at-module-scope`

Selection component factories such as `Ui.Listbox.create`, `Ui.Listbox.Multi.create`, `Ui.Combobox.create`, and related selection submodel factories must be declared once at module scope.

```ts
// ❌ creates a new factory while rendering
export const view = (model: Model) =>
	Ui.Combobox.create<Item>().view({ model: model.combobox });

// ✅
const ItemCombobox = Ui.Combobox.create<Item>();

export const view = (model: Model) =>
	ItemCombobox.view({ model: model.combobox });
```

One module-scope factory keeps view and update tied to the same item type and avoids unstable view identities.

### `lazy-view-stable-references`

Foldkit lazy slots and the view functions passed to them must be stable module-scope references.

```ts
// ❌ slot created inside render path
export const view = (model: Model) => {
	const lazyRow = createKeyedLazy();
	return lazyRow(model.row.id, (row) => viewRow(row), model.row);
};

// ❌ inline view function keeps the cache cold
const lazyRow = createKeyedLazy();
export const view = (model: Model) =>
	lazyRow(model.row.id, (row) => viewRow(row), model.row);

// ✅
const lazyRow = createKeyedLazy();
const viewRow = (row: Row) => tr([], [td([], [t(row.title)])]);

export const view = (model: Model) => lazyRow(model.row.id, viewRow, model.row);
```

The rule checks `createLazy()` and `createKeyedLazy()` declarations and their call sites. Imported lazy slots are skipped because the rule cannot prove their factory shape.

---

## Story and Scene test rules

These rules activate only in test files under `/apps/ui/test/`.

### `prefer-story-command-matchers`

Story command assertions should use `Story.Command.expectExact` or `Story.Command.expectHas` instead of hand-rolled object/name checks.

```ts
// ❌
expect(commands[0]).toMatchObject({ name: 'FetchUser' });
expect(commands[0]?.name).toBe('FetchUser');

// ✅
Story.Command.expectHas(commands, FetchUser);
Story.Command.expectExact(commands, [FetchUser({ id: user.id })]);
```

The Story matchers know Foldkit Command shape and provide better diagnostics for unresolved or unexpected Commands.

### `scene-tests-run-from-root`

`Scene.scene(...)` tests should run through the root update and root view, not an isolated page/widget update and view pair.

```ts
// ❌
import * as Chat from '../../src/page/chat/index.ts';

Scene.scene({
	update: Chat.update,
	view: Chat.view
});

// ✅
import { update } from '../../src/update/index.ts';
import { view } from '../../src/view/index.ts';

Scene.scene({ update, view });
```

Child-isolated behavior belongs in Story tests or pure render-helper tests. Scene tests are for production-shaped user flows.

---

## Type-shape rules

### `no-array-shorthand-type`

Use generic array types instead of shorthand `T[]`.

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

The generic form makes read-only upgrades obvious and keeps type shapes consistent across Foldkit code.

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
bun test
bun run typecheck
bun run check
```

Each rule lives in `src/rules/<rule-name>.ts` with a sibling test in `test/rules/<rule-name>.test.ts`. The rule SDK is documented at [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint).

## License

MIT
