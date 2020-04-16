import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';

import {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_SCHEME,
  HTTP2_HEADER_COOKIE,
  HTTP2_HEADER_SET_COOKIE,
} from './constants';

type TuftContextParams = {
  stream: ServerHttp2Stream,
  request: {
    headers: IncomingHttpHeaders,
    secure: boolean,
    method: string,
    pathname: string,
    searchParams: URLSearchParams,
    params: { [key: string]: string },
    cookies: { [key: string]: string } | null,
  },
};

export type TuftContextOptions = {
  params?: { [key: number]: string };
  parseCookies?: boolean,
  parseText?: boolean | number,
  parseJson?: boolean | number,
  parseUrlEncoded?: boolean | number,
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

/**
 * An instance of TuftContext represents a single HTTP/2 transaction, and is passed as the first
 * and only argument to a route handler.
 */

export class TuftContext {
  private readonly _stream: ServerHttp2Stream;
  private readonly _outgoingHeaders: OutgoingHttpHeaders;

  // The request object contains properties relevant to the current request.
  readonly request: {
    readonly headers: IncomingHttpHeaders;
    readonly method: string;
    readonly pathname: string;
    readonly secure: boolean;
    readonly searchParams: URLSearchParams;
    readonly params: { [key: string]: string };
    readonly cookies: { [key: string]: string } | null;
  };

  // The props object is intended for user-defined values to be passed down from pre-handler
  // functions to successive pre-handlers and the main  handler.
  readonly props: {
    [key in string | number | symbol]: any;
  };

  constructor(contextParams: TuftContextParams) {
    this._stream = contextParams.stream;
    this._outgoingHeaders = {};

    this.request = contextParams.request;
    this.props = Object.create(null);
  }

  get stream() {
    return this._stream;
  }

  get outgoingHeaders() {
    return this._outgoingHeaders;
  }

  setHeader(name: string, value: number | string | string[] | undefined) {
    this._outgoingHeaders[name] = value;
  }

  getHeader(name: string) {
    return this._outgoingHeaders[name];
  }

  setCookie(name: string, value: string, options: SetCookieOptions = {}) {
    if (this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] === undefined) {
      this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] = [];
    }

    const cookieHeader = this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] as string[];
    let cookie = name + '=' + value;

    for (const option in options) {
      const addCookieOptionString = cookieOptionStringGenerators[option];

      if (addCookieOptionString) {
        cookie += addCookieOptionString(options[option]);
      }
    }

    cookieHeader.push(cookie);
  }
}

// An array of functions that each represent a cookie option. Each function accept a value that
// corresponds to a cookie option, and returns a string to be appended to the final cookie string.
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
 * Creates an instance of TuftContext using the provided parameters.
 */

export function createTuftContext(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  options: TuftContextOptions = {},
) {
  const method = headers[HTTP2_HEADER_METHOD] as string;
  const path = headers[HTTP2_HEADER_PATH] as string;

  const secure = headers[HTTP2_HEADER_SCHEME] === 'https';

  let pathname: string = path;
  let queryString: string | undefined = undefined;

  let separatorIndex = path.indexOf('?');

  if (separatorIndex > 0) {
    // The path has a query string
    pathname = path.slice(0, separatorIndex);
    queryString = path.slice(separatorIndex + 1);
  }

  const searchParams = new URLSearchParams(queryString);

  const params: { [key: string]: string } = {};

  const paramKeys = options.params;

  if (paramKeys) {
    let i, begin, end, key;

    // Iterate over each path segment, adding that segment as a param if it exists for the current
    // route.
    for (i = 0, begin = 1; end !== -1; i++, begin = end + 1) {
      end = path.indexOf('/', begin);

      if (paramKeys[i]) {
        key = paramKeys[i];
        params[key] = path.slice(begin, end < 0 ? undefined : end);
      }
    }
  }

  const cookieHeader = headers[HTTP2_HEADER_COOKIE];

  const cookies = options.parseCookies && cookieHeader
    ? parseCookiesStr(cookieHeader)
    : null;

  const request = {
    headers,
    secure,
    method,
    pathname,
    searchParams,
    params,
    cookies,
  };

  return new TuftContext({ stream, request });
}

/**
 * Accepts a string that represents an incoming 'cookie' header, and returns the cookies in that
 * string in the form of an object.
 */

function parseCookiesStr(cookiesStr: string): { [name: string]: string } {
  const result: { [name: string]: string } = {};

  let begin, end, str, i, name, value;

  for (begin = 0; end !== -1; begin = end + 1) {
    end = cookiesStr.indexOf(';', begin);

    str = cookiesStr.slice(begin, end < 0 ? undefined : end);

    i = str.indexOf('=');
    name = str.slice(0, i);
    value = str.slice(i + 1);

    result[name] = value;
  }

  return result;
}
