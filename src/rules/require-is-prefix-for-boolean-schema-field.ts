import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const SCHEMA_NAMESPACES = ['Schema', 'S'] as const;
const BOOLEAN_PREFIXES = ['is', 'has', 'can', 'should', 'was', 'will'] as const;

const BooleanPrefixedName = Schema.String.check(
	Schema.isPattern(new RegExp(`^(${BOOLEAN_PREFIXES.join('|')})[A-Z]`), {
		identifier: 'BooleanPrefixedName',
		title: 'Boolean-Prefixed Field Name',
		description:
			'An identifier beginning with a Foldkit boolean prefix (is/has/can/should/was/will) followed by an uppercase letter.'
	})
);
const isBooleanPrefixedName = Schema.is(BooleanPrefixedName);

const isSchemaStructCall = (call: ESTree.CallExpression): boolean =>
	pipe(
		SCHEMA_NAMESPACES,
		Arr.some((ns) => AST.isCallOf(call, ns, 'Struct'))
	);

const isSchemaBoolean = (node: ESTree.Node): boolean =>
	node.type === 'MemberExpression' &&
	pipe(
		SCHEMA_NAMESPACES,
		Arr.some((ns) => AST.isMember(node, ns, 'Boolean'))
	);

interface Finding {
	readonly node: ESTree.ObjectProperty;
	readonly key: string;
}

const findings = (fields: ESTree.ObjectExpression): ReadonlyArray<Finding> =>
	pipe(
		fields.properties,
		Arr.filterMap((prop) => {
			if (prop.type !== 'Property') return Result.failVoid;
			if (prop.key.type !== 'Identifier') return Result.failVoid;
			if (!isSchemaBoolean(prop.value)) return Result.failVoid;
			if (isBooleanPrefixedName(prop.key.name)) return Result.failVoid;
			return Result.succeed<Finding>({ node: prop, key: prop.key.name });
		})
	);

const fieldsArg = (
	call: ESTree.CallExpression
): ESTree.ObjectExpression | undefined => {
	const arg = call.arguments[0];
	return arg !== undefined && arg.type === 'ObjectExpression'
		? arg
		: undefined;
};

const rule: CreateRule = Rule.define({
	name: 'require-is-prefix-for-boolean-schema-field',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Boolean fields in `Schema.Struct` must use a boolean prefix (is/has/can/should/was/will) (FK-6)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) => {
			if (!isSchemaStructCall(node)) return Effect.void;
			const fields = fieldsArg(node);
			if (fields === undefined) return Effect.void;
			return Effect.forEach(
				findings(fields),
				(f) =>
					ctx.report(
						Diagnostic.make({
							node: f.node,
							message: `Boolean field \`${f.key}\` must use a boolean prefix (\`is*\`, \`has*\`, \`can*\`, \`should*\`, \`was*\`, or \`will*\`) — e.g. \`is${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}\`. (FK-6)`
						})
					),
				{ concurrency: 1, discard: true }
			);
		});
	}
});

export default rule;
