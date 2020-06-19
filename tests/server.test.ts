import type { IncomingMessage, ServerResponse } from 'http';
import type { Stats } from 'fs';
import { Readable, Writable } from 'stream';
import { join } from 'path';
import fs = require('fs');
import {
  TuftServer,
  TuftSecureServer,
  emitError,
  emitSessionError,
  emitTimeout,
  Http2CompatibleServerStream,
  http1CompatibleHandler,
} from '../src/server';
import { TUFT_SERVER_DEFAULT_HOST, TUFT_SERVER_DEFAULT_PORT } from '../src/constants';

const mockCallback = jest.fn();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  mockCallback.mockClear();
});

afterAll(() => {
  mockConsoleError.mockRestore();
});

/**
 * TuftServer
 */

describe('TuftServer', () => {
  describe('new TuftServer()', () => {
    describe('without an options argument', () => {
      const server = new TuftServer(() => {});

      test('returns an instance of TuftServer with default options', () => {
        expect(server).toBeInstanceOf(TuftServer);
        expect(server).toHaveProperty('protocol', 'http2');
        expect(server).toHaveProperty('host', TUFT_SERVER_DEFAULT_HOST);
        expect(server).toHaveProperty('port', TUFT_SERVER_DEFAULT_PORT);
      });
    });

    describe('with an options argument', () => {
      const host = 'example.com';
      const port = 8080;
      const server = new TuftServer(() => {}, { host, port });

      test('returns an instance of TuftServer with custom options', () => {
        expect(server).toBeInstanceOf(TuftServer);
        expect(server).toHaveProperty('protocol', 'http2');
        expect(server).toHaveProperty('host', host);
        expect(server).toHaveProperty('port', port);
      });
    });

    describe('with \'http1\' option set to true', () => {
      const server = new TuftServer(() => {}, { http1: true });

      test('returns an instance of TuftServer with custom options', () => {
        expect(server).toBeInstanceOf(TuftServer);
        expect(server).toHaveProperty('protocol', 'http1');
      });
    });
  });

  describe('TuftServer.prototype.start()', () => {
    const server = new TuftServer(() => {});

    afterAll(async () => await server.stop());

    test('returns a promise that resolves to be undefined', async () => {
      await expect(server.start()).resolves.toBeUndefined();
    });
  });

  describe('TuftServer.prototype.stop()', () => {
    const server = new TuftServer(() => {});

    describe('when the server is running', () => {
      beforeAll(async () => await server.start());

      test('returns a promise that resolves to be undefined', async () => {
        await expect(server.stop()).resolves.toBeUndefined();
      });
    });
  });

  describe('TuftServer.prototype.stop()', () => {
    const server = new TuftServer(() => {});

    describe('when the server is NOT running', () => {
      test('returns a promise that rejects with an error', async () => {
        await expect(server.stop()).rejects.toThrow('Server is not running.');
      });
    });
  });

  describe('TuftServer.prototype.setTimeout()', () => {
    const server = new TuftServer(() => {});

    test('returns TuftServer.prototype', () => {
      expect(server.setTimeout()).toBe(server);
    });
  });

  describe('TuftServer.prototype.address()', () => {
    const server = new TuftServer(() => {});

    describe('when the server is running', () => {
      test('returns an object containing the expected properties', async () => {
        await server.start();
        const result = server.address();

        expect(result).toHaveProperty('address');
        expect(result).toHaveProperty('family');
        expect(result).toHaveProperty('port');

        await server.stop();
      });
    });

    describe('when the server is not running', () => {
      test('returns null', async () => {
        const result = server.address();

        expect(result).toBe(null);
      });
    });
  });
});

/**
 * TuftSecureServer
 */

