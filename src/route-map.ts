import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { ServerOptions, SecureServerOptions } from './server';
import type { TuftContext } from './context';
import { HttpError } from './utils';

import { constants } from 'http2';
import { RouteManager } from './route-manager';
import { TuftServer, TuftSecureServer } from './server';
import { getSupportedRequestMethods } from './utils';
import {
  ROUTE_MAP_DEFAULT_TRAILING_SLASH,
  ROUTE_MAP_DEFAULT_BASE_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
} from './constants';

type RequestMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE';

export interface TuftHandler {
  (t: TuftContext): TuftResponse | Error | void | Promise<TuftResponse | Error | void>;
}

export interface TuftPreHandler {
  (t: TuftContext): TuftResponse | Error | void | Promise<TuftResponse | Error | void>;
}

export interface TuftResponder {
  (
    response: TuftResponse,
    stream: ServerHttp2Stream,
    outgoingHeaders: OutgoingHttpHeaders,
  ): TuftResponse | null | void | Promise<TuftResponse | null | void>;
}

export type TuftResponse = {
  [key in string | number]: any;
} & {
  error?: HttpError;
  status?: number;
  redirect?: string;
  raw?: Buffer;
  text?: string | number | boolean;
  html?: string;
  json?: string | object;
  file?: string;
};

export interface TuftRoute {
  response: TuftHandler | TuftResponse;
  preHandlers?: TuftPreHandler[];
  responders?: TuftResponder[],
  params?: { [key: string]: string };
  trailingSlash?: boolean;
}

type RouteMapOptions = {
  preHandlers?: TuftPreHandler[];
  responders?: TuftResponder[];
  basePath?: string;
  method?: RequestMethod | RequestMethod[];
  path?: string;
  trailingSlash?: boolean;
}

const {
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_IMPLEMENTED,
} = constants;

const supportedRequestMethods = getSupportedRequestMethods();

/**
 * Stores route data indexed by method and path. Instances of TuftRouteMap can be added to other
 * route maps, which results in entries being merged and traits from the parent route map being
 * inherited.
 */

export class TuftRouteMap extends Map {
  readonly #preHandlers: TuftPreHandler[];
  readonly #responders: TuftResponder[];
  readonly #trailingSlash: boolean | null;  // Match paths with a trailing slash.
  readonly #basePath: string;               // Prepend to route path.

  #applicationErrorHandler: ((err: Error) => void | Promise<void>) | null;

  constructor(options: RouteMapOptions = {}) {
    super();

    this.#preHandlers = options.preHandlers ?? [];
    this.#responders = options.responders ?? [];
    this.#trailingSlash = options.trailingSlash ?? ROUTE_MAP_DEFAULT_TRAILING_SLASH;
    this.#basePath = options.basePath ?? ROUTE_MAP_DEFAULT_BASE_PATH;
    this.#applicationErrorHandler = null;
  }

  /**
   * Merges the provided instance of RouteMap with the current instance.
   */

  merge(routes: TuftRouteMap) {
    for (const [key, route] of routes) {
      const [method, path] = key.split(' ');

      // If there is an existing base path and the current path is a lone slash, then it can safely
      // be ignored.
      const isRedundantSlash = this.#basePath.length > 0 && path === '/';

      const mergedKey = method + ' ' + this.#basePath + (isRedundantSlash ? '' : path);

      const mergedRoute: TuftRoute = {
        response: route.response,
      };

      if (this.#preHandlers.length > 0 || route.preHandlers?.length > 0) {
        mergedRoute.preHandlers = this.#preHandlers.concat(route.preHandlers ?? []);
      }

      if (this.#responders.length > 0 || route.responders?.length > 0) {
        mergedRoute.responders = this.#responders.concat(route.responders ?? []);
      }

      // Below, certain properties are inherited from the added route if they exist. Otherwise,
      // the current route map's values are used, unless they are null.

      if (route.trailingSlash !== undefined) {
        mergedRoute.trailingSlash = route.trailingSlash;
      }
      else if (this.#trailingSlash !== null) {
        mergedRoute.trailingSlash = this.#trailingSlash;
      }

      Object.freeze(mergedRoute);

      // Add the merged route to the route map.
      super.set(mergedKey, mergedRoute);
    }

    return this;
  }

  /**
   * Adds the provided response to the route map, indexed by request method and path.
   */

