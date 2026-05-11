import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/maybe-prefix-requires-option.ts';

// ── helpers ────────────────────────────────────────────────────────────────

const annotation = (typeNode: unknown) => ({
	type: 'TSTypeAnnotation',
	typeAnnotation: typeNode
});

const union = (types: ReadonlyArray<unknown>) => ({
	type: 'TSUnionType',
	types: Array.from(types)
});

const undefinedKw = () => ({ type: 'TSUndefinedKeyword' });
const nullKw = () => ({ type: 'TSNullKeyword' });
const stringKw = () => ({ type: 'TSStringKeyword' });

const typeRef = (name: string) => ({
	type: 'TSTypeReference',
	typeName: { type: 'Identifier', name },
	typeArguments: null
});

const qualifiedTypeRef = (left: string, right: string) => ({
	type: 'TSTypeReference',
	typeName: {
		type: 'TSQualifiedName',
		left: { type: 'Identifier', name: left },
		right: { type: 'Identifier', name: right }
	},
	typeArguments: null
});

const annotatedIdent = (name: string, typeNode: unknown) => ({
	type: 'Identifier',
	name,
	typeAnnotation: typeNode === null ? null : annotation(typeNode)
});

const propertySignature = (name: string, typeNode: unknown) => ({
	type: 'TSPropertySignature',
	computed: false,
	optional: false,
	readonly: false,
	key: { type: 'Identifier', name },
	typeAnnotation: typeNode === null ? null : annotation(typeNode)
});

const property = (key: string, value: unknown) => ({
	type: 'Property',
	kind: 'init',
	computed: false,
	method: false,
	shorthand: false,
	key: { type: 'Identifier', name: key },
	value
});

const objectExpr = (props: ReadonlyArray<unknown>) => ({
	type: 'ObjectExpression',
	properties: Array.from(props)
});

const schemaStructCall = (
	namespace: 'Schema' | 'S',
	props: ReadonlyArray<unknown>
) => Testing.callOfMember(namespace, 'Struct', [objectExpr(props)]);

const schemaOptionCall = (namespace: 'Schema' | 'S', constructor: string) =>
	Testing.callOfMember(namespace, constructor, [Testing.id('String')]);

const schemaOptionalCall = (namespace: 'Schema' | 'S') =>
	Testing.callOfMember(namespace, 'optional', [Testing.id('String')]);

// ── TS axis: Identifier annotations ────────────────────────────────────────

describe('maybe-prefix-requires-option (TS Identifier)', () => {
	it('flags `maybeFoo: string | undefined`', () => {
		const node = annotatedIdent(
			'maybeFoo',
			union([stringKw(), undefinedKw()])
		);
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('nullableFoo');
	});

	it('flags `maybeName: string | null`', () => {
		const node = annotatedIdent('maybeName', union([stringKw(), nullKw()]));
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(1);
	});

	it('does not flag `maybeFoo: Option<string>`', () => {
		const node = annotatedIdent('maybeFoo', typeRef('Option'));
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `maybeFoo: Option.Option<string>` (qualified)', () => {
		const node = annotatedIdent(
			'maybeFoo',
			qualifiedTypeRef('Option', 'Option')
		);
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `maybeFoo` with no annotation', () => {
		const node = annotatedIdent('maybeFoo', null);
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag non-maybe identifiers (e.g. `nullableFoo: string | undefined`)', () => {
		const node = annotatedIdent(
			'nullableFoo',
			union([stringKw(), undefinedKw()])
		);
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `maybe` (prefix without uppercase letter)', () => {
		const node = annotatedIdent(
			'maybe',
			union([stringKw(), undefinedKw()])
		);
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `maybeFoo: string` (no nullish in union)', () => {
		const node = annotatedIdent('maybeFoo', stringKw());
		const result = Testing.runRule(rule, 'Identifier', node);
		expect(result).toHaveLength(0);
	});
});

// ── TS axis: TSPropertySignature ───────────────────────────────────────────

describe('maybe-prefix-requires-option (TS TSPropertySignature)', () => {
	it('flags `maybeFoo: string | undefined` inside an interface', () => {
		const node = propertySignature(
			'maybeFoo',
			union([stringKw(), undefinedKw()])
		);
		const result = Testing.runRule(rule, 'TSPropertySignature', node);
		expect(result).toHaveLength(1);
	});

	it('does not flag `maybeFoo: Option<string>` inside an interface', () => {
		const node = propertySignature('maybeFoo', typeRef('Option'));
		const result = Testing.runRule(rule, 'TSPropertySignature', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag a non-maybe property', () => {
		const node = propertySignature(
			'placeholder',
			union([stringKw(), undefinedKw()])
		);
		const result = Testing.runRule(rule, 'TSPropertySignature', node);
		expect(result).toHaveLength(0);
	});
});

// ── Schema axis ────────────────────────────────────────────────────────────

describe('maybe-prefix-requires-option (Schema.Struct fields)', () => {
	it('flags `maybeError: S.optional(S.String)`', () => {
		const node = schemaStructCall('S', [
			property('maybeError', schemaOptionalCall('S'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('S.Option');
	});

	it('flags `maybeError: S.optional(...)` inside `Schema.Struct`', () => {
		const node = schemaStructCall('Schema', [
			property('maybeError', schemaOptionalCall('Schema'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(1);
	});

	it('does not flag `maybeError: S.Option(S.String)`', () => {
		const node = schemaStructCall('S', [
			property('maybeError', schemaOptionCall('S', 'Option'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `maybeError: S.OptionFromNullishOr(S.String)`', () => {
		const node = schemaStructCall('S', [
			property('maybeError', schemaOptionCall('S', 'OptionFromNullishOr'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `maybeError: S.OptionFromOptional(S.String)`', () => {
		const node = schemaStructCall('S', [
			property('maybeError', schemaOptionCall('S', 'OptionFromOptional'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag non-maybe schema fields with optional', () => {
		const node = schemaStructCall('S', [
			property('placeholder', schemaOptionalCall('S'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});

	it('flags multiple maybe* fields independently', () => {
		const node = schemaStructCall('S', [
			property('maybeFoo', schemaOptionalCall('S')),
			property('maybeBar', schemaOptionCall('S', 'Option')),
			property('maybeBaz', schemaOptionalCall('S'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(2);
	});

	it('does not flag calls to non-Schema namespaces (e.g. `Foo.Struct(...)`)', () => {
		const node = Testing.callOfMember('Foo', 'Struct', [
			objectExpr([property('maybeError', schemaOptionalCall('S'))])
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});
});
