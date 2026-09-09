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

import {
  Anchor,
  Fragment,
  RouterOutlet,
  RouterProvider,
  createBrowserRouter,
  createRoot,
  h,
} from '@newfoundcodes/helvetium-dom';

function Dashboard() {
  return <h2>Dashboard</h2>;
}

function Settings() {
  return <h2>Settings</h2>;
}

function Shell() {
  return (
    <>
      <nav>
        <Anchor to="/dashboard">Dashboard</Anchor> <Anchor to="/settings">Settings</Anchor>
      </nav>
      <RouterOutlet />
    </>
  );
}

const router = createBrowserRouter([
  { path: '/dashboard', component: Dashboard },
  { path: '/settings', component: Settings },
]);

createRoot(document.getElementById('app')!).render(
  <RouterProvider router={router}>
    <Shell />
  </RouterProvider>,
);
