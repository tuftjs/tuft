import type { Http2Server, Http2SecureServer, ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { KeyObject } from 'tls';

import { createServer, createSecureServer } from 'http2';
import { EventEmitter } from 'events';
import { createPromise } from './utils';
import { TUFT_SERVER_DEFAULT_HOST, TUFT_SERVER_DEFAULT_PORT } from './constants';


export type ServerOptions = {
  host?: string,
  port?: number,
}

export type SecureServerOptions = {
  host?: string,
  port?: number,
  key?: string | Buffer | Array<Buffer | KeyObject>,
  cert?: string | Buffer | Array<string | Buffer>,
}

/**
 * Creates an instance of Http2Server and adds a listener for the 'stream' event, using the
 * provided handler function.
 */

export class TuftServer extends EventEmitter {
  readonly #http2Server: Http2Server;
  readonly #host: string;
  readonly #port: number;

  get host() {
    return this.#host;
  }

  get port() {
    return this.#port;
  }

  constructor(
    handler: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void,
    options: ServerOptions = {},
  ) {
    super();

    const server = createServer();

    server.on('error', emitError.bind(this));
    server.on('sessionError', emitSessionError.bind(this));
    server.on('timeout', emitTimeout.bind(this));

    server.on('stream', handler);

    this.#http2Server = server;
    this.#host = options.host ?? TUFT_SERVER_DEFAULT_HOST;
    this.#port = options.port ?? TUFT_SERVER_DEFAULT_PORT;
  }

  /**
   * Returns a promise that resolves once the server has started.
   */

  async start() {
    await createPromise(done => {
      this.#http2Server.listen(this.#port, done);
    });
  }

  /**
   * Returns a promise that resolves once all connections are ended and the server has closed, or
   * rejects with an error if the server was not running.
   */

  async stop() {
    await createPromise(done => {
      this.#http2Server.close(done);
    });
  }

  /**
   * Sets the timeout value in milliseconds for requests to the server. The provided callback is
   * invoked whenever the timeout value is reached.
   */

  setTimeout(msec?: number, callback?: () => void) {
    this.#http2Server.setTimeout(msec, callback);
    return this;
  }

  /**
   * If called while the server is running, returns an object containing data about the current
   * server.
   */

  address() {
    return this.#http2Server.address();
  }
}

/**
 * Creates an instance of Http2SecureServer and adds a listener for the 'stream' event, using the
 * provided handler function.
 */

export class TuftSecureServer extends EventEmitter {
  readonly #http2SecureServer: Http2SecureServer;
  readonly #host: string;
  readonly #port: number;

  get host() {
    return this.#host;
  }

  get port() {
    return this.#port;
  }

  constructor(
    handler: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void,
    options: SecureServerOptions = {},
  ) {
    super();

    const server = createSecureServer({ key: options.key, cert: options.cert });

    server.on('error', emitError.bind(this));
    server.on('sessionError', emitSessionError.bind(this));
    server.on('timeout', emitTimeout.bind(this));

    server.on('stream', handler);

    this.#http2SecureServer = server;
    this.#host = options.host ?? TUFT_SERVER_DEFAULT_HOST;
    this.#port = options.port ?? TUFT_SERVER_DEFAULT_PORT;
  }

  /**
   * Returns a promise that resolves once the server has started.
   */

  async start() {
    await createPromise(done => {
      this.#http2SecureServer.listen(this.#port, done);
    });
  }

  /**
   * Returns a promise that resolves once all connections are ended and the server has closed, or
   * rejects with an error if the server was not running.
   */

  async stop() {
    await createPromise(done => {
      this.#http2SecureServer.close(done);
    });
  }

  /**
   * Sets the timeout value in milliseconds for requests to the server. The provided callback is
   * invoked whenever the timeout value is reached.
   */

  setTimeout(msec?: number, callback?: () => void) {
    this.#http2SecureServer.setTimeout(msec, callback);
    return this;
  }

  /**
   * If called while the server is running, returns an object containing data about the current
   * server.
   */

  address() {
    return this.#http2SecureServer.address();
  }
}

export function emitError(this: TuftServer | TuftSecureServer, err: Error) {
  this.emit('error', err);
}

export function emitSessionError(this: TuftServer | TuftSecureServer, err: Error) {
  this.emit('sessionError', err);
}

export function emitTimeout(this: TuftServer | TuftSecureServer) {
  this.emit('timeout');
}
