import type { ServerOptions, SecureServerOptions } from './server';
import type { TuftContext } from './context';
import type { HttpError } from './utils';
import type { IncomingMessage, ServerResponse } from 'http';

import { RouteManager } from './route-manager';
import { TuftServer, TuftSecureServer } from './server';
import { supportedRequestMethods } from './utils';
import {
  HTTP_HEADER_ACCEPT_RANGES,
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_LAST_MODIFIED,
  HTTP_HEADER_CONTENT_RANGE,
  HTTP_HEADER_CONTENT_LENGTH,
  HTTP_HEADER_X_FORWARDED_FOR,
  HTTP_HEADER_X_FORWARDED_PORT,
  HTTP_HEADER_X_FORWARDED_PROTO,
  HTTP_HEADER_ACC_CTRL_ALLOW_ORIGIN,
  HTTP_HEADER_ACC_CTRL_ALLOW_METHODS,
  HTTP_HEADER_ACC_CTRL_ALLOW_HEADERS,
  HTTP_HEADER_ACC_CTRL_MAX_AGE,
  HTTP_HEADER_ACC_CTRL_ALLOW_CREDENTIALS,
  HTTP_HEADER_ACC_CTRL_EXPOSE_HEADERS,
  HTTP_HEADER_ACC_CTRL_REQUEST_METHOD,
  HTTP_HEADER_ACC_CTRL_REQUEST_HEADERS,
  HTTP_STATUS_OK,
  HTTP_STATUS_NO_CONTENT,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_IMPLEMENTED,
  HTTP_STATUS_PARTIAL_CONTENT,
  ROUTE_MAP_DEFAULT_TRAILING_SLASH,
  ROUTE_MAP_DEFAULT_BASE_PATH,
  ROUTE_MAP_DEFAULT_TRUST_PROXY,
  ROUTE_MAP_DEFAULT_CORS,
  HTTP_METHOD_DELETE,
  HTTP_METHOD_GET,
  HTTP_METHOD_HEAD,
  HTTP_METHOD_PATCH,
  HTTP_METHOD_POST,
  HTTP_METHOD_PUT,
  HTTP_STATUS_BAD_REQUEST,
} from './constants';
import importedMimeTypes from './data/mime-types.json';
import { promises as fsPromises } from 'fs';
import { extname, basename, relative, dirname, resolve, isAbsolute } from 'path';
import { STATUS_CODES } from 'http';

export interface TuftHandler {
  (t: TuftContext): TuftResponse | Promise<TuftResponse>;
}

export interface TuftPrehandler {
  (t: TuftContext): TuftResponse | void | Promise<TuftResponse | void>;
}

export interface TuftResponder {
  (
    tuftResponse: TuftResponse,
    response: ServerResponse,
  ): TuftResponse | null | void | Promise<TuftResponse | null | void>;
}

export interface TuftResponse {
  error?: HttpError;
  status?: number;
  redirect?: string;
  raw?: Buffer;
  text?: string | number | boolean;
  html?: string;
  json?: string | object;
  file?: string;
  [key: string]: any;
}

export interface TuftRoute {
  response: TuftHandler | TuftResponse;
  prehandlers?: TuftPrehandler[];
  responders?: TuftResponder[];
  params?: { [key: string]: string };
  trailingSlash?: boolean;
}

export type RouteMapOptions = {
  prehandlers?: TuftPrehandler[];
  /**
   * @deprecated Equivalent to 'prehandlers', may be removed in a future major release.
   */
  preHandlers?: TuftPrehandler[];
  responders?: TuftResponder[];
  basePath?: string;
  trailingSlash?: boolean;
  trustProxy?: boolean;
  cors?: boolean | CorsOptions;
}

export type CorsOptions = {
  allowOrigin?: string | string[];
  allowMethods?: string | string[],
  allowHeaders?: string[],
  allowCredentials?: true,
  exposeHeaders?: string | string[],
  maxAge?: number,
}

const mimeTypes: { [key: string]: string } = importedMimeTypes;

const defaultCorsOptions = {
  allowOrigin: '*',
  allowMethods: [
    HTTP_METHOD_DELETE,
    HTTP_METHOD_GET,
    HTTP_METHOD_HEAD,
    HTTP_METHOD_PATCH,
    HTTP_METHOD_POST,
    HTTP_METHOD_PUT,
  ],
  allowHeaders: undefined,
  allowCredentials: undefined,
  exposeHeaders: undefined,
  maxAge: undefined,
};

/**
 * Stores route data indexed by method and path. Instances of TuftRouteMap can be merged with other
 * route maps, which results in traits from the parent route map being inherited.
 */

