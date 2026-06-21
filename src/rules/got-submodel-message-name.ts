import type { CreateRule } from '@oxlint/plugins';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

import { hasChildMessagePayload, mCall } from './message-ast.ts';

const gotMessageNamePattern = /^Got[A-Z][A-Za-z0-9]*Message$/;

const rule: CreateRule = Rule.define({
	name: 'got-submodel-message-name',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Submodel wrapper Messages carrying `message: Child.Message` must use the `Got*Message` name convention'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				mCall(node),
				Option.filter(
					({ tag, fields }) =>
						!gotMessageNamePattern.test(tag) &&
						pipe(
							fields,
							Option.match({
								onNone: () => false,
								onSome: hasChildMessagePayload
							})
						)
				),
				Option.match({
					onNone: () => Effect.void,
					onSome: ({ tagNode, tag }) =>
						ctx.report(
							Diagnostic.make({
								node: tagNode,
								message: `Submodel wrapper Message \`${tag}\` carries a child \`message\` payload and must be named \`Got*Message\` (for example, \`GotChildMessage\`). (Foldkit got-submodel-message-name)`
							})
						)
				})
			)
		);
	}
});

export default rule;
