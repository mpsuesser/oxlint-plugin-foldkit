import type { CreateRule } from '@oxlint/plugins';
import type { ESTree } from 'effect-oxlint';

import { pipe } from 'effect';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';

import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const isMutableDeclaration = (node: ESTree.VariableDeclaration): boolean =>
	(node.kind === 'let' || node.kind === 'var') && node.declare !== true;

const topLevelDeclarations = (
	program: ESTree.Program
): ReadonlyArray<ESTree.VariableDeclaration> =>
	pipe(
		program.body,
		Arr.filterMap((statement) => {
			if (statement.type === 'VariableDeclaration') {
				return Result.succeed(statement);
			}
			if (
				statement.type === 'ExportNamedDeclaration' &&
				statement.declaration?.type === 'VariableDeclaration'
			) {
				return Result.succeed(statement.declaration);
			}
			return Result.failVoid;
		}),
		Arr.filter(isMutableDeclaration)
	);

const rule: CreateRule = Rule.define({
	name: 'no-module-level-mutable-state',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Disallow module-scope `let`/`var` state in Foldkit files; keep state in the Model tree'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('Program', (node) =>
			Effect.forEach(
				topLevelDeclarations(node),
				(declaration) =>
					ctx.report(
						Diagnostic.make({
							node: declaration,
							message:
								"Module-level `let`/`var` creates hidden state outside Foldkit's single Model tree. Keep mutable state in the Model or an explicit runtime primitive. (FK purity)"
						})
					),
				{ concurrency: 1, discard: true }
			)
		);
	}
});

export default rule;
