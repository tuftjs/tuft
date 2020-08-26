import { TuftServer, TuftSecureServer } from '../src/server';
import {
  TuftRouteMap,
  handleStaticFileGetRequest,
  handleStaticFileHeadRequest,
  getFilePaths,
  createStaticFileResponseObject,
  primaryHandler,
  primaryErrorHandler,
} from '../src/route-map';
import {
  HTTP_HEADER_ACCEPT_RANGES,
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_LAST_MODIFIED,
  HTTP_HEADER_CONTENT_LENGTH,
  HTTP_HEADER_CONTENT_RANGE,
  HTTP_STATUS_OK,
  HTTP_STATUS_PARTIAL_CONTENT,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_IMPLEMENTED
} from '../src/constants';
import { promises as fsPromises } from 'fs';
import { resolve } from 'path';

const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => { });

const mockExit = jest
  .spyOn(process, 'exit')
  .mockImplementation(() => undefined as never);

const mockContext: any = {
  _outgoingHeaders: {},
  request: {
    headers: {},
  },
  setHeader: jest.fn((key, value) => {
    mockContext._outgoingHeaders[key] = value;
    return mockContext;
  }),
  getHeader: jest.fn((key) => {
    return mockContext._outgoingHeaders[key];
  }),
};

const mockErrorHandler = jest.fn();

beforeEach(() => {
  mockContext._outgoingHeaders = {},
  mockContext.request = {
    headers: {},
  };
});

afterAll(() => {
  jest.restoreAllMocks();
});

/**
 * TuftRouteMap
 */

