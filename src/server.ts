import type { Server as Http1Server, IncomingMessage, ServerResponse } from 'http';
import type { Server as Http1SecureServer } from 'https';
import type { KeyObject } from 'tls';

import { createServer } from 'http';
import { createServer as createSecureServer } from 'https';
import { EventEmitter } from 'events';
import { TUFT_SERVER_DEFAULT_HOST, TUFT_SERVER_DEFAULT_PORT } from './constants';

export type ServerOptions = {
  host?: string,
  port?: number,
};

export type SecureServerOptions = {
  host?: string,
  port?: number,
  key?: string | Buffer | Array<Buffer | KeyObject>,
  cert?: string | Buffer | Array<string | Buffer>,
};

abstract class TuftServerBase extends EventEmitter {
  readonly #server: Http1Server | Http1SecureServer;
  readonly #host: string;
  readonly #port: number;

  get host() {
    return this.#host;
  }

  get port() {
    return this.#port;
  }

  constructor(
    secure: boolean,
    createServerOptions: any,
    handler: (request: IncomingMessage, response: ServerResponse) => void,
    options: ServerOptions,
  ) {
    super();

    const server = secure === true
      ? createSecureServer(createServerOptions)
      : createServer(createServerOptions);

    server.on('error', emitError.bind(this));
    server.on('timeout', emitTimeout.bind(this));
    server.on('request', handler);

    this.#server = server;

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
    handler: (request: IncomingMessage, response: ServerResponse) => void,
    options: ServerOptions = {},
  ) {
    super(false, {}, handler, options);
  }
}

/**
 * Creates an instance of Http2SecureServer and adds a listener for the 'stream' event, using the
 * provided handler function.
 */

export class TuftSecureServer extends TuftServerBase {
  constructor(
    handler: (request: IncomingMessage, response: ServerResponse) => void,
    options: SecureServerOptions = {},
  ) {
    super(true, { key: options.key, cert: options.cert }, handler, options);
  }
}

export function emitError(this: TuftServerBase, err: Error) {
  this.emit('error', err);
}

export function emitTimeout(this: TuftServerBase) {
  this.emit('timeout');
}
