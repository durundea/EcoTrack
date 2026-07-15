import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

function collectFeatureTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFeatureTsxFiles(absolutePath);
    }

    return entry.isFile() && absolutePath.endsWith('.tsx') ? [absolutePath] : [];
  });
}

const bannedTailwindColorUtility =
  /\b(?:bg|text|border|ring|divide|fill|stroke|from|via|to|placeholder|decoration|outline|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-(?:50|100|200|300|400|500|600|700|800|900|950))?(?:\/(?:\d{1,3}))?\b/g;

const bannedArbitraryColorUtility =
  /\b(?:bg|text|border|ring|divide|fill|stroke|from|via|to|placeholder|decoration|outline|accent|caret)-\[(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([^\]]+\))\]/g;

describe('ui token guard', () => {
  it('disallows hardcoded color utility literals in feature pages', () => {
    const featureRoot = join(process.cwd(), 'src', 'features');
    const files = collectFeatureTsxFiles(featureRoot);

    const offenders = files
      .map((filePath) => {
        const content = readFileSync(filePath, 'utf8');
        const paletteMatches = content.match(bannedTailwindColorUtility) ?? [];
        const arbitraryMatches = content.match(bannedArbitraryColorUtility) ?? [];
        const matches = [...new Set([...paletteMatches, ...arbitraryMatches])];

        if (matches.length === 0) {
          return null;
        }

        return {
          file: relative(process.cwd(), filePath).replaceAll('\\', '/'),
          matches,
        };
      })
      .filter((entry): entry is { file: string; matches: string[] } => Boolean(entry));

    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});