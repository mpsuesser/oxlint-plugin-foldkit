import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/prefer-array-fromoption-over-option-match-empty.ts';

const arrayLit = (elements: ReadonlyArray<unknown>) => ({
	type: 'ArrayExpression',
	elements: Array.from(elements)
});

const branches = (onNoneBody: unknown, onSomeBody: unknown) =>
	Testing.objectExpr([
		{ key: 'onNone', value: Testing.arrowFn(onNoneBody) },
		{ key: 'onSome', value: Testing.arrowFn(onSomeBody) }
	]);

/** Direct: `Option.match(maybeX, { onNone, onSome })` */
const directMatch = (matchBranches: unknown) =>
	Testing.callOfMember('Option', 'match', [
		Testing.id('maybeX'),
		matchBranches
	]);

/** Pipe: `pipe(maybeX, Option.match({ onNone, onSome }))` */
const pipedMatch = (matchBranches: unknown) =>
	Testing.callExpr('pipe', [
		Testing.id('maybeX'),
		Testing.callOfMember('Option', 'match', [matchBranches])
	]);

describe('prefer-array-fromoption-over-option-match-empty', () => {
	const fromOptionShape = branches(arrayLit([]), arrayLit([Testing.id('v')]));

	it('flags direct `Option.match(maybeX, { onNone: () => [], onSome: (v) => [v] })`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			directMatch(fromOptionShape)
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain(
			'Array.fromOption(maybeValue)'
		);
	});

	it('flags piped `pipe(maybeX, Option.match({ onNone: () => [], onSome: (v) => [v] }))`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			pipedMatch(fromOptionShape)
		);
		expect(result).toHaveLength(1);
	});

	// ── shapes that should NOT match ─────────────────────────
	it('does not flag when `onSome` returns an empty array (not the fromOption shape)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			directMatch(branches(arrayLit([]), arrayLit([])))
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag when `onNone` returns a non-empty array', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			directMatch(
				branches(
					arrayLit([Testing.id('fallback')]),
					arrayLit([Testing.id('v')])
				)
			)
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag when `onSome` returns a value (not an array)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			directMatch(branches(arrayLit([]), Testing.id('v')))
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag a non-`Option.match` call', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Option', 'getOrElse', [
				Testing.id('maybeX'),
				Testing.arrowFn()
			])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag a `pipe` without `Option.match`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('pipe', [
				Testing.id('maybeX'),
				Testing.callOfMember('Option', 'map', [Testing.arrowFn()])
			])
		);
		expect(result).toHaveLength(0);
	});

	// ── block-body arrow returning the empty/singleton array ──
	it('flags block-body arrows: `onNone: () => { return []; }`, `onSome: (v) => { return [v]; }`', () => {
		const blockBranches = Testing.objectExpr([
			{
				key: 'onNone',
				value: Testing.arrowFn(
					Testing.blockStmt([Testing.returnStmt(arrayLit([]))])
				)
			},
			{
				key: 'onSome',
				value: Testing.arrowFn(
					Testing.blockStmt([
						Testing.returnStmt(arrayLit([Testing.id('v')]))
					])
				)
			}
		]);
		const result = Testing.runRule(
			rule,
			'CallExpression',
			directMatch(blockBranches)
		);
		expect(result).toHaveLength(1);
	});
});
