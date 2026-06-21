import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

import { isIdentifierLike, mCall } from './message-ast.ts';

const bindingName = (
	declarator: ESTree.VariableDeclarator
): Option.Option<string> =>
	isIdentifierLike(declarator.id)
		? Option.some(declarator.id.name)
		: Option.none();

const initMessageCall = (
	declarator: ESTree.VariableDeclarator
): Option.Option<{
	readonly binding: string;
	readonly tag: string;
	readonly node: ESTree.Node;
}> => {
	const init = declarator.init;
	return init !== null && init !== undefined && init.type === 'CallExpression'
		? pipe(
				mCall(init),
				Option.flatMap(({ tag }) =>
					pipe(
						bindingName(declarator),
						Option.map((binding) => ({
							binding,
							tag,
							node: declarator
						}))
					)
				)
			)
		: Option.none();
};

const rule: CreateRule = Rule.define({
	name: 'message-binding-matches-tag',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Foldkit Message const binding names must match their `m(...)` tag exactly'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('VariableDeclarator', (node) =>
			pipe(
				initMessageCall(node),
				Option.filter(({ binding, tag }) => binding !== tag),
				Option.match({
					onNone: () => Effect.void,
					onSome: ({ binding, tag, node: declarator }) =>
						ctx.report(
							Diagnostic.make({
								node: declarator,
								message: `Message binding \`${binding}\` must match its \`m(...)\` tag \`${tag}\`. Rename the binding or the tag so traces and imports stay aligned. (Foldkit message-binding-matches-tag)`
							})
						)
				})
			)
		);
	}
});

export default rule;
