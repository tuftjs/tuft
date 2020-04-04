import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import { EventEmitter } from 'events';

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

const HTTP2_HEADER_METHOD         = ':method';
const HTTP2_HEADER_PATH           = ':path';
const HTTP2_HEADER_CONTENT_TYPE   = 'content-type';
const HTTP2_HEADER_CONTENT_LENGTH = 'content-length';
const HTTP2_HEADER_SET_COOKIE     = 'set-cookie';

const methodsWithBody = new Set([
  'DELETE',
  'PATCH',
  'POST',
  'PUT',
]);

class TuftContext extends EventEmitter {
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

export async function createContext(
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
    const pathSegments = extractPathSegments(pathname);
    let key, i, j;

    for (const n in paramKeys) {
      key = paramKeys[n];

      i = pathSegments.indexOf(n) + 3;
      j = pathSegments.indexOf('\n', i);

      params[key] = pathSegments.slice(i, j);
    }
  }

  const cookies = options.parseCookies && headers.cookie
    ? parseCookies(headers.cookie)
    : null;

  let body: any = null;

  const contentLengthString = headers[HTTP2_HEADER_CONTENT_LENGTH] as string;

  if (contentLengthString && methodsWithBody.has(method)) {
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

function extractPathSegments(path: string) {
  let result = '';

  let begin = 1;
  let end = path.indexOf('/', begin);
  let i = 10;

  while (end >= 0 && i < 99) {
    result += '#' + i + path.slice(begin, end) + '\n';

    begin = end + 1;
    end = path.indexOf('/', begin);
    i++;
  }

  result += '#' + i + path.slice(begin) + '\n';

  return result;
}

export type { TuftContext };
