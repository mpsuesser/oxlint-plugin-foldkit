import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const isEmptyArrayExpr = (node: ESTree.Node): boolean =>
	node.type === 'ArrayExpression' && node.elements.length === 0;

const isSingletonArrayExpr = (node: ESTree.Node): boolean =>
	node.type === 'ArrayExpression' &&
	node.elements.length === 1 &&
	node.elements[0] !== null;

const returnedExpression = (
	arrow: ESTree.ArrowFunctionExpression
): Option.Option<ESTree.Node> => {
	if (arrow.body.type !== 'BlockStatement') {
		return Option.some(arrow.body);
	}
	return pipe(
		arrow.body.body,
		Arr.findFirst((stmt) =>
			stmt.type === 'ReturnStatement' ? Option.some(stmt) : Option.none()
		),
		Option.flatMap((ret) =>
			ret.argument === null ? Option.none() : Option.some(ret.argument)
		)
	);
};

const arrowReturnsEmptyArray = (
	arrow: ESTree.ArrowFunctionExpression
): boolean =>
	pipe(
		returnedExpression(arrow),
		Option.map(isEmptyArrayExpr),
		Option.getOrElse(() => false)
	);

const arrowReturnsSingletonArray = (
	arrow: ESTree.ArrowFunctionExpression
): boolean =>
	pipe(
		returnedExpression(arrow),
		Option.map(isSingletonArrayExpr),
		Option.getOrElse(() => false)
	);

const propertyKeyMatches = (
	prop: ESTree.ObjectProperty,
	name: string
): boolean => {
	if (prop.key.type === 'Identifier') return prop.key.name === name;
	if (prop.key.type === 'Literal' && P.isString(prop.key.value))
		return prop.key.value === name;
	return false;
};

const namedProperty = (
	obj: ESTree.ObjectExpression,
	name: string
): Option.Option<ESTree.ObjectProperty> =>
	pipe(
		obj.properties,
		Arr.findFirst((p) =>
			p.type === 'Property' && propertyKeyMatches(p, name)
				? Option.some(p)
				: Option.none()
		)
	);

const propertyArrow = (
	prop: ESTree.ObjectProperty
): Option.Option<ESTree.ArrowFunctionExpression> =>
	prop.value.type === 'ArrowFunctionExpression'
		? Option.some(prop.value)
		: Option.none();

const looksLikeFromOption = (branches: ESTree.ObjectExpression): boolean =>
	pipe(
		Option.all({
			onNone: pipe(
				namedProperty(branches, 'onNone'),
				Option.flatMap(propertyArrow)
			),
			onSome: pipe(
				namedProperty(branches, 'onSome'),
				Option.flatMap(propertyArrow)
			)
		}),
		Option.map(
			({ onNone, onSome }) =>
				arrowReturnsEmptyArray(onNone) &&
				arrowReturnsSingletonArray(onSome)
		),
		Option.getOrElse(() => false)
	);

const matchBranchesFromDirectCall = (
	call: ESTree.CallExpression
): Option.Option<ESTree.ObjectExpression> => {
	if (!AST.isCallOf(call, 'Option', 'match')) return Option.none();
	const arg = call.arguments[1];
	return arg !== undefined && arg.type === 'ObjectExpression'
		? Option.some(arg)
		: Option.none();
};

const matchCallBranches = (
	call: ESTree.CallExpression
): Option.Option<ESTree.ObjectExpression> => {
	if (!AST.isCallOf(call, 'Option', 'match')) return Option.none();
	const branches = call.arguments[0];
	return branches !== undefined && branches.type === 'ObjectExpression'
		? Option.some(branches)
		: Option.none();
};

const matchBranchesFromPipedCall = (
	call: ESTree.CallExpression
): Option.Option<ESTree.ObjectExpression> => {
	if (call.callee.type !== 'Identifier' || call.callee.name !== 'pipe') {
		return Option.none();
	}
	return pipe(
		call.arguments,
		Arr.findFirst((arg) =>
			arg.type === 'CallExpression' ? Option.some(arg) : Option.none()
		),
		Option.flatMap(matchCallBranches)
	);
};

const matchBranches = (
	call: ESTree.CallExpression
): Option.Option<ESTree.ObjectExpression> =>
	pipe(
		matchBranchesFromDirectCall(call),
		Option.orElse(() => matchBranchesFromPipedCall(call))
	);

const rule: CreateRule = Rule.define({
	name: 'prefer-array-fromoption-over-option-match-empty',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Use `Array.fromOption(maybeX)` instead of `Option.match` returning `[]` vs `[x]` (FK-3)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				matchBranches(node),
				Option.filter(looksLikeFromOption),
				Option.match({
					onNone: () => Effect.void,
					onSome: () =>
						ctx.report(
							Diagnostic.make({
								node,
								message:
									'Use `Array.fromOption(maybeValue)` instead of `Option.match({ onNone: () => [], onSome: (v) => [v] })`. (FK-3)'
							})
						)
				})
			)
		);
	}
});

export default rule;
