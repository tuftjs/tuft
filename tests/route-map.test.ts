import type { Stats, Dir, PathLike } from 'fs';
import { constants } from 'http2';
import { promises as fsPromises } from 'fs';
import {
  TuftRouteMap,
  createRouteMap,
  handleStaticFileGetRequest,
  handleStaticFileHeadRequest,
  getFilePaths,
  createStaticFileResponseObject,
  primaryHandler,
  primaryErrorHandler,
} from '../src/route-map';
import { RouteManager } from '../src/route-manager';
import { TuftServer, TuftSecureServer } from '../src/server';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_ACCEPT_RANGES,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_LAST_MODIFIED,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_RANGE,
} from '../src/constants';

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_PARTIAL_CONTENT,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_IMPLEMENTED,
} = constants;

const MOCK_FILE_SIZE = 42;
const mockFileDate = new Date();

const mockFsStat = jest
  .spyOn(fsPromises, 'stat')
  .mockImplementation(async (path: PathLike) => {
    return {
      size: MOCK_FILE_SIZE,
      mtime: mockFileDate,
      isFile: () => {
        if ((path as string).length === 0) {
          return false;
        }

        return /\./.test(path as string);
      },
      isDirectory: () => {
        if ((path as string).length === 0) {
          return false;
        }

        return !/\./.test(path as string);
      },
    } as Stats;
  });

const mockFsOpendir = jest
  .spyOn(fsPromises, 'opendir')
  .mockImplementation(async () => {
    return {
      [Symbol.iterator]() {
        return {
          i: 0,
          next() {
            if (this.i < 3) {
              const n = this.i;
              this.i++;
              return { value: { name: `${n}.txt` }, done: false };
            }

            return { done: true };
          }
        };
      },
    } as unknown as Dir;
  });

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const mockStream = {
  destroyed: false,
  headersSent: false,
  on: jest.fn(),
  respond: jest.fn(),
  end: jest.fn(),
};

const mockContext: any = {
  request: {
    headers: {},
  },
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockContext.outgoingHeaders[key] = value;
    return mockContext;
  }),
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

  mockContext.request = {
    headers: {},
  };
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();

  mockErrorHandler.mockClear();
});

afterAll(() => {
  mockFsStat.mockRestore();
  mockFsOpendir.mockRestore();
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

  describe('TuftRouteMap.prototype.merge()', () => {
    describe('when passed another instance of TuftRouteMap with its own custom options', () => {
      test('adds a `GET /foo/bar` entry to the map', () => {
        const map1 = new TuftRouteMap({
          basePath: '/foo',
          trailingSlash: true,
          preHandlers: [() => { }],
          responders: [() => { }],
        });

        map1.set('GET /bar', {});

        const map2 = new TuftRouteMap();
        map2.merge(map1);

        expect(map2.has('GET /foo/bar')).toBe(true);
      });
    });

    describe('when passed an options object with all supported properties set and when passed another instance of TuftRouteMap', () => {
      test('adds a `GET /foo/bar` entry to the map', () => {
        const map1 = new TuftRouteMap();

        map1.set('GET /bar', {});

        const map2 = new TuftRouteMap({
          basePath: '/foo',
          trailingSlash: true,
          preHandlers: [() => { }],
          responders: [() => { }],
        });

        map2.merge(map1);

        expect(map2.has('GET /foo/bar')).toBe(true);
      });
    });

    describe('when passed another instance of TuftRouteMap with no custom options', () => {
      test('adds a `GET /foo` entry to the map', () => {
        const map1 = new TuftRouteMap();

        map1.set('GET /foo', {});

        const map2 = new TuftRouteMap();
        map2.merge(map1);

        expect(map2.has('GET /foo')).toBe(true);
      });
    });

    describe('when adding a route with a lone slash that gets merged with a base path', () => {
      test('adds a `GET /` entry to the map', () => {
        const map1 = new TuftRouteMap();

        map1.set('GET /', {});

        const map2 = new TuftRouteMap({
          basePath: '/foo',
        });

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

        expect(map.get('GET /foo')).toBeDefined();
      });
    });
  });

  describe('TuftRouteMap.prototype.static()', () => {
    describe('when passed `/foo` and `abc.txt`', () => {
      test('adds `GET /foo/abc.txt` and `HEAD /foo/abc.txt` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo', 'abc.txt');

        const result = map.get('GET /foo/abc.txt');

        expect(result).toBeDefined();
        expect(typeof result.response).toBe('function');
      });
    });

    describe('when passed `/foo/` and `abc.txt`', () => {
      test('adds `GET /foo/abc.txt` and `HEAD /foo/abc.txt` to the map', async () => {
        const map = new TuftRouteMap();

        await map.static('/foo/', 'abc.txt');

        const result = map.get('GET /foo/abc.txt');

        expect(result).toBeDefined();
        expect(typeof result.response).toBe('function');
      });
    });

    describe('when passed `foo` and `abc.txt`', () => {
      test('rejects with an error', async () => {
        const err = TypeError('The first argument of .static() must be a plain route path.');
        const map = new TuftRouteMap();

        await expect(map.static('foo', 'abc.txt')).resolves.toBeUndefined();
        expect(mockConsoleError).toHaveBeenCalledWith(err);
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
    const result = handleStaticFileGetRequest('abc.txt', mockContext);

    await expect(result).resolves.toEqual({
      status: HTTP_STATUS_OK,
      file: 'abc.txt',
    });
  });
});


/**
 * handleStaticFileHeadRequest()
 */

describe('handleStaticFileHeadRequest()', () => {
  test('returns the expected object', async () => {
    const result = handleStaticFileHeadRequest('abc.txt', mockContext);

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
      const filename = 'abc.txt';
      const result = getFilePaths(filename);

      await expect(result).resolves.toEqual([filename]);
      expect(mockFsStat).toHaveBeenCalledWith(filename);
      expect(mockFsOpendir).not.toHaveBeenCalled();
    });
  });

  describe('when passed a string representing a directory path', () => {
    test('returns that path concatenated with a filename in an array', async () => {
      const dirname = 'abc';
      const result = getFilePaths(dirname);

      await expect(result).resolves.toEqual([
        dirname + '/0.txt',
        dirname + '/1.txt',
        dirname + '/2.txt',
      ]);
      expect(mockFsStat).toHaveBeenCalledWith(dirname);
      expect(mockFsOpendir).toHaveBeenCalledWith(dirname);
    });
  });

  describe('when passed an empty string', () => {
    test('returns an empty array', async () => {
      const result = getFilePaths('');

      await expect(result).resolves.toEqual([]);
    });
  });
});

