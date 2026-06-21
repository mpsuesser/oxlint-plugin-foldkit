import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';

const expressionWrapperTypes = [
	'ChainExpression',
	'ParenthesizedExpression',
	'TSAsExpression',
	'TSInstantiationExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'TypeCastExpression'
] as const;

type IdentifierLike = {
	readonly type: string;
	readonly name: string;
};

type LiteralLike = {
	readonly type: string;
	readonly value: unknown;
};

type ExpressionWrapper = {
	readonly type: string;
	readonly expression: unknown;
};

type MemberExpressionLike = {
	readonly type: string;
	readonly computed?: unknown;
	readonly object?: unknown;
	readonly property?: unknown;
};

type ObjectPropertyLike = {
	readonly type: string;
	readonly computed?: unknown;
	readonly key: unknown;
	readonly value: unknown;
};

type TypeAnnotationWrapper = {
	readonly type: string;
	readonly typeAnnotation: unknown;
};

type TypeReferenceLike = {
	readonly type: string;
	readonly typeName: unknown;
};

type QualifiedNameLike = {
	readonly type: string;
	readonly left: unknown;
	readonly right: unknown;
};

type UnionTypeLike = {
	readonly type: string;
	readonly types: ReadonlyArray<unknown>;
};

/** @internal Identify AST identifier-like nodes across ESTree and TS nodes. */
export const isIdentifierLike = (value: unknown): value is IdentifierLike =>
	P.isObject(value) &&
	'type' in value &&
	value.type === 'Identifier' &&
	'name' in value &&
	P.isString(value.name);

const isLiteralLike = (value: unknown): value is LiteralLike =>
	P.isObject(value) && 'type' in value && value.type === 'Literal';

const isExpressionWrapper = (value: unknown): value is ExpressionWrapper =>
	P.isObject(value) &&
	'type' in value &&
	P.isString(value.type) &&
	'expression' in value;

const isMemberExpressionLike = (
	value: unknown
): value is MemberExpressionLike =>
	P.isObject(value) && 'type' in value && value.type === 'MemberExpression';

/** @internal Narrow an unknown value to an ESTree object expression. */
export const isObjectExpression = (
	value: unknown
): value is ESTree.ObjectExpression =>
	P.isObject(value) && 'type' in value && value.type === 'ObjectExpression';

const isObjectPropertyLike = (value: unknown): value is ObjectPropertyLike =>
	P.isObject(value) &&
	'type' in value &&
	value.type === 'Property' &&
	'key' in value &&
	'value' in value;

/** @internal Remove transparent expression wrappers around AST expressions. */
export const unwrapExpression = (value: unknown): unknown =>
	isExpressionWrapper(value) &&
	Arr.contains(expressionWrapperTypes, value.type)
		? unwrapExpression(value.expression)
		: value;

/** @internal Extract a string literal's value. */
export const stringLiteralValue = (value: unknown): Option.Option<string> => {
	const unwrapped = unwrapExpression(value);
	return isLiteralLike(unwrapped) && P.isString(unwrapped.value)
		? Option.some(unwrapped.value)
		: Option.none();
};

/** @internal Extract a static member or identifier path from an expression. */
export const memberPath = (
	value: unknown
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
	const expression = unwrapExpression(value);
	if (isIdentifierLike(expression)) return Option.some([expression.name]);
	if (!isMemberExpressionLike(expression) || expression.computed === true) {
		return Option.none();
	}
	const property = unwrapExpression(expression.property);
	if (!isIdentifierLike(property)) return Option.none();
	return pipe(
		memberPath(expression.object),
		Option.map((path) => [...path, property.name])
	);
};

/** @internal Return the static key name of an object property. */
export const propertyKeyName = (property: unknown): Option.Option<string> => {
	if (!isObjectPropertyLike(property) || property.computed === true) {
		return Option.none();
	}
	const key = unwrapExpression(property.key);
	if (isIdentifierLike(key)) return Option.some(key.name);
	return isLiteralLike(key) && P.isString(key.value)
		? Option.some(key.value)
		: Option.none();
};

/** @internal Find a statically-keyed object property value. */
export const objectPropertyValue = (
	object: ESTree.ObjectExpression,
	key: string
): Option.Option<unknown> =>
	pipe(
		object.properties,
		Arr.findFirst((property) =>
			pipe(
				propertyKeyName(property),
				Option.match({
					onNone: () => false,
					onSome: (name) => name === key
				})
			)
		),
		Option.flatMap((property) =>
			isObjectPropertyLike(property)
				? Option.some(property.value)
				: Option.none()
		)
	);

