import JSZip from 'jszip';

const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
  '.py', '.rb', '.go', '.rs', '.java', '.kt',
  '.php', '.cs', '.swift', '.dart', '.scala',
  '.c', '.cpp', '.h', '.hpp',
];

const IGNORE_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build',
  '__pycache__', '.cache', 'vendor', 'target',
  '.idea', '.vscode', 'coverage',
];

export async function parseZipFile(file) {
  const zip = await JSZip.loadAsync(file);
  const fileTree = [];
  const fileContents = {};

  const promises = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;

    // Skip ignored directories
    const parts = relativePath.split('/');
    if (parts.some(p => IGNORE_DIRS.includes(p))) return;

    // Skip non-code files for content extraction
    const ext = '.' + relativePath.split('.').pop();
    const isCode = CODE_EXTENSIONS.includes(ext);

    fileTree.push({
      path: relativePath,
      name: parts[parts.length - 1],
      isCode,
      size: zipEntry._data ? zipEntry._data.uncompressedSize : 0,
    });

    if (isCode) {
      promises.push(
        zipEntry.async('string').then(content => {
          fileContents[relativePath] = content;
        })
      );
    }
  });

  await Promise.all(promises);

  return { fileTree, fileContents };
}

export function extractImports(fileContents) {
  const imports = {};

  const importPatterns = [
    // ES6 imports
    /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/g,
    // CommonJS require
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    // Python imports
    /from\s+([\w.]+)\s+import/g,
    /^import\s+([\w.]+)/gm,
    // Go imports
    /"([^"]+)"/g,
    // Rust use
    /use\s+([\w:]+)/g,
  ];

  Object.entries(fileContents).forEach(([filePath, content]) => {
    const fileImports = new Set();

    importPatterns.forEach(pattern => {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        fileImports.add(match[1]);
      }
    });

    imports[filePath] = Array.from(fileImports);
  });

  return imports;
}

export function resolveImportPaths(imports, fileTree) {
  const filePaths = fileTree.map(f => f.path);
  const edges = [];

  Object.entries(imports).forEach(([sourceFile, importPaths]) => {
    importPaths.forEach(imp => {
      // Try to resolve relative imports
      if (imp.startsWith('.')) {
        const sourceDir = sourceFile.split('/').slice(0, -1).join('/');
        const resolved = resolveRelative(sourceDir, imp);
        const match = filePaths.find(fp =>
          fp === resolved ||
          fp === resolved + '.ts' ||
          fp === resolved + '.tsx' ||
          fp === resolved + '.js' ||
          fp === resolved + '.jsx' ||
          fp === resolved + '/index.ts' ||
          fp === resolved + '/index.js'
        );
        if (match) {
          edges.push({ source: sourceFile, target: match });
        }
      }
    });
  });

  return edges;
}

function resolveRelative(baseDir, importPath) {
  const parts = baseDir.split('/').filter(Boolean);
  const importParts = importPath.split('/');

  for (const part of importParts) {
    if (part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }

  return parts.join('/');
}
