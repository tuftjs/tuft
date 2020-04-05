import { createRouteMap } from '../src/route-map';
import { TuftServer, TuftSecureServer } from '../src/server';

describe('TuftServer', () => {
  describe('Calling RouteMap.prototype.createServer()', () => {
    describe('without an options argument', () => {
      test('returns an instance of TuftServer', () => {
        const routes = createRouteMap();
        const server = routes.createServer();
        expect(server).toBeInstanceOf(TuftServer);
      });
    });

    describe('with an options argument', () => {
      test('returns an instance of TuftServer', () => {
        const routes = createRouteMap();
        const server = routes.createServer({ host: 'localhost', port: 3000 });
        expect(server).toBeInstanceOf(TuftServer);
      });
    });
  });

  describe('TuftServer.prototype.host', () => {
    test('equals \'localhost\'', () => {
      const routes = createRouteMap();
      const server = routes.createServer();
      expect(server.host).toBe('localhost');
    });
  });

  describe('TuftServer.prototype.port', () => {
    test('equals 3000', () => {
      const routes = createRouteMap();
      const server = routes.createServer();
      expect(server.port).toBe(3000);
    });
  });

  describe('Calling TuftServer.prototype.start() and TuftServer.prototype.stop()', () => {
    test('returns a promise that resolves to be undefined', async () => {
      const routes = createRouteMap();
      const server = routes.createServer();
      await expect(server.start()).resolves.toBeUndefined();
      await expect(server.stop()).resolves.toBeUndefined();
    });
  });

  describe('Calling TuftServer.prototype.stop() when the server is not running', () => {
    test('rejects with an error', async () => {
      const routes = createRouteMap();
      const server = routes.createServer();
      await expect(server.stop()).rejects.toThrow('Server is not running.');
    });
  })
});

describe('TuftSecureServer', () => {
  describe('Calling RouteMap.prototype.createSecureServer()', () => {
    describe('without an options argument', () => {
      test('returns an instance of TuftSecureServer', () => {
        const routes = createRouteMap();
        const server = routes.createSecureServer();
        expect(server).toBeInstanceOf(TuftSecureServer);
      });
    });

    describe('with an options argument', () => {
      test('returns an instance of TuftSecureServer', () => {
        const routes = createRouteMap();
        const server = routes.createSecureServer({ host: 'localhost', port: 3000 });
        expect(server).toBeInstanceOf(TuftSecureServer);
      });
    });
  });

  describe('TuftServer.prototype.host', () => {
    test('equals \'localhost\'', () => {
      const routes = createRouteMap();
      const server = routes.createSecureServer();
      expect(server.host).toBe('localhost');
    });
  });

  describe('TuftServer.prototype.port', () => {
    test('equals 3000', () => {
      const routes = createRouteMap();
      const server = routes.createSecureServer();
      expect(server.port).toBe(3000);
    });
  });

  describe('Calling TuftSecureServer.prototype.start() and TuftSecureServer.prototype.stop()', () => {
    test('returns a promise that resolves to be undefined', async () => {
      const routes = createRouteMap();
      const server = routes.createSecureServer();
      await expect(server.start()).resolves.toBeUndefined();
      await expect(server.stop()).resolves.toBeUndefined();
    });
  });

  describe('Calling TuftSecureServer.prototype.stop() when the server is not running', () => {
    test('rejects with an error', async () => {
      const routes = createRouteMap();
      const server = routes.createSecureServer();
      await expect(server.stop()).rejects.toThrow('Server is not running.');
    });
  })
});
