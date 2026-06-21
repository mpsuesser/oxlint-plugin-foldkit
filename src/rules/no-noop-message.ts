import type { CreateRule } from '@oxlint/plugins';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

import { mCall } from './message-ast.ts';

const noopTag = 'NoOp';

const rule: CreateRule = Rule.define({
	name: 'no-noop-message',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Reject catch-all `NoOp` Messages; name the event that happened instead'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				mCall(node),
				Option.filter(({ tag }) => tag === noopTag),
				Option.match({
					onNone: () => Effect.void,
					onSome: ({ tagNode }) =>
						ctx.report(
							Diagnostic.make({
								node: tagNode,
								message:
									'`NoOp` is a catch-all Message name. Name the event that happened instead, such as `ClickedSave` or `LoadedUser`. (Foldkit no-noop-message)'
							})
						)
				})
			)
		);
	}
});

export default rule;
