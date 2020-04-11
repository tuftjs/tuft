import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import { EventEmitter } from 'events';

import {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_COOKIE,
  HTTP2_HEADER_SET_COOKIE,
} from './constants';

type TuftContextParams = {
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  method: string,
  pathname: string,
  searchParams: URLSearchParams,
  params: { [key: string]: string },
  cookies: { [key: string]: string } | null,
  body: any,
};

export type TuftContextOptions = {
  params?: { [key: number]: string };
  parseCookies?: boolean,
  parseText?: boolean | number,
  parseJson?: boolean | number,
  parseUrlEncoded?: boolean | number,
}

export class TuftContext extends EventEmitter {
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
  props: {
    [key in string | number | symbol]: any;
  };

  constructor(contextParams: TuftContextParams) {
    super();

    this._stream = contextParams.stream;
    this._outgoingHeaders = {};

    this.request = {
      headers: contextParams.headers,
      method: contextParams.method,
      pathname: contextParams.pathname,
      searchParams: contextParams.searchParams,
      params: contextParams.params,
      body: contextParams.body,
      cookies: contextParams.cookies,
    };
    this.props = Object.create(null);

    this._stream.on('finish', () => this.emit('finish'));
  }

  get outgoingHeaders() {
    return this._outgoingHeaders;
  }

  get sentHeaders() {
    return this._stream.sentHeaders;
  }

  get pushAllowed() {
    return this._stream.pushAllowed;
  }

  getHeader(name: string) {
    return this._outgoingHeaders[name];
  }

  setHeader(name: string, value: number | string | string[] | undefined) {
    this._outgoingHeaders[name] = value;
  }

  setCookie(name: string, value: string) {
    if (this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] === undefined) {
      this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] = [];
    }

    const outgoingHeaders = this._outgoingHeaders[HTTP2_HEADER_SET_COOKIE] as string[];
    const cookie = name + '=' + value;
    outgoingHeaders.push(cookie);
  }
}

export async function createTuftContext(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  options: TuftContextOptions = {},
) {
  const method = headers[HTTP2_HEADER_METHOD] as string;
  const path = headers[HTTP2_HEADER_PATH] as string;

  let pathname: string = path;
  let queryString: string | undefined = undefined;

  let separatorIndex = path.indexOf('?');

  if (separatorIndex > 0) {
    pathname = path.slice(0, separatorIndex);
    queryString = path.slice(separatorIndex + 1);
  }

  const searchParams = new URLSearchParams(queryString);

  const params: { [key: string]: string } = {};

  const paramKeys = options.params;

  if (paramKeys) {
    let i, begin, end, key;

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

  const body = null;

  return new TuftContext({
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

export async function createTuftContextWithBody(
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
  options: TuftContextOptions = {},
) {
  const method = headers[HTTP2_HEADER_METHOD] as string;
  const path = headers[HTTP2_HEADER_PATH] as string;

  let pathname: string = path;
  let queryString: string | undefined = undefined;

  let separatorIndex = path.indexOf('?');

  if (separatorIndex > 0) {
    pathname = path.slice(0, separatorIndex);
    queryString = path.slice(separatorIndex + 1);
  }

  const searchParams = new URLSearchParams(queryString);

  const params: { [key: string]: string } = {};

  const paramKeys = options.params;

  if (paramKeys) {
    let i, begin, end, key;

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

  let body: Buffer | string | { [key: string]: any } | null;

  body = null;

  const contentLengthString = headers[HTTP2_HEADER_CONTENT_LENGTH];

  if (!contentLengthString) {
    throw Error('ERR_CONTENT_LENGTH_REQUIRED');
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  body = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);

  if (body.length !== parseInt(contentLengthString)) {
    throw Error('ERR_CONTENT_LENGTH_MISMATCH');
  }

  const contentType = headers[HTTP2_HEADER_CONTENT_TYPE];

  if (contentType) {
    const { parseText, parseJson, parseUrlEncoded } = options;

    if (parseText && contentType.startsWith('text')) {
      body = body.length <= parseText ? body.toString() : '';
    }

    else if (parseJson && contentType === 'application/json') {
      body = body.length <= parseJson ? JSON.parse(body.toString()) : {};
    }

    else if (parseUrlEncoded && contentType === 'application/x-www-form-urlencoded') {
      body = body.length <= parseUrlEncoded ? parseUrlEncodedStr(body.toString()) : {};
    }
  }

  return new TuftContext({
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

function parseUrlEncodedStr(urlEncodedStr: string): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  let begin, end, str, i, name, value;

  for (begin = 0, end; end !== -1; begin = end + 1) {
    end = urlEncodedStr.indexOf('&', begin);

    str = urlEncodedStr.slice(begin, end < 0 ? undefined : end);

    i = str.indexOf('=');
    name = str.slice(0, i);
    value = str.slice(i + 1);

    result[name] = value;
  }

  return result;
}
