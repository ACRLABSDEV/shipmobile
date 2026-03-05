/**
 * AST Utilities — Parse and query Babel ASTs
 */

import { parse, type ParserOptions } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { Node, ImportDeclaration, CallExpression, JSXOpeningElement } from '@babel/types';

// Handle ESM/CJS interop for @babel/traverse
const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as { default: typeof _traverse }).default) as typeof _traverse;

const PARSER_OPTIONS: ParserOptions = {
  sourceType: 'module',
  plugins: [
    'jsx',
    'typescript',
    'decorators-legacy',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'optionalChaining',
    'nullishCoalescingOperator',
    'dynamicImport',
    'exportDefaultFrom',
    'exportNamespaceFrom',
  ],
};

export function parseToAST(code: string): Node | null {
  try {
    return parse(code, PARSER_OPTIONS);
  } catch {
    return null;
  }
}

export interface ImportInfo {
  source: string;
  specifiers: { name: string; local: string; type: 'default' | 'named' | 'namespace' }[];
  node: ImportDeclaration;
}

export function findImports(ast: Node): ImportInfo[] {
  const imports: ImportInfo[] = [];
  traverse(ast, {
    ImportDeclaration(path) {
      const specifiers = path.node.specifiers.map((s) => {
        if (s.type === 'ImportDefaultSpecifier') return { name: 'default', local: s.local.name, type: 'default' as const };
        if (s.type === 'ImportNamespaceSpecifier') return { name: '*', local: s.local.name, type: 'namespace' as const };
        return { name: (s.imported.type === 'Identifier' ? s.imported.name : s.imported.value), local: s.local.name, type: 'named' as const };
      });
      imports.push({ source: path.node.source.value, specifiers, node: path.node });
    },
  });
  return imports;
}

export interface ComponentInfo {
  name: string;
  type: 'function' | 'arrow' | 'class';
  line: number;
}

export function findComponents(ast: Node): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name;
      if (name && /^[A-Z]/.test(name)) {
        components.push({ name, type: 'function', line: path.node.loc?.start.line ?? 0 });
      }
    },
    VariableDeclarator(path) {
      if (path.node.id.type === 'Identifier' && /^[A-Z]/.test(path.node.id.name)) {
        const init = path.node.init;
        if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
          components.push({ name: path.node.id.name, type: 'arrow', line: path.node.loc?.start.line ?? 0 });
        }
      }
    },
    ClassDeclaration(path) {
      const name = path.node.id?.name;
      if (name && /^[A-Z]/.test(name)) {
        components.push({ name, type: 'class', line: path.node.loc?.start.line ?? 0 });
      }
    },
  });
  return components;
}

export function findCallExpressions(ast: Node, name: string): { node: CallExpression; line: number; column: number }[] {
  const results: { node: CallExpression; line: number; column: number }[] = [];
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      let calleeName = '';
      if (callee.type === 'Identifier') calleeName = callee.name;
      else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const obj = callee.object.type === 'Identifier' ? callee.object.name : '';
        calleeName = `${obj}.${callee.property.name}`;
      }
      if (calleeName === name) {
        results.push({
          node: path.node,
          line: path.node.loc?.start.line ?? 0,
          column: path.node.loc?.start.column ?? 0,
        });
      }
    },
  });
  return results;
}

export function findJSXElements(ast: Node, name: string): { line: number; column: number; node: JSXOpeningElement }[] {
  const results: { line: number; column: number; node: JSXOpeningElement }[] = [];
  traverse(ast, {
    JSXOpeningElement(path) {
      const id = path.node.name;
      let elementName = '';
      if (id.type === 'JSXIdentifier') elementName = id.name;
      else if (id.type === 'JSXMemberExpression') {
        const obj = id.object.type === 'JSXIdentifier' ? id.object.name : '';
        elementName = `${obj}.${id.property.name}`;
      }
      if (elementName === name) {
        results.push({
          line: path.node.loc?.start.line ?? 0,
          column: path.node.loc?.start.column ?? 0,
          node: path.node,
        });
      }
    },
  });
  return results;
}
