import type { RouteMapOptions } from './route-map';
import { TuftRouteMap } from './route-map';

// Type exports
export type { TuftHandler, TuftPreHandler, TuftResponse, TuftRouteMap } from './route-map';
export type { TuftContext, TuftRequest } from './context';
export type { TuftServer, TuftSecureServer } from './server';

// Main export
export default function tuft(options?: RouteMapOptions) {
  return new TuftRouteMap(options);
}

// Extensions
export { createSearchParams } from './pre-handlers/search-params';
export { createCookieParser } from './pre-handlers/cookie-parser';
export { createBodyParser } from './pre-handlers/body-parser';
export { createWriteStreamResponder } from './responders/write-stream';

// Utility functions
export { createPromise } from './utils';
