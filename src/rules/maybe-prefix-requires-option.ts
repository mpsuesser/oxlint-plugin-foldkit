import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

/**
 * Foldkit reserves the `maybe*` prefix exclusively for `Option<T>`. Two axes
 * are enforced:
 *
 *   1. TS bindings / parameters / interface members named `maybe*` whose type
 *      annotation is `T | undefined` / `T | null` rather than `Option<T>`.
 *   2. Schema struct fields named `maybe*` whose value is not a
 *      `Schema.Option(...)` / `S.Option(...)` (or `OptionFromNullOr`, etc.)
 *      constructor call.
 *
 * The fix is either to change the type/schema to use `Option`, or rename the
 * binding to `nullable*` if `T | undefined` is the intended shape.
 *
 * @since 0.4.0
 */

const SCHEMA_NAMESPACES = ['Schema', 'S'] as const;

const MaybePrefixedName = Schema.String.check(
	Schema.isPattern(/^maybe[A-Z]/, {
		identifier: 'MaybePrefixedName',
		title: 'Maybe-Prefixed Identifier',
		description:
			'An identifier beginning with `maybe` followed by an uppercase letter — Foldkit reserves this prefix for `Option<T>`.'
	})
);
const isMaybePrefixedName: (s: string) => boolean =
	Schema.is(MaybePrefixedName);

// ── TS runtime shape schemas ───────────────────────────────────────────────
//
// The oxc `.d.ts` types `BindingIdentifier.typeAnnotation` and related fields
// as `?: null`, but the parser emits real `TSTypeAnnotation` nodes for
// TS-annotated source. We narrow with Schema-based runtime guards rather than
// casting, in line with EF-35.

const NodeWithType = Schema.Struct({ type: Schema.String });
const isNodeWithType = Schema.is(NodeWithType);

const TypeAnnotationWrapper = Schema.Struct({
	type: Schema.Literal('TSTypeAnnotation'),
	typeAnnotation: NodeWithType
});

const TSUnionShape = Schema.Struct({
	type: Schema.Literal('TSUnionType'),
	types: Schema.Array(NodeWithType)
});
const isTSUnionShape = Schema.is(TSUnionShape);

const TSTypeReferenceIdent = Schema.Struct({
	type: Schema.Literal('TSTypeReference'),
	typeName: Schema.Struct({
		type: Schema.Literal('Identifier'),
		name: Schema.String
	})
});
const TSTypeReferenceQualified = Schema.Struct({
	type: Schema.Literal('TSTypeReference'),
	typeName: Schema.Struct({
		type: Schema.Literal('TSQualifiedName'),
		right: Schema.Struct({
			type: Schema.Literal('Identifier'),
			name: Schema.String
		})
	})
});
const isTSTypeReferenceIdent = Schema.is(TSTypeReferenceIdent);
const isTSTypeReferenceQualified = Schema.is(TSTypeReferenceQualified);

const TSLiteralNull = Schema.Struct({
	type: Schema.Literal('TSLiteralType'),
	literal: Schema.Struct({ type: Schema.Literal('NullLiteral') })
});
const isTSLiteralNull = Schema.is(TSLiteralNull);

const TSUndefinedKeyword = Schema.Struct({
	type: Schema.Literal('TSUndefinedKeyword')
});
const TSNullKeyword = Schema.Struct({ type: Schema.Literal('TSNullKeyword') });
const isTSUndefinedKeyword = Schema.is(TSUndefinedKeyword);
const isTSNullKeyword = Schema.is(TSNullKeyword);

// ── Axis 1: TS type annotations ────────────────────────────────────────────

/** Read the inner TS annotation off any node, regardless of `.d.ts` narrowness. */
const readAnnotation = (
	node: ESTree.Node
): Option.Option<{ readonly type: string }> => {
	if (!Schema.is(Schema.Struct({ typeAnnotation: Schema.Unknown }))(node)) {
		return Option.none();
	}
	const wrapper = node.typeAnnotation;
	if (!Schema.is(TypeAnnotationWrapper)(wrapper)) return Option.none();
	return Option.some(wrapper.typeAnnotation);
};

const isUndefinedOrNullKeyword = (n: { readonly type: string }): boolean =>
	isTSUndefinedKeyword(n) || isTSNullKeyword(n) || isTSLiteralNull(n);

const isOptionTypeReference = (n: { readonly type: string }): boolean => {
	if (isTSTypeReferenceIdent(n)) return n.typeName.name === 'Option';
	if (isTSTypeReferenceQualified(n))
		return n.typeName.right.name === 'Option';
	return false;
};

const annotationIsBareNullish = (ann: { readonly type: string }): boolean => {
	if (!isTSUnionShape(ann)) return false;
	const hasNullish = pipe(ann.types, Arr.some(isUndefinedOrNullKeyword));
	if (!hasNullish) return false;
	return pipe(
		ann.types,
		Arr.filter((t) => !isUndefinedOrNullKeyword(t)),
		Arr.match({
			// `T | undefined | null` with no non-nullish member is degenerate;
			// still wrong-shape under the convention.
			onEmpty: () => true,
			onNonEmpty: (items) =>
				!pipe(items, Arr.every(isOptionTypeReference))
		})
	);
};