export class TuftRouteMap extends Map {
  readonly #prehandlers: TuftPrehandler[];
  readonly #responders: TuftResponder[];
  readonly #trailingSlash: boolean | null;  // Match paths with a trailing slash.
  readonly #basePath: string;               // Prepend to route path.
  readonly #trustProxy: boolean;
  readonly #corsPreflightHandler: TuftResponse | null;
  #applicationErrorHandler: ((err: unknown) => void | Promise<void>) | null;

  constructor(options: RouteMapOptions = {}) {
    super();

    // 'preHandlers' (with an uppercase 'H') is supported as a legacy option, but
    // 'prehandlers' (all lowercase) takes precedence.
    this.#prehandlers = options.prehandlers ?? options.preHandlers ?? [];
    this.#responders = options.responders ?? [];
    this.#trailingSlash = options.trailingSlash ?? ROUTE_MAP_DEFAULT_TRAILING_SLASH;
    this.#basePath = options.basePath ?? ROUTE_MAP_DEFAULT_BASE_PATH;
    this.#trustProxy = options.trustProxy ?? ROUTE_MAP_DEFAULT_TRUST_PROXY;
    this.#corsPreflightHandler = null;
    this.#applicationErrorHandler = null;

    const corsOptions = options.cors ?? ROUTE_MAP_DEFAULT_CORS;
    const cors = corsOptions === true ? defaultCorsOptions : corsOptions;

    if (cors !== false) {
      // CORS is to be enabled for all routes.
      const allowOrigin = cors.allowOrigin ?? defaultCorsOptions.allowOrigin;
      const exposeHeaders = cors.exposeHeaders
        ? [cors.exposeHeaders].flat().join(', ')
        : null;
      const corsPreHandler = handleCorsOrigin.bind(null, allowOrigin, exposeHeaders);
      this.#prehandlers.push(corsPreHandler);

      const headerProps: { [key: string]: any } = {};

      headerProps.methods = cors.allowMethods
        ? [cors.allowMethods].flat().join(', ')
        : defaultCorsOptions.allowMethods.join(', ');

      if (typeof cors.allowHeaders === 'string' || Array.isArray(cors.allowHeaders)) {
        headerProps.headers = [cors.allowHeaders].flat().join(', ');
      }

      if (cors.allowCredentials === true) {
        headerProps.credentials = 'true';
      }

      if (typeof cors.maxAge === 'number') {
        headerProps.maxAge = cors.maxAge.toString();
      }

      const corsPreflightHandler = handleCorsPreflight.bind(null, headerProps);
      this.#corsPreflightHandler = corsPreflightHandler;
    }
  }

