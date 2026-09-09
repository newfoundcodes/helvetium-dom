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

import { h, createRoot, useState } from '@newfoundcodes/helvetium-dom';

const records = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
];

function App() {
  const [selected, setSelected] = useState(records[0]!);
  return (
    <div>
      <ul>
        {records.map((record) => (
          <li key={record.id}>
            <button onClick={() => setSelected(record)}>{record.name}</button>
          </li>
        ))}
      </ul>
      <article>
        <h2>{selected.name}</h2>
        <p>ID: {selected.id}</p>
      </article>
    </div>
  );
}

export function mount(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<App />);
  return root;
}
