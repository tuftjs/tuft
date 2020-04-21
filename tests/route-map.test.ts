import type { TuftContext } from '../src/context';

import { constants } from 'http2';
import {
  RouteMap,
  createRouteMap,
  primaryHandler,
  streamErrorHandler,
  defaultErrorHandler,
} from '../src/route-map';
import { RouteManager } from '../src/route-manager';
import { TuftServer, TuftSecureServer } from '../src/server';
import { HTTP2_HEADER_STATUS } from '../src/constants';

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_METHOD_NOT_ALLOWED,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  NGHTTP2_NO_ERROR,
} = constants;

function mockPlugin(t: TuftContext) {
  t.request.foo = 42;
}

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

beforeEach(() => {
  mockConsoleError.mockClear();
  mockExit.mockClear();
});

afterAll(() => {
  mockConsoleError.mockRestore();
  mockExit.mockRestore();
});

describe('createRouteMap()', () => {
  test('returns an instance of RouteMap', () => {
    expect(createRouteMap()).toBeInstanceOf(RouteMap);
  });
});

describe('RouteMap.prototype.add()', () => {
  describe('adds a value to the map', () => {
    test('when \'method\' is set', () => {
      const routes = createRouteMap();

      routes.add({
        method: ['GET', 'HEAD', 'POST'],
        response: {},
      });

      expect(routes.get('GET /')).toBeDefined();
      expect(routes.get('HEAD /')).toBeDefined();
      expect(routes.get('POST /')).toBeDefined();

      expect(routes.get('CONNECT /')).toBeUndefined();
      expect(routes.get('DELETE /')).toBeUndefined();
      expect(routes.get('OPTIONS /')).toBeUndefined();
      expect(routes.get('PATCH /')).toBeUndefined();
      expect(routes.get('PUT /')).toBeUndefined();
      expect(routes.get('TRACE /')).toBeUndefined();
    });

    test('when \'method\' is NOT set', () => {
      const routes = createRouteMap();

      routes.add({
        response: {},
      });

      expect(routes.get('CONNECT /')).toBeDefined();
      expect(routes.get('DELETE /')).toBeDefined();
      expect(routes.get('GET /')).toBeDefined();
      expect(routes.get('HEAD /')).toBeDefined();
      expect(routes.get('OPTIONS /')).toBeDefined();
      expect(routes.get('PATCH /')).toBeDefined();
      expect(routes.get('POST /')).toBeDefined();
      expect(routes.get('PUT /')).toBeDefined();
      expect(routes.get('TRACE /')).toBeDefined();
    });

    test('when \'path\' is set', () => {
      const routes = createRouteMap();

      routes.add({
        path: '/foo',
        response: {},
      });

      expect(routes.get('GET /foo')).toBeDefined();
      expect(routes.get('GET /')).toBeUndefined();
    });

    test('when \'path\' is NOT set', () => {
      const routes = createRouteMap();

      routes.add({
        response: {},
      });

      expect(routes.get('GET /')).toBeDefined();
    });
  });

  describe('adds an object with the correct properties', () => {
    test('when custom RouteMap options are set', () => {
      const routes = createRouteMap({
        method: 'POST',
        basePath: '/foo',
        path: '/bar',
        trailingSlash: true,
      });

      routes.add({
        response: {},
      });

      const route = routes.get('POST /foo/bar');
      expect(route).toHaveProperty('trailingSlash', true);
    });

    test('when passed another instance of RouteMap with its own custom options as the first argument', () => {
      const routes1 = createRouteMap({
        method: 'POST',
        basePath: '/foo',
        path: '/bar',
        trailingSlash: false,
        plugins: [
          mockPlugin,
        ]
      });

      routes1.add({
        response: {},
      });

      const routes2 = createRouteMap();

      routes2.add(routes1);

      const route = routes2.get('POST /foo/bar');

      expect(route).toHaveProperty('trailingSlash', false);
    });

    test('when custom RouteMap options are set AND when passed another instance of RouteMap', () => {
      const routes1 = createRouteMap();

      routes1.add({
        response: {},
      });

      const routes2 = createRouteMap({
        method: 'POST',
        basePath: '/foo',
        path: '/bar',
        trailingSlash: false,
        plugins: [
          mockPlugin,
        ]
      });

      routes2.add(routes1);

      const route = routes2.get('POST /foo');

      expect(route).toHaveProperty('trailingSlash', false);
    });

    test('when NO custom RouteMap options are set AND when passed another instance of RouteMap', () => {
      const routes1 = createRouteMap();

      routes1.add({
        response: {},
      });

      const routes2 = createRouteMap();

      routes2.add(routes1);

      const route = routes2.get('GET /');

      expect(route).not.toHaveProperty('plugins');
      expect(route).not.toHaveProperty('errorHandler');
      expect(route).not.toHaveProperty('trailingSlash');
    });
  });
});

