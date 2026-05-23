import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { Match } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const isOptionSomeCall = (node: ESTree.Node): boolean =>
	node.type === 'CallExpression' && AST.isCallOf(node, 'Option', 'some');

const isOptionNoneCall = (node: ESTree.Node): boolean =>
	node.type === 'CallExpression' && AST.isCallOf(node, 'Option', 'none');

type TernaryShape = 'positive' | 'inverted';

const classifyTernary = (
	cond: ESTree.ConditionalExpression
): Option.Option<TernaryShape> =>
	Match.value({
		consSome: isOptionSomeCall(cond.consequent),
		consNone: isOptionNoneCall(cond.consequent),
		altSome: isOptionSomeCall(cond.alternate),
		altNone: isOptionNoneCall(cond.alternate)
	}).pipe(
		Match.when({ consSome: true, altNone: true }, () =>
			Option.some<TernaryShape>('positive')
		),
		Match.when({ consNone: true, altSome: true }, () =>
			Option.some<TernaryShape>('inverted')
		),
		Match.orElse(() => Option.none<TernaryShape>())
	);

const messageFor = (shape: TernaryShape): string =>
	Match.value(shape).pipe(
		Match.when(
			'positive',
			() =>
				'Use `OptionExt.when(condition, value)` instead of `condition ? Option.some(value) : Option.none()`. (FK-3)'
		),
		Match.when(
			'inverted',
			() =>
				'Use `OptionExt.when(!condition, value)` instead of `condition ? Option.none() : Option.some(value)`. Invert the predicate and use `OptionExt.when`. (FK-3)'
		),
		Match.exhaustive
	);

const rule: CreateRule = Rule.define({
	name: 'prefer-option-when-over-ternary',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Use `OptionExt.when(cond, value)` instead of `cond ? Option.some(value) : Option.none()` (FK-3)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('ConditionalExpression', (node) =>
			Option.match(classifyTernary(node), {
				onNone: () => Effect.void,
				onSome: (shape) =>
					ctx.report(
						Diagnostic.make({ node, message: messageFor(shape) })
					)
			})
		);
	}
});

export default rule;
