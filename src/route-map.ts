import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { ServerOptions, SecureServerOptions } from './server';
import type { TuftContext } from './context';
import type { HttpError } from './utils';

import { constants } from 'http2';
import { RouteManager } from './route-manager';
import { TuftServer, TuftSecureServer } from './server';
import { findInvalidSchemaEntry } from './schema-validation';
import { getSupportedRequestMethods } from './utils';
import {
  ROUTE_MAP_DEFAULT_TRAILING_SLASH,
  ROUTE_MAP_DEFAULT_BASE_PATH,
  ROUTE_MAP_DEFAULT_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
} from './constants';

type RequestMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE';

export interface TuftHandler {
  (t: TuftContext): TuftResponse | Error | void | Promise<TuftResponse | Error | void>;
}

export interface TuftPluginHandler {
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
  contentType?: string;
  body?: any;
  file?: string;
};

export interface TuftRoute {
  response: TuftHandler | TuftResponse;
  plugins?: TuftPluginHandler[];
  responders?: TuftResponder[],
  params?: { [key: string]: string };
  trailingSlash?: boolean;
}

export interface TuftRouteSchema {
  response: TuftHandler | TuftResponse;
  method?: RequestMethod | RequestMethod[];
  path?: string;
}

type RouteMapOptions = {
  plugins?: TuftPluginHandler[],
  responders?: TuftResponder[],
  basePath?: string,
  method?: RequestMethod | RequestMethod[],
  path?: string,
  trailingSlash?: boolean,
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
  readonly #plugins: TuftPluginHandler[];
  readonly #responders: TuftResponder[];

  // If 'trailingSlash' is true, all paths with a trailing slash will be matched.
  readonly #trailingSlash: boolean | null;

  readonly #basePath: string;     // Prepended to any path added to the route map.
  readonly #methods: string[];    // Default methods.
  readonly #path: string;         // Default path.

  #applicationErrorHandler: ((err: Error) => void | Promise<void>) | null;

  constructor(options: RouteMapOptions = {}) {
    super();

    this.#plugins = options.plugins ?? [];
    this.#responders = options.responders ?? [];
    this.#trailingSlash = options.trailingSlash ?? ROUTE_MAP_DEFAULT_TRAILING_SLASH;
    this.#basePath = options.basePath ?? ROUTE_MAP_DEFAULT_BASE_PATH;
    this.#methods = ([options.method ?? supportedRequestMethods]).flat();
    this.#path = options.path ?? ROUTE_MAP_DEFAULT_PATH;
    this.#applicationErrorHandler = null;
  }

  /**
   * Merges the provided instance of RouteMap with the current instance.
   */

  private _merge(routes: TuftRouteMap) {
    for (const [key, route] of routes) {
      const [method, path] = key.split(' ');

      // If there is an existing base path and the current path is a lone slash, then it can safely
      // be ignored.
      const isRedundantSlash = this.#basePath.length > 0 && path === '/';

      const mergedKey = method + ' ' + this.#basePath + (isRedundantSlash ? '' : path);

      const mergedRoute: TuftRoute = {
        response: route.response,
      };

      if (this.#plugins.length > 0 || route.plugins?.length > 0) {
        mergedRoute.plugins = this.#plugins.concat(route.plugins ?? []);
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
  }

  /**
   * If a route schema is provided, then a new route entry is created and added based on its
   * properties. If another instance of RouteMap is provided, its route entries are merged with the
   * current instance.
   */

  add(schema: TuftRouteSchema | TuftRouteMap) {
    if (schema instanceof TuftRouteMap) {
      this._merge(schema);
      return this;
    }

    const errorMessage = findInvalidSchemaEntry(schema);

    if (errorMessage) {
      // An invalid schema entry was detected, so pipe the relevent error to stderr and exit.
      const err = TypeError(errorMessage);
      console.error(err);
      return process.exit(1);
    }

    const path = this.#basePath + (schema.path ?? this.#path);

    const methods = schema.method ? [schema.method].flat() : this.#methods;

    const routeProps: TuftRoute = {
      response: schema.response,
    };

    if (this.#plugins.length > 0) {
      routeProps.plugins = this.#plugins;
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

  /**
   * An alternative to .add(), where the provided route schema is added to the route map
   * based on the provided string, which should be in the format of '{request method} {path}'.
   */

  set(key: string, route: TuftRouteSchema) {
    const [method, path] = key.split(/[ ]+/);

    const schema = Object.assign(route, {
      method: method === '*' ? supportedRequestMethods : method.split('|'),
      path,
    });

    this.add(schema);

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