// ── Axis 2: Schema struct fields ───────────────────────────────────────────

const isSchemaStructCall = (call: ESTree.CallExpression): boolean =>
	pipe(
		SCHEMA_NAMESPACES,
		Arr.some((ns) => AST.isCallOf(call, ns, 'Struct'))
	);

/**
 * Accept any `Schema.Option*` / `S.Option*` constructor call —
 * `Option`, `OptionFromNullOr`, `OptionFromNullishOr`, `OptionFromOptional`,
 * `OptionFromOptionalKey`.
 */
const isSchemaOptionLikeCall = (node: ESTree.Node): boolean => {
	if (node.type !== 'CallExpression') return false;
	const callee = node.callee;
	if (callee.type !== 'MemberExpression') return false;
	const object = callee.object;
	const property = callee.property;
	if (object.type !== 'Identifier') return false;
	if (property.type !== 'Identifier') return false;
	const objectName = object.name;
	const propertyName = property.name;
	const isSchemaNs = pipe(
		SCHEMA_NAMESPACES,
		Arr.some((ns) => ns === objectName)
	);
	if (!isSchemaNs) return false;
	return propertyName.startsWith('Option');
};

interface SchemaFinding {
	readonly node: ESTree.Node;
	readonly key: string;
}

const schemaFindings = (
	fields: ESTree.ObjectExpression
): ReadonlyArray<SchemaFinding> =>
	pipe(
		fields.properties,
		Arr.filterMap((prop) => {
			if (prop.type !== 'Property') return Result.failVoid;
			if (prop.key.type !== 'Identifier') return Result.failVoid;
			if (!isMaybePrefixedName(prop.key.name)) return Result.failVoid;
			if (isSchemaOptionLikeCall(prop.value)) return Result.failVoid;
			return Result.succeed<SchemaFinding>({
				node: prop,
				key: prop.key.name
			});
		})
	);

const fieldsArg = (
	call: ESTree.CallExpression
): Option.Option<ESTree.ObjectExpression> => {
	const arg = call.arguments[0];
	return arg !== undefined && arg.type === 'ObjectExpression'
		? Option.some(arg)
		: Option.none();
};

// ── Diagnostic messages ────────────────────────────────────────────────────

const renameSuffix = (key: string): string => key.slice('maybe'.length);

const tsMessage = (key: string): string =>
	`\`${key}\` is prefixed \`maybe*\` but its type is not \`Option<T>\`. Either change the type to \`Option<T>\`, or rename to \`nullable${renameSuffix(key)}\`. (FK-6)`;

const schemaMessage = (key: string): string =>
	`Schema field \`${key}\` is prefixed \`maybe*\` but uses \`S.optional\` / nullable shape instead of \`S.Option\`. Use \`${key}: S.Option(...)\` (or \`S.OptionFromNullishOr\`, etc.) to match the prefix. (FK-6)`;

// ── Rule ───────────────────────────────────────────────────────────────────

export default Rule.define({
	name: 'maybe-prefix-requires-option',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'`maybe*`-prefixed names must be typed as `Option<T>` (TS) or `Schema.Option(...)` (Schema) (FK-6)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;

		const reportTs = (node: ESTree.Node, key: string) =>
			ctx.report(Diagnostic.make({ node, message: tsMessage(key) }));

		const reportSchema = (node: ESTree.Node, key: string) =>
			ctx.report(Diagnostic.make({ node, message: schemaMessage(key) }));

		const checkAnnotated = (
			node: ESTree.Node,
			key: string
		): Effect.Effect<void> =>
			pipe(
				readAnnotation(node),
				Option.filter(annotationIsBareNullish),
				Option.match({
					onNone: () => Effect.void,
					onSome: () => reportTs(node, key)
				})
			);

		const tsIdentifierVisitor = Visitor.on('Identifier', (node) => {
			if (!isMaybePrefixedName(node.name)) return Effect.void;
			return checkAnnotated(node, node.name);
		});

		const tsPropertySignatureVisitor = Visitor.on(
			'TSPropertySignature',
			(node) => {
				if (!isNodeWithType(node.key)) return Effect.void;
				if (node.key.type !== 'Identifier') return Effect.void;
				const keyName = node.key.name;
				if (!isMaybePrefixedName(keyName)) return Effect.void;
				return checkAnnotated(node, keyName);
			}
		);

		const schemaStructVisitor = Visitor.on('CallExpression', (node) => {
			if (!isSchemaStructCall(node)) return Effect.void;
			return pipe(
				fieldsArg(node),
				Option.map(schemaFindings),
				Option.match({
					onNone: () => Effect.void,
					onSome: (findings) =>
						Effect.forEach(
							findings,
							(f) => reportSchema(f.node, f.key),
							{ concurrency: 1, discard: true }
						)
				})
			);
		});

		return Visitor.merge(
			tsIdentifierVisitor,
			tsPropertySignatureVisitor,
			schemaStructVisitor
		);
	}
});
