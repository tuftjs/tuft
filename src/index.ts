import type { RouteMapOptions } from './route-map';

import { TuftRouteMap } from './route-map';

// Type exports
export type { TuftHandler, TuftPreHandler, TuftResponse, TuftRouteMap } from './route-map';
export type { TuftContext, TuftRequest } from './context';
export type { TuftServer, TuftSecureServer } from './server';

// Main export
export function tuft(options?: RouteMapOptions) {
  return new TuftRouteMap(options);
}

// Extension exports
export { createBodyParser } from './pre-handlers/body-parser';
export { createCookieParser } from './pre-handlers/cookie-parser';
export { createSearchParams } from './pre-handlers/search-params';
export { createSession } from './pre-handlers/session';
export { createWriteStreamResponder } from './responders/write-stream';

// Utility function exports
export { createPromise } from './utils';