describe('TuftSecureServer', () => {
  describe('new TuftSecureServer()', () => {
    describe('without an options argument', () => {
      const server = new TuftSecureServer(() => {});

      test('returns an instance of TuftSecureServer with default options', () => {
        expect(server).toBeInstanceOf(TuftSecureServer);
        expect(server).toHaveProperty('protocol', 'http2');
        expect(server).toHaveProperty('host', TUFT_SERVER_DEFAULT_HOST);
        expect(server).toHaveProperty('port', TUFT_SERVER_DEFAULT_PORT);
      });
    });

    describe('with an options argument', () => {
      const host = 'example.com';
      const port = 8080;
      const server = new TuftSecureServer(() => {}, { host, port });

      test('returns an instance of TuftSecureServer with custom options', () => {
        expect(server).toBeInstanceOf(TuftSecureServer);
        expect(server).toHaveProperty('protocol', 'http2');
        expect(server).toHaveProperty('host', host);
        expect(server).toHaveProperty('port', port);
      });
    });

    describe('with \'http1\' option set to true', () => {
      const server = new TuftSecureServer(() => {}, { http1: true });

      test('returns an instance of TuftServer with custom options', () => {
        expect(server).toBeInstanceOf(TuftSecureServer);
        expect(server).toHaveProperty('protocol', 'http1');
      });
    });
  });

  describe('TuftSecureServer.prototype.start()', () => {
    const server = new TuftSecureServer(() => {});

    afterAll(async () => await server.stop());

    test('returns a promise that resolves to be undefined', async () => {
      await expect(server.start()).resolves.toBeUndefined();
    });
  });

  describe('TuftSecureServer.prototype.stop()', () => {
    const server = new TuftSecureServer(() => {});

    describe('when the server is running', () => {
      beforeAll(async () => await server.start());

      test('returns a promise that resolves to be undefined', async () => {
        await expect(server.stop()).resolves.toBeUndefined();
      });
    });
  });

  describe('TuftSecureServer.prototype.stop()', () => {
    const server = new TuftSecureServer(() => {});

    describe('when the server is NOT running', () => {
      test('returns a promise that rejects with an error', async () => {
        await expect(server.stop()).rejects.toThrow('Server is not running.');
      });
    });
  });

  describe('TuftSecureServer.prototype.setTimeout()', () => {
    const server = new TuftSecureServer(() => {});

    test('returns TuftSecureServer.prototype', () => {
      expect(server.setTimeout()).toBe(server);
    });
  });

  describe('TuftSecureServer.prototype.address()', () => {
    const server = new TuftSecureServer(() => {});

    describe('when the server is running', () => {
      test('returns an object containing the expected properties', async () => {
        await server.start();
        const result = server.address();

        expect(result).toHaveProperty('address');
        expect(result).toHaveProperty('family');
        expect(result).toHaveProperty('port');

        await server.stop();
      });
    });

    describe('when the server is not running', () => {
      test('returns null', async () => {
        const result = server.address();

        expect(result).toBe(null);
      });
    });
  });
});

/**
 * emitError()
 */

describe('emitError()', () => {
  const server = new TuftServer(() => {});
  const err = Error('mock error');

  server.on('error', mockCallback);

  describe('when bound to an instance of TuftServer and passed an error', () => {
    test('mock callback is called with the same error', () => {
      const result = emitError.bind(server)(err);

      expect(result).toBeUndefined();
      expect(mockCallback).toHaveBeenCalledWith(err);
    });
  });
});

/**
 * emitSessionError()
 */

describe('emitSessionError()', () => {
  const server = new TuftServer(() => {});
  const err = Error('mock error');

  server.on('sessionError', mockCallback);

  describe('when bound to an instance of TuftServer and passed an error', () => {
    test('mock callback is called with the same error', () => {
      const result = emitSessionError.bind(server)(err);

      expect(result).toBeUndefined();
      expect(mockCallback).toHaveBeenCalledWith(err);
    });
  });
});

/**
 * emitTimeout()
 */

