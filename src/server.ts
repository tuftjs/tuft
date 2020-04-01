import type { Http2Server, Http2SecureServer, ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { KeyObject } from 'tls';

import { createServer, createSecureServer } from 'http2';

export type ServerOptions = {
  host?: string,
  port?: number,
}

export type SecureServerOptions = {
  key: string | Buffer | (Buffer | KeyObject)[],
  cert: string | Buffer | (string | Buffer)[],
  host?: string,
  port?: number,
}

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 3000;

class Server {
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
    this.#host = options.host ?? DEFAULT_HOST;
    this.#port = options.port ?? DEFAULT_PORT;
  }

  start() {
    return new Promise((resolve) => {
      this.#http2Server.listen(this.port, resolve);
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.#http2Server.close((err) => {
        err ? reject() : resolve();
      });
    });
  }
}

class SecureServer {
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
    options: SecureServerOptions,
  ) {
    const server = createSecureServer({ key: options.key, cert: options.cert });

    server.on('stream', handler);

    this.#http2SecureServer = server;
    this.#host = options.host ?? DEFAULT_HOST;
    this.#port = options.port ?? DEFAULT_PORT;
  }

  start() {
    return new Promise((resolve) => {
      this.#http2SecureServer.listen(this.port, resolve);
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.#http2SecureServer.close((err) => {
        err ? reject() : resolve();
      });
    });
  }
}

export { Server, SecureServer };
