import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-effect-ignore-then-as.ts';

const effectIgnore = () => Testing.memberExpr('Effect', 'ignore');
const effectAs = (...args: ReadonlyArray<unknown>) =>
	Testing.callOfMember('Effect', 'as', args);
const effectMap = (...args: ReadonlyArray<unknown>) =>
	Testing.callOfMember('Effect', 'map', args);

/** `<receiver>.pipe(...args)` */
const pipeOn = (receiver: unknown, args: ReadonlyArray<unknown>) => ({
	type: 'CallExpression',
	callee: {
		type: 'MemberExpression',
		object: receiver,
		property: Testing.id('pipe'),
		computed: false,
		optional: false
	},
	arguments: Array.from(args)
});

describe('no-effect-ignore-then-as', () => {
	// ── adjacency: Effect.ignore directly before Effect.as ──
	it('flags `effect.pipe(Effect.ignore, Effect.as(undefined))`', () => {
		const node = pipeOn(Testing.id('effect'), [
			effectIgnore(),
			effectAs(Testing.id('undefined'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		// receiver `effect` is not in the infallible list, so only the
		// adjacency finding fires.
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('redundant');
	});

	it('does not flag `effect.pipe(Effect.ignore, Effect.map(...))` (no `Effect.as`)', () => {
		const node = pipeOn(Testing.id('effect'), [
			effectIgnore(),
			effectMap(Testing.arrowFn())
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});

	it('does not flag `effect.pipe(Effect.map(...), Effect.as(undefined))` (no `Effect.ignore`)', () => {
		const node = pipeOn(Testing.id('effect'), [
			effectMap(Testing.arrowFn()),
			effectAs(Testing.id('undefined'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});

	// ── infallible Foldkit primitives ───────────────────────
	it('flags `pushUrl(url).pipe(Effect.ignore)` (no-op on infallible primitive)', () => {
		const receiver = Testing.callExpr('pushUrl', [Testing.id('url')]);
		const node = pipeOn(receiver, [effectIgnore()]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('no-op');
		expect(result[0]?.diagnostic.message).toContain('pushUrl');
	});

	it.each(['load', 'loadExternalUrl', 'back', 'forward'])(
		'flags `%s(...).pipe(Effect.ignore)`',
		(fnName) => {
			const receiver = Testing.callExpr(fnName, []);
			const node = pipeOn(receiver, [effectIgnore()]);
			const result = Testing.runRule(rule, 'CallExpression', node);
			expect(result).toHaveLength(1);
			expect(result[0]?.diagnostic.message).toContain(fnName);
		}
	);

	it('does not flag `unknownFn(...).pipe(Effect.ignore)` (not in infallible list)', () => {
		const receiver = Testing.callExpr('unknownFn', []);
		const node = pipeOn(receiver, [effectIgnore()]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(0);
	});

	// ── both findings on the same pipe ──────────────────────
	it('reports both adjacency and infallible findings for `pushUrl(...).pipe(Effect.ignore, Effect.as(...))`', () => {
		const receiver = Testing.callExpr('pushUrl', [Testing.id('url')]);
		const node = pipeOn(receiver, [
			effectIgnore(),
			effectAs(Testing.id('undefined'))
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(2);
	});

	// ── non-pipe receivers ──────────────────────────────────
	it('does not flag a non-`.pipe(...)` call', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('foo', [effectIgnore()])
		);
		expect(result).toHaveLength(0);
	});
});
