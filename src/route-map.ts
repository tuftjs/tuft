import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { ServerOptions, SecureServerOptions } from './server';
import type { TuftContext } from './context';
import type { HttpError } from './utils';
import { constants } from 'http2';
import { promises as fsPromises } from 'fs';
import { extname, basename, relative, dirname, resolve, isAbsolute } from 'path';
import { RouteManager } from './route-manager';
import { TuftServer, TuftSecureServer } from './server';
import { supportedRequestMethods } from './utils';
import {
  ROUTE_MAP_DEFAULT_TRAILING_SLASH,
  ROUTE_MAP_DEFAULT_BASE_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_ACCEPT_RANGES,
  HTTP2_HEADER_CONTENT_RANGE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_LAST_MODIFIED,
  HTTP2_HEADER_CONTENT_TYPE,
} from './constants';
import importedMimeTypes from './data/mime-types.json';

export interface TuftHandler {
  (t: TuftContext): TuftResponse | Promise<TuftResponse>;
}

export interface TuftPreHandler {
  (t: TuftContext): TuftResponse | void | Promise<TuftResponse | void>;
}

export interface TuftResponder {
  (
    response: TuftResponse,
    stream: ServerHttp2Stream,
    outgoingHeaders: OutgoingHttpHeaders,
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
  preHandlers?: TuftPreHandler[];
  responders?: TuftResponder[];
  params?: { [key: string]: string };
  trailingSlash?: boolean;
}

export type RouteMapOptions = {
  preHandlers?: TuftPreHandler[];
  responders?: TuftResponder[];
  basePath?: string;
  trailingSlash?: boolean;
}

const mimeTypes: { [key: string]: string } = importedMimeTypes;

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_IMPLEMENTED,
  HTTP_STATUS_PARTIAL_CONTENT,
} = constants;

/**
 * Stores route data indexed by method and path. Instances of TuftRouteMap can be merged with other
 * route maps, which results in traits from the parent route map being inherited.
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
      const stat = await fsPromises.stat(path);
      rootDir = stat.isDirectory() ? path : dirname(path);
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

        this.set(`GET ${key + (urlPath === '.' ? '' : '/' + urlPath)}`, handleStaticFileGetRequest.bind(null, pathname));
        this.set(`HEAD ${key + (urlPath === '.' ? '' : '/' + urlPath)}`, handleStaticFileHeadRequest.bind(null, pathname));
      }
    }

    return this;
  }

  /**
   * Adds an error listener to handle errors that are thrown in the application.
   */

  onError(callback: (err: Error) => void | Promise<void>) {
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

  const stat = await fsPromises.stat(path);

  if (stat.isFile()) {
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
    .setHeader(HTTP2_HEADER_ACCEPT_RANGES, 'bytes')
    .setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType)
    .setHeader(HTTP2_HEADER_LAST_MODIFIED, mtime.toUTCString());

  if (range) {
    const status = HTTP_STATUS_PARTIAL_CONTENT;

    const i = range.indexOf('=') + 1;
    const i2 = range.indexOf('-');
    const j = i2 + 1;

    const offset = parseInt(range.slice(i, i2), 10);
    const end = range.slice(j) ? parseInt(range.slice(j), 10) : size - 1;

    if (end >= size) {
      t.setHeader(HTTP2_HEADER_CONTENT_RANGE, 'bytes */' + size);

      return {
        error: 'RANGE_NOT_SATISFIABLE',
      };
    }

    const length = end - offset + 1;

    t
      .setHeader(HTTP2_HEADER_CONTENT_RANGE, 'bytes ' + offset + '-' + end + '/' + size)
      .setHeader(HTTP2_HEADER_CONTENT_LENGTH, length);

    return {
      status,
      file,
      offset,
      length,
    };
  }

  else {
    const status = HTTP_STATUS_OK;

    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, size);

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
  errorHandler: ((err: Error) => void | Promise<void>) | null,
) {
  const routes = new RouteManager(routeMap);
  return primaryHandler.bind(null, routes, errorHandler);
}

/**
 * Determines if there is a matching route for the given request. If there is no matching route, or
 * if the request method is not supported, a response is sent with the appropriate HTTP error. If
 * there is a matching route, control of the stream is passed to the corresponding response handler.
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

    // Pass control of the stream to the response handler.
    await handleResponse(stream, headers);
  }

  catch (err) {
    primaryErrorHandler(stream, errorHandler, err);
  }
}

/**
 * Called when an error is thrown or when an 'error' event is emitted on the HTTP/2 stream. Accepts
 * a user-defined error handler which is passed the error object.
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

  // Pass the error object to the user-defined error handler.
  await handleError?.(err);
}
