import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/prefer-callable-message-constructor.ts';

const tagObject = (tag: string) =>
	Testing.objectExpr([{ key: '_tag', value: Testing.strLiteral(tag) }]);

const typeAnnotation = (name: string) => ({
	type: 'TSTypeAnnotation',
	typeAnnotation: Testing.tsTypeRef(name)
});

const typedIdentifier = (name: string, typeName: string) => ({
	type: 'Identifier',
	name,
	typeAnnotation: typeAnnotation(typeName)
});

const typedDeclarator = (name: string, typeName: string, init: unknown) => ({
	type: 'VariableDeclarator',
	id: typedIdentifier(name, typeName),
	init
});

const typedExpression = (
	kind: string,
	typeName: string,
	expression: unknown
) => ({
	type: kind,
	expression,
	typeAnnotation: Testing.tsTypeRef(typeName)
});

describe('prefer-callable-message-constructor', () => {
	it('flags object literals assigned to a `Message`-typed binding', () => {
		const result = Testing.runRule(
			rule,
			'VariableDeclarator',
			typedDeclarator('badMessage', 'Message', tagObject('ClickedSave'))
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('ClickedSave');
	});

	it('flags object literals cast as Message', () => {
		const result = Testing.runRule(
			rule,
			'TSAsExpression',
			typedExpression(
				'TSAsExpression',
				'Message',
				tagObject('ClickedSave')
			)
		);
		expect(result).toHaveLength(1);
	});

	it('flags object literals satisfying Message', () => {
		const result = Testing.runRule(
			rule,
			'TSSatisfiesExpression',
			typedExpression(
				'TSSatisfiesExpression',
				'Message',
				tagObject('ClickedSave')
			)
		);
		expect(result).toHaveLength(1);
	});

	it('allows callable Message constructors', () => {
		const result = Testing.runRule(
			rule,
			'VariableDeclarator',
			typedDeclarator(
				'goodMessage',
				'Message',
				Testing.callExpr('ClickedSave')
			)
		);
		expect(result).toHaveLength(0);
	});

	it('ignores non-Message typed object literals', () => {
		const result = Testing.runRule(
			rule,
			'VariableDeclarator',
			typedDeclarator('route', 'Route', tagObject('HomeRoute'))
		);
		expect(result).toHaveLength(0);
	});
});
