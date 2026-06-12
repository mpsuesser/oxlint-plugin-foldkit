import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as HashSet from 'effect/HashSet';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const FailedResultName = Schema.String.check(
	Schema.isPattern(/^Failed[A-Z]/, {
		identifier: 'FailedResultName',
		title: 'Failed-prefixed Command Result',
		description:
			'A Command result constructor whose name starts with `Failed` followed by an uppercase letter.'
	})
);
const isFailedResultName = Schema.is(FailedResultName);

const CATCH_METHODS = HashSet.make(
	'catch',
	'catchAll',
	'catchCause',
	'catchIf',
	'catchTag',
	'catchTags',
	'match',
	'matchCause'
);

const isCommandDefineCall = (node: ESTree.CallExpression): boolean =>
	AST.isCallOf(node, 'Command', 'define');

const appliedCommandDefine = (
	call: ESTree.CallExpression
): Option.Option<ESTree.CallExpression> =>
	call.callee.type === 'CallExpression' && isCommandDefineCall(call.callee)
		? Option.some(call.callee)
		: Option.none();

const resultArgs = (
	defineCall: ESTree.CallExpression
): ReadonlyArray<ESTree.Argument> => {
	const withoutName = Arr.drop(defineCall.arguments, 1);
	return pipe(
		Arr.head(withoutName),
		Option.match({
			onNone: () => withoutName,
			onSome: (arg) =>
				arg.type === 'ObjectExpression'
					? Arr.drop(withoutName, 1)
					: withoutName
		})
	);
};

const argumentName = (arg: ESTree.Argument): Option.Option<string> => {
	if (arg.type === 'Identifier') return Option.some(arg.name);
	if (arg.type === 'MemberExpression') {
		return pipe(AST.memberPath(arg), Option.map(Arr.lastNonEmpty));
	}
	return Option.none();
};

const failedResultNames = (
	defineCall: ESTree.CallExpression
): ReadonlyArray<string> =>
	pipe(
		resultArgs(defineCall),
		Arr.filterMap((arg) =>
			pipe(
				argumentName(arg),
				Option.filter(isFailedResultName),
				Result.fromOption(() => undefined)
			)
		)
	);

const hasFailedResult = (defineCall: ESTree.CallExpression): boolean =>
	Arr.isReadonlyArrayNonEmpty(failedResultNames(defineCall));

const parentOf = (node: {
	readonly parent?: unknown;
}): Option.Option<{
	readonly type: string;
	readonly callee?: unknown;
	readonly parent?: unknown;
}> =>
	pipe(
		Option.fromNullishOr(node.parent),
		Option.filter(
			(
				parent
			): parent is {
				readonly type: string;
				readonly callee?: unknown;
				readonly parent?: unknown;
			} =>
				P.isObject(parent) &&
				'type' in parent &&
				P.isString(parent.type)
		)
	);

const isImmediatelyApplied = (defineCall: ESTree.CallExpression): boolean =>
	pipe(
		parentOf(defineCall),
		Option.match({
			onNone: () => false,
			onSome: (parent) =>
				parent.type === 'CallExpression' && parent.callee === defineCall
		})
	);

type IdentifierLike = {
	readonly type: string;
	readonly name: string;
};

type MemberExpressionLike = {
	readonly type: string;
	readonly computed?: unknown;
	readonly object?: unknown;
	readonly property?: unknown;
};

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
	P.isObject(value) &&
	'type' in value &&
	value.type === 'Identifier' &&
	'name' in value &&
	P.isString(value.name);

const isMemberExpressionLike = (
	value: unknown
): value is MemberExpressionLike =>
	P.isObject(value) && 'type' in value && value.type === 'MemberExpression';

const memberPath = (
	value: unknown
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
	if (isIdentifierLike(value)) return Option.some([value.name]);
	if (!isMemberExpressionLike(value) || value.computed === true) {
		return Option.none();
	}
	const property = value.property;
	if (!isIdentifierLike(property)) return Option.none();
	return pipe(
		memberPath(value.object),
		Option.map((path) => [...path, property.name])
	);
};

const isEffectCatchCall = (value: unknown): boolean => {
	if (!P.isObject(value)) return false;
	if (!('type' in value) || value.type !== 'CallExpression') return false;
	if (!('callee' in value)) return false;
	return pipe(
		memberPath(value.callee),
		Option.match({
			onNone: () => false,
			onSome: (path) => {
				const method = Arr.lastNonEmpty(path);
				return (
					path.length === 2 &&
					Arr.headNonEmpty(path) === 'Effect' &&
					HashSet.has(CATCH_METHODS, method)
				);
			}
		})
	);
};

const containsCatch = (root: unknown): boolean => {
	if (isEffectCatchCall(root)) return true;
	if (!P.isObject(root)) return false;
	return pipe(
		Object.values(root),
		Arr.some((child) =>
			Array.isArray(child)
				? pipe(child, Arr.some(containsCatch))
				: containsCatch(child)
		)
	);
};

const appliedArgumentContainsCatch = (call: ESTree.CallExpression): boolean =>
	pipe(call.arguments, Arr.some(containsCatch));

const failedList = (defineCall: ESTree.CallExpression): string =>
	pipe(failedResultNames(defineCall), Arr.join(', '));

const rule: CreateRule = Rule.define({
	name: 'command-failed-result-requires-catch',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Commands declaring Failed* results must catch failures into those result messages'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) => {
			if (isCommandDefineCall(node)) {
				return hasFailedResult(node) && !isImmediatelyApplied(node)
					? ctx.report(
							Diagnostic.make({
								node,
								message: `\`Command.define\` declares ${failedList(node)} but is not immediately applied to an Effect factory. Apply it in-place and catch failures into the Failed result. (FK commands)`
							})
						)
					: Effect.void;
			}
			return pipe(
				appliedCommandDefine(node),
				Option.filter(hasFailedResult),
				Option.filter(() => !appliedArgumentContainsCatch(node)),
				Option.match({
					onNone: () => Effect.void,
					onSome: (defineCall) =>
						ctx.report(
							Diagnostic.make({
								node,
								message: `\`Command.define\` declares ${failedList(defineCall)} but the applied Effect does not contain \`Effect.catch*\` or \`Effect.match*\`. Catch failures and return the Failed result so the Foldkit runtime receives a Message instead of a defect. (FK commands)`
							})
						)
				})
			);
		});
	}
});

export default rule;
