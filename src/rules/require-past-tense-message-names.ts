import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

/**
 * Allowed verb-first past-tense prefixes for Foldkit Message tags.
 *
 * Drawn from `conventions.md` — every Message is past-tense, verb-first.
 */
const ALLOWED_PREFIXES = [
	'Clicked',
	'Updated',
	'Submitted',
	'Pressed',
	'Blurred',
	'Selected',
	'Toggled',
	'Succeeded',
	'Failed',
	'Completed',
	'Got',
	'Loaded',
	'Hid',
	'Ticked',
	'Opened',
	'Closed',
	'Dismissed',
	'Resized',
	'Scrolled',
	'Focused',
	'Hovered'
] as const;

/**
 * A string that begins with an allowed verb-prefix followed by either
 * a word boundary (uppercase letter) or end-of-string.
 */
const PastTenseMessageTag = Schema.String.check(
	Schema.isPattern(new RegExp(`^(${ALLOWED_PREFIXES.join('|')})([A-Z]|$)`), {
		identifier: 'PastTenseMessageTag',
		title: 'Past-Tense Message Tag',
		description:
			'Foldkit Message tag whose first word is a past-tense verb prefix.'
	})
);

const isPastTenseMessageTag = Schema.is(PastTenseMessageTag);

/** Boolean wrapper that does not narrow callers via the brand refinement. */
const startsWithPastTensePrefix = (tag: string): boolean =>
	isPastTenseMessageTag(tag);

const mTagFromCall = (call: ESTree.CallExpression): Option.Option<string> => {
	if (call.callee.type !== 'Identifier' || call.callee.name !== 'm') {
		return Option.none();
	}
	const arg = call.arguments[0];
	return arg !== undefined && arg.type === 'Literal' && P.isString(arg.value)
		? Option.some(arg.value)
		: Option.none();
};

export default Rule.define({
	name: 'require-past-tense-message-names',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Enforce verb-first past-tense Foldkit Message names (e.g. ClickedSubmit, UpdatedEmail). (FK-1)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) =>
			pipe(
				mTagFromCall(node),
				Option.filter((tag) => !startsWithPastTensePrefix(tag)),
				Option.match({
					onNone: () => Effect.void,
					onSome: (tag) =>
						ctx.report(
							Diagnostic.make({
								node,
								message: `Message tag \`${tag}\` does not start with an allowed verb-first past-tense prefix. Use one of: ${ALLOWED_PREFIXES.join(', ')}. (FK-1)`
							})
						)
				})
			)
		);
	}
});
