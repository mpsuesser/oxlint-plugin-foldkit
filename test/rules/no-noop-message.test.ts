import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-noop-message.ts';

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)]);

describe('no-noop-message', () => {
	it('flags `m("NoOp")`', () => {
		const result = Testing.runRule(rule, 'CallExpression', m('NoOp'));
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('NoOp');
	});

	it('flags the `Noop` and `NoOperation` spellings', () => {
		for (const tag of ['Noop', 'NoOperation']) {
			const result = Testing.runRule(rule, 'CallExpression', m(tag));
			expect(result).toHaveLength(1);
			expect(result[0]?.diagnostic.message).toContain(tag);
		}
	});

	it('allows event-specific Message names', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m('ClickedSave')
		);
		expect(result).toHaveLength(0);
	});

	it('ignores non-`m` calls', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callExpr('other', [Testing.strLiteral('NoOp')])
		);
		expect(result).toHaveLength(0);
	});
});
