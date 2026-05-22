// Smart truncation: keep signature lines (imports, exports, function/class declarations,
// decorators, docstrings, closing braces) and drop function bodies. Ports the
// CodebaseExplorer approach with no changes — works well across JS/TS, Python,
// Go, Rust, C/C++.

const SIGNATURE_PATTERNS = [
  /^\s*(import\s|from\s|export\s|require\(|module\.exports)/,
  /^\s*(export\s+)?(default\s+)?(async\s+)?(function|class|interface|type|enum|const|let|var|abstract)\s/,
  /^\s*(def |class |async def )/,
  /^\s*(func |type |struct |impl |pub fn |fn )/,
  /^\s*@\w+/,
  /^\s*(\/\*\*|"""|''')/,
  /^\s*}\s*$/,
];

function isSignatureLine(line: string): boolean {
  return SIGNATURE_PATTERNS.some((p) => p.test(line));
}

export function smartTruncate(content: string, budget: number = 3500): string {
  if (content.length <= budget) return content;

  const lines = content.split('\n');
  const headerLines = lines.slice(0, 5);
  const restLines = lines.slice(5);

  const signatureIndices: number[] = [];
  const bodyIndices: number[] = [];

  restLines.forEach((line, i) => {
    if (isSignatureLine(line)) signatureIndices.push(i);
    else bodyIndices.push(i);
  });

  let result = headerLines.join('\n');
  let remaining = budget - result.length;

  const signatureBlock = signatureIndices.map((i) => restLines[i]).join('\n');
  if (signatureBlock.length <= remaining) {
    const includedSet = new Set(signatureIndices);
    const parts: string[] = [];
    let omittedRun = 0;

    for (let i = 0; i < restLines.length; i++) {
      if (includedSet.has(i)) {
        if (omittedRun > 0) {
          parts.push(`// ... (${omittedRun} lines omitted)`);
          omittedRun = 0;
        }
        parts.push(restLines[i]);
      } else {
        omittedRun++;
      }
    }
    if (omittedRun > 0) parts.push(`// ... (${omittedRun} lines omitted)`);

    const sigResult = result + '\n' + parts.join('\n');
    if (sigResult.length <= budget) {
      remaining = budget - sigResult.length;
      if (remaining > 200 && bodyIndices.length > 0) {
        const contextLines = new Set<number>();
        for (const si of signatureIndices) {
          for (let offset = 1; offset <= 2; offset++) {
            if (si + offset < restLines.length && bodyIndices.includes(si + offset)) {
              contextLines.add(si + offset);
            }
          }
        }
        const includedWithContext = new Set([...includedSet, ...contextLines]);
        const contextParts: string[] = [];
        omittedRun = 0;
        for (let i = 0; i < restLines.length; i++) {
          if (includedWithContext.has(i)) {
            if (omittedRun > 0) {
              contextParts.push(`// ... (${omittedRun} lines omitted)`);
              omittedRun = 0;
            }
            contextParts.push(restLines[i]);
          } else {
            omittedRun++;
          }
        }
        if (omittedRun > 0) contextParts.push(`// ... (${omittedRun} lines omitted)`);

        const contextResult = result + '\n' + contextParts.join('\n');
        if (contextResult.length <= budget) return contextResult;
      }
      return sigResult;
    }
  }

  return content.substring(0, budget);
}
