import type { CreateRule } from '@oxlint/plugins';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

import { hasChildMessagePayload, mCall } from './message-ast.ts';

const gotPrefixPattern = /^Got[A-Z]/;

const rule: CreateRule = Rule.define({
	name: 'got-prefix-requires-submodel-payload',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Got-prefixed Messages are reserved for submodel wrappers and must include `message: Child.Message`'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				mCall(node),
				Option.filter(({ tag }) => gotPrefixPattern.test(tag)),
				Option.filter(({ fields }) =>
					pipe(
						fields,
						Option.match({
							onNone: () => true,
							onSome: (object) => !hasChildMessagePayload(object)
						})
					)
				),
				Option.match({
					onNone: () => Effect.void,
					onSome: ({ tagNode, tag }) =>
						ctx.report(
							Diagnostic.make({
								node: tagNode,
								message: `Got-prefixed Message \`${tag}\` must wrap a child Message with a payload named \`message\`, e.g. \`message: Child.Message\`. Use a non-Got name for command results or ordinary events. (Foldkit got-prefix-requires-submodel-payload)`
							})
						)
				})
			)
		);
	}
});

export default rule;
