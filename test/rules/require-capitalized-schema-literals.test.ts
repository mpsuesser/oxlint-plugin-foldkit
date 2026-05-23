import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/require-capitalized-schema-literals.ts';

const arr = (elements: ReadonlyArray<unknown>) => ({
	type: 'ArrayExpression',
	elements: Array.from(elements)
});

const literalsCall = (namespace: string, members: ReadonlyArray<unknown>) =>
	Testing.callOfMember(namespace, 'Literals', [arr(members)]);

describe('require-capitalized-schema-literals', () => {
	// ── flagged: lowercase literals ─────────────────────────
	it('flags `Schema.Literals(["draft", "published"])`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			literalsCall('Schema', [
				Testing.strLiteral('draft'),
				Testing.strLiteral('published')
			])
		);
		expect(result).toHaveLength(2);
		expect(result[0]?.diagnostic.message).toContain("'draft'");
		expect(result[0]?.diagnostic.message).toContain("'Draft'");
		expect(result[1]?.diagnostic.message).toContain("'published'");
		expect(result[1]?.diagnostic.message).toContain("'Published'");
	});

	it('flags `S.Literals(["pending"])` (alias namespace)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			literalsCall('S', [Testing.strLiteral('pending')])
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain("'Pending'");
	});

	it('flags only the lowercase entries, not the capitalized ones', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			literalsCall('Schema', [
				Testing.strLiteral('Draft'),
				Testing.strLiteral('published'), // only this
				Testing.strLiteral('Archived')
			])
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain("'published'");
	});

	// ── allowed cases ──────────────────────────────────────
	it('does not flag all-capitalized `Schema.Literals(["Draft", "Published"])`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			literalsCall('Schema', [
				Testing.strLiteral('Draft'),
				Testing.strLiteral('Published')
			])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag empty `Schema.Literals([])`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			literalsCall('Schema', [])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag non-string literals (numbers passed by mistake)', () => {
		// Numbers won't match the lowercase-initial check because the
		// predicate is gated on `P.isString` — they're skipped silently.
		const result = Testing.runRule(
			rule,
			'CallExpression',
			literalsCall('Schema', [
				Testing.numLiteral(1),
				Testing.numLiteral(2)
			])
		);
		expect(result).toHaveLength(0);
	});

	// ── non-target call ────────────────────────────────────
	it('does not flag `Other.Literals(["draft"])`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Other', 'Literals', [
				arr([Testing.strLiteral('draft')])
			])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `Schema.Literal("draft")` (singular `Literal` is for one literal)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Schema', 'Literal', [
				Testing.strLiteral('draft')
			])
		);
		expect(result).toHaveLength(0);
	});

	it('does not flag `Schema.Literals(...nonArray)` (first arg not an array literal)', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Schema', 'Literals', [Testing.id('myList')])
		);
		expect(result).toHaveLength(0);
	});
});
