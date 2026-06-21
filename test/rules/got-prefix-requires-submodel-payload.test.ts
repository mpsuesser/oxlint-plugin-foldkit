import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/got-prefix-requires-submodel-payload.ts';

const fields = (
	properties: ReadonlyArray<{
		readonly key: string;
		readonly value?: unknown;
	}>
) => Testing.objectExpr(properties);

const m = (tag: string, object?: unknown) =>
	Testing.callExpr(
		'm',
		object === undefined
			? [Testing.strLiteral(tag)]
			: [Testing.strLiteral(tag), object]
	);

describe('got-prefix-requires-submodel-payload', () => {
	it('flags Got-prefixed ordinary payload Messages', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m('GotWeather', fields([{ key: 'temperature' }]))
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('Child.Message');
	});

	it('flags Got-prefixed wrappers without `message: Child.Message`', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m('GotChildMessage', fields([{ key: 'id' }]))
		);
		expect(result).toHaveLength(1);
	});

	it('allows Got-prefixed wrappers with a child Message payload', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m(
				'GotChildMessage',
				fields([
					{ key: 'id' },
					{
						key: 'message',
						value: Testing.memberExpr('Child', 'Message')
					}
				])
			)
		);
		expect(result).toHaveLength(0);
	});

	it('allows non-Got command-result Message names', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			m('ReceivedWeather', fields([{ key: 'temperature' }]))
		);
		expect(result).toHaveLength(0);
	});
});
