import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const ChangedPrefixedTag = Schema.String.check(
	Schema.isPattern(/^Changed([A-Z]|$)/, {
		identifier: 'ChangedPrefixedTag',
		title: 'Changed-prefixed Message Tag',
		description:
			"A Message tag using the non-idiomatic `Changed*` prefix; Foldkit's convention is `Updated*`."
	})
);

const isChangedPrefixedTag = Schema.is(ChangedPrefixedTag);

const mTagFromCall = (call: ESTree.CallExpression): Option.Option<string> => {
	if (call.callee.type !== 'Identifier' || call.callee.name !== 'm') {
		return Option.none();
	}
	const arg = call.arguments[0];
	return arg !== undefined && arg.type === 'Literal' && P.isString(arg.value)
		? Option.some(arg.value)
		: Option.none();
};

export default Rule.define({
	name: 'no-changed-message-prefix',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow Message tags prefixed with `Changed*` — use `Updated*` instead (FK-1)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				mTagFromCall(node),
				Option.filter(isChangedPrefixedTag),
				Option.match({
					onNone: () => Effect.void,
					onSome: (tag) =>
						ctx.report(
							Diagnostic.make({
								node,
								message: `Message tag \`${tag}\` uses the \`Changed*\` prefix. Foldkit's convention is \`Updated*\` for both user input changes and external state updates. Rename to \`Updated${tag.slice('Changed'.length)}\`. (FK-1)`
							})
						)
				})
			)
		);
	}
});
