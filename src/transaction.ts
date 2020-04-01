import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';

import { constants } from 'http2';
import { EventEmitter } from 'events';
import { extractPathnameAndQueryString, pathSegmentCache } from './utils';

type TransactionOptions = {
  params?: {
    n: number;
    key: string;
  }[];
  parseCookies?: boolean,
  parseText?: boolean | number,
  parseJson?: boolean | number,
  parseUrlEncoded?: boolean | number,
}

const {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_SET_COOKIE,
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
} = constants;

const requestMethodsWithBody = new Set([
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
]);

class Transaction extends EventEmitter {
  private readonly _stream: ServerHttp2Stream;
  private _outgoingHeaders: OutgoingHttpHeaders;

  readonly request: {
    headers: IncomingHttpHeaders;
    method: string;
    pathname: string;
    searchParams: URLSearchParams;
    params: { [key: string]: string };
    cookies: { [key: string]: string } | null;
    body: any;
  };
  props: { [key: string]: any };

  constructor(args: {
    stream: ServerHttp2Stream;
    headers: IncomingHttpHeaders;
    method: string;
    pathname: string;
    searchParams: URLSearchParams;
    params: { [key: string]: string };
    cookies: { [key: string]: string } | null;
    body: any;
  }) {
    super();

    this._stream = args.stream;
    this._outgoingHeaders = Object.create(null);

    this.request = {
      headers: args.headers,
      method: args.method,
      pathname: args.pathname,
      searchParams: args.searchParams,
      params: args.params,
      body: args.body,
      cookies: args.cookies,
    };
    this.props = Object.create(null);

    this._stream.on('finish', () => this.emit('finish'));
  }

  get outgoingHeaders() {
    return Object.assign({}, this._outgoingHeaders);
  }

  get sentHeaders() {
    return this._stream.sentHeaders;
  }

  get pushAllowed() {
    return this._stream.pushAllowed;
  }

  setHeader(name: string, value: number | string | string[] | undefined) {
    this._outgoingHeaders[name] = value;
  }

  setCookie(name: string, value: string) {
    if (this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] === undefined) {
      this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] = [];
    }

    const cookie = name + '=' + value;

    (this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] as string[]).push(cookie);
  }
}

async function createTransaction(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  options: TransactionOptions = {},
) {
  const method = headers[HTTP2_HEADER_METHOD] as string;
  const { pathname, queryString } = extractPathnameAndQueryString(headers);

  if (!pathname) {
    throw Error('ERR_NULL_PATHNAME');
  }

  const searchParams = new URLSearchParams(queryString);

  const params: { [key: string]: string } = {};

  if (options.params) {
    const pathSegments = pathSegmentCache.get(pathname);

    for (let i = 0; i < options.params.length; i++) {
      const { key, n } = options.params[i];
      params[key] = pathSegments[n];
    }
  }

  const cookies = options.parseCookies && headers.cookie
    ? parseCookies(headers.cookie)
    : null;

  let body: any = null;

  const contentLengthString = headers[HTTP2_HEADER_CONTENT_LENGTH] as string;

  if (contentLengthString && requestMethodsWithBody.has(method)) {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    body = Buffer.concat(chunks);

    const contentLength = parseInt(contentLengthString, 10);

    if (body.length !== contentLength) {
      throw Error('ERR_CONTENT_LENGTH_MISMATCH');
    }
  }

  if (body) {
    const contentType = headers[HTTP2_HEADER_CONTENT_TYPE] as string;

    if (options.parseText && contentType.startsWith('text')) {
      body = body.length <= options.parseText ? body.toString() : '';
    }

    else if (options.parseJson && contentType === 'application/json') {
      body = body.length <= options.parseJson ? JSON.parse(body) : {};
    }

    else if (options.parseUrlEncoded && contentType === 'application/x-www-form-urlencoded') {
      body = body.length <= options.parseUrlEncoded ? parseUrlEncoded(body.toString()) : {};
    }
  }

  return new Transaction({
    stream,
    headers,
    method,
    pathname,
    searchParams,
    params,
    cookies,
    body,
  });
}

function parseCookies(cookiesStr: string): { [name: string]: string } {
  const cookies: { [name: string]: string } = {};

  let begin, end;

  for (begin = 0; end !== -1; begin = end + 1) {
    end = cookiesStr.indexOf(';', begin);

    const str = cookiesStr.slice(begin, end >= 0 ? end : undefined).trim();

    const i = str.indexOf('=');
    const name = str.slice(0, i);
    const value = str.slice(i + 1);

    cookies[name] = value;
  }

  return cookies;
}

function parseUrlEncoded(urlEncodedStr: string): { [key: string]: string } {
  const obj: { [key: string]: string } = {};

  let begin, end;

  for (begin = 0, end; end !== -1; begin = end + 1) {
    end = urlEncodedStr.indexOf('&', begin);

    const str = urlEncodedStr.slice(begin, end >= 0 ? end : undefined);

    const i = str.indexOf('=');
    const name = str.slice(0, i);
    const value = str.slice(i + 1);

    obj[name] = value;
  }

  return obj;
}

export { createTransaction, parseCookies };
export type { Transaction };
