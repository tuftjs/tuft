import { constants } from 'http2';
import { RouteMap, createRouteMap, primaryHandler, logStreamError } from '../src/route-map';
import { RouteManager } from '../src/route-manager';
import { TuftServer, TuftSecureServer } from '../src/server';
import {
  HTTP2_HEADER_STATUS,
  HTTP_STATUS_METHOD_NOT_ALLOWED,
  HTTP_STATUS_OK
} from '../src/constants';

const { NGHTTP2_NO_ERROR } = constants;

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

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
    test('when \'preHandlers\' is set', () => {
      const preHandlers = [() => {}];

      const routes = createRouteMap();

      routes.add({
        response: {},
        preHandlers,
      });

      const route = routes.get('GET /');
      expect(route).toHaveProperty('preHandlers', preHandlers);
    });

    test('when \'errorHandler\' is set', () => {
      const errorHandler = () => { return {}; };

      const routes = createRouteMap();

      routes.add({
        response: {},
        errorHandler,
      });

      const route = routes.get('GET /');
      expect(route).toHaveProperty('errorHandler', errorHandler);
    });

    test('when custom RouteMap options are set', () => {
      const preHandlers = [() => {}];
      const errorHandler = () => { return {}; };

      const routes = createRouteMap({
        method: 'POST',
        basePath: '/foo',
        path: '/bar',
        preHandlers,
        errorHandler,
        trailingSlash: true,
        parseCookies: true,
        parseText: true,
        parseJson: true,
        parseUrlEncoded: true,
      });

      routes.add({
        response: {},
      });

      const route = routes.get('POST /foo/bar');
      expect(route).toHaveProperty('preHandlers', preHandlers);
      expect(route).toHaveProperty('errorHandler', errorHandler);
      expect(route).toHaveProperty('trailingSlash', true);
      expect(route).toHaveProperty('parseCookies', true);
      expect(route).toHaveProperty('parseText', 10_485_760);
      expect(route).toHaveProperty('parseJson', 10_485_760);
      expect(route).toHaveProperty('parseUrlEncoded', 10_485_760);
    });

    test('when \'parseText\', \'parseJson\', and \'parseUrlEncoded\' are all set to false', () => {
      const routes = createRouteMap({
        parseText: false,
        parseJson: false,
        parseUrlEncoded: false,
      });

      routes.add({
        response: {},
      });

      const route = routes.get('GET /');
      expect(route).toHaveProperty('parseText', false);
      expect(route).toHaveProperty('parseJson', false);
      expect(route).toHaveProperty('parseUrlEncoded', false);
    });

    test('when \'parseText\', \'parseJson\', and \'parseUrlEncoded\' are all set to 1000', () => {
      const routes = createRouteMap({
        parseText: 1000,
        parseJson: 1000,
        parseUrlEncoded: 1000,
      });

      routes.add({
        response: {},
      });

      const route = routes.get('GET /');
      expect(route).toHaveProperty('parseText', 1000);
      expect(route).toHaveProperty('parseJson', 1000);
      expect(route).toHaveProperty('parseUrlEncoded', 1000);
    });

    test('when passed another instance of RouteMap with its own custom options as the first argument', () => {
      const preHandlers = [() => {}];
      const errorHandler = () => { return {}; };

      const routes1 = createRouteMap({
        method: 'POST',
        preHandlers,
        errorHandler,
        basePath: '/foo',
        path: '/bar',
        trailingSlash: false,
        parseCookies: false,
        parseText: false,
        parseJson: false,
        parseUrlEncoded: false,
      });

      routes1.add({
        response: {},
      });

      const routes2 = createRouteMap();

      routes2.add(routes1);

      const route = routes2.get('POST /foo/bar');

      expect(route).toHaveProperty('preHandlers', preHandlers);
      expect(route).toHaveProperty('errorHandler', errorHandler);
      expect(route).toHaveProperty('trailingSlash', false);
      expect(route).toHaveProperty('parseCookies', false);
      expect(route).toHaveProperty('parseText', false);
      expect(route).toHaveProperty('parseJson', false);
      expect(route).toHaveProperty('parseUrlEncoded', false);
    });

    test('when custom RouteMap options are set AND when passed another instance of RouteMap', () => {
      const preHandlers = [() => {}];
      const errorHandler = () => { return {}; };

      const routes1 = createRouteMap();

      routes1.add({
        response: {},
      });

      const routes2 = createRouteMap({
        method: 'POST',
        preHandlers,
        errorHandler,
        basePath: '/foo',
        path: '/bar',
        trailingSlash: false,
        parseCookies: false,
        parseText: false,
        parseJson: false,
        parseUrlEncoded: false,
      });

      routes2.add(routes1);

      const route = routes2.get('POST /foo');

      expect(route).toHaveProperty('preHandlers', preHandlers);
      expect(route).toHaveProperty('errorHandler', errorHandler);
      expect(route).toHaveProperty('trailingSlash', false);
      expect(route).toHaveProperty('parseCookies', false);
      expect(route).toHaveProperty('parseText', false);
      expect(route).toHaveProperty('parseJson', false);
      expect(route).toHaveProperty('parseUrlEncoded', false);
    });

    test('when NO custom RouteMap options are set AND when passed another instance of RouteMap', () => {
      const routes1 = createRouteMap();

      routes1.add({
        response: {},
      });

      const routes2 = createRouteMap();

      routes2.add(routes1);

      const route = routes2.get('GET /');

      expect(route).toHaveProperty('preHandlers', []);

      expect(route).not.toHaveProperty('errorHandler');
      expect(route).not.toHaveProperty('trailingSlash');
      expect(route).not.toHaveProperty('parseCookies');
      expect(route).not.toHaveProperty('parseText');
      expect(route).not.toHaveProperty('parseJson');
      expect(route).not.toHaveProperty('parseUrlEncoded');
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
      //@ts-ignore
      primaryHandler(routes, mockStream, {
        ':method': 'GET',
        ':path': '/does_not_exist',
      });
      expect(mockStream.on).toHaveBeenCalledWith('error', logStreamError);
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
      //@ts-ignore
      primaryHandler(routes, mockStream, {
        ':method': 'LINK',
        ':path': '/foo',
      });

      expect(mockStream.on).toHaveBeenCalledWith('error', logStreamError);
      expect(mockStream.respond).toHaveBeenCalledWith({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_METHOD_NOT_ALLOWED
      }, { endStream: true });
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

  describe('stream.respond() is called with a 200 status code when', () => {
    test('the \'path\' header property includes a query string', () => {
      //@ts-ignore
      primaryHandler(routes, mockStream, {
        ':method': 'GET',
        ':path': '/foo?bar=baz',
      });

      expect(mockStream.on).toHaveBeenCalledWith('error', logStreamError);
      expect(mockStream.respond).toHaveBeenCalledWith({
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
      }, { endStream: true });
    });
  });
});

describe('logStreamError()', () => {
  const mockError = Error('mock error');

  test('calls console.error() with an error', () => {
    expect(logStreamError(mockError)).toBeUndefined();
    expect(mockConsoleError).toHaveBeenCalledWith(mockError);
  });
});
