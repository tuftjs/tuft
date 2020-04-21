import {
  TuftServer,
  TuftSecureServer,
  emitError,

  emitSessionError,
  emitTimeout,
} from '../src/server';
import { TUFT_SERVER_DEFAULT_HOST, TUFT_SERVER_DEFAULT_PORT } from '../src/constants';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

afterAll(() => {
  mockConsoleError.mockRestore();
});

describe('TuftServer', () => {
  describe('RouteMap.prototype.createServer()', () => {
    describe('without an options argument', () => {
      const server = new TuftServer(() => {});

      test('returns an instance of TuftServer with default options', () => {
        expect(server).toBeInstanceOf(TuftServer);
        expect(server).toHaveProperty('host', TUFT_SERVER_DEFAULT_HOST);
        expect(server).toHaveProperty('port', TUFT_SERVER_DEFAULT_PORT);
      });
    });

    describe('with an options argument', () => {
      const server = new TuftServer(() => {}, {
        host: 'example.com',
        port: 8080,
      });

      test('returns an instance of TuftServer with custom options', () => {
        expect(server).toBeInstanceOf(TuftServer);
        expect(server).toHaveProperty('host', 'example.com');
        expect(server).toHaveProperty('port', 8080);
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

    beforeAll(async () => await server.start());
    afterAll(async () => await server.stop());

    test('returns an object containing the expected properties', async () => {
      expect(server.address()).toHaveProperty('address');
      expect(server.address()).toHaveProperty('family');
      expect(server.address()).toHaveProperty('port');
    });
  });
});

describe('TuftSecureServer', () => {
  describe('RouteMap.prototype.createSecureServer()', () => {
    describe('without an options argument', () => {
      const server = new TuftSecureServer(() => {});

      test('returns an instance of TuftSecureServer with default options', () => {
        expect(server).toBeInstanceOf(TuftSecureServer);
        expect(server).toHaveProperty('host', TUFT_SERVER_DEFAULT_HOST);
        expect(server).toHaveProperty('port', TUFT_SERVER_DEFAULT_PORT);
      });
    });

    describe('with an options argument', () => {
      const server = new TuftSecureServer(() => {}, {
        host: 'example.com',
        port: 8080,
      });

      test('returns an instance of TuftSecureServer with custom options', () => {
        expect(server).toBeInstanceOf(TuftSecureServer);
        expect(server).toHaveProperty('host', 'example.com');
        expect(server).toHaveProperty('port', 8080);
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

  describe('TuftServer.prototype.setTimeout()', () => {
    const server = new TuftSecureServer(() => {});

    test('returns TuftServer.prototype', () => {
      expect(server.setTimeout()).toBe(server);
    });
  });

  describe('TuftSecureServer.prototype.address()', () => {
    const server = new TuftSecureServer(() => {});

    beforeAll(async () => await server.start());
    afterAll(async () => await server.stop());

    test('returns an object containing the expected properties', async () => {
      expect(server.address()).toHaveProperty('address');
      expect(server.address()).toHaveProperty('family');
      expect(server.address()).toHaveProperty('port');
    });
  });
});

describe('emitError()', () => {
  const server = new TuftServer(() => {});
  const mockError = Error('mock error');
  const mockCallback = jest.fn();
  server.on('error', mockCallback);

  describe('when bound to an instance of TuftServer', () => {
    test('results in the \'error event being emitted\'', () => {
      const emit = emitError.bind(server);
      expect(emit(mockError)).toBeUndefined();
      expect(mockCallback).toHaveBeenCalledWith(mockError);
    });
  });
});

describe('emitSessionError()', () => {
  const server = new TuftServer(() => {});
  const mockSessionError = Error('mock session error');
  const mockCallback = jest.fn();
  server.on('sessionError', mockCallback);

  describe('when bound to an instance of TuftServer', () => {
    test('results in the \'error event being emitted\'', () => {
      const emit = emitSessionError.bind(server);
      expect(emit(mockSessionError)).toBeUndefined();
      expect(mockCallback).toHaveBeenCalledWith(mockSessionError);
    });
  });
});

describe('emitTimeout()', () => {
  const server = new TuftServer(() => {});
  const mockCallback = jest.fn();
  server.on('timeout', mockCallback);

  describe('when bound to an instance of TuftServer', () => {
    test('results in the \'error event being emitted\'', () => {
      const emit = emitTimeout.bind(server);
      expect(emit()).toBeUndefined();
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
