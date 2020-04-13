import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { ServerOptions, SecureServerOptions } from './server';
import type { TuftContext } from './context';

import { constants } from 'http2';
import { RouteManager } from './route-manager';
import { TuftServer, TuftSecureServer } from './server';
import { findInvalidSchemaEntry } from './schema-validation';
import { getValidRequestMethods } from './utils';
import {
  ROUTE_MAP_DEFAULT_TRAILING_SLASH,
  ROUTE_MAP_DEFAULT_PARSE_COOKIES,
  ROUTE_MAP_DEFAULT_PARSE_JSON,
  ROUTE_MAP_DEFAULT_PARSE_BODY_LIMIT,
  ROUTE_MAP_DEFAULT_BASE_PATH,
  ROUTE_MAP_DEFAULT_PATH,
  ROUTE_MAP_DEFAULT_ERROR_HANDLER,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP_STATUS_METHOD_NOT_ALLOWED,
} from './constants';

export interface TuftHandler {
  (t: TuftContext): TuftResponse | null | Promise<TuftResponse | null>;
}

export interface TuftPreHandler {
  (t: TuftContext): void | Promise<void>;
}

export interface TuftErrorHandler {
  (err: Error, t: TuftContext): TuftResponse | null | Promise<TuftResponse | null>;
}

export interface TuftStreamHandler {
  (write: (chunk: any, encoding?: string) => Promise<void>): Promise<void>
}

export interface TuftResponse {
  status?: number;
  contentType?: string;
  body?: any;
  stream?: TuftStreamHandler,
  file?: string;
}

export interface TuftRoute {
  trailingSlash?: boolean;
  parseCookies?: boolean;
  parseText?: boolean | number;
  parseJson?: boolean | number;
  parseUrlEncoded?: boolean | number;
  params?: { [key: string]: string };
  preHandlers: TuftPreHandler[];
  response: TuftResponse | TuftHandler;
  errorHandler?: TuftErrorHandler;
}

type RequestMethod =
  'CONNECT' | 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE';

export interface TuftRouteSchema {
  path?: string;
  method?: RequestMethod | RequestMethod[];
  contentType?: string;
  preHandlers?: TuftPreHandler[];
  response: TuftResponse | TuftHandler;
  errorHandler?: TuftErrorHandler;
}

type RouteMapOptions = {
  trailingSlash?: boolean,
  parseCookies?: boolean,
  parseText?: boolean | number,
  parseJson?: boolean | number,
  parseUrlEncoded?: boolean | number,
  basePath?: string,
  path?: string,
  method?: RequestMethod | RequestMethod[],
  preHandlers?: TuftPreHandler[],
  errorHandler?: TuftErrorHandler,
}

const { NGHTTP2_NO_ERROR } = constants;

const validRequestMethods = getValidRequestMethods();

/**
 * Stores route data indexed by method and path. Instances of RouteMap can be added to other route
 * maps, which results in entries being merged and traits from the parent route map being inherited.
 * The createServer() and createSecureServer() methods can then be used to create a server that
 * utilizes the routes currently present in the route map.
 */

export class RouteMap extends Map {
  // If 'trailingSlash' is true, all paths with a trailing slash will be matched.
  readonly #trailingSlash: boolean | null;

  readonly #parseCookies: boolean | null;
  readonly #parseText: boolean | number | null;
  readonly #parseJson: boolean | number | null;
  readonly #parseUrlEncoded: boolean | number | null;
  readonly #errorHandler: TuftErrorHandler | null;

  readonly #basePath: string;               // Prepended to any path added to the route map.
  readonly #path: string;                   // Default path.
  readonly #methods: string[];              // Default methods.
  readonly #preHandlers: TuftPreHandler[];  // Default pre-handlers.