/**
 * createStaticFileResponseObject()
 */

describe('createStaticFileResponseObject()', () => {
  describe('when passed a context with a \'range\' header', () => {
    test('returns the expected object', async () => {
      mockContext.request.headers.range = 'bytes=0-';

      const result = createStaticFileResponseObject(mockContext, 'abc.txt');

      const expectedResult = {
        status: HTTP_STATUS_PARTIAL_CONTENT,
        file: 'abc.txt',
        offset: 0,
        length: MOCK_FILE_SIZE,
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, 'text/plain');
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_LAST_MODIFIED, mockFileDate.toUTCString());
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(
          HTTP2_HEADER_CONTENT_RANGE,
          `bytes 0-${MOCK_FILE_SIZE - 1}/${MOCK_FILE_SIZE}`
        );
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, MOCK_FILE_SIZE);
    });
  });

  describe('when passed a context with a \'range\' header that is not satisfiable', () => {
    test('returns the expected object', async () => {
      mockContext.request.headers.range = `bytes=0-${MOCK_FILE_SIZE + 1}`;

      const result = createStaticFileResponseObject(mockContext, 'abc.txt');

      const expectedResult = {
        error: 'RANGE_NOT_SATISFIABLE',
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, 'text/plain');
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_LAST_MODIFIED, mockFileDate.toUTCString());
    });
  });

  describe('when passed a context without a \'range\' header', () => {
    test('returns the expected object', async () => {
      const result = createStaticFileResponseObject(mockContext, 'abc.txt');

      const expectedResult = {
        status: HTTP_STATUS_OK,
        file: 'abc.txt',
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, 'text/plain');
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_LAST_MODIFIED, mockFileDate.toUTCString());
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, MOCK_FILE_SIZE);
    });
  });

  describe('when passed a file with undetermined file type', () => {
    test('returns the expected object', async () => {
      const result = createStaticFileResponseObject(mockContext, 'abc.foo');

      const expectedResult = {
        status: HTTP_STATUS_OK,
        file: 'abc.foo',
      };

      await expect(result).resolves.toEqual(expectedResult);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_ACCEPT_RANGES, 'bytes');
      expect(mockContext.setHeader).toHaveBeenCalledWith(
        HTTP2_HEADER_CONTENT_TYPE,
        'application/octet-stream',
      );
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_LAST_MODIFIED, mockFileDate.toUTCString());
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, MOCK_FILE_SIZE);
    });
  });
});

/**
 * primaryHandler()
 */

describe('primaryHandler()', () => {
  const map = new TuftRouteMap();

  map.set('GET /foo', {});

  const routes = new RouteManager(map);

  describe('when the value of `:path` does not match a route', () => {
    test('stream.respond() is called with a 404 status code', async () => {
      const result = primaryHandler(
        routes,
        mockErrorHandler,
        //@ts-expect-error
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
        //@ts-expect-error
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
        //@ts-expect-error
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

  map.set('GET /foo', () => { throw err; });

  const routes = new RouteManager(map);

  describe('when the response handler throws an error', () => {
    test('the passed error handler is called', async () => {
      const result = primaryHandler(
        routes,
        mockErrorHandler,
        //@ts-expect-error
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
        //@ts-expect-error
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
        //@ts-expect-error
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
        //@ts-expect-error
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
        //@ts-expect-error
        mockStream,
        null,
        err,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });
});

/**
 * createRouteMap()
 */

describe('createRouteMap()', () => {
  test('returns an instance of TuftRouteMap', () => {
    const result = createRouteMap();

    expect(result).toBeInstanceOf(TuftRouteMap);
  });
});
