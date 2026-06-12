import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/command-failed-result-requires-catch.ts';

const commandDefine = (...args: ReadonlyArray<unknown>) =>
	Testing.callOfMember('Command', 'define', args);

const msg = (name: string) => Testing.memberExpr('Msg', name);

const failedDefine = () =>
	commandDefine(
		Testing.strLiteral('FetchUser'),
		msg('SucceededFetchUser'),
		msg('FailedFetchUser')
	);

const failedDefineWithArgs = () =>
	commandDefine(
		Testing.strLiteral('CreateUser'),
		Testing.objectExpr([{ key: 'id', value: Testing.id('String') }]),
		msg('SucceededCreateUser'),
		msg('FailedCreateUser')
	);

const completedDefine = () =>
	commandDefine(Testing.strLiteral('FocusInput'), msg('CompletedFocusInput'));

const applyDefine = (
	defineCall: ReturnType<typeof commandDefine>,
	effect: unknown
) => {
	const applied = {
		type: 'CallExpression',
		callee: defineCall,
		arguments: [effect]
	};
	Object.defineProperty(defineCall, 'parent', { value: applied });
	return applied;
};

const effectGen = () => Testing.callOfMember('Effect', 'gen');

const effectWithCatch = (method: string) =>
	Testing.callExpr('pipe', [
		effectGen(),
		Testing.callOfMember('Effect', method, [Testing.arrowFn()])
	]);

const programExit = ['Program:exit', Testing.program()] as const;

describe('command-failed-result-requires-catch', () => {
	it('flags Failed*-declaring Commands whose applied Effect has no catch', () => {
		const defineCall = failedDefine();
		const applied = applyDefine(defineCall, effectGen());
		const result = Testing.runRule(rule, 'CallExpression', applied);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('FailedFetchUser');
		expect(result[0]?.diagnostic.message).toContain('Effect.catch');
	});

	it.each([
		'catch',
		'catchAll',
		'catchCause',
		'catchIf',
		'catchTag',
		'catchTags',
		'match',
		'matchCause'
	])('accepts Effect.%s in the applied Effect subtree', (method) => {
		const defineCall = failedDefine();
		const applied = applyDefine(defineCall, effectWithCatch(method));
		const result = Testing.runRule(rule, 'CallExpression', applied);
		expect(result).toHaveLength(0);
	});

	it('skips the optional args object before looking for Failed* results', () => {
		const defineCall = failedDefineWithArgs();
		const applied = applyDefine(defineCall, effectGen());
		const result = Testing.runRule(rule, 'CallExpression', applied);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('FailedCreateUser');
	});

	it('does not flag Commands with only Completed* results', () => {
		const defineCall = completedDefine();
		const applied = applyDefine(defineCall, effectGen());
		const result = Testing.runRule(rule, 'CallExpression', applied);
		expect(result).toHaveLength(0);
	});

	it('flags Failed*-declaring `Command.define` calls that are not immediately applied', () => {
		const result = Testing.runRule(rule, 'CallExpression', failedDefine());
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain(
			'not immediately applied'
		);
	});

	it('does not flag split Completed*-only `Command.define` calls', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			completedDefine()
		);
		expect(result).toHaveLength(0);
	});

	it('does not double-report an immediately applied Failed* Command when both calls are visited', () => {
		const defineCall = failedDefine();
		const applied = applyDefine(defineCall, effectWithCatch('catchCause'));
		const result = Testing.runRuleMulti(rule, [
			['CallExpression', defineCall],
			['CallExpression', applied],
			programExit
		]);
		expect(result).toHaveLength(0);
	});

	it('ignores unrelated calls', () => {
		const result = Testing.runRule(
			rule,
			'CallExpression',
			Testing.callOfMember('Task', 'define', [msg('FailedFetchUser')])
		);
		expect(result).toHaveLength(0);
	});
});
