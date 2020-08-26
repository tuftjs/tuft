import type { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http';

import { HTTP_HEADER_SET_COOKIE } from './constants';
import { escape } from 'querystring';

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
  readonly search: string;
  readonly params: { [key: string]: string };
  cookies?: { [key: string]: string };
  body?: string | Buffer | { [key: string]: any } | null;
  [key: string]: any;
}

export const requestSymbol = Symbol.for('tuft.incomingMessage');
export const responseSymbol = Symbol.for('tuft.serverResponse');

/**
 * An instance of TuftContext represents a single HTTP/2 transaction, and is passed as the first
 * and only argument to each response handler.
 */

export class TuftContext {
  readonly [requestSymbol]: IncomingMessage;
  readonly [responseSymbol]: ServerResponse;
  readonly request: TuftRequest;

  constructor(request: IncomingMessage, response: ServerResponse, tuftRequest: TuftRequest) {
    this[requestSymbol] = request;
    this[responseSymbol] = response;
    this.request = tuftRequest;
  }

  /**
   * Sets the provided outgoing header 'name' to 'value'.
   */

  setHeader(name: string, value: number | string | string[]) {
    this[responseSymbol].setHeader(name, value);
    return this;
  }

  /**
   * Gets the value of the provided outgoing header 'name'.
   */

  getHeader(name: string) {
    return this[responseSymbol].getHeader(name);
  }

  /**
   * Adds the provided 'name' and 'value' to the outgoing 'set-cookie' header, adding any of the
   * defined options if present.
   */

  setCookie(name: string, value: string, options: SetCookieOptions = {}) {
    if (!this[responseSymbol].hasHeader(HTTP_HEADER_SET_COOKIE)) {
      this[responseSymbol].setHeader(HTTP_HEADER_SET_COOKIE, []);
    }

    const cookieHeader = this[responseSymbol].getHeader(HTTP_HEADER_SET_COOKIE) as string[];
    let cookie = escape(name) + '=' + escape(value);

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
  request: IncomingMessage,
  response: ServerResponse,
  options: TuftContextOptions = {},
) {
  const method = request.method as string;
  const path = request.url as string;

  let pathname = path;
  let search = '';

  const separatorIndex = path.indexOf('?');

  if (separatorIndex > 0) {
    // Separate the query string from the path.
    pathname = path.slice(0, separatorIndex);
    search = path.slice(separatorIndex);
  }

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

  const tuftRequest = {
    headers: request.headers,
    method,
    pathname,
    search,
    params,
  };

  return new TuftContext(request, response, tuftRequest);
}
