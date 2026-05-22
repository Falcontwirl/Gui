import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export interface RawFunction {
  name: string;
  kind: 'function' | 'method' | 'class';
  start_line: number;
  end_line: number;
  signature: string;
  snippet: string;
}

type Lang = 'javascript' | 'typescript' | 'tsx' | 'python' | 'java' | 'go';

const EXT_TO_LANG: Record<string, Lang> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  java: 'java',
  go: 'go',
};

const WASM_FILE: Record<Lang, string> = {
  javascript: 'tree-sitter-javascript.wasm',
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  python: 'tree-sitter-python.wasm',
  java: 'tree-sitter-java.wasm',
  go: 'tree-sitter-go.wasm',
};

// Tree-sitter node types that count as "definitions" per language.
const DEFN_TYPES: Record<Lang, Set<string>> = {
  javascript: new Set([
    'function_declaration',
    'method_definition',
    'class_declaration',
    'generator_function_declaration',
  ]),
  typescript: new Set([
    'function_declaration',
    'method_definition',
    'class_declaration',
    'abstract_class_declaration',
    'interface_declaration',
    'generator_function_declaration',
  ]),
  tsx: new Set([
    'function_declaration',
    'method_definition',
    'class_declaration',
    'abstract_class_declaration',
    'interface_declaration',
    'generator_function_declaration',
  ]),
  python: new Set(['function_definition', 'class_definition']),
  java: new Set(['method_declaration', 'constructor_declaration', 'class_declaration', 'interface_declaration']),
  go: new Set(['function_declaration', 'method_declaration', 'type_declaration']),
};

let parserInitialized = false;
let ParserClass: any = null;
let LanguageClass: any = null;
const langCache: Map<Lang, any> = new Map();

async function getParser(lang: Lang): Promise<any> {
  if (!parserInitialized) {
    const mod: any = await import('web-tree-sitter');
    ParserClass = mod.Parser;
    LanguageClass = mod.Language;
    await ParserClass.init();
    parserInitialized = true;
  }
  if (!langCache.has(lang)) {
    const wasmPath = require.resolve(`tree-sitter-wasms/out/${WASM_FILE[lang]}`);
    const wasmBytes = await readFile(wasmPath);
    const Language = await LanguageClass.load(wasmBytes);
    langCache.set(lang, Language);
  }
  const parser = new ParserClass();
  parser.setLanguage(langCache.get(lang));
  return parser;
}

function pickLang(path: string): Lang | null {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? null;
}

function nameOf(node: any, lang: Lang): string {
  // Most grammars expose a child `name` field.
  const named = node.childForFieldName?.('name');
  if (named) return named.text;

  // Go method receivers — the name field is on the field_identifier child.
  if (lang === 'go' && node.type === 'method_declaration') {
    for (let i = 0; i < node.namedChildCount; i++) {
      const c = node.namedChild(i);
      if (c.type === 'field_identifier') return c.text;
    }
  }

  // Go type_declaration wraps type_spec which has the name.
  if (lang === 'go' && node.type === 'type_declaration') {
    const spec = node.namedChild(0);
    if (spec && spec.type === 'type_spec') {
      const id = spec.childForFieldName?.('name');
      if (id) return id.text;
    }
  }

  return '<anonymous>';
}

function kindOf(node: any, lang: Lang): RawFunction['kind'] {
  const t = node.type;
  if (t.includes('class') || t.includes('interface') || (lang === 'go' && t === 'type_declaration')) return 'class';
  if (t === 'method_definition' || t === 'method_declaration' || t === 'constructor_declaration') return 'method';
  return 'function';
}

function trimSignature(text: string): string {
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  return firstLine.length > 160 ? firstLine.slice(0, 157) + '...' : firstLine;
}

function trimSnippet(text: string, maxLines = 30): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join('\n') + `\n// … (${lines.length - maxLines} more lines)`;
}

function collectDefinitions(root: any, lang: Lang): any[] {
  const defns: any[] = [];
  const types = DEFN_TYPES[lang];
  const walk = (node: any) => {
    if (types.has(node.type)) {
      defns.push(node);
      // Recurse into classes so we capture their methods too.
      if (kindOf(node, lang) === 'class') {
        for (let i = 0; i < node.namedChildCount; i++) {
          walk(node.namedChild(i));
        }
      }
      return;
    }
    for (let i = 0; i < node.namedChildCount; i++) {
      walk(node.namedChild(i));
    }
  };
  walk(root);
  return defns;
}

export async function extractFunctions(path: string, content: string): Promise<RawFunction[]> {
  const lang = pickLang(path);
  if (!lang) return [];

  let parser: any;
  try {
    parser = await getParser(lang);
  } catch (err) {
    console.error(`[ast] failed to load parser for ${lang}:`, err);
    return [];
  }

  let tree: any;
  try {
    tree = parser.parse(content);
  } catch (err) {
    console.error(`[ast] parse failed for ${path}:`, err);
    return [];
  }

  const defns = collectDefinitions(tree.rootNode, lang);
  return defns
    .map((node) => ({
      name: nameOf(node, lang),
      kind: kindOf(node, lang),
      start_line: node.startPosition.row + 1,
      end_line: node.endPosition.row + 1,
      signature: trimSignature(node.text),
      snippet: trimSnippet(node.text),
    }))
    .filter((f) => f.name !== '<anonymous>');
}