  constructor(options: RouteMapOptions = {}) {
    super();

    this.#trailingSlash = options.trailingSlash ?? ROUTE_MAP_DEFAULT_TRAILING_SLASH;
    this.#parseCookies = options.parseCookies ?? ROUTE_MAP_DEFAULT_PARSE_COOKIES;
    this.#basePath = options.basePath ?? ROUTE_MAP_DEFAULT_BASE_PATH;
    this.#path = options.path ?? ROUTE_MAP_DEFAULT_PATH;
    this.#methods = ([options.method ?? getValidRequestMethods()]).flat();
    this.#preHandlers = options.preHandlers ?? [];
    this.#errorHandler = options.errorHandler ?? ROUTE_MAP_DEFAULT_ERROR_HANDLER;

    // Determine the value of 'parseText'
    if (options.parseText === true) {
      this.#parseText = ROUTE_MAP_DEFAULT_PARSE_BODY_LIMIT;
    }
    else if (options.parseText === false) {
      this.#parseText = false;
    }
    else if (typeof options.parseText === 'number') {
      this.#parseText = options.parseText;
    }
    else {
      this.#parseText = ROUTE_MAP_DEFAULT_PARSE_JSON;
    }

    // Determine the value of 'parseJson'
    if (options.parseJson === true) {
      this.#parseJson = ROUTE_MAP_DEFAULT_PARSE_BODY_LIMIT;
    }
    else if (options.parseJson === false) {
      this.#parseJson = false;
    }
    else if (typeof options.parseJson === 'number') {
      this.#parseJson = options.parseJson;
    }
    else {
      this.#parseJson = ROUTE_MAP_DEFAULT_PARSE_JSON;
    }

    // Determine the value of 'parseUrlEncoded'
    if (options.parseUrlEncoded === true) {
      this.#parseUrlEncoded = ROUTE_MAP_DEFAULT_PARSE_BODY_LIMIT;
    }
    else if (options.parseUrlEncoded === false) {
      this.#parseUrlEncoded = false;
    }
    else if (typeof options.parseUrlEncoded === 'number') {
      this.#parseUrlEncoded = options.parseUrlEncoded;
    }
    else {
      this.#parseUrlEncoded = ROUTE_MAP_DEFAULT_PARSE_JSON;
    }
  }

  /**
   * Merges the provided instance of RouteMap with the current instance.
   */

  private _merge(routes: RouteMap) {
    for (const [key, route] of routes) {
      const [method, path] = key.split(' ');

      // If there is an existing base path and the current path is a lone slash, then it can safely
      // be ignored.
      const isRedundantSlash = this.#basePath.length > 0 && path === '/';

      const mergedKey = method + ' ' + this.#basePath + (isRedundantSlash ? '' : path);

      const mergedRoute: TuftRoute = {
        preHandlers: this.#preHandlers.concat(route.preHandlers),
        response: route.response,
      };

      // Below, certain properties are inherited from the added route if they exist. Otherwise,
      // the current route map's values are used, unless they are null.

      if (route.errorHandler !== undefined) {
        mergedRoute.errorHandler = route.errorHandler;
      }
      else if (this.#errorHandler !== null) {
        mergedRoute.errorHandler = this.#errorHandler;
      }

      if (route.trailingSlash !== undefined) {
        mergedRoute.trailingSlash = route.trailingSlash;
      }
      else if (this.#trailingSlash !== null) {
        mergedRoute.trailingSlash = this.#trailingSlash;
      }

      if (route.parseCookies !== undefined) {
        mergedRoute.parseCookies = route.parseCookies;
      }
      else if (this.#parseCookies !== null) {
        mergedRoute.parseCookies = this.#parseCookies;
      }

      if (route.parseText !== undefined) {
        mergedRoute.parseText = route.parseText;
      }
      else if (this.#parseText !== null) {
        mergedRoute.parseText = this.#parseText;
      }

      if (route.parseJson !== undefined) {
        mergedRoute.parseJson = route.parseJson;
      }
      else if (this.#parseJson !== null) {
        mergedRoute.parseJson = this.#parseJson;
      }

      if (route.parseUrlEncoded !== undefined) {
        mergedRoute.parseUrlEncoded = route.parseUrlEncoded;
      }
      else if (this.#parseUrlEncoded !== null) {
        mergedRoute.parseUrlEncoded = this.#parseUrlEncoded;
      }

      // Add the merged route to the route map.
      super.set(mergedKey, mergedRoute);
    }
  }