  set(key: string, response: TuftResponse | (() => TuftResponse)) {
    const keyArr = key.split(/[ ]+/);

    let methods, path;

    if (keyArr.length === 1) {
      methods = supportedRequestMethods;
      path = this.#basePath + keyArr[0];
    }

    else {
      methods = keyArr[0].split('|');
      path = this.#basePath + keyArr[1];
    }

    const routeProps: TuftRoute = { response };

    if (this.#preHandlers.length > 0) {
      routeProps.preHandlers = this.#preHandlers;
    }

    if (this.#responders.length > 0) {
      routeProps.responders = this.#responders;
    }

    if (this.#trailingSlash !== null) {
      routeProps.trailingSlash = this.#trailingSlash;
    }

    // Add a copy of the route data for each method.
    for (const method of methods) {
      const key = method + ' ' + path;
      const route = Object.assign({}, routeProps);

      Object.freeze(route);

      super.set(key, route);
    }

    return this;
  }

  redirect(key: string, url: string) {
    this.set(key, {
      response: {
        redirect: url,
      },
    });

    return this;
  }

  onError(callback: (err: Error) => void | Promise<void>) {
    this.#applicationErrorHandler = callback;
    return this;
  }

  /**
   * Creates and returns an instance of TuftServer that utilizes the current route map.
   */

  createServer(options?: ServerOptions) {
    const handler = createPrimaryHandler(this, this.#applicationErrorHandler);
    return new TuftServer(handler, options);
  }

  /**
   * Creates and returns an instance of TuftSecureServer that utilizes the current route map.
   */

  createSecureServer(options?: SecureServerOptions) {
    const handler = createPrimaryHandler(this, this.#applicationErrorHandler);
    return new TuftSecureServer(handler, options);
  }
}

/**
 * Creates and returns a main handler function that has access to an instance of RouteManager.
 */

function createPrimaryHandler(
  routeMap: TuftRouteMap,
  errorHandler: ((err: Error) => void | Promise<void>) | null,
) {
  const routes = new RouteManager(routeMap);
  return primaryHandler.bind(null, routes, errorHandler);
}

/**
 * Determines if there is a matching route for the given request. If there is no matching route, or
 * if the request method is not supported, a response is sent with the appropriate error. If there
 * is a matching route, control of the stream is passed on to the corresponding response handler.
 */

export async function primaryHandler(
  routes: RouteManager,
  errorHandler: ((err: Error) => void | Promise<void>) | null,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders
) {
  try {
    stream.on('error', primaryErrorHandler.bind(null, stream, errorHandler));

    const method = headers[HTTP2_HEADER_METHOD] as string;

    if (!supportedRequestMethods.includes(method)) {
      // The request method is not supported.
      stream.respond({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_IMPLEMENTED,
      }, { endStream: true });

      return;
    }

    const path = headers[HTTP2_HEADER_PATH] as string;
    const queryStringSeparatorIndex = path.indexOf('?');

    // Separate the pathname from the query string, if it exists.
    const pathname = queryStringSeparatorIndex > 0
      ? path.slice(0, queryStringSeparatorIndex)
      : path;

    // Determine if a response handler exists for the given method and pathname.
    const handleResponse = routes.find(method, pathname);

    if (!handleResponse) {
      // There is no response handler for the given route.
      stream.respond({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND,
      }, { endStream: true });

      return;
    }

    // Pass control of the stream on to the response handler.
    await handleResponse(stream, headers);
  }

  catch (err) {
    primaryErrorHandler(stream, errorHandler, err);
  }
}

/**
 * To be called when an error has been thrown that was not caught by a route-level error handler, or
 * when an `error` event is emitted on the HTTP/2 stream. Accepts a user-defined error handler which
 * is passed the error object.
 */

export async function primaryErrorHandler(
  stream: ServerHttp2Stream,
  handleError: ((err: Error) => void | Promise<void>) | null,
  err: Error,
) {
  if (!stream.destroyed) {
    if (!stream.headersSent) {
      // The stream is still active and no headers have been sent.
      stream.respond({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      });
    }

    stream.end();
  }

  // Pass the error object on to the user-defined error handler.
  await handleError?.(err);
}

/**
 * Returns a new instance of TuftRouteMap, created using the provided options.
 */

export function createRouteMap(options?: RouteMapOptions) {
  return new TuftRouteMap(options);
}
