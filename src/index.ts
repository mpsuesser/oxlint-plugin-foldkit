import { Plugin } from 'effect-oxlint';

import commandDefinePascalConst from './rules/command-define-pascal-const.ts';
import keyedRequiredForMappedRows from './rules/keyed-required-for-mapped-rows.ts';
import labelRequiresFor from './rules/label-requires-for.ts';
import maybePrefixRequiresOption from './rules/maybe-prefix-requires-option.ts';
import noArrayShorthandType from './rules/no-array-shorthand-type.ts';
import noHandRolledFormControls from './rules/no-hand-rolled-form-controls.ts';
import noChangedMessagePrefix from './rules/no-changed-message-prefix.ts';
import noEffectIgnoreThenAs from './rules/no-effect-ignore-then-as.ts';
import noEmptyObjectTaggedCall from './rules/no-empty-object-tagged-call.ts';
import noExplicitCommandTypeAnnotation from './rules/no-explicit-command-type-annotation.ts';
import noHardcodedRouteStrings from './rules/no-hardcoded-route-strings.ts';
import noLengthComparison from './rules/no-length-comparison.ts';
import noSpreadInEvo from './rules/no-spread-in-evo.ts';
import preferArrayFromoptionOverOptionMatchEmpty from './rules/prefer-array-fromoption-over-option-match-empty.ts';
import preferEmptyOverEmptyElement from './rules/prefer-empty-over-empty-element.ts';
import preferOptionMatchOverMapGetorelse from './rules/prefer-option-match-over-map-getorelse.ts';
import preferOptionWhenOverTernary from './rules/prefer-option-when-over-ternary.ts';
import requireCapitalizedSchemaLiterals from './rules/require-capitalized-schema-literals.ts';
import requireCompletedMirrorsCommand from './rules/require-completed-mirrors-command.ts';
import requireIsPrefixForBooleanSchemaField from './rules/require-is-prefix-for-boolean-schema-field.ts';
import requirePastTenseMessageNames from './rules/require-past-tense-message-names.ts';
import requireRelForExternalLink from './rules/require-rel-for-external-link.ts';
import requireSucceededFailedPair from './rules/require-succeeded-failed-pair.ts';

const rules = {
	// ── Message naming (FK-1) ────────────────────────────────
	'require-past-tense-message-names': requirePastTenseMessageNames,
	'no-changed-message-prefix': noChangedMessagePrefix,
	'require-succeeded-failed-pair': requireSucceededFailedPair,
	'require-completed-mirrors-command': requireCompletedMirrorsCommand,

	// ── Command / construction shape (FK-2) ──────────────────
	'command-define-pascal-const': commandDefinePascalConst,
	'no-empty-object-tagged-call': noEmptyObjectTaggedCall,
	'no-spread-in-evo': noSpreadInEvo,
	'no-explicit-command-type-annotation': noExplicitCommandTypeAnnotation,

	// ── Effect / Option / Array idioms (FK-3) ────────────────
	'prefer-option-match-over-map-getorelse': preferOptionMatchOverMapGetorelse,
	'prefer-option-when-over-ternary': preferOptionWhenOverTernary,
	'prefer-array-fromoption-over-option-match-empty':
		preferArrayFromoptionOverOptionMatchEmpty,
	'no-length-comparison': noLengthComparison,
	'no-effect-ignore-then-as': noEffectIgnoreThenAs,

	// ── Routing (FK-4) ───────────────────────────────────────
	'no-hardcoded-route-strings': noHardcodedRouteStrings,

	// ── View / accessibility (FK-5) ──────────────────────────
	'require-rel-for-external-link': requireRelForExternalLink,
	'prefer-empty-over-empty-element': preferEmptyOverEmptyElement,
	'label-requires-for': labelRequiresFor,
	'no-hand-rolled-form-controls': noHandRolledFormControls,
	'keyed-required-for-mapped-rows': keyedRequiredForMappedRows,

	// ── Schema / type shape (FK-6) ───────────────────────────
	'require-capitalized-schema-literals': requireCapitalizedSchemaLiterals,
	'require-is-prefix-for-boolean-schema-field':
		requireIsPrefixForBooleanSchemaField,
	'no-array-shorthand-type': noArrayShorthandType,
	'maybe-prefix-requires-option': maybePrefixRequiresOption
};

export default Plugin.define({
	name: '@mpsuesser/foldkit',
	specifier: '@mpsuesser/oxlint-plugin-foldkit',
	rules
});
