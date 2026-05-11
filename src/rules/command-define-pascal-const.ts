import type { ESTree } from 'effect-oxlint';

import { Match, pipe } from 'effect';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

const PascalCase = Schema.String.check(
	Schema.isPattern(/^[A-Z][A-Za-z0-9]*$/, {
		identifier: 'PascalCase',
		title: 'PascalCase Identifier',
		description: 'A non-empty PascalCase identifier (e.g. `FetchWeather`).'
	})
);

const isPascalCase = Schema.is(PascalCase);

interface Diagnosis {
	readonly node: ESTree.CallExpression;
	readonly message: string;
}

const stringLiteralValue = (arg: ESTree.Argument): Option.Option<string> =>
	arg.type === 'Literal' && P.isString(arg.value)
		? Option.some(arg.value)
		: Option.none();

/** Walk the typed parent chain to find the enclosing `VariableDeclarator`. */
const walkUpForDeclarator = (
	node: Option.Option<ESTree.Node>
): Option.Option<ESTree.VariableDeclarator> =>
	Option.match(node, {
		onNone: () => Option.none(),
		onSome: (n) =>
			n.type === 'VariableDeclarator'
				? Option.some(n)
				: walkUpForDeclarator(Option.fromNullishOr(n.parent))
	});

const declaratorOf = (
	node: ESTree.CallExpression
): Option.Option<ESTree.VariableDeclarator> =>
	walkUpForDeclarator(Option.fromNullishOr(node.parent));

const declaratorName = (
	declarator: ESTree.VariableDeclarator
): Option.Option<string> =>
	declarator.id.type === 'Identifier'
		? Option.some(declarator.id.name)
		: Option.none();

const isImmediateInitOf = (
	declarator: ESTree.VariableDeclarator,
	node: ESTree.CallExpression
): boolean => declarator.init === node;

const diagnoseFromName = (
	node: ESTree.CallExpression,
	name: string
): Option.Option<Diagnosis> =>
	Match.value(name).pipe(
		Match.when(
			(n) => !isPascalCase(n),
			() =>
				Option.some<Diagnosis>({
					node,
					message: `\`Command.define('${name}', ...)\` must use a PascalCase name (e.g. \`FetchWeather\`, \`FocusInput\`). (FK-2)`
				})
		),
		Match.orElse(() =>
			pipe(
				declaratorOf(node),
				Option.filter((d) => isImmediateInitOf(d, node)),
				Option.match({
					onNone: () =>
						Option.some<Diagnosis>({
							node,
							message: `\`Command.define('${name}', ...)\` must be assigned to a PascalCase \`const\` — never inline in a pipe or expression. Write \`const ${name} = Command.define('${name}', ...)\`. (FK-2)`
						}),
					onSome: (d) =>
						pipe(
							declaratorName(d),
							Option.flatMap((got) =>
								got === name
									? Option.none<Diagnosis>()
									: Option.some<Diagnosis>({
											node,
											message: `\`Command.define('${name}', ...)\` should be assigned to a const named \`${name}\` — got \`${got}\`. The const name must mirror the Command identity. (FK-2)`
										})
							)
						)
				})
			)
		)
	);

const diagnose = (node: ESTree.CallExpression): Option.Option<Diagnosis> => {
	const arg = node.arguments[0];
	if (arg === undefined) {
		return Option.some({
			node,
			message:
				'`Command.define` requires a literal string name as its first argument. (FK-2)'
		});
	}
	return pipe(
		stringLiteralValue(arg),
		Option.match({
			onNone: () =>
				Option.some<Diagnosis>({
					node,
					message:
						'`Command.define` requires a literal string name as its first argument. (FK-2)'
				}),
			onSome: (name) => diagnoseFromName(node, name)
		})
	);
};

export default Rule.define({
	name: 'command-define-pascal-const',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'`Command.define(...)` must be assigned to a PascalCase const matching the first argument (FK-2)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return Visitor.on('CallExpression', (node) => {
			if (!AST.isCallOf(node, 'Command', 'define')) return Effect.void;
			return Option.match(diagnose(node), {
				onNone: () => Effect.void,
				onSome: (d) => ctx.report(Diagnostic.make(d))
			});
		});
	}
});