describe('TuftRouteMap', () => {
  describe('TuftRouteMap.prototype.merge()', () => {
    describe('when passed another instance of TuftRouteMap with its own custom options', () => {
      test('adds a `GET /foo/bar` entry to the map', () => {
        const map1 = new TuftRouteMap({
          basePath: '/foo',
          trailingSlash: true,
          preHandlers: [() => { }],
          responders: [() => { }],
        });
        const map2 = new TuftRouteMap();

        map1.set('GET /bar', {});
        map2.merge(map1);

        expect(map2.has('GET /foo/bar')).toBe(true);
      });
    });

    describe('when passed an options object with all supported properties set and when passed another instance of TuftRouteMap', () => {
      test('adds a `GET /foo/bar` entry to the map', () => {
        const map1 = new TuftRouteMap();
        const map2 = new TuftRouteMap({
          basePath: '/foo',
          trailingSlash: true,
          trustProxy: true,
          preHandlers: [() => { }],
          responders: [() => { }],
        });

        map1.set('GET /bar', {});
        map2.merge(map1);

        expect(map2.has('GET /foo/bar')).toBe(true);
      });
    });

    describe('when passed another instance of TuftRouteMap with no custom options', () => {
      test('adds a `GET /foo` entry to the map', () => {
        const map1 = new TuftRouteMap();
        const map2 = new TuftRouteMap();

        map1.set('GET /foo', {});
        map2.merge(map1);

        expect(map2.has('GET /foo')).toBe(true);
      });
    });

    describe('when adding a route with a lone slash that gets merged with a base path', () => {
      test('adds a `GET /` entry to the map', () => {
        const map1 = new TuftRouteMap();
        const map2 = new TuftRouteMap({ basePath: '/foo' });

        map1.set('GET /', {});
        map2.merge(map1);

        expect(map2.has('GET /foo')).toBe(true);
      });
    });
  });

  describe('TuftRouteMap.prototype.set()', () => {
    describe('when passed `GET|HEAD|POST /`', () => {
      test('adds `GET /`, `HEAD /`, and `POST /` entries to the map', () => {
        const map = new TuftRouteMap();

        map.set('GET|HEAD|POST /', {});

        expect(map.has('GET /')).toBe(true);
        expect(map.has('HEAD /')).toBe(true);
        expect(map.has('POST /')).toBe(true);
      });
    });

    describe('when passed `/`', () => {
      test('adds entries for all valid request methods to the map', () => {
        const map = new TuftRouteMap();

        map.set('/', {});

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
        const map = new TuftRouteMap();

        map.redirect('GET /foo', '/bar');

        expect(map.has('GET /foo')).toBe(true);
      });
    });
  });

  describe('TuftRouteMap.prototype.static()', () => {
    describe('when passed `/` and `abc.txt`', () => {
      test('adds `GET /abc.txt` and `HEAD /abc.txt` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/', './mock-assets/abc.txt');

        const getResult = map.get('GET /abc.txt');
        expect(getResult).toBeDefined();
        expect(typeof getResult.response).toBe('function');

        const headResult = map.get('HEAD /abc.txt');
        expect(headResult).toBeDefined();
        expect(typeof headResult.response).toBe('function');

        expect(map.get('DELETE /abc.txt')).toBeUndefined();
        expect(map.get('OPTIONS /abc.txt')).toBeUndefined();
        expect(map.get('PATCH /abc.txt')).toBeUndefined();
        expect(map.get('POST /abc.txt')).toBeUndefined();
        expect(map.get('PUT /abc.txt')).toBeUndefined();
        expect(map.get('TRACE /abc.txt')).toBeUndefined();
      });
    });

    describe('when passed `/foo` and `abc.txt`', () => {
      test('adds `GET /foo/abc.txt` and `HEAD /foo/abc.txt` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo', './mock-assets/abc.txt');

        const getResult = map.get('GET /foo/abc.txt');
        expect(getResult).toBeDefined();
        expect(typeof getResult.response).toBe('function');

        const headResult = map.get('HEAD /foo/abc.txt');
        expect(headResult).toBeDefined();
        expect(typeof headResult.response).toBe('function');

        expect(map.get('DELETE /foo/abc.txt')).toBeUndefined();
        expect(map.get('OPTIONS /foo/abc.txt')).toBeUndefined();
        expect(map.get('PATCH /fooabc.txt')).toBeUndefined();
        expect(map.get('POST /foo/abc.txt')).toBeUndefined();
        expect(map.get('PUT /foo/abc.txt')).toBeUndefined();
        expect(map.get('TRACE /foo/abc.txt')).toBeUndefined();
      });
    });

    describe('when passed `/` and `index.html`', () => {
      test('adds `GET /index.html`, `GET /`, `HEAD /index.html`, and `HEAD /` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/', './mock-assets/index.html');

        const getResult1 = map.get('GET /index.html');
        expect(getResult1).toBeDefined();
        expect(typeof getResult1.response).toBe('function');

        const headResult1 = map.get('HEAD /index.html');
        expect(headResult1).toBeDefined();
        expect(typeof headResult1.response).toBe('function');

        expect(map.get('DELETE /index.html')).toBeUndefined();
        expect(map.get('OPTIONS /index.html')).toBeUndefined();
        expect(map.get('PATCH /index.html')).toBeUndefined();
        expect(map.get('POST /index.html')).toBeUndefined();
        expect(map.get('PUT /index.html')).toBeUndefined();
        expect(map.get('TRACE /index.html')).toBeUndefined();

        const getResult2 = map.get('GET /');
        expect(getResult2).toBeDefined();
        expect(typeof getResult2.response).toBe('function');

        const headResult2 = map.get('HEAD /');
        expect(headResult2).toBeDefined();
        expect(typeof headResult2.response).toBe('function');

        expect(map.get('DELETE /')).toBeUndefined();
        expect(map.get('OPTIONS /')).toBeUndefined();
        expect(map.get('PATCH /')).toBeUndefined();
        expect(map.get('POST /')).toBeUndefined();
        expect(map.get('PUT /')).toBeUndefined();
        expect(map.get('TRACE /')).toBeUndefined();
      });
    });

    describe('when passed `/foo` and `index.html`', () => {
      test('adds `GET /foo/index.html`, `GET /foo/`, `HEAD /foo/index.html`, and `HEAD /foo/` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo', './mock-assets/index.html');

        const getResult1 = map.get('GET /foo/index.html');
        expect(getResult1).toBeDefined();
        expect(typeof getResult1.response).toBe('function');

        const headResult1 = map.get('HEAD /foo/index.html');
        expect(headResult1).toBeDefined();
        expect(typeof headResult1.response).toBe('function');

        expect(map.get('DELETE /foo/index.html')).toBeUndefined();
        expect(map.get('OPTIONS /foo/index.html')).toBeUndefined();
        expect(map.get('PATCH /foo/index.html')).toBeUndefined();
        expect(map.get('POST /foo/index.html')).toBeUndefined();
        expect(map.get('PUT /foo/index.html')).toBeUndefined();
        expect(map.get('TRACE /foo/index.html')).toBeUndefined();

        const getResult2 = map.get('GET /foo');
        expect(getResult2).toBeDefined();
        expect(typeof getResult2.response).toBe('function');

        const headResult2 = map.get('HEAD /foo');
        expect(headResult2).toBeDefined();
        expect(typeof headResult2.response).toBe('function');

        expect(map.get('DELETE /foo')).toBeUndefined();
        expect(map.get('OPTIONS /foo')).toBeUndefined();
        expect(map.get('PATCH /foo')).toBeUndefined();
        expect(map.get('POST /foo')).toBeUndefined();
        expect(map.get('PUT /foo')).toBeUndefined();
        expect(map.get('TRACE /foo')).toBeUndefined();
      });
    });

    describe('when passed `/foo` and `index.html`', () => {
      test('adds `GET /foo/index.html`, `GET /foo/`, `HEAD /foo/index.html`, and `HEAD /foo/` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo', './mock-assets/index.html');

        const getResult1 = map.get('GET /foo/index.html');
        expect(getResult1).toBeDefined();
        expect(typeof getResult1.response).toBe('function');

        const headResult1 = map.get('HEAD /foo/index.html');
        expect(headResult1).toBeDefined();
        expect(typeof headResult1.response).toBe('function');

        expect(map.get('DELETE /foo/index.html')).toBeUndefined();
        expect(map.get('OPTIONS /foo/index.html')).toBeUndefined();
        expect(map.get('PATCH /foo/index.html')).toBeUndefined();
        expect(map.get('POST /foo/index.html')).toBeUndefined();
        expect(map.get('PUT /foo/index.html')).toBeUndefined();
        expect(map.get('TRACE /foo/index.html')).toBeUndefined();

        const getResult2 = map.get('GET /foo');
        expect(getResult2).toBeDefined();
        expect(typeof getResult2.response).toBe('function');

        const headResult2 = map.get('HEAD /foo');
        expect(headResult2).toBeDefined();
        expect(typeof headResult2.response).toBe('function');

        expect(map.get('DELETE /foo')).toBeUndefined();
        expect(map.get('OPTIONS /foo')).toBeUndefined();
        expect(map.get('PATCH /foo')).toBeUndefined();
        expect(map.get('POST /foo')).toBeUndefined();
        expect(map.get('PUT /foo')).toBeUndefined();
        expect(map.get('TRACE /foo')).toBeUndefined();
      });
    });

    describe('when passed `/foo/` and `abc.txt`', () => {
      test('adds `GET /foo/abc.txt` and `HEAD /foo/abc.txt` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo/', './mock-assets/abc.txt');

        const getResult = map.get('GET /foo/abc.txt');
        expect(getResult).toBeDefined();
        expect(typeof getResult.response).toBe('function');

        const headResult = map.get('HEAD /foo/abc.txt');
        expect(headResult).toBeDefined();
        expect(typeof headResult.response).toBe('function');

        expect(map.get('DELETE /foo/abc.txt')).toBeUndefined();
        expect(map.get('OPTIONS /foo/abc.txt')).toBeUndefined();
        expect(map.get('PATCH /foo/abc.txt')).toBeUndefined();
        expect(map.get('POST /foo/abc.txt')).toBeUndefined();
        expect(map.get('PUT /foo/abc.txt')).toBeUndefined();
        expect(map.get('TRACE /foo/abc.txt')).toBeUndefined();
      });
    });

    describe('when passed `/foo` and `resolve(\'abc.txt\')`', () => {
      test('adds `GET /foo/abc.txt` and `HEAD /foo/abc.txt` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo/', resolve('./mock-assets/abc.txt'));

        const getResult = map.get('GET /foo/abc.txt');
        expect(getResult).toBeDefined();
        expect(typeof getResult.response).toBe('function');

        const headResult = map.get('HEAD /foo/abc.txt');
        expect(headResult).toBeDefined();
        expect(typeof headResult.response).toBe('function');

        expect(map.get('DELETE /foo/abc.txt')).toBeUndefined();
        expect(map.get('OPTIONS /foo/abc.txt')).toBeUndefined();
        expect(map.get('PATCH /foo/abc.txt')).toBeUndefined();
        expect(map.get('POST /foo/abc.txt')).toBeUndefined();
        expect(map.get('PUT /foo/abc.txt')).toBeUndefined();
        expect(map.get('TRACE /foo/abc.txt')).toBeUndefined();
      });
    });

    describe('when passed `/` and `./tests/mocks`', () => {
      test('adds the expected entries to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/', './mock-assets');

        const getResult1 = map.get('GET /abc.txt');
        expect(getResult1).toBeDefined();
        expect(typeof getResult1.response).toBe('function');

        const headResult1 = map.get('HEAD /abc.txt');
        expect(headResult1).toBeDefined();
        expect(typeof headResult1.response).toBe('function');

        const getResult2 = map.get('GET /subdir/abc.txt');
        expect(getResult2).toBeDefined();
        expect(typeof getResult2.response).toBe('function');

        const headResult2 = map.get('HEAD /subdir/abc.txt');
        expect(headResult2).toBeDefined();
        expect(typeof headResult2.response).toBe('function');
      });
    });

    describe('when passed `/foo` and `./tests/mocks`', () => {
      test('adds the expected entries to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo', './mock-assets');

        const getResult1 = map.get('GET /foo/abc.txt');
        expect(getResult1).toBeDefined();
        expect(typeof getResult1.response).toBe('function');

        const headResult1 = map.get('HEAD /foo/abc.txt');
        expect(headResult1).toBeDefined();
        expect(typeof headResult1.response).toBe('function');

        const getResult2 = map.get('GET /foo/subdir/abc.txt');
        expect(getResult2).toBeDefined();
        expect(typeof getResult2.response).toBe('function');

        const headResult2 = map.get('HEAD /foo/subdir/abc.txt');
        expect(headResult2).toBeDefined();
        expect(typeof headResult2.response).toBe('function');
      });
    });

    describe('when passed `foo` and `abc.txt`', () => {
      test('rejects with an error', async () => {
        const err = TypeError('The first argument of .static() must be a plain route path.');
        const map = new TuftRouteMap();

        const promise = map.static('foo', 'abc.txt');
        await expect(promise).resolves.toBeUndefined();
        expect(mockConsoleError).toHaveBeenCalledWith(err);
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when an error is thrown', () => {
      test('rejects with an error', async () => {
        const map = new TuftRouteMap();

        await expect(map.static('/foo', 'THROW_ERROR')).resolves.toBeUndefined();
        expect(mockConsoleError).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('TuftRouteMap.prototype.onError()', () => {
    test('returns TuftRouteMap.prototype', () => {
      const map = new TuftRouteMap();

      expect(map.onError(() => { })).toBe(map);
    });
  });

  describe('TuftRouteMap.prototype.createServer()', () => {
    test('returns an instance of TuftServer', () => {
      const map = new TuftRouteMap();
      const result = map.createServer();

      expect(result).toBeInstanceOf(TuftServer);
    });
  });

  describe('TuftRouteMap.prototype.createSecureServer()', () => {
    test('returns an instance of TuftSecureServer', () => {
      const map = new TuftRouteMap();
      const result = map.createSecureServer();

      expect(result).toBeInstanceOf(TuftSecureServer);
    });
  });
});

/**
 * handleStaticFileGetRequest()
 */

describe('handleStaticFileGetRequest()', () => {
  test('returns the expected object', async () => {
    const result = handleStaticFileGetRequest('./mock-assets/abc.txt', mockContext);

    await expect(result).resolves.toEqual({
      status: HTTP_STATUS_OK,
      file: './mock-assets/abc.txt',
    });
  });
});


/**
 * handleStaticFileHeadRequest()
 */

describe('handleStaticFileHeadRequest()', () => {
  test('returns the expected object', async () => {
    const result = handleStaticFileHeadRequest('./mock-assets/abc.txt', mockContext);

    await expect(result).resolves.toEqual({
      status: HTTP_STATUS_OK,
    });
  });
});

/**
 * getFilePaths()
 */

describe('getFilePaths()', () => {
  describe('when passed a string representing a file path', () => {
    test('returns that file path in an array', async () => {
      const filename = './mock-assets/abc.txt';
      const result = getFilePaths(filename);
      await expect(result).resolves.toEqual([filename]);
    });
  });

  describe('when passed a string representing a directory path', () => {
    test('returns that path concatenated with a filename in an array', async () => {
      const dirname = './mock-assets/subdir';
      const result = await getFilePaths(dirname);
      expect(result).toContain(dirname + '/abc.txt');
      expect(result).toContain(dirname + '/def.txt');
    });
  });
});

/**
 * createStaticFileResponseObject()
 */

describe('createStaticFileResponseObject()', () => {
  describe('when passed a context with a \'range\' header', () => {
    test('returns the expected object', async () => {
      const stats = await fsPromises.stat('./mock-assets/abc.txt');

      mockContext.request.headers.range = 'bytes=0-';

      const result = createStaticFileResponseObject(mockContext, './mock-assets/abc.txt');

      const expectedResult = {
        status: HTTP_STATUS_PARTIAL_CONTENT,
        file: './mock-assets/abc.txt',
        offset: 0,
        length: 4,
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_LAST_MODIFIED, stats.mtime.toUTCString());
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_RANGE, 'bytes 0-3/4');
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, 4);
    });
  });

  describe('when passed a context with a \'range\' header that is not satisfiable', () => {
    test('returns the expected object', async () => {
      const stats = await fsPromises.stat('./mock-assets/abc.txt');

      mockContext.request.headers.range = 'bytes=0-4';

      const result = createStaticFileResponseObject(mockContext, './mock-assets/abc.txt');

      const expectedResult = {
        error: 'RANGE_NOT_SATISFIABLE',
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_LAST_MODIFIED, stats.mtime.toUTCString());
    });
  });

  describe('when passed a context without a \'range\' header', () => {
    test('returns the expected object', async () => {
      const stats = await fsPromises.stat('./mock-assets/abc.txt');
      const result = createStaticFileResponseObject(mockContext, './mock-assets/abc.txt');

      const expectedResult = {
        status: HTTP_STATUS_OK,
        file: './mock-assets/abc.txt',
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_LAST_MODIFIED, stats.mtime.toUTCString());
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, 4);
    });
  });

  describe('when passed a file with undetermined file type', () => {
    test('returns the expected object', async () => {
      const stats = await fsPromises.stat('./mock-assets/abc.foo');
      const result = createStaticFileResponseObject(mockContext, './mock-assets/abc.foo');

      const expectedResult = {
        status: HTTP_STATUS_OK,
        file: './mock-assets/abc.foo',
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        HTTP_HEADER_CONTENT_TYPE,
        'application/octet-stream',
      );
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_LAST_MODIFIED, stats.mtime.toUTCString());
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, 4);
    });
  });
});

