import { URLSearchParams } from 'url';
import { TuftContext, createTuftContext, TuftRequest } from '../src/context';
import { HTTP_HEADER_STATUS, HTTP_STATUS_OK } from '../src/constants';

function createMockRequest(method: string = 'GET', url: string = '/') {
  const mockRequest: any = {
    method,
    url,
    on: jest.fn((_, callback) => {
      callback();
    }),
  };

  return mockRequest;
}

function createMockResponse() {
  const mockResponse: any = {
    _headers: {},
    setHeader: jest.fn((name: string, value: string | number) => {
      mockResponse._headers[name] = value;
      return mockResponse;
    }),
    getHeader: jest.fn((name: string) => {
      return mockResponse._headers[name];
    }),
    hasHeader: jest.fn((name: string) => {
      return mockResponse._headers[name] !== undefined;
    }),
  };

  return mockResponse;
}

function createMockTuftRequest(method: string = 'GET', pathname: string = '/') {
  const tuftRequest: TuftRequest = {
    headers: {},
    method,
    pathname,
    search: '',
    searchParams: new URLSearchParams(),
    params: {},
    cookies: {},
    body: null,
  };

  return tuftRequest;
}

/**
 * TuftContext
 */

describe('TuftContext', () => {
  describe('new TuftContext()', () => {
    test('returns an instance of TuftContext with the expected properties', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      expect(t).toBeInstanceOf(TuftContext);
      expect(t).toHaveProperty('request', mockTuftRequest);
    });
  });

  describe('TuftContext.prototype.setHeader()', () => {
    test('returns the instance of TuftContext', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      expect(t.setHeader(HTTP_HEADER_STATUS, HTTP_STATUS_OK)).toBe(t);
    });
  });

  describe('TuftContext.prototype.getHeader()', () => {
    test('returns the expected value', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      t.setHeader(HTTP_HEADER_STATUS, HTTP_STATUS_OK);

      expect(t.getHeader(HTTP_HEADER_STATUS)).toBe(HTTP_STATUS_OK);
    });
  });

  describe('TuftContext.prototype.setCookie()', () => {
    const mockRequest = createMockRequest();
    const mockResponse = createMockResponse();
    const mockTuftRequest = createMockTuftRequest();

    const t = new TuftContext(
      mockRequest,
      mockResponse,
      mockTuftRequest,
    );

    test('adds `set-cookie` to the `outgoingHeaders` property', () => {
      expect(t.getHeader('set-cookie')).toBeUndefined();
      expect(t.setCookie('a', 'foo')).toBe(t);
      expect(t.getHeader('set-cookie')).toEqual(['a=foo; Path=/']);
    });

    test('updates `set-cookie` on the `outgoingHeaders` property', () => {
      expect(t.getHeader('set-cookie')).toBeDefined();
      expect(t.setCookie('b', 'bar')).toBe(t);
      expect(t.getHeader('set-cookie')).toEqual(['a=foo; Path=/', 'b=bar; Path=/']);
    });
  });

  describe('TuftContext.prototype.setCookie()', () => {
    describe('when passed an options object', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      test('adds the expected cookie entry', () => {
        const expires = new Date();

        t.setCookie('a', 'foo', {
          expires,
          maxAge: 1000,
          domain: 'example.com',
          path: '/',
          secure: true,
          httpOnly: true,
        });

        expect(t.getHeader('set-cookie')).toEqual([
          `a=foo; Expires=${expires.toUTCString()}; Max-Age=1000; Domain=example.com; Path=/; Secure; HttpOnly`,
        ]);
      });
    });

    describe('when passed an options object with an invalid property', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { invalidProperty: 42 });
        expect(t.getHeader('set-cookie')).toEqual(['a=foo; Path=/']);
      });
    });

    describe('when passed an options object with `secure` and `httpOnly` set to false', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', {
          secure: false,
          httpOnly: false,
        });

        expect(t.getHeader('set-cookie')).toEqual(['a=foo; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to `strict`', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'Strict' });
        expect(t.getHeader('set-cookie')).toEqual(['a=foo; SameSite=Strict; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to `lax`', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'Lax' });
        expect(t.getHeader('set-cookie')).toEqual(['a=foo; SameSite=Lax; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to `none`', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'None' });
        expect(t.getHeader('set-cookie')).toEqual(['a=foo; SameSite=None; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to an invalid value', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();
      const mockTuftRequest = createMockTuftRequest();

      const t = new TuftContext(
        mockRequest,
        mockResponse,
        mockTuftRequest,
      );

      test('adds the expected cookie entry', () => {
        //@ts-expect-error
        t.setCookie('a', 'foo', { sameSite: 'foo' });
        expect(t.getHeader('set-cookie')).toEqual(['a=foo; Path=/']);
      });
    });
  });
});

/**
 * createTuftContext()
 */

describe('createTuftContext()', () => {
  describe('with no options', () => {
    test('returns an instance of TuftContext', () => {
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = createTuftContext(
        mockRequest,
        mockResponse,
      );

      expect(result).toBeInstanceOf(TuftContext);
    });
  });

  describe('with a path that includes a query string', () => {
    test('returns an instance of TuftContext', () => {
      const mockRequest = createMockRequest('GET', '/foo?bar=baz');
      const mockResponse = createMockResponse();

      const result = createTuftContext(
        mockRequest,
        mockResponse,
      );

      expect(result).toBeInstanceOf(TuftContext);
    });
  });

  describe('with option `params` set', () => {
    test('returns an instance of TuftContext', () => {
      const mockRequest = createMockRequest('GET', '/foo/bar/baz');
      const mockResponse = createMockResponse();
      const options = {
        params: {
          0: 'one',
          2: 'three',
        },
      };

      const result = createTuftContext(
        mockRequest,
        mockResponse,
        options,
      );

      expect(result).toBeInstanceOf(TuftContext);
    });
  });
});
