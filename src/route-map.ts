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
  (t: TuftContext): any | Promise<any>;
  extName?: string;
}

export interface TuftErrorHandler {
  (err: Error, t: TuftContext): TuftResponse | null | Promise<TuftResponse | null>;
}

export interface TuftStreamHandler {
  (write: (chunk: any, encoding?: string) => Promise<void>): Promise<void>
}

export interface TuftResponse {
  status?: number;
  redirect?: string;
  contentType?: string;
  body?: any;
  stream?: TuftStreamHandler,
  file?: string;
}

export interface TuftRoute {
  response: TuftResponse | TuftHandler;
  preHandlers: TuftPreHandler[];
  errorHandler?: TuftErrorHandler;
  params?: { [key: string]: string };
  trailingSlash?: boolean;
}

type RequestMethod =
  'CONNECT' | 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE';

export interface TuftRouteSchema {
  path?: string;
  method?: RequestMethod | RequestMethod[];
  contentType?: string;
  response: TuftResponse | TuftHandler;
  errorHandler?: TuftErrorHandler;
}

type RouteMapOptions = {
  errorHandler?: TuftErrorHandler,
  basePath?: string,
  method?: RequestMethod | RequestMethod[],
  path?: string,
  trailingSlash?: boolean,
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

  readonly #errorHandler: TuftErrorHandler | null;

  readonly #basePath: string;               // Prepended to any path added to the route map.
  readonly #methods: string[];              // Default methods.
  readonly #path: string;                   // Default path.
  readonly #preHandlers: TuftPreHandler[];  // Default pre-handlers.

  constructor(options: RouteMapOptions = {}) {
    super();

    this.#trailingSlash = options.trailingSlash ?? ROUTE_MAP_DEFAULT_TRAILING_SLASH;
    this.#basePath = options.basePath ?? ROUTE_MAP_DEFAULT_BASE_PATH;
    this.#path = options.path ?? ROUTE_MAP_DEFAULT_PATH;
    this.#methods = ([options.method ?? getValidRequestMethods()]).flat();
    this.#preHandlers = [];
    this.#errorHandler = options.errorHandler ?? ROUTE_MAP_DEFAULT_ERROR_HANDLER;
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

    const preHandlers = this.#preHandlers;

    const routeProps: TuftRoute = {
      preHandlers,
      response: schema.response,
    };

    if (schema.errorHandler) {
      routeProps.errorHandler = schema.errorHandler;
    }
    else if (this.#errorHandler) {
      routeProps.errorHandler = this.#errorHandler;
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

  redirect(key: string, url: string) {
    this.set(key, {
      response: {
        redirect: url,
      },
    });
  }

  extend(name: string, preHandler: TuftPreHandler) {
    preHandler.extName = name;
    this.#preHandlers.push(preHandler);
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
    // The request method is not supported.
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
    // There is no matching route.
    stream.close(NGHTTP2_NO_ERROR);
    return;
  }

  // plugins go here?

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
