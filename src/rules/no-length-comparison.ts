import type { ESTree } from 'effect-oxlint';

import * as Bool from 'effect/Boolean';
import * as Effect from 'effect/Effect';
import * as HashSet from 'effect/HashSet';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const SUSPECT_OPS = HashSet.make(
	'===',
	'!==',
	'==',
	'!=',
	'>',
	'<',
	'>=',
	'<='
);

const isLengthAccess = (
	n: ESTree.Expression | ESTree.PrivateIdentifier
): boolean =>
	n.type === 'MemberExpression' &&
	n.property.type === 'Identifier' &&
	n.property.name === 'length';

const isZero = (n: ESTree.Expression | ESTree.PrivateIdentifier): boolean =>
	n.type === 'Literal' && n.value === 0;

const lengthAgainstZero = (bin: ESTree.BinaryExpression): boolean => {
	const leftLen = isLengthAccess(bin.left);
	const rightLen = isLengthAccess(bin.right);
	const leftZero = isZero(bin.left);
	const rightZero = isZero(bin.right);
	return (leftLen && rightZero) || (leftZero && rightLen);
};

export default Rule.define({
	name: 'no-length-comparison',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow `.length === 0` / `.length > 0` — use `Array.isEmptyArray`, `Array.isNonEmptyArray`, `String.isNonEmpty`, or `Array.match` (FK-3)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('BinaryExpression', (node) =>
			Bool.match(
				HashSet.has(SUSPECT_OPS, node.operator) &&
					lengthAgainstZero(node),
				{
					onFalse: () => Effect.void,
					onTrue: () =>
						ctx.report(
							Diagnostic.make({
								node,
								message:
									'Avoid `.length` comparisons against `0`. Use `Array.isEmptyArray(xs)` / `Array.isNonEmptyArray(xs)` for arrays, `String.isNonEmpty(s)` for strings, or `Array.match({ onEmpty, onNonEmpty })` for branching. (FK-3)'
							})
						)
				}
			)
		);
	}
});
