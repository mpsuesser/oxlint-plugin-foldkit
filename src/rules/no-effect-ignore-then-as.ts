import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as HashSet from 'effect/HashSet';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

/**
 * Foldkit `Task` / navigation primitives whose `Effect` has no error
 * channel — `Effect.ignore` is a no-op on these.
 */
const INFALLIBLE_FN_NAMES = HashSet.make(
	'pushUrl',
	'load',
	'loadExternalUrl',
	'back',
	'forward'
);

const isEffectIgnoreMember = (node: ESTree.Node): boolean =>
	node.type === 'MemberExpression' && AST.isMember(node, 'Effect', 'ignore');

const isEffectAsCall = (node: ESTree.Node): boolean =>
	node.type === 'CallExpression' && AST.isCallOf(node, 'Effect', 'as');

/**
 * Walk a chain of `<expr>.pipe(...)` calls to the leaf callee identifier
 * (e.g. `pushUrl` in `pushUrl(...).pipe(...)`).
 */
const leafCalleeName = (node: ESTree.Node): Option.Option<string> => {
	if (node.type === 'CallExpression') {
		if (node.callee.type === 'Identifier') {
			return Option.some(node.callee.name);
		}
		if (node.callee.type === 'MemberExpression') {
			return leafCalleeName(node.callee.object);
		}
		return Option.none();
	}
	if (node.type === 'MemberExpression') {
		return leafCalleeName(node.object);
	}
	return Option.none();
};

const pipeReceiverObject = (
	call: ESTree.CallExpression
): Option.Option<ESTree.Node> =>
	call.callee.type === 'MemberExpression' &&
	call.callee.property.type === 'Identifier' &&
	call.callee.property.name === 'pipe'
		? Option.some(call.callee.object)
		: Option.none();

interface Finding {
	readonly node: ESTree.Node;
	readonly message: string;
}

const adjacencyFindings = (
	args: ReadonlyArray<ESTree.Argument>
): ReadonlyArray<Finding> =>
	pipe(
		Arr.range(0, Math.max(args.length - 2, -1)),
		Arr.filterMap((i) => {
			const a = args[i];
			const b = args[i + 1];
			if (a === undefined || b === undefined) return Result.failVoid;
			if (a.type === 'SpreadElement' || b.type === 'SpreadElement')
				return Result.failVoid;
			return isEffectIgnoreMember(a) && isEffectAsCall(b)
				? Result.succeed<Finding>({
						node: a,
						message:
							'`Effect.ignore` immediately before `Effect.as(...)` is redundant. `Effect.as` already discards the success value; the `ignore` only hides errors. Either drop `Effect.ignore` (if the Effect is infallible) or catch errors explicitly. (FK-3)'
					})
				: Result.failVoid;
		})
	);

const infallibleFindings = (
	args: ReadonlyArray<ESTree.Argument>,
	leaf: string
): ReadonlyArray<Finding> =>
	pipe(
		args,
		Arr.filterMap((arg) =>
			arg.type !== 'SpreadElement' && isEffectIgnoreMember(arg)
				? Result.succeed<Finding>({
						node: arg,
						message: `\`Effect.ignore\` on \`${leaf}(...)\` is a no-op — the Effect is infallible (\`Effect.Effect<void>\`). Drop the \`Effect.ignore\` step. (FK-3)`
					})
				: Result.failVoid
		)
	);

const rule: CreateRule = Rule.define({
	name: 'no-effect-ignore-then-as',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow `Effect.ignore` followed by `Effect.as` and `Effect.ignore` on infallible Foldkit primitives (FK-3)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				pipeReceiverObject(node),
				Option.match({
					onNone: () => Effect.void,
					onSome: (receiver) => {
						const adjacency = adjacencyFindings(node.arguments);
						const infallible = pipe(
							leafCalleeName(receiver),
							Option.filter((name) =>
								HashSet.has(INFALLIBLE_FN_NAMES, name)
							),
							Option.match({
								onNone: () => Arr.empty<Finding>(),
								onSome: (leaf) =>
									infallibleFindings(node.arguments, leaf)
							})
						);
						return Effect.forEach(
							Arr.appendAll(adjacency, infallible),
							(f) =>
								ctx.report(
									Diagnostic.make({
										node: f.node,
										message: f.message
									})
								),
							{ concurrency: 1, discard: true }
						);
					}
				})
			)
		);
	}
});

export default rule;
