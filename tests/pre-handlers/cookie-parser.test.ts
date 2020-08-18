import type { TuftContext } from '../../src/context';
import { createCookieParser } from '../../src/pre-handlers/cookie-parser';
import { HTTP_HEADER_COOKIE } from '../../src/constants';

type MockTuftContext = {
  request: {
    headers: {
      [HTTP_HEADER_COOKIE]?: string,
    },
    [key: string]: any;
  },
};

function createMockContext(withCookie = false) {
  const mockContext: MockTuftContext = {
    request: {
      headers: {},
    },
  };

  if (withCookie) {
    mockContext.request.headers[HTTP_HEADER_COOKIE] = 'name-1=value-1;name-2=value-2';
  }

  return mockContext;
}

/**
 * createCookieParser()
 */

describe('createCookieParser()', () => {
  test('returns a function named `cookieParser`', () => {
    const cookieParser = createCookieParser();
    expect(typeof cookieParser).toBe('function');
    expect(cookieParser.name).toBe('cookieParser');
  });

  describe('cookieParser()', () => {
    describe('when passed a request object with no cookie header', () => {
      test('adds a `cookies` property set to null', () => {
        const cookieParser = createCookieParser();
        const context = createMockContext();
        cookieParser(context as TuftContext);
        expect(context.request).toHaveProperty('cookies', {});
      });
    });

    describe('when passed a request object with a cookie header', () => {
      test('adds a `cookies` property set to the expected value', () => {
        const cookieParser = createCookieParser();
        const context = createMockContext(true);
        cookieParser(context as TuftContext);

        expect(context.request).toHaveProperty('cookies');
        expect(context.request.cookies).toHaveProperty('name-1', 'value-1');
        expect(context.request.cookies).toHaveProperty('name-2', 'value-2');
      });
    });
  });
});