  /**
   * If a route schema is provided, then a new route entry is created and added based on its
   * properties. If another instance of RouteMap is provided, its route entries are merged with the
   * current instance.
   */

  add(schema: TuftRouteSchema | RouteMap) {
    if (schema instanceof RouteMap) {
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

    const preHandlers = schema.preHandlers
      ? this.#preHandlers.concat([schema.preHandlers].flat())
      : this.#preHandlers;

    const route: TuftRoute = {
      preHandlers,
      response: schema.response,
    };

    if (schema.errorHandler) {
      route.errorHandler = schema.errorHandler;
    }
    else if (this.#errorHandler) {
      route.errorHandler = this.#errorHandler;
    }

    if (this.#trailingSlash !== null) {
      route.trailingSlash = this.#trailingSlash;
    }

    if (this.#parseCookies !== null) {
      route.parseCookies = this.#parseCookies;
    }

    if (this.#parseText !== null) {
      route.parseText = this.#parseText;
    }

    if (this.#parseJson !== null) {
      route.parseJson = this.#parseJson;
    }

    if (this.#parseUrlEncoded !== null) {
      route.parseUrlEncoded = this.#parseUrlEncoded;
    }

    // Add a copy of the route data for each method.
    for (const method of methods) {
      const key = method + ' ' + path;
      super.set(key, route);
    }

    return this;
  }

  /**
   * An alternative method to .add(), where the provided route schema is added to the route map
   * based on the provided string, which should be in the format of '{request method} {path}'.
   */

  set(key: string, route: TuftRouteSchema) {
    const [method, path] = key.split(/[ ]+/);

    const schema = Object.assign(route, {
      method: method === '*' ? getValidRequestMethods() : method.split('|'),
      path,
    });

    this.add(schema);

    return this;
  }

  /**
   * Create and return an instance of TuftServer that utilizes the current route map.
   */

  createServer(options?: ServerOptions) {
    const handler = createPrimaryHandler(this);
    return new TuftServer(handler, options);
  }

  /**
   * Create and return an instance of TuftSecureServer that utilizes the current route map.
   */

  createSecureServer(options?: SecureServerOptions) {
    const handler = createPrimaryHandler(this);
    return new TuftSecureServer(handler, options);
  }
}

/**
 * Create and return a main handler function that has access to an instance of RouteManager, which
 * in turn contains all the route handlers for the application.
 */

function createPrimaryHandler(routeMap: RouteMap) {
  const routes = new RouteManager(routeMap);
  return primaryHandler.bind(null, routes);
}

/**
 * primaryHandler() is the solitary function that gets added as a listener to the 'stream' event in
 * the underlying HTTP/2 server. It serves to determine if there is a matching route, and then pass
 * any further operations on to the route handler that exists for that route.
 */

export function primaryHandler(
  routes: RouteManager,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders
) {
  stream.on('error', logStreamError);

  const method = headers[HTTP2_HEADER_METHOD] as string;
  const path = headers[HTTP2_HEADER_PATH] as string;

  if (!validRequestMethods.includes(method)) {
    // The request method is not supported, respond with HTTP status code 405.
    stream.respond({
      [HTTP2_HEADER_STATUS]: HTTP_STATUS_METHOD_NOT_ALLOWED,
    }, { endStream: true });

    return;
  }

  const queryStringSeparatorIndex = path.indexOf('?');

  const pathname = queryStringSeparatorIndex > 0
    ? path.slice(0, queryStringSeparatorIndex)
    : path;

  const routeHandler = routes.find(method, pathname);

  if (!routeHandler) {
    // There is no matching route, close the stream.
    stream.close(NGHTTP2_NO_ERROR);
    return;
  }

  routeHandler(stream, headers);
}

export function logStreamError(err: Error) {
  console.error(err);
}

/**
 * Create and return a new instance of RouteMap with the provided options.
 */

export function createRouteMap(options?: RouteMapOptions) {
  return new RouteMap(options);
}