describe('emitTimeout()', () => {
  const server = new TuftServer(() => {});

  server.on('timeout', mockCallback);

  describe('when bound to an instance of TuftServer and called', () => {
    test('mock callback is called', () => {
      const result = emitTimeout.bind(server)();

      expect(result).toBeUndefined();
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});

/**
 * Http2CompatibleServerStream
 */

describe('Http2CompatibleServerStream', () => {
  describe('Reading from the stream', () => {
    test('results in the expected data', done => {
      const mockRequest = Readable.from(['a', 'b', 'c']) as IncomingMessage;
      const mockResponse = new Writable({
        write: (_, __, callback) => {
          callback();
        },
      }) as ServerResponse;

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      const data: string[] = [];

      stream.on('data', chunk => {
        data.push(chunk.toString());
      });
      stream.on('end', () => {
        expect(data).toEqual(['a', 'b', 'c']);
        done();
      });
    });
  });

  describe('Writing to the stream', () => {
    test('results in the expected data', done => {
      const data: string[] = [];
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (chunk, _, callback) => {
          data.push(chunk.toString());
          callback();
        },
      }) as ServerResponse;

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      stream.write('a');
      stream.write('b');
      stream.end('c', () => {
        expect(data).toEqual(['a', 'b', 'c']);
        done();
      });
    });
  });

  describe('stream.respond()', () => {
    test('Calls the expected mock functions', () => {
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (_, __, callback) => {
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();
      mockResponse.end = jest.fn();

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      stream.respond();
      expect(mockResponse.writeHead).toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
    });
  });

  describe('stream.respond() with status header', () => {
    test('Calls the expected mock functions', () => {
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (_, __, callback) => {
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();
      mockResponse.end = jest.fn();

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      stream.respond({ status: 200 });
      expect(mockResponse.writeHead).toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
    });
  });

  describe('stream.respond() with :status header', () => {
    test('Calls the expected mock functions', () => {
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (_, __, callback) => {
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();
      mockResponse.end = jest.fn();

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      stream.respond({ ':status': '200' });
      expect(mockResponse.writeHead).toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
    });
  });

  describe('stream.respond() with \'endStream\' set to true', () => {
    test('Calls the expected mock functions', () => {
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (_, __, callback) => {
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();
      mockResponse.end = jest.fn();

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      stream.respond({}, { endStream: true });
      expect(mockResponse.writeHead).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('stream.respondWithFile()', () => {
    test('Calls the expected mock functions', done => {
      const data: string[] = [];
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (chunk, __, callback) => {
          data.push(chunk.toString());
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      stream.respondWithFile(join(__dirname, 'mocks', 'abc.txt'));
      expect(mockResponse.writeHead).toHaveBeenCalled();

      mockResponse.on('finish', () => {
        expect(data).toEqual(['abc\n']);
        done();
      });
    });
  });

  describe('stream.respondWithFile() with \'offsent\' and \'length\' options', () => {
    test('Calls the expected mock functions', done => {
      const data: string[] = [];
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (chunk, __, callback) => {
          data.push(chunk.toString());
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      stream.respondWithFile(join(__dirname, 'mocks', 'abc.txt'), {}, { offset: 0, length: 1 });
      expect(mockResponse.writeHead).toHaveBeenCalled();

      mockResponse.on('finish', () => {
        expect(data).toEqual(['a']);
        done();
      });
    });
  });

  describe('stream.respondWithFile() with \'statCheck\' option', () => {
    test('Calls the expected mock functions', done => {
      const data: string[] = [];
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (chunk, __, callback) => {
          data.push(chunk.toString());
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();
      const mockFsStat = jest.spyOn(fs, 'stat').mockImplementation((_, callback) => {
        //@ts-expect-error
        callback(null, {} as Stats);
      });

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      const statCheck = jest.fn();

      stream.respondWithFile(join(__dirname, 'mocks', 'abc.txt'), {}, { statCheck });
      expect(mockResponse.writeHead).toHaveBeenCalled();

      mockResponse.on('finish', () => {
        expect(data).toEqual(['abc\n']);
        expect(mockFsStat).toHaveBeenCalled();
        expect(statCheck).toHaveBeenCalled();
        mockFsStat.mockRestore();
        done();
      });
    });
  });

  describe('stream.respondWithFile() with \'statCheck\' option that receives an error', () => {
    test('Calls the expected mock functions', done => {
      const data: string[] = [];
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (chunk, __, callback) => {
          data.push(chunk.toString());
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();
      const mockFsStat = jest.spyOn(fs, 'stat').mockImplementation((_, callback) => {
        //@ts-expect-error
        callback(Error('mock error'), {} as Stats);
      });

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      const statCheck = jest.fn();

      stream.on('error', err => {
        expect(err).toEqual(Error('mock error'));
        expect(mockResponse.writeHead).not.toHaveBeenCalled();
        expect(data).toEqual([]);
        expect(mockFsStat).toHaveBeenCalled();
        expect(statCheck).not.toHaveBeenCalled();
        mockFsStat.mockRestore();
        done();
      });

      stream.respondWithFile(join(__dirname, 'mocks', 'text-file.txt'), {}, { statCheck });
    });
  });

  describe('stream.respondWithFile() with \'onError\' option', () => {
    test('Calls the expected mock functions', done => {
      const data: string[] = [];
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (chunk, __, callback) => {
          data.push(chunk.toString());
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      const onError = jest.fn();

      stream.respondWithFile(join(__dirname, 'mocks', 'abc.txt'), {}, { onError });
      expect(mockResponse.writeHead).toHaveBeenCalled();

      mockResponse.on('finish', () => {
        expect(data).toEqual(['abc\n']);
        expect(onError).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('stream.respondWithFile() with \'onError\' option and \'statCheck\' option that receives an error', () => {
    test('Calls the expected mock functions', done => {
      const data: string[] = [];
      const mockRequest = Readable.from([]) as IncomingMessage;
      const mockResponse = new Writable({
        write: (chunk, __, callback) => {
          data.push(chunk.toString());
          callback();
        },
      }) as ServerResponse;
      mockResponse.writeHead = jest.fn();
      const mockFsStat = jest.spyOn(fs, 'stat').mockImplementation((_, callback) => {
        //@ts-expect-error
        callback(Error('mock error'), {} as Stats);
      });

      const stream = new Http2CompatibleServerStream(mockRequest, mockResponse);
      expect(stream).toBeInstanceOf(Http2CompatibleServerStream);

      const statCheck = jest.fn();
      const onError = jest.fn(err => {
        expect(err).toEqual(Error('mock error'));
        expect(mockResponse.writeHead).not.toHaveBeenCalled();
        expect(data).toEqual([]);
        expect(mockFsStat).toHaveBeenCalled();
        expect(statCheck).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalled();
        mockFsStat.mockRestore();
        done();
      });

      stream.respondWithFile(join(__dirname, 'mocks', 'text-file.txt'), {}, { statCheck, onError });
    });
  });
});

/**
 * http1CompatibleHandler()
 */

describe('http1CompatibleHandler()', () => {
  test('calls the passed handler', () => {
    const handler = jest.fn();
    const request = {
      headers: {},
    } as IncomingMessage;
    const response = {} as ServerResponse;

    const result = http1CompatibleHandler(handler, request, response);

    expect(result).toBeUndefined();
    expect(handler).toHaveBeenCalled();
  });
});
