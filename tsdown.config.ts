import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: './src/index.ts',
	format: ['esm'],
	dts: true,
	clean: true,
	fixedExtension: false,
	hash: false,
	deps: {
		neverBundle: ['@oxlint/plugins', 'effect', 'effect-oxlint']
	}
});
