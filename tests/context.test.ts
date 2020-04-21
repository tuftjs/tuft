import { constants } from 'http2';
import { TuftContext, createTuftContext } from '../src/context';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_METHOD_GET,
} from '../src/constants';

const { HTTP_STATUS_OK } = constants;

describe('TuftContext', () => {
  const mockStream = {
    on: jest.fn((_, callback) => {
      callback();
    }),
    sentHeaders: {},
    pushAllowed: false,
  };

  const request = {
    headers: {},
    method: 'GET',
    pathname: '/',
    searchParams: new URLSearchParams(),
    params: {},
    cookies: {},
    body: null,
  };

  test('has the expected properties', () => {
    //@ts-ignore
    const t = new TuftContext(mockStream, request);
    expect(t).toHaveProperty('stream', mockStream);
    expect(t).toHaveProperty('request', request);
    expect(t).toHaveProperty('outgoingHeaders', {});
  });

  describe('TuftContext.prototype.setHeader()', () => {
    //@ts-ignore
    const t = new TuftContext(mockStream, request);

    test('returns undefined', () => {
      expect(t.setHeader(HTTP2_HEADER_STATUS, HTTP_STATUS_OK)).toBeUndefined();
    });
  });

  describe('TuftContext.prototype.getHeader()', () => {
    //@ts-ignore
    const t = new TuftContext(mockStream, request);
    t.setHeader(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);

    test('returns the expected value', () => {
      expect(t.getHeader(HTTP2_HEADER_STATUS)).toBe(HTTP_STATUS_OK);
    });
  });

  describe('TuftContext.prototype.setCookie()', () => {
    //@ts-ignore
    const t = new TuftContext(mockStream, request);

    test('adds \'set-cookie\' to the \'outgoingHeaders\' property', () => {
      expect(t.outgoingHeaders).not.toHaveProperty('set-cookie');
      expect(t.setCookie('a', 'foo')).toBeUndefined();
      expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo']);
    });

    test('updates the \'set-cookie\' entry of the \'outgoingHeaders\' property', () => {
      expect(t.outgoingHeaders).toHaveProperty('set-cookie');
      expect(t.setCookie('b', 'foo')).toBeUndefined();
      expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo', 'b=foo']);
    });
  });

  describe('TuftContext.prototype.setCookie()', () => {
    describe('when passed an options object', () => {
      //@ts-ignore
      const t = new TuftContext(mockStream, request);

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

        expect(t.outgoingHeaders).toHaveProperty('set-cookie', [
          `a=foo; Expires=${expires.toUTCString()}; Max-Age=1000; Domain=example.com; Path=/; Secure; HttpOnly`,
        ]);
      });
    });

    describe('when passed an options object with an invalid property', () => {
      //@ts-ignore
      const t = new TuftContext(mockStream, request);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { invalidProperty: 42 });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo']);
      });
    });

    describe('when passed an options object with \'secure\' and \'httpOnly\' set to false', () => {
      //@ts-ignore
      const t = new TuftContext(mockStream, request);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', {
          secure: false,
          httpOnly: false,
        });

        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo']);
      });
    });

    describe('when passed an options object with \'sameSite\' set to \'strict\'', () => {
      //@ts-ignore
      const t = new TuftContext(mockStream, request);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'strict' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=Strict']);
      });
    });

    describe('when passed an options object with \'sameSite\' set to \'lax\'', () => {
      //@ts-ignore
      const t = new TuftContext(mockStream, request);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'lax' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=Lax']);
      });
    });

    describe('when passed an options object with \'sameSite\' set to \'none\'', () => {
      //@ts-ignore
      const t = new TuftContext(mockStream, request);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'none' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=None']);
      });
    });

    describe('when passed an options object with \'sameSite\' set to an invalid value', () => {
      //@ts-ignore
      const t = new TuftContext(mockStream, request);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'foo' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo']);
      });
    });
  });
});

describe('createTuftContext()', () => {
  const mockStream = {
    on: jest.fn((_, callback) => {
      callback();
    }),
  };

  beforeAll(() => {
    mockStream.on.mockClear();
  });

  describe('with no options', () => {
    const mockHeaders = {
      [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
      [HTTP2_HEADER_PATH]: '/',
    };

    test('returns an instance of TuftContext', () => {
      //@ts-ignore
      const result = createTuftContext(mockStream, mockHeaders);
      expect(result).toBeInstanceOf(TuftContext);
    });
  });

  describe('with a path that includes a query string', () => {
    const mockHeaders = {
      [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
      [HTTP2_HEADER_PATH]: '/foo?bar=baz',
    };

    test('returns an instance of TuftContext', () => {
      //@ts-ignore
      const result = createTuftContext(mockStream, mockHeaders);
      expect(result).toBeInstanceOf(TuftContext);
    });
  });

  describe('with option \'params\' set', () => {
    const mockHeaders = {
      [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
      [HTTP2_HEADER_PATH]: '/foo/bar/baz',
    };

    const options = {
      params: {
        0: 'one',
        2: 'three',
      },
    };

    test('returns an instance of TuftContext', () => {
      //@ts-ignore
      const result = createTuftContext(mockStream, mockHeaders, options);
      expect(result).toBeInstanceOf(TuftContext);
    });
  });
});
