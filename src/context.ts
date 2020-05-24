import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_SET_COOKIE,
} from './constants';

export type TuftContextOptions = {
  params?: { [key: number]: string };
}

type SetCookieOptions = {
  expires?: Date,
  maxAge?: number,
  domain?: string,
  path?: string,
  secure?: boolean,
  httpOnly?: boolean,
  sameSite?: 'Strict' | 'Lax' | 'None',
  [key: string]: any,
}

export interface TuftRequest {
  readonly headers: IncomingHttpHeaders;
  readonly method: string;
  readonly pathname: string;
  readonly secure: boolean;
  readonly search: string;
  readonly params: { [key: string]: string };
  cookies?: { [key: string]: string };
  body?: string | Buffer | { [key: string]: any } | null;
  [key: string]: any;
}

export const symStream = Symbol('Http2Stream');

/**
 * An instance of TuftContext represents a single HTTP/2 transaction, and is passed as the first
 * and only argument to each response handler.
 */

export class TuftContext {
  private readonly _outgoingHeaders: OutgoingHttpHeaders;
  readonly [symStream]: ServerHttp2Stream;
  readonly request: TuftRequest;

  constructor(stream: ServerHttp2Stream, request: TuftRequest) {
    this._outgoingHeaders = Object.create(null);
    this[symStream] = stream;
    this.request = request;
  }

  get outgoingHeaders() {
    return this._outgoingHeaders;
  }

  /**
   * Sets the provided outgoing header 'name' to 'value'.
   */

  setHeader(name: string, value: number | string | string[] | undefined) {
    this._outgoingHeaders[name] = value;
    return this;
  }

  /**
   * Gets the value of the provided outgoing header 'name'.
   */

  getHeader(name: string) {
    return this._outgoingHeaders[name];
  }

  /**
   * Adds the provided 'name' and 'value' to the outgoing 'set-cookie' header, adding any of the
   * defined options if present.
   */

  setCookie(name: string, value: string, options: SetCookieOptions = {}) {
    if (this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] === undefined) {
      this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] = [];
    }

    const cookieHeader = this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] as string[];
    let cookie = name + '=' + value;

    if (!options.path) {
      options.path = '/';
    }

    for (const option in options) {
      const addCookieOptionString = cookieOptionStringGenerators[option];

      if (addCookieOptionString) {
        cookie += addCookieOptionString(options[option]);
      }
    }

    cookieHeader.push(cookie);

    return this;
  }
}

/**
 * An array of functions that each represent a cookie option. Each function accepts a value that
 * corresponds to a cookie option, and returns a string to be appended to the final cookie string.
 */

const cookieOptionStringGenerators: { [key: string]: ((value: any) => string) | undefined } = {
  expires: (value: Date) => {
    return '; Expires=' + value.toUTCString();
  },
  maxAge: (value: number) => {
    return '; Max-Age=' + value;
  },
  domain: (value: string) => {
    return '; Domain=' + value;
  },
  path: (value: string) => {
    return '; Path=' + value;
  },
  secure: (value: boolean) => {
    return value === true ? '; Secure' : '';
  },
  httpOnly: (value: boolean) => {
    return value === true ? '; HttpOnly' : '';
  },
  sameSite: (value: string) => {
    if (value.toLowerCase() === 'strict') {
      return '; SameSite=Strict';
    }

    if (value.toLowerCase() === 'lax') {
      return '; SameSite=Lax';
    }

    if (value.toLowerCase() === 'none') {
      return '; SameSite=None';
    }

    return '';
  },
};

/**
 * Returns an instance of TuftContext created using the provided parameters.
 */

export function createTuftContext(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  options: TuftContextOptions = {},
) {
  const method = headers[HTTP2_HEADER_METHOD] as string;
  const path = headers[HTTP2_HEADER_PATH] as string;

  let pathname = path;
  let search = '';

  let separatorIndex = path.indexOf('?');

  if (separatorIndex > 0) {
    // Separate the query string from the path.
    pathname = path.slice(0, separatorIndex);
    search = path.slice(separatorIndex);
  }

  const secure = headers[HTTP2_HEADER_SCHEME] === 'https';

  const paramKeys = options.params;
  const params: { [key: string]: string } = {};

  if (paramKeys) {
    // There are named parameters that need to be extracted.
    let i, begin, end, key;

    // Iterate over each path segment, adding that segment to its corresponding named parameter if
    // it exists for the current route.
    for (i = 0, begin = 1; end !== -1; i++, begin = end + 1) {
      end = pathname.indexOf('/', begin);

      if (paramKeys[i]) {
        // A named parameter exists for this path segment.
        key = paramKeys[i];
        const value = pathname.slice(begin, end < 0 ? undefined : end);
        params[key] = encodeURIComponent(value);
      }
    }
  }

  const request = {
    headers,
    method,
    pathname,
    search,
    secure,
    params,
  };

  return new TuftContext(stream, request);
}