/**
 * primaryHandler()
 */

describe('primaryHandler()', () => {
  const mockResponseHandler = jest.fn();
  const mockError = Error('mockError');
  const mockRoutes = {
    find: jest.fn((method, pathname) => {
      if (method === 'GET') {
        if (pathname === '/foo') {
          return mockResponseHandler;
        }

        if (pathname === '/error') {
          return () => { throw mockError; };
        }
      }
    })
  };

  describe('when the value of `request.url` does not match a route', () => {
    test('the response ends with a 404 status code', async () => {
      const trustProxy = true;

      const method = 'GET';
      const path = '/does_not_exist';

      const mockRequest = {
        method,
        url: path,
        on: jest.fn()
      };

      const mockResponse = {
        writableEnded: false,
        headersSent: false,
        statusCode: HTTP_STATUS_OK,
        on: jest.fn(),
        end: jest.fn()
      };

      const returnValue = await primaryHandler(
        trustProxy,
        //@ts-expect-error
        mockRoutes,
        mockErrorHandler,
        mockRequest,
        mockResponse
      );

      expect(returnValue).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_NOT_FOUND);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockRoutes.find).toHaveBeenCalledWith(method, path);
      expect(mockResponseHandler).not.toHaveBeenCalled();
    });
  });

  describe('when the value of `request.method` is not a supported request method', () => {
    test('the response ends with a 501 status code', async () => {
      const trustProxy = true;

      const method = 'LINK';
      const path = '/foo';

      const mockRequest = {
        method,
        url: path,
        on: jest.fn()
      };

      const mockResponse = {
        writableEnded: false,
        headersSent: false,
        statusCode: HTTP_STATUS_OK,
        on: jest.fn(),
        end: jest.fn()
      };

      const returnValue = await primaryHandler(
        trustProxy,
        //@ts-expect-error
        mockRoutes,
        mockErrorHandler,
        mockRequest,
        mockResponse
      );

      expect(returnValue).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_NOT_IMPLEMENTED);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockRoutes.find).not.toHaveBeenCalled();
      expect(mockResponseHandler).not.toHaveBeenCalled();
    });
  });

  describe('when the value of `request.url` includes a query string', () => {
    test('returns undefined', async () => {
      const trustProxy = true;

      const method = 'GET';
      const path = '/foo?bar=baz';

      const mockRequest = {
        method,
        url: path,
        on: jest.fn()
      };

      const mockResponse = {
        writableEnded: false,
        headersSent: false,
        statusCode: HTTP_STATUS_OK,
        on: jest.fn(),
        end: jest.fn()
      };

      const returnValue = await primaryHandler(
        trustProxy,
        //@ts-expect-error
        mockRoutes,
        mockErrorHandler,
        mockRequest,
        mockResponse
      );

      expect(returnValue).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_OK);
      expect(mockResponse.end).not.toHaveBeenCalled();
      expect(mockRoutes.find).toHaveBeenCalledWith(method, '/foo');
      expect(mockResponseHandler).toHaveBeenCalledWith(mockRequest, mockResponse);
    });
  });

  describe('when `trustProxy` is set to false', () => {
    test('returns undefined', async () => {
      const trustProxy = false;

      const method = 'GET';
      const path = '/foo';

      const mockRequest = {
        headers: {
          'x-forwarded-proto': 'http',
        },
        method,
        url: path,
        on: jest.fn()
      };

      const mockResponse = {
        writableEnded: false,
        headersSent: false,
        statusCode: HTTP_STATUS_OK,
        on: jest.fn(),
        end: jest.fn()
      };

      const returnValue = await primaryHandler(
        trustProxy,
        //@ts-expect-error
        mockRoutes,
        mockErrorHandler,
        mockRequest,
        mockResponse
      );

      expect(returnValue).toBeUndefined();
      expect(mockRequest.headers['x-forwarded-proto']).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_OK);
      expect(mockResponse.end).not.toHaveBeenCalled();
      expect(mockRoutes.find).toHaveBeenCalledWith(method, '/foo');
      expect(mockResponseHandler).toHaveBeenCalledWith(mockRequest, mockResponse);
    });
  });

  describe('when the response handler throws an error', () => {
    test('the passed error handler is called', async () => {
      const trustProxy = true;

      const method = 'GET';
      const path = '/error';

      const mockRequest = {
        method,
        url: path,
        on: jest.fn()
      };

      const mockResponse = {
        writableEnded: false,
        headersSent: false,
        statusCode: HTTP_STATUS_OK,
        on: jest.fn(),
        end: jest.fn()
      };

      const returnValue = await primaryHandler(
        trustProxy,
        //@ts-expect-error
        mockRoutes,
        mockErrorHandler,
        mockRequest,
        mockResponse
      );

      expect(returnValue).toBeUndefined();
      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockRoutes.find).toHaveBeenCalledWith(method, path);
      expect(mockResponseHandler).not.toHaveBeenCalled();
    });
  });
});

