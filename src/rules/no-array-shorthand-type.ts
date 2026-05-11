import { Rule } from 'effect-oxlint';

export default Rule.banStatement('TSArrayType', {
	message:
		'Avoid `T[]` array-type syntax. Use `Array<T>` for mutable arrays or `ReadonlyArray<T>` for read-only — the form used throughout Foldkit exemplars. (FK-6)'
});
