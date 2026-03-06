import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'src/cli/banner.ts',
        'src/cli/renderer.ts',
        'src/cli/theme.ts',
        'src/cli/components/**',
        'src/index.ts',
        'src/mcp.ts',
        'tests/**',
        'dist/**',
        '*.config.*',
      ],
    },
  },
});