// --- Import extraction ---

// JS/TS standard library modules — skip these as they're built-in.
const JS_BUILTIN = new Set([
  'fs', 'path', 'os', 'url', 'http', 'https', 'crypto', 'stream', 'util',
  'child_process', 'events', 'buffer', 'querystring', 'zlib', 'net',
  'readline', 'tls', 'dgram', 'cluster', 'dns', 'module', 'assert', 'vm',
  'worker_threads', 'perf_hooks', 'process', 'string_decoder', 'timers',
  'console', 'async_hooks',
]);

// Python standard library top-level modules (common subset).
const PY_STDLIB = new Set([
  'os', 'sys', 're', 'json', 'math', 'time', 'datetime', 'collections',
  'itertools', 'functools', 'random', 'string', 'pathlib', 'typing',
  'asyncio', 'subprocess', 'threading', 'multiprocessing', 'logging',
  'unittest', 'argparse', 'io', 'csv', 'pickle', 'copy', 'hashlib',
  'urllib', 'http', 'socket', 'shutil', 'tempfile', 'glob', 'enum',
  'abc', 'dataclasses', 'inspect', 'contextlib', 'warnings', 'traceback',
  '__future__',
]);

// Java stdlib top-level packages.
const JAVA_STDLIB_PREFIXES = ['java.', 'javax.', 'jakarta.', 'sun.', 'com.sun.'];

function jsModuleName(spec: string): string | null {
  if (!spec) return null;
  if (spec.startsWith('.') || spec.startsWith('/')) return null; // relative / absolute path
  // Scoped: @scope/pkg or @scope/pkg/sub — keep scope + first segment.
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  }
  const name = spec.split('/')[0];
  if (!name || JS_BUILTIN.has(name) || name.startsWith('node:')) return null;
  return name;
}

function pyModuleName(spec: string, isRelative: boolean): string | null {
  if (isRelative) return null;
  const top = spec.split('.')[0];
  if (!top || PY_STDLIB.has(top)) return null;
  return top;
}

function javaModuleName(spec: string): string | null {
  if (!spec) return null;
  for (const p of JAVA_STDLIB_PREFIXES) if (spec.startsWith(p)) return null;
  const parts = spec.split('.');
  if (parts.length < 2) return parts[0];
  // group.artifact-ish: take first two segments
  return `${parts[0]}.${parts[1]}`;
}

function goModuleName(spec: string): string | null {
  if (!spec) return null;
  if (!spec.includes('.')) return null; // stdlib like "fmt", "errors"
  return spec;
}

function stripQuotes(s: string): string {
  return s.replace(/^['"`]|['"`]$/g, '');
}

function collectImports(root: any, lang: Lang): string[] {
  const out = new Set<string>();
  const walk = (node: any) => {
    const t = node.type;

    if (lang === 'javascript' || lang === 'typescript' || lang === 'tsx') {
      if (t === 'import_statement') {
        const src = node.childForFieldName?.('source');
        if (src) {
          const name = jsModuleName(stripQuotes(src.text));
          if (name) out.add(name);
        }
      } else if (t === 'call_expression') {
        const fn = node.childForFieldName?.('function');
        if (fn && fn.text === 'require') {
          const args = node.childForFieldName?.('arguments');
          if (args && args.namedChildCount > 0) {
            const arg = args.namedChild(0);
            if (arg.type === 'string') {
              const name = jsModuleName(stripQuotes(arg.text));
              if (name) out.add(name);
            }
          }
        }
      }
    } else if (lang === 'python') {
      if (t === 'import_statement') {
        for (let i = 0; i < node.namedChildCount; i++) {
          const c = node.namedChild(i);
          if (c.type === 'dotted_name' || c.type === 'aliased_import') {
            const dn = c.type === 'aliased_import' ? c.namedChild(0) : c;
            const name = pyModuleName(dn?.text ?? '', false);
            if (name) out.add(name);
          }
        }
      } else if (t === 'import_from_statement') {
        const module = node.childForFieldName?.('module_name');
        const isRelative = node.text.startsWith('from .');
        if (module) {
          const name = pyModuleName(module.text, isRelative);
          if (name) out.add(name);
        }
      }
    } else if (lang === 'java') {
      if (t === 'import_declaration') {
        const id = node.namedChild(0);
        if (id) {
          const name = javaModuleName(id.text);
          if (name) out.add(name);
        }
      }
    } else if (lang === 'go') {
      if (t === 'import_spec') {
        const pathNode = node.childForFieldName?.('path') ?? node.namedChild(node.namedChildCount - 1);
        if (pathNode) {
          const name = goModuleName(stripQuotes(pathNode.text));
          if (name) out.add(name);
        }
      }
    }

    for (let i = 0; i < node.namedChildCount; i++) walk(node.namedChild(i));
  };
  walk(root);
  return [...out].sort();
}

export async function extractImports(path: string, content: string): Promise<string[]> {
  const lang = pickLang(path);
  if (!lang) return [];
  let parser: any;
  try {
    parser = await getParser(lang);
  } catch {
    return [];
  }
  let tree: any;
  try {
    tree = parser.parse(content);
  } catch {
    return [];
  }
  return collectImports(tree.rootNode, lang);
}

export const SUPPORTED_EXTENSIONS = Object.keys(EXT_TO_LANG);
