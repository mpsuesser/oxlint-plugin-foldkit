import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

import {
	bindingTypeAnnotation,
	isObjectExpression,
	objectExpressionFromUnknown,
	objectTagValue,
	typeAnnotationMentionsMessage
} from './message-ast.ts';

type TypedObjectExpression = {
	readonly type: string;
	readonly expression: unknown;
	readonly typeAnnotation: unknown;
};

const isTypedObjectExpression = (
	value: unknown
): value is TypedObjectExpression =>
	P.isObject(value) &&
	'type' in value &&
	P.isString(value.type) &&
	'expression' in value &&
	'typeAnnotation' in value;

const messageObjectFromVariable = (
	declarator: ESTree.VariableDeclarator
): Option.Option<{
	readonly tag: string;
	readonly node: ESTree.Node;
}> =>
	pipe(
		bindingTypeAnnotation(declarator.id),
		Option.filter(typeAnnotationMentionsMessage),
		Option.flatMap(() =>
			declarator.init !== null &&
			declarator.init !== undefined &&
			isObjectExpression(declarator.init)
				? Option.some(declarator.init)
				: Option.none()
		),
		Option.flatMap((object) =>
			pipe(
				objectTagValue(object),
				Option.map((tag) => ({ tag, node: object }))
			)
		)
	);

const messageObjectFromTypedExpression = (
	node: ESTree.Node
): Option.Option<{
	readonly tag: string;
	readonly node: ESTree.Node;
}> =>
	isTypedObjectExpression(node) &&
	typeAnnotationMentionsMessage(node.typeAnnotation)
		? pipe(
				objectExpressionFromUnknown(node.expression),
				Option.flatMap((object) =>
					pipe(
						objectTagValue(object),
						Option.map((tag) => ({ tag, node: object }))
					)
				)
			)
		: Option.none();

const reportHandRolledMessage = (
	ctx: RuleContext['Service'],
	{ tag, node }: { readonly tag: string; readonly node: ESTree.Node }
): Effect.Effect<void, never, RuleContext> =>
	ctx.report(
		Diagnostic.make({
			node,
			message: `Do not construct Message \`${tag}\` with a typed or cast object literal. Use the callable Message constructor instead, e.g. \`${tag}(...)\`. (Foldkit prefer-callable-message-constructor)`
		})
	);

const rule: CreateRule = Rule.define({
	name: 'prefer-callable-message-constructor',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Use callable Foldkit Message constructors instead of typed or cast `_tag` object literals'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.merge(
			Visitor.on('VariableDeclarator', (node) =>
				pipe(
					messageObjectFromVariable(node),
					Option.match({
						onNone: () => Effect.void,
						onSome: (messageObject) =>
							reportHandRolledMessage(ctx, messageObject)
					})
				)
			),
			Visitor.on('TSAsExpression', (node) =>
				pipe(
					messageObjectFromTypedExpression(node),
					Option.match({
						onNone: () => Effect.void,
						onSome: (messageObject) =>
							reportHandRolledMessage(ctx, messageObject)
					})
				)
			),
			Visitor.on('TSTypeAssertion', (node) =>
				pipe(
					messageObjectFromTypedExpression(node),
					Option.match({
						onNone: () => Effect.void,
						onSome: (messageObject) =>
							reportHandRolledMessage(ctx, messageObject)
					})
				)
			),
			Visitor.on('TSSatisfiesExpression', (node) =>
				pipe(
					messageObjectFromTypedExpression(node),
					Option.match({
						onNone: () => Effect.void,
						onSome: (messageObject) =>
							reportHandRolledMessage(ctx, messageObject)
					})
				)
			)
		);
	}
});

export default rule;
