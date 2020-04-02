import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { promises } from 'fs';
import type { ServerOptions, SecureServerOptions } from './server';
import type { TuftContext } from './context';

import { RouteManager } from './route-manager';
import { TuftServer, TuftSecureServer } from './server';
import { requestMethods, findInvalidSchemaEntry, extractPathnameAndQueryString } from './utils';

export interface TuftHandler {
  (t: TuftContext): TuftResponse | Promise<TuftResponse>;
}

export interface TuftPreHandler {
  (t: TuftContext): void | Promise<void>;
}

export interface TuftErrorHandler {
  (err: Error, t: TuftContext): TuftResponse | Promise<TuftResponse>;
}

export interface TuftStreamHandler {
  (write: (chunk: any, encoding?: string) => Promise<void>): Promise<void>
}

export interface TuftResponse {
  status?: number;
  contentType?: string;
  body?: any;
  stream?: TuftStreamHandler,
  file?: string | promises.FileHandle;
}

export interface TuftRoute {
  trailingSlash?: boolean;
  parseCookies?: boolean;
  parseText?: boolean | number;
  parseJson?: boolean | number;
  parseUrlEncoded?: boolean | number;
  params?: {
    n: number;
    key: string;
  }[];
  preHandlers: TuftPreHandler[];
  response: TuftResponse | TuftHandler;
  errorHandler?: TuftErrorHandler;
}

export interface TuftRouteSchema {
  path?: string;
  method?: string | string[];
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
  method?: string | string[],
  preHandlers?: TuftPreHandler[],
  errorHandler?: TuftErrorHandler,
}

const HTTP2_HEADER_METHOD = ':method';

const DEFAULT_TRAILING_SLASH = null;
const DEFAULT_PARSE_COOKIES = null;
const DEFAULT_PARSE_JSON = null;
const DEFAULT_PARSE_BODY_LIMIT = 10_485_760; //bytes
const DEFAULT_BASE_PATH = '';
const DEFAULT_PATH = '/';
const DEFAULT_ERROR_HANDLER = null;

class RouteMap extends Map {
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

    this.#trailingSlash = options.trailingSlash ?? DEFAULT_TRAILING_SLASH;
    this.#parseCookies = options.parseCookies ?? DEFAULT_PARSE_COOKIES;
    this.#basePath = options.basePath ?? DEFAULT_BASE_PATH;
    this.#path = options.path ?? DEFAULT_PATH;
    this.#methods = ([options.method ?? requestMethods]).flat();
    this.#preHandlers = options.preHandlers ?? [];
    this.#errorHandler = options.errorHandler ?? DEFAULT_ERROR_HANDLER;


    if (options.parseText === true) {
      this.#parseText = DEFAULT_PARSE_BODY_LIMIT;
    }

    else if (options.parseText === false) {
      this.#parseText = false;
    }

    else if (typeof options.parseText === 'number') {
      this.#parseText = options.parseText;
    }

    else {
      this.#parseText = DEFAULT_PARSE_JSON;
    }



    if (options.parseJson === true) {
      this.#parseJson = DEFAULT_PARSE_BODY_LIMIT;
    }

    else if (options.parseJson === false) {
      this.#parseJson = false;
    }

    else if (typeof options.parseJson === 'number') {
      this.#parseJson = options.parseJson;
    }

    else {
      this.#parseJson = DEFAULT_PARSE_JSON;
    }



    if (options.parseUrlEncoded === true) {
      this.#parseUrlEncoded = DEFAULT_PARSE_BODY_LIMIT;
    }

    else if (options.parseUrlEncoded === false) {
      this.#parseUrlEncoded = false;
    }

    else if (typeof options.parseUrlEncoded === 'number') {
      this.#parseUrlEncoded = options.parseUrlEncoded;
    }

    else {
      this.#parseUrlEncoded = DEFAULT_PARSE_JSON;
    }
  }

  private _merge(APP_NAME_INSTANCE: RouteMap) {
    for (const [key, routeProps] of APP_NAME_INSTANCE) {
      let [method, path] = key.split(' ');

      if (path === '/') {
        path = '';
      }

      const newPath = this.#basePath + path;

      const route: TuftRoute = {
        preHandlers: this.#preHandlers.concat(routeProps.preHandlers ?? []),
        response: routeProps.response,
      };

      if (routeProps.errorHandler) {
        route.errorHandler = routeProps.errorHandler;
      }

      else if (this.#errorHandler) {
        route.errorHandler = this.#errorHandler;
      }

      if (routeProps.trailingSlash !== undefined) {
        route.trailingSlash = routeProps.trailingSlash;
      }

      else if (this.#trailingSlash !== null) {
        route.trailingSlash = this.#trailingSlash;
      }

      if (routeProps.parseCookies !== undefined) {
        route.parseCookies = routeProps.parseCookies;
      }

      else if (this.#parseCookies !== null) {
        route.parseCookies = this.#parseCookies;
      }

      if (routeProps.parseText !== undefined) {
        route.parseText = routeProps.parseText;
      }

      else if (this.#parseText !== null) {
        route.parseText = this.#parseText;
      }

      if (routeProps.parseJson !== undefined) {
        route.parseJson = routeProps.parseJson;
      }

      else if (this.#parseJson !== null) {
        route.parseJson = this.#parseJson;
      }

      if (routeProps.parseUrlEncoded !== undefined) {
        route.parseUrlEncoded = routeProps.parseUrlEncoded;
      }

      else if (this.#parseUrlEncoded !== null) {
        route.parseUrlEncoded = this.#parseUrlEncoded;
      }

      const newKey = `${method} ${newPath}`;

      super.set(newKey, route);
    }
  }

  add(schema: TuftRouteSchema | RouteMap) {
    if (schema instanceof RouteMap) {
      this._merge(schema);
      return this;
    }

    const errorMessage = findInvalidSchemaEntry(schema);

    if (errorMessage) {
      const err = Error(errorMessage);
      console.error(err);
      process.exit(1);
    }

    const thisPath = schema.path ?? this.#path;

    const path = this.#basePath + (thisPath === '/' ? '' : thisPath);

    const methods = schema.method
      ? [schema.method].flat()
      : this.#methods;

    const preHandlers = schema.preHandlers
      ? this.#preHandlers.concat(([schema.preHandlers ?? []]).flat())
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
      const key = `${method} ${path}`;
      super.set(key, route);
    }

    return this;
  }

  set(key: string, route: TuftRouteSchema) {
    const [method, path] = key.split(/[ ]+/);

    const schema = Object.assign(route, {
      method: method === '*' ? requestMethods : method.split('|'),
      path,
    });

    this.add(schema);

    return this;
  }

  createServer(options: ServerOptions) {
    const handler = createPrimaryHandler(this);
    return new TuftServer(handler, options);
  }

  createSecureServer(options: SecureServerOptions) {
    const handler = createPrimaryHandler(this);
    return new TuftSecureServer(handler, options);
  }
}

function createPrimaryHandler(routeMap: RouteMap) {
  const routes = new RouteManager(routeMap);

  return function primaryHandler(stream: ServerHttp2Stream, headers: IncomingHttpHeaders) {
    const method = headers[HTTP2_HEADER_METHOD] as string;
    const pathname = extractPathnameAndQueryString(headers).pathname as string;
    const routeHandler = routes.find(method, pathname);
    routeHandler?.(stream, headers);
  };
}

export function createRouteMap(options?: RouteMapOptions) {
  return new RouteMap(options);
}

export type { RouteMap };