  get trustProxy() {
    return this.#trustProxy;
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

      if (this.#prehandlers.length > 0 || route.prehandlers?.length > 0) {
        mergedRoute.prehandlers = this.#prehandlers.concat(route.prehandlers ?? []);
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

  set(key: string, response: TuftResponse | TuftHandler) {
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

    if (this.#corsPreflightHandler) {
      // This is a CORS-enabled route.
      const key = `OPTIONS ${path}`;
      const route = {
        trailingSlash: this.#trailingSlash,
        prehandlers: this.#prehandlers,
        response: this.#corsPreflightHandler,
      };

      super.set(key, route);
    }

    const routeProps: TuftRoute = { response };

    if (this.#prehandlers.length > 0) {
      routeProps.prehandlers = this.#prehandlers;
    }

    if (this.#responders.length > 0) {
      routeProps.responders = this.#responders;
    }

    if (this.#trailingSlash !== null) {
      routeProps.trailingSlash = this.#trailingSlash;
    }

    // Add a copy of the route data for each method.
    for (const method of methods) {
      const key = `${method} ${path}`;
      const route = Object.assign({}, routeProps);

      Object.freeze(route);

      super.set(key, route);
    }

    return this;
  }

  /**
   * Adds a route that redirects requests for route 'key' to 'url', where 'url' is a relative path
   * or absolute URI.
   */

  redirect(key: string, url: string) {
    this.set(key, { redirect: url });
    return this;
  }

  /**
   * Adds a route that serves static files. If the 'path' parameter is set to a directory, then all
   * files in that directory plus all subdirectories will be served. If set to a file, only that
   * will be served.
   */

  async static(key: string, path: string) {
    if (!key.startsWith('/')) {
      const err = TypeError('The first argument of .static() must be a plain route path.');
      console.error(err);
      return process.exit(1);
    }

    if (key.endsWith('/')) {
      key = key.slice(0, key.length - 1);
    }

    if (!isAbsolute(path)) {
      path = resolve(path);
    }

    let rootDir: string, pathnames: string[];

    try {
      const stats = await fsPromises.stat(path);
      rootDir = stats.isDirectory() ? path : dirname(path);
      pathnames = await getFilePaths(path);
    }

    catch (err) {
      console.error(err);
      return process.exit(1);
    }

    for (const pathname of pathnames) {
      let urlPath = relative(rootDir, pathname);

      this.set(`GET ${key + '/' + urlPath}`, handleStaticFileGetRequest.bind(null, pathname));
      this.set(`HEAD ${key + '/' + urlPath}`, handleStaticFileHeadRequest.bind(null, pathname));

      if (/^index\.html?$/.test(basename(pathname))) {
        urlPath = dirname(urlPath);

        let routePath = key + (urlPath === '.' ? '' : '/' + urlPath);

        if (routePath.length === 0) {
          routePath = '/';
        }

        this.set(`GET ${routePath}`, handleStaticFileGetRequest.bind(null, pathname));
        this.set(`HEAD ${routePath}`, handleStaticFileHeadRequest.bind(null, pathname));
      }
    }

    return this;
  }

  /**
   * Adds an error listener to handle errors that are thrown in the application.
   */

  onError(callback: (err: unknown) => void | Promise<void>) {
    this.#applicationErrorHandler = callback;
    return this;
  }

  /**
   * Returns an instance of TuftServer that utilizes the current route map.
   */

  createServer(options?: ServerOptions) {
    const handler = createPrimaryHandler(this, this.#applicationErrorHandler);
    return new TuftServer(handler, options);
  }

  /**
   * Returns an instance of TuftSecureServer that utilizes the current route map.
   */

  createSecureServer(options?: SecureServerOptions) {
    const handler = createPrimaryHandler(this, this.#applicationErrorHandler);
    return new TuftSecureServer(handler, options);
  }
}

/**
 * A Tuft prehandler function for setting the 'Access-Control-Allow-Origin' response header.
 */

export function handleCorsOrigin(
  origin: string | string[],
  headers: string | null,
  t: TuftContext,
) {
  if (headers !== null) {
    t.setHeader(HTTP_HEADER_ACC_CTRL_EXPOSE_HEADERS, headers);
  }

  if (typeof origin === 'string') {
    // Only a single allowed origin string has been provided.
    t.setHeader(HTTP_HEADER_ACC_CTRL_ALLOW_ORIGIN, origin);
    return;
  }

  // Multiple allowed origins have been provided.
  const clientOrigin = t.request.protocol + '://' + t.request.headers.host as string;

  if (origin.includes(clientOrigin)) {
    // The request's origin matches one of the allowed origins.
    t.setHeader(HTTP_HEADER_ACC_CTRL_ALLOW_ORIGIN, clientOrigin);
  }
}

/**
 * A Tuft response handler for responding to CORS preflight requests.
 */

export function handleCorsPreflight(headers: { [header: string]: string }, t: TuftContext) {
  const preflightRequestMethod = t.request.headers[HTTP_HEADER_ACC_CTRL_REQUEST_METHOD];
  const preflightRequestHeaders = t.request.headers[HTTP_HEADER_ACC_CTRL_REQUEST_HEADERS];

  if (preflightRequestMethod === undefined || preflightRequestHeaders === undefined) {
    // One or both of the required headers for a preflight request are missing.
    return {
      status: HTTP_STATUS_BAD_REQUEST,
      text: STATUS_CODES[HTTP_STATUS_BAD_REQUEST],
    };
  }

  t
    .setHeader(HTTP_HEADER_ACC_CTRL_ALLOW_METHODS, headers.methods)
    .setHeader(HTTP_HEADER_ACC_CTRL_ALLOW_HEADERS, headers.headers ?? preflightRequestHeaders)
    .setHeader(HTTP_HEADER_CONTENT_LENGTH, '0');

  if (headers.credentials !== undefined) {
    t.setHeader(HTTP_HEADER_ACC_CTRL_ALLOW_CREDENTIALS, headers.credentials);
  }

  if (headers.maxAge !== undefined) {
    t.setHeader(HTTP_HEADER_ACC_CTRL_MAX_AGE, headers.maxAge);
  }

  // Once all the necessary headers are set, respond with `204 No Content`.
  return { status: HTTP_STATUS_NO_CONTENT };
}

/**
 * Returns a file response object created based on the provided path.
 */

export async function handleStaticFileGetRequest(path: string, t: TuftContext) {
  return await createStaticFileResponseObject(t, path);
}

/**
 * Returns a file response object, with a status property only, created based on the provided path.
 */

export async function handleStaticFileHeadRequest(path: string, t: TuftContext) {
  const { status } = await createStaticFileResponseObject(t, path);
  return { status };
}

/**
 * If passed an absolute directory path, returns an array containing the absolute paths of all files
 * in that directory, plus all subdirectories. If passed an absolute file path, returns an array
 * containing that path.
 */

export async function getFilePaths(path: string) {
  const result: string[] = [];

  const stats = await fsPromises.stat(path);

  if (stats.isFile()) {
    result.push(path);
  }

  else {
    const dir = await fsPromises.opendir(path);

    for await (const dirent of dir) {
      const paths = await getFilePaths(path + '/' + dirent.name);
      result.push(...paths);
    }
  }

  return result;
}

/**
 * Returns a response object for the provided file.
 */

export async function createStaticFileResponseObject(
  t: TuftContext,
  file: string,
): Promise<TuftResponse> {
  const { range } = t.request.headers;
  const { size, mtime } = await fsPromises.stat(file);

  const contentType = mimeTypes[extname(file)] ?? 'application/octet-stream';

  t
    .setHeader(HTTP_HEADER_ACCEPT_RANGES, 'bytes')
    .setHeader(HTTP_HEADER_CONTENT_TYPE, contentType)
    .setHeader(HTTP_HEADER_LAST_MODIFIED, mtime.toUTCString());

  if (range) {
    const status = HTTP_STATUS_PARTIAL_CONTENT;

    const i = range.indexOf('=') + 1;
    const i2 = range.indexOf('-');
    const j = i2 + 1;

    const offset = parseInt(range.slice(i, i2), 10);
    const end = range.slice(j) ? parseInt(range.slice(j), 10) : size - 1;

    if (end >= size) {
      t.setHeader(HTTP_HEADER_CONTENT_RANGE, 'bytes */' + size);

      return {
        error: 'RANGE_NOT_SATISFIABLE',
      };
    }

    const length = end - offset + 1;

    t
      .setHeader(HTTP_HEADER_CONTENT_RANGE, 'bytes ' + offset + '-' + end + '/' + size)
      .setHeader(HTTP_HEADER_CONTENT_LENGTH, length);

    return {
      status,
      file,
      offset,
      length,
    };
  }

  else {
    const status = HTTP_STATUS_OK;

    t.setHeader(HTTP_HEADER_CONTENT_LENGTH, size);

    return {
      status,
      file,
    };
  }
}

/**
 * Returns a main handler function that has access to an instance of RouteManager.
 */

function createPrimaryHandler(
  routeMap: TuftRouteMap,
  errorHandler: ((err: unknown) => void | Promise<void>) | null,
) {
  const routes = new RouteManager(routeMap);
  return primaryHandler.bind(null, routeMap.trustProxy, routes, errorHandler);
}

/**
 * Determines if there is a matching route for the given request. If there is no matching route, or
 * if the request method is not supported, a response is sent with the appropriate HTTP error. If
 * there is a matching route, control of the stream is passed to the corresponding response handler.
 */

export function primaryHandler(
  trustProxy: boolean,
  routes: RouteManager,
  errorHandler: ((err: unknown) => void | Promise<void>) | null,
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const handleError = (err: unknown) => {
      primaryErrorHandler(response, errorHandler, err);
    };

    request.on('error', handleError);
    response.on('error', handleError);

    if (!trustProxy) {
      // Remove the untrusted proxy headers.
      request.headers[HTTP_HEADER_X_FORWARDED_FOR] = undefined;
      request.headers[HTTP_HEADER_X_FORWARDED_PORT] = undefined;
      request.headers[HTTP_HEADER_X_FORWARDED_PROTO] = undefined;
    }

    const method = request.method as string;

    if (!supportedRequestMethods.includes(method)) {
      // The request method is not supported.
      response.statusCode = HTTP_STATUS_NOT_IMPLEMENTED;
      response.end();
      return;
    }

    const path = request.url as string;
    const queryStringSeparatorIndex = path.indexOf('?');

    // Separate the pathname from the query string, if it exists.
    const pathname = queryStringSeparatorIndex > 0
      ? path.slice(0, queryStringSeparatorIndex)
      : path;

    // Determine if a response handler exists for the given route.
    const handleResponse = routes.find(method, pathname);

    if (!handleResponse) {
      // There is no response handler for the given route.
      response.statusCode = HTTP_STATUS_NOT_FOUND;
      response.end();
      return;
    }

    // Pass control to the response handler.
    handleResponse(request, response)
      .catch(handleError);
  }

  catch (err) {
    primaryErrorHandler(response, errorHandler, err);
  }
}

/**
 * Called when an error is thrown or when an 'error' event is emitted on the HTTP/2 stream. Accepts
 * a user-defined error handler which is passed the error object.
 */

export async function primaryErrorHandler(
  response: ServerResponse,
  handleError: ((err: unknown) => void | Promise<void>) | null,
  err: unknown,
) {
  if (!response.writableEnded) {
    if (!response.headersSent) {
      // The stream is still active and no headers have been sent.
      response.statusCode = HTTP_STATUS_INTERNAL_SERVER_ERROR;
    }

    response.end();
  }

  // Pass the error object to the user-defined error handler.
  await handleError?.(err);
}
