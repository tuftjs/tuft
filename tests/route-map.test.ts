import { constants } from 'http2';
import {
  TuftRouteMap,
  createTuft,
  primaryHandler,
  primaryErrorHandler,
} from '../src/route-map';
import { RouteManager } from '../src/route-manager';
import { TuftServer, TuftSecureServer } from '../src/server';
import { HTTP2_HEADER_STATUS } from '../src/constants';

const {
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_IMPLEMENTED,
} = constants;

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const mockStream = {
  destroyed: false,
  headersSent: false,
  on: jest.fn(),
  respond: jest.fn(),
  end: jest.fn(),
};

const mockErrorHandler = jest.fn();

beforeEach(() => {
  mockConsoleError.mockClear();
  mockExit.mockClear();

  mockStream.destroyed = false;
  mockStream.headersSent = false;
  mockStream.on.mockClear();
  mockStream.respond.mockClear();
  mockStream.end.mockClear();

  mockErrorHandler.mockClear();
});

afterAll(() => {
  mockConsoleError.mockRestore();
  mockExit.mockRestore();
});

/**
 * TuftRouteMap
 */

describe('TuftRouteMap', () => {
  describe('new TuftRouteMap()', () => {
    test('returns an instance of TuftRouteMap', () => {
      const result = new TuftRouteMap();

      expect(result).toBeInstanceOf(TuftRouteMap);
    });
  });

  describe('TuftRouteMap.prototype.add()', () => {
    describe('when the `method` property is set to [\'GET\', \'HEAD\', \'POST\']', () => {
      test('adds `GET /`, `HEAD /`, and `POST /` entries to the map', () => {
        const map = createTuft();

        map.add({
          method: ['GET', 'HEAD', 'POST'],
          response: {},
        });

        expect(map.has('GET /')).toBe(true);
        expect(map.has('HEAD /')).toBe(true);
        expect(map.has('POST /')).toBe(true);
      });
    });

    describe('when the `method` property is not set', () => {
      test('adds entries for all valid request methods to the map', () => {
        const map = createTuft();

        map.add({
          response: {},
        });

        expect(map.has('DELETE /')).toBe(true);
        expect(map.has('GET /')).toBe(true);
        expect(map.has('HEAD /')).toBe(true);
        expect(map.has('OPTIONS /')).toBe(true);
        expect(map.has('PATCH /')).toBe(true);
        expect(map.has('POST /')).toBe(true);
        expect(map.has('PUT /')).toBe(true);
        expect(map.has('TRACE /')).toBe(true);
      });
    });

    describe('when the `path` property is set to `/foo`', () => {
      test('adds a `GET /foo` entry to the map', () => {
        const map = createTuft();

        map.add({
          path: '/foo',
          method: 'GET',
          response: {},
        });

        expect(map.has('GET /foo')).toBe(true);
      });
    });

    describe('when the `path` property is not set', () => {
      test('adds a `GET /` entry to the map', () => {
        const map = createTuft();

        map.add({
          method: 'GET',
          response: {},
        });

        expect(map.has('GET /')).toBe(true);
      });
    });

    describe('when passed an options object with all supported properties set', () => {
      test('adds a `POST /foo/bar` entry to the map', () => {
        const map = createTuft({
          method: 'POST',
          basePath: '/foo',
          path: '/bar',
          trailingSlash: true,
          plugins: [() => { }],
          responders: [() => { }],
        });

        map.add({
          response: {},
        });

        expect(map.has('POST /foo/bar')).toBe(true);
      });
    });

    describe('when passed another instance of TuftRouteMap with its own custom options', () => {
      test('adds a `POST /foo/bar` entry to the map', () => {
        const map1 = createTuft({
          method: 'POST',
          basePath: '/foo',
          path: '/bar',
          trailingSlash: true,
          plugins: [() => { }],
          responders: [() => { }],
        });

        map1.add({
          response: {},
        });

        const map2 = createTuft();
        map2.add(map1);

        expect(map2.has('POST /foo/bar')).toBe(true);
      });
    });

    describe('when passed an options object with all supported properties set and when passed another instance of TuftRouteMap', () => {
      test('adds a `POST /foo` entry to the map', () => {
        const map1 = createTuft();

        map1.add({
          response: {},
        });

        const map2 = createTuft({
          method: 'POST',
          basePath: '/foo',
          path: '/bar',
          trailingSlash: true,
          plugins: [() => { }],
          responders: [() => { }],
        });

        map2.add(map1);

        expect(map2.has('POST /foo')).toBe(true);
      });
    });

    describe('when passed another instance of TuftRouteMap with no custom options', () => {
      test('adds a `GET /` entry to the map', () => {
        const map1 = createTuft();

        map1.add({
          response: {},
        });

        const map2 = createTuft();
        map2.add(map1);

        expect(map2.has('GET /')).toBe(true);
      });
    });

    describe('when passed a non-object', () => {
      test('calls console.error() and exits with error code 1', () => {
        const map = createTuft();

        //@ts-ignore
        map.add(42);

        const expectedError = TypeError('42 is not a valid route schema object.');
        expect(mockConsoleError).toHaveBeenCalledWith(expectedError);
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('TuftRouteMap.prototype.set()', () => {
    describe('when passed `GET|HEAD|POST /`', () => {
      test('adds `GET /`, `HEAD /`, and `POST /` entries to the map', () => {
        const map = createTuft();

        map.set('GET|HEAD|POST /', { response: {} });

        expect(map.has('GET /')).toBe(true);
        expect(map.has('HEAD /')).toBe(true);
        expect(map.has('POST /')).toBe(true);
      });
    });

    describe('when passed `* /`', () => {
      test('adds entries for all valid request methods to the map', () => {
        const map = createTuft();

        map.set('* /', { response: {} });

        expect(map.has('DELETE /')).toBe(true);
        expect(map.has('GET /')).toBe(true);
        expect(map.has('HEAD /')).toBe(true);
        expect(map.has('OPTIONS /')).toBe(true);
        expect(map.has('PATCH /')).toBe(true);
        expect(map.has('POST /')).toBe(true);
        expect(map.has('PUT /')).toBe(true);
        expect(map.has('TRACE /')).toBe(true);
      });
    });
  });

  describe('TuftRouteMap.prototype.redirect()', () => {
    describe('when passed `GET /foo` and `/bar`', () => {
      test('adds a `GET /foo` entry to the map', () => {
        const map = createTuft();

        map.redirect('GET /foo', '/bar');

        expect(map.get('GET /foo')).toBeDefined();
      });
    });
  });

  describe('TuftRouteMap.prototype.onError()', () => {
    test('returns TuftRouteMap.prototype', () => {
      const map = createTuft();

      expect(map.onError(() => { })).toBe(map);
    });
  });

  describe('TuftRouteMap.prototype.createServer()', () => {
    test('returns an instance of TuftServer', () => {
      const map = createTuft();
      const result = map.createServer();

      expect(result).toBeInstanceOf(TuftServer);
    });
  });

  describe('TuftRouteMap.prototype.createSecureServer()', () => {
    test('returns an instance of TuftSecureServer', () => {
      const map = createTuft();
      const result = map.createSecureServer();

      expect(result).toBeInstanceOf(TuftSecureServer);
    });
  });
});

/**
 * primaryHandler()
 */

describe('primaryHandler()', () => {
  const map = new TuftRouteMap();

  map.set('GET /foo', {
    response: {},
  });

  const routes = new RouteManager(map);

  describe('when the value of `:path` does not match a route', () => {
    test('stream.respond() is called with a 404 status code', async () => {
      const result = primaryHandler(
        routes,
        mockErrorHandler,
        //@ts-ignore
        mockStream,
        {
          ':method': 'GET',
          ':path': '/does_not_exist',
        },
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND,
      }, { endStream: true });
    });
  });

  describe('when the value of `:method` is not a supported request method', () => {
    test('stream.respond() is called with a 501 status code', async () => {
      const result = primaryHandler(
        routes,
        mockErrorHandler,
        //@ts-ignore
        mockStream,
        {
          ':method': 'LINK',
          ':path': '/foo',
        },
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_IMPLEMENTED,
      }, { endStream: true });
    });
  });


  describe('when the value of `path` includes a query string', () => {
    test('returns undefined', async () => {
      const result = primaryHandler(
        routes,
        mockErrorHandler,
        //@ts-ignore
        mockStream,
        {
          ':method': 'GET',
          ':path': '/foo?bar=baz',
        },
      );

      await expect(result).resolves.toBeUndefined();
    });
  });
});

describe('primaryHandler()', () => {
  const err = Error('mock error');
  const map = new TuftRouteMap();

  map.set('GET /foo', {
    response: () => { throw err; },
  });

  const routes = new RouteManager(map);

  describe('when the response handler throws an error', () => {
    test('the passed error handler is called', async () => {
      const result = primaryHandler(
        routes,
        mockErrorHandler,
        //@ts-ignore
        mockStream,
        {
          ':method': 'GET',
          ':path': '/foo',
        },
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockErrorHandler).toHaveBeenCalledWith(err);
    });
  });
});

/**
 * primaryErrorHandler()
 */

describe('primaryErrorHandler()', () => {
  describe('when `stream.destroyed` is set to false', () => {
    test('stream.respond() is called with a 500 status code and the passed error handler is called', async () => {
      const err = Error('mock error');
      mockStream.destroyed = false;

      const result = primaryErrorHandler(
        //@ts-ignore
        mockStream,
        mockErrorHandler,
        err,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(err);
    });
  });

  describe('when `stream.destroyed` is set to true', () => {
    test('stream.respond() is not called and the passed error handler is called', async () => {
      const err = Error('mock error');
      mockStream.destroyed = true;

      const result = primaryErrorHandler(
        //@ts-ignore
        mockStream,
        mockErrorHandler,
        err,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(err);
    });
  });

  describe('when `stream.destroyed` is set to false and `stream.headerSent` is set to true', () => {
    test('stream.respond() is not called and the passed error handler is called', async () => {
      const err = Error('mock error');
      mockStream.destroyed = false;
      mockStream.headersSent = true;

      const result = primaryErrorHandler(
        //@ts-ignore
        mockStream,
        mockErrorHandler,
        err,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(err);
    });
  });

  describe('when the provided error handler is null', () => {
    test('returns undefined', async () => {
      const err = Error('mock error');

      const result = primaryErrorHandler(
        //@ts-ignore
        mockStream,
        null,
        err,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });
});

/**
 * createTuft()
 */

describe('createTuft()', () => {
  test('returns an instance of TuftRouteMap', () => {
    const result = createTuft();

    expect(result).toBeInstanceOf(TuftRouteMap);
  });
});
