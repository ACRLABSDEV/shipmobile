#!/usr/bin/env node
/**
 * Prepend shebang and set executable permissions on CLI entry points.
 * tsup banner + splitting puts the shebang on the wrong line, so we do it here.
 */
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';

const SHEBANG = '#!/usr/bin/env node\n';

for (const file of ['dist/index.js', 'dist/mcp.js']) {
  const content = readFileSync(file, 'utf8');
  if (!content.startsWith('#!')) {
    writeFileSync(file, SHEBANG + content);
  }
  chmodSync(file, 0o755);
}
