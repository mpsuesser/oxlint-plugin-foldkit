import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const PascalCaseIdentifier = Schema.String.check(
	Schema.isPattern(/^[A-Z][A-Za-z0-9]*$/, {
		identifier: 'PascalCaseIdentifier',
		title: 'PascalCase Identifier',
		description:
			'A PascalCase identifier used as a tagged-struct constructor.'
	})
);
const isPascalCaseIdentifier = Schema.is(PascalCaseIdentifier);

const pascalCaseCalleeName = (
	call: ESTree.CallExpression
): Option.Option<string> =>
	call.callee.type === 'Identifier' &&
	isPascalCaseIdentifier(call.callee.name)
		? Option.some(call.callee.name)
		: Option.none();

const singleEmptyObjectArg = (
	call: ESTree.CallExpression
): Option.Option<ESTree.ObjectExpression> =>
	call.arguments.length === 1
		? pipe(
				Arr.head(call.arguments),
				Option.flatMap((arg) =>
					arg.type === 'ObjectExpression' &&
					arg.properties.length === 0
						? Option.some(arg)
						: Option.none()
				)
			)
		: Option.none();

export default Rule.define({
	name: 'no-empty-object-tagged-call',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'No-field tagged-struct constructors must be called with no argument, not `{}` (FK-2)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				pascalCaseCalleeName(node),
				Option.flatMap((name) =>
					pipe(
						singleEmptyObjectArg(node),
						Option.map(() => name)
					)
				),
				Option.match({
					onNone: () => Effect.void,
					onSome: (name) =>
						ctx.report(
							Diagnostic.make({
								node,
								message: `\`${name}({})\` is non-idiomatic. Call no-field tagged-struct constructors with no argument: \`${name}()\`. (FK-2)`
							})
						)
				})
			)
		);
	}
});
