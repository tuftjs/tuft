import { createCookieParser } from '../../src/pre-handlers/cookie-parser';

type MockTuftContext = {
  request: {
    headers: {
      cookie?: string,
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
    mockContext.request.headers.cookie = 'name-1=value-1;name-2=value-2';
  }

  return mockContext;
}

/**
 * createCookieParser()
 */

describe('createCookieParser()', () => {
  let cookieParser: (t: MockTuftContext) => void;

  test('returns a function named `cookieParser`', () => {
    cookieParser = createCookieParser();
    expect(typeof cookieParser).toBe('function');
    expect(cookieParser.name).toBe('cookieParser');
  });

  describe('cookieParser()', () => {
    describe('when passed a request object with no cookie header', () => {
      test('adds a `cookies` property set to null', () => {
        const context = createMockContext();
        cookieParser(context);
        expect(context.request).toHaveProperty('cookies', {});
      });
    });

    describe('when passed a request object with a cookie header', () => {
      test('adds a `cookies` property set to the expected value', () => {
        const context = createMockContext(true);
        cookieParser(context);
        expect(context.request).toHaveProperty('cookies');
        expect(context.request.cookies).toHaveProperty('name-1', 'value-1');
        expect(context.request.cookies).toHaveProperty('name-2', 'value-2');
      });
    });
  });
});