/**
 * primaryErrorHandler()
 */

describe('primaryErrorHandler()', () => {
  const mockError = Error('mockError');

  describe('when `stream.destroyed` is set to false', () => {
    test('response.end() is called with a 500 status code and the passed error handler is called', async () => {
      const mockResponse = {
        writableEnded: false,
        statusCode: HTTP_STATUS_OK,
        end: jest.fn()
      };

      const returnValue = await primaryErrorHandler(
        //@ts-expect-error
        mockResponse,
        mockErrorHandler,
        mockError
      );

      expect(returnValue).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('when `response.writableEnded` is set to true', () => {
    test('response.end() is not called and the passed error handler is called', async () => {
      const mockResponse = {
        writableEnded: true,
        statusCode: HTTP_STATUS_OK,
        end: jest.fn()
      };

      const returnValue = await primaryErrorHandler(
        //@ts-expect-error
        mockResponse,
        mockErrorHandler,
        mockError
      );

      expect(returnValue).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_OK);
      expect(mockResponse.end).not.toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('when `response.writableEnded` is set to false and `response.headerSent` is set to true', () => {
    test('response.end() is not called and the passed error handler is called', async () => {
      const mockResponse = {
        writableEnded: false,
        headersSent: true,
        statusCode: HTTP_STATUS_OK,
        end: jest.fn()
      };

      const returnValue = await primaryErrorHandler(
        //@ts-expect-error
        mockResponse,
        mockErrorHandler,
        mockError
      );

      expect(returnValue).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_OK);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockErrorHandler).toHaveBeenCalledWith(mockError);
    });
  });

  describe('when no error handler is provided', () => {
    test('returns undefined', async () => {
      const mockResponse = {
        statusCode: HTTP_STATUS_OK,
        end: jest.fn()
      };

      const returnValue = await primaryErrorHandler(
        //@ts-expect-error
        mockResponse,
        null,
        mockError
      );

      expect(returnValue).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR);
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
