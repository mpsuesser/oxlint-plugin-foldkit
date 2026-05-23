import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as P from 'effect/Predicate';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

/** Common namespace identifiers for Effect's Schema module. */
const SCHEMA_NAMESPACES = ['Schema', 'S'] as const;

const isSchemaLiteralsCall = (call: ESTree.CallExpression): boolean =>
	pipe(
		SCHEMA_NAMESPACES,
		Arr.some((ns) => AST.isCallOf(call, ns, 'Literals'))
	);

const LowercaseInitial = Schema.String.check(
	Schema.isPattern(/^[a-z]/, {
		identifier: 'LowercaseInitial',
		title: 'Lowercase Initial',
		description: 'A non-empty string whose first character is lowercase.'
	})
);
const isLowercaseInitial = Schema.is(LowercaseInitial);

interface LiteralFinding {
	readonly node: ESTree.Node;
	readonly value: string;
	readonly suggested: string;
}

const literalsArray = (
	call: ESTree.CallExpression
): ESTree.ArrayExpression | undefined => {
	const arg = call.arguments[0];
	return arg !== undefined && arg.type === 'ArrayExpression'
		? arg
		: undefined;
};

const findings = (arr: ESTree.ArrayExpression): ReadonlyArray<LiteralFinding> =>
	pipe(
		arr.elements,
		Arr.filterMap((el) => {
			if (
				el === null ||
				el.type !== 'Literal' ||
				!P.isString(el.value) ||
				!isLowercaseInitial(el.value)
			) {
				return Result.failVoid;
			}
			return Result.succeed<LiteralFinding>({
				node: el,
				value: el.value,
				suggested: el.value.charAt(0).toUpperCase() + el.value.slice(1)
			});
		})
	);

const rule: CreateRule = Rule.define({
	name: 'require-capitalized-schema-literals',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'`Schema.Literals(["..."])` entries must be capitalized (FK-6)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) => {
			if (!isSchemaLiteralsCall(node)) return Effect.void;
			const arr = literalsArray(node);
			if (arr === undefined) return Effect.void;
			return Effect.forEach(
				findings(arr),
				(f) =>
					ctx.report(
						Diagnostic.make({
							node: f.node,
							message: `Schema literal \`'${f.value}'\` must be capitalized — use \`'${f.suggested}'\`. (FK-6)`
						})
					),
				{ concurrency: 1, discard: true }
			);
		});
	}
});

export default rule;
