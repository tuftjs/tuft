import { URLSearchParams } from 'url';
import { TuftContext, createTuftContext, TuftRequest } from '../src/context';
import { HTTP_HEADER_SET_COOKIE } from '../src/constants';

function createMockRequest(method: string = 'GET', url: string = '/', headers = {}, socket = {}) {
  const mockRequest: any = {
    headers,
    socket,
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
    protocol: 'http',
    secure: false,
    ip: '127.0.0.1',
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

      expect(t.setHeader('custom-header-name', 'custom-header-value')).toBe(t);
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

      t.setHeader('custom-header-name', 'custom-header-value');

      expect(t.getHeader('custom-header-name')).toBe('custom-header-value');
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
      expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toBeUndefined();
      expect(t.setCookie('a', 'foo')).toBe(t);
      expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; Path=/']);
    });

    test('updates `set-cookie` on the `outgoingHeaders` property', () => {
      expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toBeDefined();
      expect(t.setCookie('b', 'bar')).toBe(t);
      expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; Path=/', 'b=bar; Path=/']);
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

        expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual([
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
        expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; Path=/']);
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

        expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; Path=/']);
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
        expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; SameSite=Strict; Path=/']);
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
        expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; SameSite=Lax; Path=/']);
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
        expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; SameSite=None; Path=/']);
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
        expect(t.getHeader(HTTP_HEADER_SET_COOKIE)).toEqual(['a=foo; Path=/']);
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

  describe('with `x-forwarded-proto` set to `https`', () => {
    test('returns an instance of TuftContext with the expected secure property', () => {
      const mockRequest = createMockRequest('GET', '/foo?bar=baz', {
        'x-forwarded-proto': 'https',
      });
      const mockResponse = createMockResponse();

      const result = createTuftContext(
        mockRequest,
        mockResponse,
      );

      expect(result).toBeInstanceOf(TuftContext);
      expect(result.request.protocol).toBe('https');
      expect(result.secure).toBe(true);
    });
  });

  describe('with `socket.encrypted` set to true', () => {
    test('returns an instance of TuftContext with the expected secure property', () => {
      const mockRequest = createMockRequest('GET', '/foo?bar=baz', {}, {
        encrypted: true,
      });
      const mockResponse = createMockResponse();

      const result = createTuftContext(
        mockRequest,
        mockResponse,
      );

      expect(result).toBeInstanceOf(TuftContext);
      expect(result.request.protocol).toBe('https');
      expect(result.secure).toBe(true);
    });
  });

  describe('with `x-forwarded-for` set to a single IP address', () => {
    test('returns an instance of TuftContext with the expected request IP', () => {
      const mockRequest = createMockRequest('GET', '/foo?bar=baz', {
        'x-forwarded-for': '10.0.0.1',
      });
      const mockResponse = createMockResponse();

      const result = createTuftContext(
        mockRequest,
        mockResponse,
      );

      expect(result).toBeInstanceOf(TuftContext);
      expect(result.request.ip).toBe('10.0.0.1');
    });
  });

  describe('with `x-forwarded-for` set to multiple IP addresses', () => {
    test('returns an instance of TuftContext with the expected request IP', () => {
      const mockRequest = createMockRequest('GET', '/foo?bar=baz', {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      });
      const mockResponse = createMockResponse();

      const result = createTuftContext(
        mockRequest,
        mockResponse,
      );

      expect(result).toBeInstanceOf(TuftContext);
      expect(result.request.ip).toBe('10.0.0.1');
    });
  });
});
