import { describe, expect, it } from 'vitest';

/**
 * Meta guards over the repository's own test sources.
 *
 * The guard is a static scan: it never runs the code it inspects, it only
 * reads the raw text of the files. Every rule below is a mechanical rule that
 * a reviewer would otherwise have to check by hand.
 */

const HELPER_PATH = '/src/test/helpers.tsx';
const GUARD_PATH = '/src/test/guards/sourceGuards.test.ts';

const rawTestFiles = import.meta.glob('/src/**/*.test.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const rawSupportFiles = import.meta.glob('/src/test/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const rawProductionFiles = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Every test source: the `*.test.*` files plus the support files. */
const testSources: Record<string, string> = { ...rawTestFiles, ...rawSupportFiles };

/** Removes comments and string literals so only real code is inspected. */
function stripNoise(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, ' ')
    .replace(/'(?:\\[\s\S]|[^'\\])*'/g, ' ')
    .replace(/"(?:\\[\s\S]|[^"\\])*"/g, ' ');
}

/** Returns the text between the bracket at `openIndex` and its match. */
function extractBalanced(source: string, openIndex: number, open: string, close: string): string {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === open) depth += 1;
    else if (source[index] === close) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  return '';
}

/** Returns the body of the named function declaration. */
function functionBody(source: string, name: string): string {
  const marker = source.indexOf(`function ${name}`);
  if (marker === -1) return '';
  const open = source.indexOf('{', marker);
  if (open === -1) return '';
  return extractBalanced(source, open, '{', '}');
}

/** Returns the callback text of every `beforeEach` call. */
function beforeEachBodies(source: string): string[] {
  const bodies: string[] = [];
  const pattern = /beforeEach\s*\(/g;
  let match = pattern.exec(source);
  while (match !== null) {
    const open = match.index + match[0].length - 1;
    bodies.push(extractBalanced(source, open, '(', ')'));
    match = pattern.exec(source);
  }
  return bodies;
}

function importsHelper(source: string): boolean {
  return /from\s*['"][^'"]*helpers['"]/.test(source);
}

const PLAYER_IDENTIFIER = /(?<![\w$.])Player(?![\w$])/;
const PLAYER_LITERAL_KEYS = /(?<![\w$])(tapped|wins)\s*:/;
const STORAGE_TOKENS = [/clearStorage/, /localStorage\s*\.\s*clear/, /removeItem/, /setItem/];
const VIEWPORT_TOKENS = [
  /matchMedia/,
  /innerWidth/,
  /innerHeight/,
  /visualViewport/,
  /['"`]resize['"`]/,
];

describe('G1 — test fixtures are store-sourced', () => {
  it('forbids the domain player type and hand-built player literals', () => {
    const violations: string[] = [];

    for (const [path, source] of Object.entries(testSources)) {
      if (path === GUARD_PATH) continue;
      const code = stripNoise(source);
      if (PLAYER_IDENTIFIER.test(code)) {
        violations.push(`${path}: uses the "Player" identifier`);
      }
      if (PLAYER_LITERAL_KEYS.test(code)) {
        violations.push(`${path}: builds a player literal ("tapped:" / "wins:")`);
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('G2 — the shared helper owns the storage lifecycle', () => {
  it('forbids direct storage writes outside the shared helper', () => {
    const violations: string[] = [];

    for (const [path, source] of Object.entries(testSources)) {
      if (path === GUARD_PATH || path === HELPER_PATH) continue;
      const code = stripNoise(source);
      for (const token of STORAGE_TOKENS) {
        if (token.test(code)) {
          violations.push(`${path}: touches storage directly (${token.source})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('resets the memory before the persisted key is removed', () => {
    const helper = stripNoise(testSources[HELPER_PATH] ?? '');
    const body = functionBody(helper, 'resetStore');

    expect(body).not.toBe('');
    expect(body).toContain('setState');
    expect(body).toContain('clearStorage');
    expect(body.indexOf('setState')).toBeLessThan(body.indexOf('clearStorage'));
  });
});

describe('G3 — every suite starts from a blank board', () => {
  it('requires a reset inside a beforeEach for every helper-importing suite', () => {
    const violations: string[] = [];

    for (const [path, source] of Object.entries(testSources)) {
      if (path === GUARD_PATH) continue;
      if (!importsHelper(source)) continue;
      const bodies = beforeEachBodies(stripNoise(source));
      if (!bodies.some((body) => body.includes('resetStore('))) {
        violations.push(`${path}: imports the helper without a resetStore() in a beforeEach`);
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('G4 — the DOM has no viewport-dependent branching', () => {
  it('forbids viewport reads in production sources', () => {
    const violations: string[] = [];

    for (const [path, source] of Object.entries(rawProductionFiles)) {
      if (path.includes('.test.')) continue;
      for (const token of VIEWPORT_TOKENS) {
        if (token.test(source)) {
          violations.push(`${path}: reads the viewport (${token.source})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
