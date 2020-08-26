import type { TuftContext } from '../context';

import { URLSearchParams } from 'url';

/**
 * Returns the 'searchParams' pre-handler function, which attaches any parameters and their values
 * present on the query string to the request object under the 'search' property as a
 * URLSearchParams object.
 */

export function createSearchParams() {
  return function searchParams(t: TuftContext) {
    t.request.searchParams = new URLSearchParams(t.request.search);
  };
}
