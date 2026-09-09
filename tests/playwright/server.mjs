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

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.HELVETIUM_TEST_PORT ?? 4173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
]);

createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname,
  );
  const candidate = resolve(join(root, normalize(pathname).replace(/^[/\\]+/, '')));

  if (!candidate.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let file = candidate;
  try {
    if (statSync(file).isDirectory()) {
      file = join(file, 'index.html');
    }
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', types.get(extname(file)) ?? 'application/octet-stream');

  createReadStream(file)
    .on('error', () => response.writeHead(500).end('Read error'))
    .pipe(response);
}).listen(port, '127.0.0.1', () =>
  console.log(`Helvetium DOM test server: http://127.0.0.1:${port}`),
);
