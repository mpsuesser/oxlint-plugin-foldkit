import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/got-submodel-message-name.ts';

const fields = (
	properties: ReadonlyArray<{
		readonly key: string;
		readonly value?: unknown;
	}>
) => Testing.objectExpr(properties);

const m = (tag: string, object: unknown) =>
	Testing.callExpr('m', [Testing.strLiteral(tag), object]);

describe('got-submodel-message-name', () => {
	it('flags child Message wrappers that are not named `Got*Message`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m(
				'ChildChanged',
				fields([
					{
						key: 'message',
						value: Testing.memberExpr('Child', 'Message')
					}
				])
			)
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('Got*Message');
	});

	it('allows canonical `Got*Message` wrappers', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m(
				'GotChildMessage',
				fields([
					{
						key: 'message',
						value: Testing.memberExpr('Child', 'Message')
					}
				])
			)
		);
		expect(result).toHaveLength(0);
	});

	it('ignores non-submodel Message payloads', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m('UpdatedWeather', fields([{ key: 'temperature' }]))
		);
		expect(result).toHaveLength(0);
	});
});
