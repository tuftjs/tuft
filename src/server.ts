import type {
  Http2Server,
  Http2SecureServer,
  ServerHttp2Stream,
  IncomingHttpHeaders,
  ServerStreamResponseOptions,
  ServerStreamFileResponseOptionsWithError,
} from 'http2';
import type { Server as Http1Server, OutgoingHttpHeaders } from 'http';
import type { Server as Http1SecureServer } from 'https';
import type { IncomingMessage, ServerResponse } from 'http';
import type { KeyObject } from 'tls';
import http2 = require('http2');
import http = require('http');
import https = require('https');
import { Duplex } from 'stream';
import { EventEmitter } from 'events';
import {
  TUFT_SERVER_DEFAULT_HOST,
  TUFT_SERVER_DEFAULT_PORT,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
} from './constants';
import { stat, createReadStream } from 'fs';

export type ServerOptions = {
  host?: string,
  port?: number,
  http1?: boolean,
};

export type SecureServerOptions = {
  host?: string,
  port?: number,
  http1?: boolean,
  key?: string | Buffer | Array<Buffer | KeyObject>,
  cert?: string | Buffer | Array<string | Buffer>,
};

// this is a test comment

abstract class TuftServerBase extends EventEmitter {
  readonly #server: Http2Server | Http2SecureServer | Http1Server | Http1SecureServer;
  readonly #host: string;
  readonly #port: number;

  get protocol() {
    return /^Http2(Secure)*Server$/.test(this.#server.constructor.name) ? 'http2' : 'http1';
  }

  get host() {
    return this.#host;
  }

  get port() {
    return this.#port;
  }

  constructor(
    type: string,
    createServerOptions: any,
    handler: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void,
    options: ServerOptions,
  ) {
    super();
    if (type === 'http2' || type === 'secure_http2') {
      // Server is an http2 server.
      const createServer = type === 'http2' ? http2.createServer : http2.createSecureServer;
      const server = createServer(createServerOptions);

      server.on('error', emitError.bind(this));
      server.on('sessionError', emitSessionError.bind(this));
      server.on('timeout', emitTimeout.bind(this));
      server.on('stream', handler);

      this.#server = server;
    }

    else {
      // Server is an http or https server.
      const createServer = type === 'http1' ? http.createServer : https.createServer;
      const server = createServer(createServerOptions);

      server.on('error', emitError.bind(this));
      server.on('timeout', emitTimeout.bind(this));
      server.on('request', http1CompatibleHandler.bind(null, handler));

      this.#server = server;
    }

    this.#host = options.host ?? TUFT_SERVER_DEFAULT_HOST;
    this.#port = options.port ?? TUFT_SERVER_DEFAULT_PORT;
  }

  /**
   * Returns a promise that resolves once the server has started.
   */

  start() {
    return new Promise(resolve => {
      this.#server.listen(this.#port, resolve);
    });
  }

  /**
   * Returns a promise that resolves once all connections are ended and the server has closed, or
   * rejects with an error if the server was not running.
   */

  stop() {
    return new Promise((resolve, reject) => {
      this.#server.close(err => {
        err ? reject(err) : resolve();
      });
    });
  }

  /**
   * Sets the timeout value in milliseconds for requests to the server. The provided callback is
   * invoked whenever the timeout value is reached.
   */

  setTimeout(msec?: number, callback?: () => void) {
    this.#server.setTimeout(msec, callback);
    return this;
  }

  /**
   * If called while the server is running, returns an object containing data about the current
   * server.
   */

  address() {
    return this.#server.address();
  }
}

/**
 * Creates an instance of Http2Server and adds a listener for the 'stream' event, using the
 * provided handler function.
 */

export class TuftServer extends TuftServerBase {
  constructor(
    handler: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void,
    options: ServerOptions = {},
  ) {
    const type = options.http1 === true ? 'http1' : 'http2';
    super(type, {}, handler, options);
  }
}

