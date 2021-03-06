import type { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http';
import type { URLSearchParams } from 'url';

import {
  HTTP_HEADER_SET_COOKIE,
  HTTP_HEADER_X_FORWARDED_FOR,
  HTTP_HEADER_X_FORWARDED_PROTO,
} from './constants';
import { escape } from 'querystring';

declare module 'net' {
  interface Socket {
     encrypted?: boolean;
  }
}

export type TuftContextOptions = {
  params?: { [key: number]: string };
}

export type SetCookieOptions = {
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
  readonly protocol: string;
  readonly ip: string | undefined;
  readonly method: string;
  readonly pathname: string;
  readonly search: string;
  readonly params: { [key: string]: string };
  cookies?: { [key: string]: string };
  body?: any;
  searchParams?: URLSearchParams;
  [key: string]: any;
}

export const requestSymbol = Symbol.for('tuft.incomingMessage');
export const responseSymbol = Symbol.for('tuft.serverResponse');

/**
 * An instance of TuftContext represents a single HTTP transaction, and is passed as the first
 * and only argument to each response handler.
 */

export class TuftContext {
  readonly [requestSymbol]: IncomingMessage;
  readonly [responseSymbol]: ServerResponse;
  readonly request: TuftRequest;
  readonly secure: boolean;

  constructor(request: IncomingMessage, response: ServerResponse, tuftRequest: TuftRequest) {
    this[requestSymbol] = request;
    this[responseSymbol] = response;
    this.request = tuftRequest;
    this.secure = tuftRequest.protocol === 'https';
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
   * Gets all of the outgoing headers.
   */

  getHeaders() {
    return this[responseSymbol].getHeaders();
  }

  /**
   * Adds the provided 'name' and 'value' to the outgoing 'set-cookie' header, adding any of the
   * defined options if present.
   */

  setCookie(name: string, value: string, options: SetCookieOptions = {}) {
    const response = this[responseSymbol];

    let setCookieHeader = response.getHeader(HTTP_HEADER_SET_COOKIE) as string[] | undefined;

    if (setCookieHeader === undefined) {
      setCookieHeader = [];
      response.setHeader(HTTP_HEADER_SET_COOKIE, setCookieHeader);
    }

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

    setCookieHeader.push(cookie);

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
  const { headers } = request;

  let protocol: string;

  const xForwardedProto = headers[HTTP_HEADER_X_FORWARDED_PROTO] as string | undefined;

  if (xForwardedProto !== undefined) {
    // Use the trusted proxy header to determine the protocol.
    protocol = xForwardedProto;
  }

  else {
    // Determine the protocol via the Node socket.
    protocol = request.socket.encrypted ? 'https' : 'http';
  }

  let ip: string | undefined;

  const xForwardedFor = headers[HTTP_HEADER_X_FORWARDED_FOR] as string | undefined;

  if (xForwardedFor) {
    // Use the trusted proxy header to determine the client IP address.
    const separatorIndex = xForwardedFor.indexOf(',');
    ip = separatorIndex > 0 ? xForwardedFor.slice(0, separatorIndex) : xForwardedFor;
  }

  else {
    // Determine the client IP address via the Node socket.
    ip = request.socket.remoteAddress;
  }

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
    headers,
    protocol,
    ip,
    method,
    pathname,
    search,
    params,
  };

  return new TuftContext(request, response, tuftRequest);
}
