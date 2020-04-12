import type { Http2Server, Http2SecureServer, ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { KeyObject } from 'tls';

import { createServer, createSecureServer } from 'http2';
import { HTTP2_SERVER_DEFAULT_HOST, HTTP2_SERVER_DEFAULT_PORT } from './constants';

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

export class TuftServer {
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
    const server = createServer();

    server.on('stream', handler);

    this.#http2Server = server;
    this.#host = options.host ?? HTTP2_SERVER_DEFAULT_HOST;
    this.#port = options.port ?? HTTP2_SERVER_DEFAULT_PORT;
  }

  start() {
    return new Promise((resolve) => {
      this.#http2Server.listen(this.port, resolve);
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.#http2Server.close((err) => {
        err ? reject(err) : resolve();
      });
    });
  }
}

export class TuftSecureServer {
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
    const server = createSecureServer({ key: options.key, cert: options.cert });

    server.on('stream', handler);

    this.#http2SecureServer = server;
    this.#host = options.host ?? HTTP2_SERVER_DEFAULT_HOST;
    this.#port = options.port ?? HTTP2_SERVER_DEFAULT_PORT;
  }

  start() {
    return new Promise((resolve) => {
      this.#http2SecureServer.listen(this.port, resolve);
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.#http2SecureServer.close((err) => {
        err ? reject(err) : resolve();
      });
    });
  }
}
