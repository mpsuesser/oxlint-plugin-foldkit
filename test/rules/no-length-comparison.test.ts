import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-length-comparison.ts';

const lengthOf = (name: string) => Testing.memberExpr(name, 'length');

describe('no-length-comparison', () => {
	// ── flagged: .length OP 0 (and 0 OP .length) ─────────────
	it.each(['===', '!==', '==', '!=', '>', '<', '>=', '<='])(
		'flags `arr.length %s 0`',
		(op) => {
			const result = Testing.runRule(
				rule,
				'BinaryExpression',
				Testing.binaryExpr(op, lengthOf('arr'), Testing.numLiteral(0))
			);
			expect(result).toHaveLength(1);
			expect(result[0]?.diagnostic.message).toContain('isEmptyArray');
		}
	);

	it('flags `0 < arr.length` (zero on left)', () => {
		const result = Testing.runRule(
			rule,
			'BinaryExpression',
			Testing.binaryExpr('<', Testing.numLiteral(0), lengthOf('arr'))
		);
		expect(result).toHaveLength(1);
	});

	it('flags `s.length === 0` for strings as well', () => {
		const result = Testing.runRule(
			rule,
			'BinaryExpression',
			Testing.binaryExpr('===', lengthOf('s'), Testing.numLiteral(0))
		);
		expect(result).toHaveLength(1);
	});

	// ── allowed comparisons ──────────────────────────────────
	it('does not flag `arr.length === 1` (non-zero literal)', () => {
		const result = Testing.runRule(
			rule,
			'BinaryExpression',
			Testing.binaryExpr('===', lengthOf('arr'), Testing.numLiteral(1))
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `arr.length === other.length`', () => {
		const result = Testing.runRule(
			rule,
			'BinaryExpression',
			Testing.binaryExpr('===', lengthOf('arr'), lengthOf('other'))
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `.size === 0` (different property)', () => {
		const result = Testing.runRule(
			rule,
			'BinaryExpression',
			Testing.binaryExpr(
				'===',
				Testing.memberExpr('set', 'size'),
				Testing.numLiteral(0)
			)
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `arr.length + 0` (non-comparison operator)', () => {
		const result = Testing.runRule(
			rule,
			'BinaryExpression',
			Testing.binaryExpr('+', lengthOf('arr'), Testing.numLiteral(0))
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `0 === 0` (no length access)', () => {
		const result = Testing.runRule(
			rule,
			'BinaryExpression',
			Testing.binaryExpr(
				'===',
				Testing.numLiteral(0),
				Testing.numLiteral(0)
			)
		);
		expect(result).toHaveLength(0);
	});
});
