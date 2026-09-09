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
  RouterProvider,
  createBrowserRouter,
  createRoot,
  h,
  useParams,
} from '@newfoundcodes/helvetium-dom';

function Users() {
  return (
    <ul>
      <li>
        <Anchor to="/users/ada">Ada</Anchor>
      </li>
      <li>
        <Anchor to="/users/grace">Grace</Anchor>
      </li>
    </ul>
  );
}

function UserProfile() {
  const params = useParams();
  return <h1>User: {params.id}</h1>;
}

const router = createBrowserRouter([
  { path: '/users', component: Users },
  { path: '/users/:id', component: UserProfile },
]);

createRoot(document.getElementById('app')!).render(<RouterProvider router={router} />);
