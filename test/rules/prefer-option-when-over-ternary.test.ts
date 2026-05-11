import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/prefer-option-when-over-ternary.ts';

const ternary = (
	test: unknown,
	consequent: unknown,
	alternate: unknown
): unknown => ({
	type: 'ConditionalExpression',
	test,
	consequent,
	alternate
});

const optionSome = (arg: unknown) =>
	Testing.callOfMember('Option', 'some', [arg]);

const optionNone = () => Testing.callOfMember('Option', 'none', []);

describe('prefer-option-when-over-ternary', () => {
	// ── positive form: cond ? Option.some(x) : Option.none() ──
	it('flags `cond ? Option.some(value) : Option.none()`', () => {
		const node = ternary(
			Testing.id('cond'),
			optionSome(Testing.id('value')),
			optionNone()
		);
		const result = Testing.runRule(rule, 'ConditionalExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain(
			'OptionExt.when(condition, value)'
		);
	});

	// ── inverted form: cond ? Option.none() : Option.some(x) ──
	it('flags `cond ? Option.none() : Option.some(value)`', () => {
		const node = ternary(
			Testing.id('cond'),
			optionNone(),
			optionSome(Testing.id('value'))
		);
		const result = Testing.runRule(rule, 'ConditionalExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain(
			'OptionExt.when(!condition, value)'
		);
	});

	// ── correct usage ────────────────────────────────────────
	it('does not flag a non-Option ternary `cond ? a : b`', () => {
		const node = ternary(
			Testing.id('cond'),
			Testing.id('a'),
			Testing.id('b')
		);
		const result = Testing.runRule(rule, 'ConditionalExpression', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `cond ? Option.some(a) : Option.some(b)` (both branches Some)', () => {
		const node = ternary(
			Testing.id('cond'),
			optionSome(Testing.id('a')),
			optionSome(Testing.id('b'))
		);
		const result = Testing.runRule(rule, 'ConditionalExpression', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `cond ? Option.some(a) : x`', () => {
		const node = ternary(
			Testing.id('cond'),
			optionSome(Testing.id('a')),
			Testing.id('x')
		);
		const result = Testing.runRule(rule, 'ConditionalExpression', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag a Result-shaped ternary `cond ? Result.succeed(a) : Result.failVoid`', () => {
		const node = ternary(
			Testing.id('cond'),
			Testing.callOfMember('Result', 'succeed', [Testing.id('a')]),
			Testing.callOfMember('Result', 'failVoid', [])
		);
		const result = Testing.runRule(rule, 'ConditionalExpression', node);
		expect(result).toHaveLength(0);
	});
});
