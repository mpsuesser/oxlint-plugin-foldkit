import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-empty-object-tagged-call.ts';

const emptyObj = Testing.objectExpr([]);

describe('no-empty-object-tagged-call', () => {
	it('flags `Foo({})` (PascalCase identifier with empty-object arg)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('Foo', [emptyObj])
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('`Foo({})`');
		expect(result[0]?.diagnostic.message).toContain('`Foo()`');
	});

	it('flags `MyTaggedError({})`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('MyTaggedError', [emptyObj])
		);
		expect(result).toHaveLength(1);
	});

	it('does not flag `Foo()` (no args)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('Foo', [])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `Foo({ x: 1 })` (non-empty object)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('Foo', [
				Testing.objectExpr([{ key: 'x', value: Testing.numLiteral(1) }])
			])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `foo({})` (lowercase callee — not a tagged constructor)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('foo', [emptyObj])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `Foo({}, x)` (more than one arg)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('Foo', [emptyObj, Testing.numLiteral(1)])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag member-expression callee `obj.Foo({})`', () => {
		// Only bare PascalCase identifiers are tagged constructors here.
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('obj', 'Foo', [emptyObj])
		);
		expect(result).toHaveLength(0);
	});
});