/** @internal Check if a value references a child `*.Message` schema. */
export const isChildMessageReference = (value: unknown): boolean =>
	pipe(
		memberPath(value),
		Option.match({
			onNone: () => false,
			onSome: (path) =>
				path.length >= 2 && Arr.lastNonEmpty(path) === 'Message'
		})
	);

/** @internal Check if an object contains `message: Child.Message`. */
export const hasChildMessagePayload = (
	object: ESTree.ObjectExpression
): boolean =>
	pipe(
		objectPropertyValue(object, 'message'),
		Option.match({
			onNone: () => false,
			onSome: isChildMessageReference
		})
	);

const isTypeAnnotationWrapper = (
	value: unknown
): value is TypeAnnotationWrapper =>
	P.isObject(value) && 'type' in value && 'typeAnnotation' in value;

const isTypeReferenceLike = (value: unknown): value is TypeReferenceLike =>
	P.isObject(value) &&
	'type' in value &&
	value.type === 'TSTypeReference' &&
	'typeName' in value;

const isQualifiedNameLike = (value: unknown): value is QualifiedNameLike =>
	P.isObject(value) &&
	'type' in value &&
	value.type === 'TSQualifiedName' &&
	'left' in value &&
	'right' in value;

const isUnionTypeLike = (value: unknown): value is UnionTypeLike =>
	P.isObject(value) &&
	'type' in value &&
	value.type === 'TSUnionType' &&
	'types' in value &&
	Array.isArray(value.types);

const typeNamePath = (
	value: unknown
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
	if (isIdentifierLike(value)) return Option.some([value.name]);
	if (!isQualifiedNameLike(value)) return Option.none();
	return pipe(
		typeNamePath(value.left),
		Option.flatMap((left) =>
			pipe(
				typeNamePath(value.right),
				Option.map((right) => [...left, ...right])
			)
		)
	);
};

/** @internal Check whether a TypeScript type annotation names `Message`. */
export const typeAnnotationMentionsMessage = (value: unknown): boolean => {
	const unwrapped = unwrapExpression(value);
	if (isTypeAnnotationWrapper(unwrapped)) {
		return typeAnnotationMentionsMessage(unwrapped.typeAnnotation);
	}
	if (isTypeReferenceLike(unwrapped)) {
		return pipe(
			typeNamePath(unwrapped.typeName),
			Option.match({
				onNone: () => false,
				onSome: (path) => Arr.lastNonEmpty(path) === 'Message'
			})
		);
	}
	return isUnionTypeLike(unwrapped)
		? pipe(unwrapped.types, Arr.some(typeAnnotationMentionsMessage))
		: false;
};

/** @internal Extract a typed binding annotation from an identifier-like node. */
export const bindingTypeAnnotation = (value: unknown): Option.Option<unknown> =>
	P.isObject(value) && 'typeAnnotation' in value
		? Option.some(value.typeAnnotation)
		: Option.none();

/** @internal Extract a Message `_tag` literal from an object expression. */
export const objectTagValue = (
	object: ESTree.ObjectExpression
): Option.Option<string> =>
	pipe(
		objectPropertyValue(object, '_tag'),
		Option.flatMap(stringLiteralValue)
	);

/** @internal Extract an `m('Tag', fields?)` call. */
export const mCall = (
	call: ESTree.CallExpression
): Option.Option<{
	readonly tag: string;
	readonly tagNode: ESTree.Node;
	readonly fields: Option.Option<ESTree.ObjectExpression>;
}> => {
	if (!isIdentifierLike(call.callee) || call.callee.name !== 'm') {
		return Option.none();
	}
	const tagArg = call.arguments[0];
	return pipe(
		Option.fromNullishOr(tagArg),
		Option.flatMap((arg) =>
			pipe(
				stringLiteralValue(arg),
				Option.map((tag) => ({
					tag,
					tagNode: arg,
					fields: pipe(
						Option.fromNullishOr(call.arguments[1]),
						Option.filter(isObjectExpression)
					)
				}))
			)
		)
	);
};

/** @internal Check if an unknown value is an object expression. */
export const objectExpressionFromUnknown = (
	value: unknown
): Option.Option<ESTree.ObjectExpression> => {
	const unwrapped = unwrapExpression(value);
	return isObjectExpression(unwrapped)
		? Option.some(unwrapped)
		: Option.none();
};
