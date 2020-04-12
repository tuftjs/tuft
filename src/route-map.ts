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

const { NGHTTP2_REFUSED_STREAM } = constants;

const validRequestMethods = getValidRequestMethods();

export class RouteMap extends Map {
  readonly #trailingSlash: boolean | null;

  readonly #parseCookies: boolean | null;
  readonly #parseText: boolean | number | null;
  readonly #parseJson: boolean | number | null;
  readonly #parseUrlEncoded: boolean | number | null;
  readonly #errorHandler: TuftErrorHandler | null;

  readonly #basePath: string;
  readonly #path: string;
  readonly #methods: string[];
  readonly #preHandlers: TuftPreHandler[];

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

  private _merge(routes: RouteMap) {
    for (const [key, route] of routes) {
      const [method, path] = key.split(' ');

      const isRedundantSlash = this.#basePath.length > 0 && path === '/';
      const mergedKey = method + ' ' + this.#basePath + (isRedundantSlash ? '' : path);

      const mergedRoute: TuftRoute = {
        preHandlers: this.#preHandlers.concat(route.preHandlers),
        response: route.response,
      };

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

      super.set(mergedKey, mergedRoute);
    }
  }

  add(schema: TuftRouteSchema | RouteMap) {
    if (schema instanceof RouteMap) {
      this._merge(schema);
      return this;
    }

    const errorMessage = findInvalidSchemaEntry(schema);

    if (errorMessage) {
      console.error(TypeError(errorMessage));
      return process.exit(1);
    }

    const path = this.#basePath + (schema.path ?? this.#path);

    const methods = schema.method
      ? [schema.method].flat()
      : this.#methods;

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

    for (const method of methods) {
      const key = method + ' ' + path;
      super.set(key, route);
    }

    return this;
  }

  set(key: string, route: TuftRouteSchema) {
    const [method, path] = key.split(/[ ]+/);

    const schema = Object.assign(route, {
      method: method === '*' ? getValidRequestMethods() : method.split('|'),
      path,
    });

    this.add(schema);

    return this;
  }

  createServer(options?: ServerOptions) {
    const handler = createPrimaryHandler(this);
    return new TuftServer(handler, options);
  }

  createSecureServer(options?: SecureServerOptions) {
    const handler = createPrimaryHandler(this);
    return new TuftSecureServer(handler, options);
  }
}

function createPrimaryHandler(routeMap: RouteMap) {
  const routes = new RouteManager(routeMap);
  return primaryHandler.bind(null, routes);
}

export function primaryHandler(
  routes: RouteManager,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders
) {
  const method = headers[HTTP2_HEADER_METHOD];
  const path = headers[HTTP2_HEADER_PATH];

  if (!method || !path) {
    stream.close(NGHTTP2_REFUSED_STREAM);
    return;
  }

  if (!validRequestMethods.includes(method)) {
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
    stream.close(NGHTTP2_REFUSED_STREAM);
    return;
  }

  routeHandler(stream, headers);
}

export function createRouteMap(options?: RouteMapOptions) {
  return new RouteMap(options);
}
