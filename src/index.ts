import type { CreateRule } from '@oxlint/plugins';
import { Plugin } from 'effect-oxlint';

import commandDefinePascalConst from './rules/command-define-pascal-const.ts';
import commandFailedResultRequiresCatch from './rules/command-failed-result-requires-catch.ts';
import foldkitPrimitivesDeclaredInRoleFiles from './rules/foldkit-primitives-declared-in-role-files.ts';
import keyedRequiredForMappedRows from './rules/keyed-required-for-mapped-rows.ts';
import labelRequiresFor from './rules/label-requires-for.ts';
import noArrayIndexViewKeys from './rules/no-array-index-view-keys.ts';
import noArrayShorthandType from './rules/no-array-shorthand-type.ts';
import noChangedMessagePrefix from './rules/no-changed-message-prefix.ts';
import noEmptyObjectTaggedCall from './rules/no-empty-object-tagged-call.ts';
import noExplicitCommandTypeAnnotation from './rules/no-explicit-command-type-annotation.ts';
import noHandRolledCommandStruct from './rules/no-hand-rolled-command-struct.ts';
import noHandRolledFormControls from './rules/no-hand-rolled-form-controls.ts';
import noHardcodedRouteStrings from './rules/no-hardcoded-route-strings.ts';
import noImpureCallsInPureLayer from './rules/no-impure-calls-in-pure-layer.ts';
import noModuleLevelMutableState from './rules/no-module-level-mutable-state.ts';
import noSpreadInEvo from './rules/no-spread-in-evo.ts';
import preferEmptyOverEmptyElement from './rules/prefer-empty-over-empty-element.ts';
import preferOptionMatchOverMapGetorelse from './rules/prefer-option-match-over-map-getorelse.ts';
import requireCompletedMirrorsCommand from './rules/require-completed-mirrors-command.ts';
import requirePastTenseMessageNames from './rules/require-past-tense-message-names.ts';
import requireRelForExternalLink from './rules/require-rel-for-external-link.ts';
import requireSucceededFailedPair from './rules/require-succeeded-failed-pair.ts';
import routeOneofShadowingOrder from './rules/route-oneof-shadowing-order.ts';
import routeUnionParserRegistration from './rules/route-union-parser-registration.ts';

const rules: Record<string, CreateRule> = {
	// ── Message naming (FK-1) ────────────────────────────────
	'require-past-tense-message-names': requirePastTenseMessageNames,
	'no-changed-message-prefix': noChangedMessagePrefix,
	'require-succeeded-failed-pair': requireSucceededFailedPair,
	'require-completed-mirrors-command': requireCompletedMirrorsCommand,

	// ── Purity / side-effect boundaries ──────────────────────
	'no-impure-calls-in-pure-layer': noImpureCallsInPureLayer,
	'no-module-level-mutable-state': noModuleLevelMutableState,

	// ── Command / construction shape (FK-2) ──────────────────
	'command-failed-result-requires-catch': commandFailedResultRequiresCatch,
	'command-define-pascal-const': commandDefinePascalConst,
	'foldkit-primitives-declared-in-role-files':
		foldkitPrimitivesDeclaredInRoleFiles,
	'no-hand-rolled-command-struct': noHandRolledCommandStruct,
	'no-empty-object-tagged-call': noEmptyObjectTaggedCall,
	'no-spread-in-evo': noSpreadInEvo,
	'no-explicit-command-type-annotation': noExplicitCommandTypeAnnotation,

	// ── Effect / Option idioms (FK-3) ────────────────────────
	'prefer-option-match-over-map-getorelse': preferOptionMatchOverMapGetorelse,

	// ── Routing (FK-4) ───────────────────────────────────────
	'no-hardcoded-route-strings': noHardcodedRouteStrings,
	'route-union-parser-registration': routeUnionParserRegistration,
	'route-oneof-shadowing-order': routeOneofShadowingOrder,

	// ── View / accessibility (FK-5) ──────────────────────────
	'require-rel-for-external-link': requireRelForExternalLink,
	'prefer-empty-over-empty-element': preferEmptyOverEmptyElement,
	'label-requires-for': labelRequiresFor,
	'no-hand-rolled-form-controls': noHandRolledFormControls,
	'keyed-required-for-mapped-rows': keyedRequiredForMappedRows,
	'no-array-index-view-keys': noArrayIndexViewKeys,

	// ── Type shape (FK-6) ────────────────────────────────────
	'no-array-shorthand-type': noArrayShorthandType
};

/**
 * Oxlint plugin for Foldkit conventions and generated config presets.
 *
 * @since 0.2.2
 */
const plugin: Plugin.DefinedPlugin<Record<string, CreateRule>> = Plugin.define({
	name: '@mpsuesser/foldkit',
	specifier: '@mpsuesser/oxlint-plugin-foldkit',
	rules
});

export default plugin;
