import { TuftServer, TuftSecureServer, emitError, emitTimeout } from '../src/server';
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
        expect(server).toHaveProperty('host', host);
        expect(server).toHaveProperty('port', port);
      });
    });
  });

  describe('TuftServer.prototype.start()', () => {
    const server = new TuftServer(() => {});

    afterAll(async () => await server.stop());

    test('returns a promise that resolves to be undefined', async () => {
      const returnValue = await server.start();
      expect(returnValue).toBeDefined();
      expect(returnValue).toHaveProperty('host', TUFT_SERVER_DEFAULT_HOST);
      expect(returnValue).toHaveProperty('port');
      expect(typeof returnValue.port).toBe('number');
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
        expect(server).toHaveProperty('host', host);
        expect(server).toHaveProperty('port', port);
      });
    });
  });

  describe('TuftSecureServer.prototype.start()', () => {
    const server = new TuftSecureServer(() => {});

    afterAll(async () => await server.stop());

    test('returns a promise that resolves to be undefined', async () => {
      const returnValue = await server.start();
      expect(returnValue).toBeDefined();
      expect(returnValue).toHaveProperty('host', TUFT_SERVER_DEFAULT_HOST);
      expect(returnValue).toHaveProperty('port');
      expect(typeof returnValue.port).toBe('number');
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
