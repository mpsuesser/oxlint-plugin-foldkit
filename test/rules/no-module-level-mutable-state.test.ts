import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-module-level-mutable-state.ts';

const runProgram = (body: ReadonlyArray<unknown>) =>
	Testing.runRule(rule, 'Program', Testing.program(body));

const declareVar = () => ({
	...Testing.varDecl('let', 'ambient'),
	declare: true
});

describe('no-module-level-mutable-state', () => {
	it('flags top-level `let` declarations', () => {
		const result = runProgram([Testing.varDecl('let', 'inFlight')]);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('Module-level');
	});

	it('flags top-level `var` declarations', () => {
		const result = runProgram([Testing.varDecl('var', 'cache')]);
		expect(result).toHaveLength(1);
	});

	it('does not flag top-level `const` declarations', () => {
		const result = runProgram([Testing.varDecl('const', 'cache')]);
		expect(result).toHaveLength(0);
	});

	it('flags exported top-level mutable declarations', () => {
		const result = runProgram([
			Testing.exportNamedDecl(Testing.varDecl('let', 'cache'))
		]);
		expect(result).toHaveLength(1);
	});

	it('does not flag exported `const` declarations', () => {
		const result = runProgram([
			Testing.exportNamedDecl(Testing.varDecl('const', 'Model'))
		]);
		expect(result).toHaveLength(0);
	});

	it('does not flag function-scope `let` declarations', () => {
		const functionDecl = {
			type: 'FunctionDeclaration',
			body: Testing.blockStmt([Testing.varDecl('let', 'i')])
		};
		const result = runProgram([functionDecl]);
		expect(result).toHaveLength(0);
	});

	it('does not flag `declare let` ambient declarations', () => {
		const result = runProgram([declareVar()]);
		expect(result).toHaveLength(0);
	});

	it('reports each top-level mutable declaration independently', () => {
		const result = runProgram([
			Testing.varDecl('let', 'one'),
			Testing.varDecl('const', 'two'),
			Testing.varDecl('var', 'three')
		]);
		expect(result).toHaveLength(2);
	});
});
