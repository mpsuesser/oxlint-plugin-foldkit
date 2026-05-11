# oxlint-plugin-foldkit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

An opinionated [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin for [Foldkit](https://github.com/mpsuesser/foldkit) that drives your codebase toward idiomatic Foldkit programs — Elm-style architecture, message-driven updates, and Effect-backed services.

> **Status:** scaffolding only. Rule set under design.

## Installation

```sh
npm install oxlint-plugin-foldkit
```

```sh
bun add oxlint-plugin-foldkit
```

Then register the plugin in your oxlint config:

```jsonc
// oxlint.json
{
	"plugins": ["oxlint-plugin-foldkit"]
}
```

## What it catches

_To be filled in as rules are designed._

## Writing rules

Rules are defined with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK. There are several helpers depending on the complexity of what you need:

**Ban a statement type** (one-liner):

```ts
import { Rule } from 'effect-oxlint';

export default Rule.banStatement('TryStatement', {
	message: 'Use Effect.try or Effect.tryPromise instead of try/catch.'
});
```

**Ban a member access** (one-liner):

```ts
import { Rule } from 'effect-oxlint';

export default Rule.banMember('JSON', ['parse', 'stringify'], {
	message: 'Use Schema.fromJsonString for typed JSON boundaries.'
});
```

**Ban an import** (one-liner):

```ts
import { Rule } from 'effect-oxlint';

export default Rule.banImport((s) => s === 'node:fs' || s === 'fs', {
	message: "Use Effect's FileSystem service from @effect/platform."
});
```

**Custom rule with full AST visitor** (for complex logic):

```ts
import type { ESTree } from 'effect-oxlint';
import * as Effect from 'effect/Effect';
import { Diagnostic, Rule, RuleContext } from 'effect-oxlint';

export default Rule.define({
	name: 'my-rule',
	meta: Rule.meta({
		type: 'suggestion',
		description: 'Describe what this rule does'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			CallExpression: (node: ESTree.Node) => {
				// your logic here
				return ctx.report(Diagnostic.make({ node, message: '...' }));
			}
		};
	}
});
```

Rules use Effect generators for their `create` function, giving you access to `Ref`, `Effect.gen`, and other Effect primitives for tracking state across AST nodes. See the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) repo for full SDK documentation.

## Development

```sh
bun install
bun test          # run the test suite
bun run check     # lint + format
```

## License

MIT
