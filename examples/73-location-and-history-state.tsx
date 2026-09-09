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
  useLocation,
} from '@newfoundcodes/helvetium-dom';

function Cart() {
  return (
    <Anchor to="/checkout?step=shipping" state={{ source: 'cart' }}>
      Checkout
    </Anchor>
  );
}

function Checkout() {
  const location = useLocation();
  const state = location.state as { source?: string } | null;
  return (
    <main>
      <p>Path: {location.pathname}</p>
      <p>Query: {location.search}</p>
      <p>Source: {state?.source ?? 'direct'}</p>
    </main>
  );
}

const router = createBrowserRouter([
  { path: '/cart', component: Cart },
  { path: '/checkout', component: Checkout },
]);

createRoot(document.getElementById('app')!).render(<RouterProvider router={router} />);