describe('RouteMap.prototype.add()', () => {
  describe('when an invalid schema is passed as the first argument', () => {
    test('the program exits with error code 1', () => {
      const routes = createRouteMap();

      //@ts-ignore
      routes.add(42);

      const err = TypeError('42 is not a valid route schema object.');
      expect(mockConsoleError).toHaveBeenCalledWith(err);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});

describe('RouteMap.prototype.set()', () => {
  describe('adds a value to the map', () => {
    test('when passed \'GET|POST|PUT /foo\'', () => {
      const routes = createRouteMap();

      routes.set('GET|HEAD|POST /foo', { response: {} });

      expect(routes.get('GET /foo')).toBeDefined();
      expect(routes.get('HEAD /foo')).toBeDefined();
      expect(routes.get('POST /foo')).toBeDefined();

      expect(routes.get('CONNECT /foo')).toBeUndefined();
      expect(routes.get('DELETE /foo')).toBeUndefined();
      expect(routes.get('OPTIONS /foo')).toBeUndefined();
      expect(routes.get('PATCH /foo')).toBeUndefined();
      expect(routes.get('PUT /foo')).toBeUndefined();
      expect(routes.get('TRACE /foo')).toBeUndefined();
    });

    test('when passed \'* /foo\'', () => {
      const routes = createRouteMap();

      routes.set('* /foo', { response: {} });

      expect(routes.get('GET /foo')).toBeDefined();
      expect(routes.get('HEAD /foo')).toBeDefined();
      expect(routes.get('POST /foo')).toBeDefined();
      expect(routes.get('CONNECT /foo')).toBeDefined();
      expect(routes.get('DELETE /foo')).toBeDefined();
      expect(routes.get('OPTIONS /foo')).toBeDefined();
      expect(routes.get('PATCH /foo')).toBeDefined();
      expect(routes.get('PUT /foo')).toBeDefined();
      expect(routes.get('TRACE /foo')).toBeDefined();
    });
  });
});

describe('RouteMap.prototype.redirect()', () => {
  describe('adds a value to the map', () => {
    test('when passed \'GET /foo\', \'/bar\'', () => {
      const routes = createRouteMap();

      routes.redirect('GET /foo', '/bar');

      expect(routes.get('GET /foo')).toBeDefined();

      expect(routes.get('HEAD /foo')).toBeUndefined();
      expect(routes.get('POST /foo')).toBeUndefined();
      expect(routes.get('CONNECT /foo')).toBeUndefined();
      expect(routes.get('DELETE /foo')).toBeUndefined();
      expect(routes.get('OPTIONS /foo')).toBeUndefined();
      expect(routes.get('PATCH /foo')).toBeUndefined();
      expect(routes.get('PUT /foo')).toBeUndefined();
      expect(routes.get('TRACE /foo')).toBeUndefined();
    });
  });
});

describe('RouteMap.prototype.onError()', () => {
  test('returns RouteMap.prototype', () => {
    const routes = createRouteMap();
    expect(routes.onError(() => {})).toBe(routes);
  });
});

describe('RouteMap.prototype.createServer()', () => {
  const routes = createRouteMap();

  test('returns an instance of TuftServer', () => {
    expect(routes.createServer()).toBeInstanceOf(TuftServer);
  });
});

describe('RouteMap.prototype.createSecureServer()', () => {
  const routes = createRouteMap();

  test('returns an instance of TuftSecureServer', () => {
    expect(routes.createSecureServer()).toBeInstanceOf(TuftSecureServer);
  });
});

describe('primaryHandler()', () => {
  const mockStream = {
    on: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(() => {
    mockStream.close.mockClear();
  });

  const routeMap = new RouteMap();

  routeMap.set('GET /foo', {
    response: {},
  });

  const routes = new RouteManager(routeMap);

  describe('stream.close() is called with 0 when', () => {
    test('the value of the \':path\' header does not match a route', () => {
      const errorHandler = () => {};

      //@ts-ignore
      primaryHandler(routes, errorHandler, mockStream, {
        ':method': 'GET',
        ':path': '/does_not_exist',
      });

      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_NO_ERROR);
    });
  });
});

describe('primaryHandler()', () => {
  const mockStream = {
    on: jest.fn(),
    respond: jest.fn(),
  };

  const routeMap = new RouteMap();

  routeMap.set('GET /foo', {
    response: {},
  });

  const routes = new RouteManager(routeMap);

  describe('stream.respond() is called with a 405 status code when', () => {
    test('the value of \':method\' is not a valid request method', () => {
      const errorHandler = () => {};

      //@ts-ignore
      primaryHandler(routes, errorHandler, mockStream, {
        ':method': 'LINK',
        ':path': '/foo',
      });

      expect(mockStream.respond).toHaveBeenCalledWith({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_METHOD_NOT_ALLOWED
      }, { endStream: true });
    });
  });
});

describe('primaryHandler()', () => {
  const mockStream = {
    destroyed: false,
    headersSent: false,
    on: jest.fn(),
    emit: jest.fn(),
    respond: jest.fn(),
  };

  const routeMap = new RouteMap();

  routeMap.set('GET /foo', {
    response: {},
  });

  routeMap.set('GET /bar', {
    response: () => {
      throw Error('mock error');
    },
  });

  const routes = new RouteManager(routeMap);

  beforeEach(() => {
    mockStream.on.mockClear();
    mockStream.emit.mockClear();
    mockStream.respond.mockClear();
  });

  describe('stream.respond() is called with a 200 status code when', () => {
    test('the \'path\' header property includes a query string', async () => {
      const errorHandler = () => {};

      //@ts-ignore
      await primaryHandler(routes, errorHandler, mockStream, {
        ':method': 'GET',
        ':path': '/foo?bar=baz',
      });

      expect(mockStream.respond).toHaveBeenCalledWith({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
      }, { endStream: true });
    });
  });

  describe('stream.emit() is called when', () => {
    test('a response handler throws an error', async () => {
      const mockStreamErrorHandler = jest.fn();

      //@ts-ignore
      await primaryHandler(routes, mockStreamErrorHandler, mockStream, {
        ':method': 'GET',
        ':path': '/bar',
      });

      expect(mockStreamErrorHandler).toHaveBeenCalledWith(Error('mock error'));
    });
  });
});

describe('streamErrorHandler()', () => {
  const mockStreamErrorHandler = jest.fn();

  const mockStream = {
    destroyed: false,
    headersSent: false,
    closed: false,
    respond: jest.fn(),
    close: jest.fn(),
  };
  const mockError = Error('mock error');

  beforeEach(() => {
    mockStream.destroyed = false;
    mockStream.headersSent = false;
    mockStream.respond.mockClear();
    mockStream.close.mockClear();
    mockStreamErrorHandler.mockClear();
  });

  describe('when `stream.destroyed` and `stream.headerSent` are set to false', () => {
    test('calls the passed error handler with an error', async () => {
      //@ts-ignore
      const result = streamErrorHandler(mockStream, mockStreamErrorHandler, mockError);

      await expect(result).resolves.toBeUndefined();

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      };

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStreamErrorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('when `stream.destroyed` is set to true', () => {
    test('calls the passed error handler with an error', async () => {
      mockStream.destroyed = true;

      //@ts-ignore
      const result = streamErrorHandler(mockStream, mockStreamErrorHandler, mockError);

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStreamErrorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('when `stream.destroyed` is false and `stream.headerSent` is true', () => {
    test('calls the passed error handler with an error', async () => {
      mockStream.destroyed = false;
      mockStream.headersSent = true;

      //@ts-ignore
      const result = streamErrorHandler(mockStream, mockStreamErrorHandler, mockError);

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_NO_ERROR);
      expect(mockStreamErrorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('when `stream.closed` is set to true', () => {
    test('calls the passed error handler with an error', async () => {
      mockStream.destroyed = false;
      mockStream.headersSent = true;
      mockStream.closed = true;

      //@ts-ignore
      const result = streamErrorHandler(mockStream, mockStreamErrorHandler, mockError);

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStreamErrorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('when the passed error handler throws an error', () => {
    test('calls console.error() with the expected argument', async () => {
      mockStream.destroyed = true;

      const mockError = Error('mock error');
      const mockStreamErrorHandler = jest.fn(() => {
        throw mockError;
      });

      //@ts-ignore
      const result = streamErrorHandler(mockStream, mockStreamErrorHandler, mockError);

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStreamErrorHandler).toHaveBeenCalledWith(mockError);
      expect(mockConsoleError).toHaveBeenCalledWith(mockError);
    });
  });
});

describe('defaultErrorHandler()', () => {
  test('calls console.error() with the expected argument', () => {
    const mockError = Error('mock error');
    expect(defaultErrorHandler(mockError)).toBeUndefined();
    expect(mockConsoleError).toHaveBeenCalledWith(mockError);
  });
});
