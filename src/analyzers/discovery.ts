/**
 * File Discovery — Walk project directory, collect source files
 */

import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import type { ProjectFile, AuditContext } from './types.js';
import { parseToAST } from './ast.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.expo', '.shipmobile', 'android', 'ios', 'coverage', '__mocks__']);
const SOURCE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);

function walkDir(dir: string, rootDir: string, files: ProjectFile[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env') continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walkDir(fullPath, rootDir, files);
      }
    } else if (entry.isFile() && SOURCE_EXTS.has(extname(entry.name))) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const file: ProjectFile = {
          path: relative(rootDir, fullPath),
          absolutePath: fullPath,
          content,
        };
        // Lazy AST via getter
        Object.defineProperty(file, 'ast', {
          get: function () {
            const cached = parseToAST(this.content as string);
            Object.defineProperty(this, 'ast', { value: cached, writable: false });
            return cached;
          },
          configurable: true,
          enumerable: true,
        });
        files.push(file);
      } catch {
        // skip unreadable files
      }
    }
  }
}

export function discoverFiles(projectPath: string): ProjectFile[] {
  const files: ProjectFile[] = [];
  walkDir(projectPath, projectPath, files);
  return files;
}

export function buildAuditContext(projectPath: string): AuditContext {
  const files = discoverFiles(projectPath);

  let packageJson: Record<string, unknown> = {};
  try {
    packageJson = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'));
  } catch {
    // no package.json
  }

  let appJson: Record<string, unknown> = {};
  for (const name of ['app.json', 'app.config.json']) {
    const p = join(projectPath, name);
    if (existsSync(p)) {
      try {
        appJson = JSON.parse(readFileSync(p, 'utf-8'));
        break;
      } catch {
        // skip
      }
    }
  }

  return { projectPath, files, packageJson, appJson };
}

export function findAssetFiles(projectPath: string): { path: string; size: number }[] {
  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.tiff']);
  const assetDirs = ['assets', 'src/assets', 'app/assets', 'images', 'src/images'];
  const results: { path: string; size: number }[] = [];

  for (const dir of assetDirs) {
    const fullDir = join(projectPath, dir);
    if (!existsSync(fullDir)) continue;
    walkAssets(fullDir, projectPath, imageExts, results);
  }
  return results;
}

function walkAssets(dir: string, root: string, exts: Set<string>, results: { path: string; size: number }[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAssets(full, root, exts, results);
    } else if (entry.isFile() && exts.has(extname(entry.name).toLowerCase())) {
      try {
        const stat = statSync(full);
        results.push({ path: relative(root, full), size: stat.size });
      } catch {
        // skip
      }
    }
  }
}
