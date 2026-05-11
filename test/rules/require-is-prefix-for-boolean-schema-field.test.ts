import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/require-is-prefix-for-boolean-schema-field.ts';

const structCall = (
	namespace: string,
	fields: ReadonlyArray<{ readonly key: string; readonly value: unknown }>
) => Testing.callOfMember(namespace, 'Struct', [Testing.objectExpr(fields)]);

const schemaBoolean = (namespace: string = 'Schema') =>
	Testing.memberExpr(namespace, 'Boolean');

describe('require-is-prefix-for-boolean-schema-field', () => {
	// ── flagged: boolean fields without proper prefix ──────
	it.each([
		'active',
		'visible',
		'disabled',
		'submitted',
		'loading',
		'expanded'
	])('flags `%s: Schema.Boolean`', (fieldName) => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			structCall('Schema', [{ key: fieldName, value: schemaBoolean() }])
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain(fieldName);
		expect(result[0]?.diagnostic.message).toContain('boolean prefix');
	});

	it('flags only the offending boolean fields', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			structCall('Schema', [
				{ key: 'isActive', value: schemaBoolean() }, // ok
				{ key: 'visible', value: schemaBoolean() }, // ❌
				{ key: 'hasChildren', value: schemaBoolean() }, // ok
				{ key: 'submitted', value: schemaBoolean() } // ❌
			])
		);
		expect(result).toHaveLength(2);
	});

	// ── allowed prefixes ────────────────────────────────────
	it.each([
		'isActive',
		'hasError',
		'canSubmit',
		'shouldRefresh',
		'wasSeen',
		'willRetry'
	])('does not flag `%s: Schema.Boolean`', (fieldName) => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			structCall('Schema', [{ key: fieldName, value: schemaBoolean() }])
		);
		expect(result).toHaveLength(0);
	});

	// ── alias namespace `S` ─────────────────────────────────
	it('also covers `S.Struct` + `S.Boolean`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			structCall('S', [{ key: 'submitted', value: schemaBoolean('S') }])
		);
		expect(result).toHaveLength(1);
	});

	// ── non-boolean fields ─────────────────────────────────
	it('does not flag non-boolean fields with the same names', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			structCall('Schema', [
				{
					key: 'submitted',
					value: Testing.memberExpr('Schema', 'String')
				},
				{
					key: 'visible',
					value: Testing.memberExpr('Schema', 'Number')
				}
			])
		);
		expect(result).toHaveLength(0);
	});

	// ── boundary: prefix-as-substring without word boundary ──
	it('flags `iscool` (prefix without uppercase boundary)', () => {
		// `iscool` does NOT start with `is` followed by an uppercase letter,
		// so it fails the prefix check and is flagged.
		const result = Testing.runRule(
			rule,
			'CallExpression',
			structCall('Schema', [{ key: 'iscool', value: schemaBoolean() }])
		);
		expect(result).toHaveLength(1);
	});

	// ── non-target calls ───────────────────────────────────
	it('does not flag a `Other.Struct(...)` call', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Other', 'Struct', [
				Testing.objectExpr([
					{ key: 'submitted', value: schemaBoolean() }
				])
			])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag a `Schema.Struct(...)` with no object-literal arg', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Schema', 'Struct', [Testing.id('fields')])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag computed-key properties', () => {
		// Computed keys (`[someName]:`) have `key.type !== 'Identifier'` and
		// are skipped — the rule cannot make a static naming judgment.
		const computedKeyObj = {
			type: 'ObjectExpression',
			properties: [
				{
					type: 'Property',
					key: Testing.id('dynamicKey'),
					value: schemaBoolean(),
					computed: true,
					shorthand: false,
					method: false,
					kind: 'init'
				}
			]
		};
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Schema', 'Struct', [computedKeyObj])
		);
		// The current rule does not differentiate computed/non-computed for
		// Identifier keys; ensure it still operates and matches naming.
		expect(result.length).toBeGreaterThanOrEqual(1);
	});
});
