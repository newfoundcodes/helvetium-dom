/*
 * Helvetium DOM - Helvetium Framework, A Newfoundcodes project.
 *
 * Copyright (C) 2026 Jonathan Eldy Baldivicio
 *
 * Author: Jonathan Eldy Baldivicio
 * Contact: jonathaneldy.baldivicio@newfoundcodes.com
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('./fixtures/classic-jsx.tsx', import.meta.url));

async function findJavaScriptFile(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await findJavaScriptFile(path);
      if (nested) {
        return nested;
      }
    } else if (entry.name.endsWith('.js')) {
      return path;
    }
  }

  return null;
}

test('classic Helvetium DOM TSX emits h() calls without an automatic JSX runtime import', async () => {
  const output = await mkdtemp(join(tmpdir(), 'helvetium-jsx-'));
  try {
    const config = join(output, 'tsconfig.json');
    await writeFile(
      config,
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            lib: ['ES2022', 'DOM'],
            strict: true,
            skipLibCheck: true,
            jsx: 'react',
            jsxFactory: 'h',
            jsxFragmentFactory: 'Fragment',
            rootDir: dirname(fixture),
            outDir: output,
          },
          files: [fixture],
        },
        null,
        2,
      ),
    );

    execFileSync(process.platform === 'win32' ? 'tsc.cmd' : 'tsc', ['--project', config], {
      stdio: 'pipe',
    });

    const emitted = await findJavaScriptFile(output);
    assert.ok(emitted, 'TypeScript should emit one JavaScript fixture');

    const source = await readFile(emitted, 'utf8');
    assert.match(source, /\bh\s*\(/, 'emitted TSX should call the Helvetium DOM h factory');
    assert.match(source, /\bFragment\b/, 'fragment shorthand should use Helvetium DOM Fragment');

    assert.doesNotMatch(
      source,
      /react\/jsx-runtime/,
      'React automatic runtime must not be imported',
    );

    assert.doesNotMatch(
      source,
      /helvetium-dom\/jsx-runtime/,
      'Helvetium DOM automatic runtime must not be required by classic TSX',
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
