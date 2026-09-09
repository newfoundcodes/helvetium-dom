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

import { h, createContext, createRoot, useContext, useState } from '@newfoundcodes/helvetium-dom';

const Theme = createContext<'light' | 'dark'>('light');

function Card() {
  return <article data-theme={useContext(Theme)}>Themed content</article>;
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <Theme.Provider value={theme}>
      <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>Toggle</button>
      <Card />
    </Theme.Provider>
  );
}

export function mount(container: HTMLElement) {
  const root = createRoot(container);
  root.render(<App />);
  return root;
}