/**
 * Creates an instance of Http2SecureServer and adds a listener for the 'stream' event, using the
 * provided handler function.
 */

export class TuftSecureServer extends TuftServerBase {
  constructor(
    handler: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void,
    options: SecureServerOptions = {},
  ) {
    const type = options.http1 === true ? 'secure_http1' : 'secure_http2';
    super(type, { key: options.key, cert: options.cert }, handler, options);
  }
}

export function emitError(this: TuftServerBase, err: Error) {
  this.emit('error', err);
}

export function emitSessionError(this: TuftServerBase, err: Error) {
  this.emit('sessionError', err);
}

export function emitTimeout(this: TuftServerBase) {
  this.emit('timeout');
}

/**
 * A custom duplex stream that is *partially* compatible with Node's Http2ServerStream class,
 * intended as a compatibility layer between the request and response objects of http/https and
 * the stream object of http2. Only method/properties that are used internally by Tuft have been
 * implemented.
 */

const symStartRead = Symbol('symStardRead');

export class Http2CompatibleServerStream extends Duplex {
  [symStartRead]: any;
  _request: IncomingMessage;
  _response: ServerResponse;

  constructor(request: IncomingMessage, response: ServerResponse) {
    super();
    this._request = request;
    this._response = response;

    this[symStartRead] = () => {
      request.on('data', chunk => {
        this.push(chunk);
      });
      request.on('end', () => {
        this.push(null);
      });
    };

    this.on('finish', () => {
      this._response.end();
    });
  }

  _read() {
    this[symStartRead]();
  }

  _write(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error: Error | null | undefined) => void,
  ) {
    this._response.write(chunk, encoding, callback);
  }

  respond(headers: OutgoingHttpHeaders = {}, options: ServerStreamResponseOptions = {}) {
    const http1Headers: OutgoingHttpHeaders = {};

    for (const header in headers) {
      const value = headers[header];

      // Ignore http2 headers.
      if (!header.startsWith(':')) {
        http1Headers[header] = value;
      }
    }

    let statusCode = headers[HTTP2_HEADER_STATUS] ?? headers.status ?? 200;

    if (typeof statusCode !== 'number') {
      statusCode = parseInt(statusCode as string, 10);
    }

    this._response.writeHead(statusCode, http1Headers);

    if (options.endStream === true) {
      this._response.end();
    }
  }

  respondWithFile(
    path: string,
    headers: OutgoingHttpHeaders = {},
    options: ServerStreamFileResponseOptionsWithError = {},
  ) {
    const { statCheck } = options;
    const onError = options.onError ?? (err => this.emit('error', err));
    const start = options.offset ?? 0;
    const end = options.length ? start + (options.length - 1) : Infinity;

    if (typeof statCheck === 'function') {
      stat(path, (err, stats) => {
        if (err) {
          onError(err);
          return;
        }

        statCheck(stats, headers, { offset: start, length: end - start + 1 });
        sendFile.call(this, path, headers, start, end, onError);
      });

      return;
    }

    sendFile.call(this, path, headers, start, end, onError);
  }
}

function sendFile(
  this: Http2CompatibleServerStream,
  path: string, headers: OutgoingHttpHeaders,
  start: number, end: number, onError: any,
) {
  this.respond(headers);

  const readStream = createReadStream(path, { start, end });
  readStream.on('error', onError);
  readStream.pipe(this._response);
}

/**
 * A wrapper function for the primary HTTP/2 stream handler. Creates an HTTP/2-compatible stream
 * object from HTTP/1 request and response objects, and then passes it to the HTTP/2 stream handler.
 */

export function http1CompatibleHandler(
  handler: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void,
  request: IncomingMessage,
  response: ServerResponse,
) {
  const stream = new Http2CompatibleServerStream(request, response);
  const { headers } = request;
  headers[HTTP2_HEADER_METHOD] = request.method;
  headers[HTTP2_HEADER_PATH] = request.url;
  handler(<unknown>stream as ServerHttp2Stream, headers);
}
