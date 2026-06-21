import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/message-binding-matches-tag.ts';

const m = (tag: string) => Testing.callExpr('m', [Testing.strLiteral(tag)]);

const declarator = (binding: string, tag: string) =>
	Testing.varDeclarator(binding, m(tag));

describe('message-binding-matches-tag', () => {
	it('flags a Message binding that does not match the `m(...)` tag', () => {
		const result = Testing.runRule(
			rule,
			'VariableDeclarator',
			declarator('ClickedSave', 'ClickedSubmit')
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('ClickedSave');
		expect(result[0]?.diagnostic.message).toContain('ClickedSubmit');
	});

	it('allows matching Message bindings and tags', () => {
		const result = Testing.runRule(
			rule,
			'VariableDeclarator',
			declarator('ClickedSubmit', 'ClickedSubmit')
		);
		expect(result).toHaveLength(0);
	});

	it('ignores non-Message initializers', () => {
		const result = Testing.runRule(
			rule,
			'VariableDeclarator',
			Testing.varDeclarator('ClickedSave', Testing.callExpr('other'))
		);
		expect(result).toHaveLength(0);
	});
});
