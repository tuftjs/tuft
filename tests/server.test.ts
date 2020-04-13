import { TuftServer, TuftSecureServer, logServerError } from '../src/server';

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
        expect(server).toHaveProperty('host', 'localhost');
        expect(server).toHaveProperty('port', 3000);
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
});

describe('TuftSecureServer', () => {
  describe('RouteMap.prototype.createSecureServer()', () => {
    describe('without an options argument', () => {
      const server = new TuftSecureServer(() => {});

      test('returns an instance of TuftSecureServer with default options', () => {
        expect(server).toBeInstanceOf(TuftSecureServer);
        expect(server).toHaveProperty('host', 'localhost');
        expect(server).toHaveProperty('port', 3000);
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
});

describe('logServerError()', () => {
  const mockError = Error('mock error');

  test('calls console.error() with an error', () => {
    expect(logServerError(mockError)).toBeUndefined();
    expect(mockConsoleError).toHaveBeenCalledWith(mockError);
  });
});
