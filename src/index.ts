import type { CreateRule } from '@oxlint/plugins';
import { Plugin } from 'effect-oxlint';

import commandDefinePascalConst from './rules/command-define-pascal-const.ts';
import keyedRequiredForMappedRows from './rules/keyed-required-for-mapped-rows.ts';
import labelRequiresFor from './rules/label-requires-for.ts';
import noArrayShorthandType from './rules/no-array-shorthand-type.ts';
import noChangedMessagePrefix from './rules/no-changed-message-prefix.ts';
import noEmptyObjectTaggedCall from './rules/no-empty-object-tagged-call.ts';
import noExplicitCommandTypeAnnotation from './rules/no-explicit-command-type-annotation.ts';
import noHandRolledFormControls from './rules/no-hand-rolled-form-controls.ts';
import noHardcodedRouteStrings from './rules/no-hardcoded-route-strings.ts';
import noSpreadInEvo from './rules/no-spread-in-evo.ts';
import preferEmptyOverEmptyElement from './rules/prefer-empty-over-empty-element.ts';
import preferOptionMatchOverMapGetorelse from './rules/prefer-option-match-over-map-getorelse.ts';
import requireCompletedMirrorsCommand from './rules/require-completed-mirrors-command.ts';
import requirePastTenseMessageNames from './rules/require-past-tense-message-names.ts';
import requireRelForExternalLink from './rules/require-rel-for-external-link.ts';
import requireSucceededFailedPair from './rules/require-succeeded-failed-pair.ts';

const rules: Record<string, CreateRule> = {
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

	// ── Effect / Option idioms (FK-3) ────────────────────────
	'prefer-option-match-over-map-getorelse': preferOptionMatchOverMapGetorelse,

	// ── Routing (FK-4) ───────────────────────────────────────
	'no-hardcoded-route-strings': noHardcodedRouteStrings,

	// ── View / accessibility (FK-5) ──────────────────────────
	'require-rel-for-external-link': requireRelForExternalLink,
	'prefer-empty-over-empty-element': preferEmptyOverEmptyElement,
	'label-requires-for': labelRequiresFor,
	'no-hand-rolled-form-controls': noHandRolledFormControls,
	'keyed-required-for-mapped-rows': keyedRequiredForMappedRows,

	// ── Type shape (FK-6) ────────────────────────────────────
	'no-array-shorthand-type': noArrayShorthandType,
};

/**
 * Oxlint plugin for Foldkit conventions and generated config presets.
 *
 * @since 0.2.2
 */
const plugin: Plugin.DefinedPlugin<Record<string, CreateRule>> = Plugin.define({
	name: '@mpsuesser/foldkit',
	specifier: '@mpsuesser/oxlint-plugin-foldkit',
	rules,
});

export default plugin;
