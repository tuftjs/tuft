import { cookieParserPlugin } from '../../src/plugins/cookie-parser';

type MockTuftContext = {
  request: {
    headers: {
      cookie?: string,
    },
    [key: string]: any;
  },
};

const mockContextWithoutCookie: MockTuftContext = {
  request: {
    headers: {},
  },
};

const mockContextWithCookie: MockTuftContext = {
  request: {
    headers: {
      cookie: 'cookie-name-1=cookie-value-1;cookie-name-2=cookie-value-2',
    },
  },
};

describe('cookieParserPlugin()', () => {
  let cookieParser: (t: MockTuftContext) => void;

  test('returns a function named \'cookieParser\'', () => {
    cookieParser = cookieParserPlugin();
    expect(typeof cookieParser).toBe('function');
    expect(cookieParser.name).toBe('cookieParser');
  });

  describe('cookieParser()', () => {
    describe('when passed a request object with no cookie header', () => {
      test('add a \'cookies\' property set to null', () => {
        cookieParser(mockContextWithoutCookie);
        expect(mockContextWithoutCookie.request).toHaveProperty('cookies', {});
      });
    });
  });

  describe('when passed a request object with a cookie header', () => {
    test('add a \'cookies\' property set to the expected object', () => {
      cookieParser(mockContextWithCookie);
      expect(mockContextWithCookie.request).toHaveProperty('cookies', {
        'cookie-name-1': 'cookie-value-1',
        'cookie-name-2': 'cookie-value-2',
      });
    });
  });
});
