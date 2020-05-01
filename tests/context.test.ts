import { constants } from 'http2';
import { URLSearchParams } from 'url';
import { TuftContext, createTuftContext } from '../src/context';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_METHOD_GET,
} from '../src/constants';

const { HTTP_STATUS_OK } = constants;

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

beforeEach(() => {
  mockStream.on.mockClear();
});

/**
 * TuftContext
 */

describe('TuftContext', () => {
  describe('new TuftContext()', () => {
    test('returns an instance of TuftContext with the expected properties', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      expect(t).toBeInstanceOf(TuftContext);
      expect(t).toHaveProperty('request', request);
      expect(t).toHaveProperty('outgoingHeaders', {});
    });
  });

  describe('TuftContext.prototype.setHeader()', () => {
    test('returns undefined', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      expect(t.setHeader(HTTP2_HEADER_STATUS, HTTP_STATUS_OK)).toBeUndefined();
    });
  });

  describe('TuftContext.prototype.getHeader()', () => {
    test('returns the expected value', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      t.setHeader(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);

      expect(t.getHeader(HTTP2_HEADER_STATUS)).toBe(HTTP_STATUS_OK);
    });
  });

  describe('TuftContext.prototype.setCookie()', () => {
    const t = new TuftContext(
      //@ts-ignore
      mockStream,
      request,
    );

    test('adds `set-cookie` to the `outgoingHeaders` property', () => {
      expect(t.outgoingHeaders).not.toHaveProperty('set-cookie');
      expect(t.setCookie('a', 'foo')).toBeUndefined();
      expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; Path=/']);
    });

    test('updates the `set-cookie` entry of the `outgoingHeaders` property', () => {
      expect(t.outgoingHeaders).toHaveProperty('set-cookie');
      expect(t.setCookie('b', 'foo')).toBeUndefined();
      expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; Path=/', 'b=foo; Path=/']);
    });
  });

  describe('TuftContext.prototype.setCookie()', () => {
    describe('when passed an options object', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
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

        expect(t.outgoingHeaders).toHaveProperty('set-cookie', [
          `a=foo; Expires=${expires.toUTCString()}; Max-Age=1000; Domain=example.com; Path=/; Secure; HttpOnly`,
        ]);
      });
    });

    describe('when passed an options object with an invalid property', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { invalidProperty: 42 });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; Path=/']);
      });
    });

    describe('when passed an options object with `secure` and `httpOnly` set to false', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', {
          secure: false,
          httpOnly: false,
        });

        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to `strict`', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'strict' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=Strict; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to `lax`', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'lax' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=Lax; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to `none`', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'none' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=None; Path=/']);
      });
    });

    describe('when passed an options object with `sameSite` set to an invalid value', () => {
      const t = new TuftContext(
        //@ts-ignore
        mockStream,
        request,
      );

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'foo' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; Path=/']);
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
      const headers = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = createTuftContext(
        //@ts-ignore
        mockStream,
        headers,
      );

      expect(result).toBeInstanceOf(TuftContext);
    });
  });

  describe('with a path that includes a query string', () => {
    test('returns an instance of TuftContext', () => {
      const headers = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
        [HTTP2_HEADER_PATH]: '/foo?bar=baz',
      };

      const result = createTuftContext(
        //@ts-ignore
        mockStream,
        headers,
      );

      expect(result).toBeInstanceOf(TuftContext);
    });
  });

  describe('with option `params` set', () => {
    test('returns an instance of TuftContext', () => {
      const headers = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
        [HTTP2_HEADER_PATH]: '/foo/bar/baz',
      };

      const options = {
        params: {
          0: 'one',
          2: 'three',
        },
      };

      const result = createTuftContext(
        //@ts-ignore
        mockStream,
        headers,
        options,
      );

      expect(result).toBeInstanceOf(TuftContext);
    });
  });
});
