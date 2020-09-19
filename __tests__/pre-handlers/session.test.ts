import type { SetCookieOptions } from '../../src/context';

import { createSession, randomBytesAsync } from '../../src/pre-handlers/session';
import { responseSymbol } from '../../src/context';
import { HTTP_HEADER_COOKIE } from '../../src/constants';
import { PassThrough } from 'stream';

jest.mock('crypto');

afterAll(() => {
  jest.restoreAllMocks();
});

type MockTuftContext = {
  [responseSymbol]: PassThrough;
  request: {
    headers: {
      [HTTP_HEADER_COOKIE]?: string,
    },
    [key: string]: any;
  },
  setCookie: (name: string, value: string, options?: SetCookieOptions) => MockTuftContext,
};

function createMockContext(headers?: { [key: string]: any }): any {
  const mockContext: MockTuftContext = {
    [responseSymbol]: new PassThrough(),
    request: {
      headers: {},
    },
    setCookie: jest.fn(),
  };

  if (headers) {
    mockContext.request.headers = headers;
  }

  return mockContext;
}

function createMockStore(data?: ([string, object])[] | null, throwError = false) {
  return {
    _store: new Map(data),
    get(name: string) {
      return this._store.get(name);
    },
    set(name: string, value: object) {
      if (throwError) {
        throw Error('mock error');
      }
      this._store.set(name, value);
    },
    delete(name: string) {
      this._store.delete(name);
    },
  };
}

/**
 * createSession()
 */

describe('createSession()', () => {
  test('returns a function named `session`', () => {
    const session = createSession();
    expect(typeof session).toBe('function');
    expect(session.name).toBe('session');
  });
});

describe('createSession() with custom `name` and `cookieName`', () => {
  test('returns a function named `session`', () => {
    const session = createSession({ name: 'my session', cookieName: 'my_session' });
    expect(typeof session).toBe('function');
    expect(session.name).toBe('session');
  });
});

/**
 * session()
 */

describe('session()', () => {
  describe('when passed a context without cookies', () => {
    test('creates a new session that can be destroyed', async () => {
      const session = createSession();
      const context = createMockContext();

      await session(context);

      expect(context.request).toHaveProperty('session');
      expect(typeof context.request.session).toBe('object');

      expect(context.setCookie).toHaveBeenCalledTimes(1);

      context[responseSymbol].emit('finish');
    });

    test('creates a new session that can be destroyed', async () => {
      const session = createSession();
      const context = createMockContext();

      await session(context);

      expect(context.request.session).toHaveProperty('destroy');
      expect(typeof context.request.session.destroy).toBe('function');

      await context.request.session.destroy();

      expect(context.setCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('when passed a context with headers that include an invalid session ID', () => {
    test('creates a new session', async () => {
      const session = createSession();
      const context = createMockContext({
        cookie: 'session_id=invalid id',
      });

      await session(context);

      expect(context.request).toHaveProperty('session');
      expect(typeof context.request.session).toBe('object');
    });
  });
});

describe('session() with custom session store', () => {
  describe('when passed a context without a cookie header', () => {
    test('creates a new session that can be destroyed', async () => {
      const store = createMockStore();
      const session = createSession({ store });
      const context = createMockContext();

      await session(context);

      expect(context.request).toHaveProperty('session');
      expect(typeof context.request.session).toBe('object');

      expect(context.setCookie).toHaveBeenCalledTimes(1);

      context[responseSymbol].emit('finish');
    });

    test('creates a new session that can be destroyed', async () => {
      const store = createMockStore();
      const session = createSession({ store });
      const context = createMockContext();

      await session(context);

      expect(context.request.session).toHaveProperty('destroy');
      expect(typeof context.request.session.destroy).toBe('function');

      await context.request.session.destroy();

      expect(context.setCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('when passed a context with a cookie header that does not include a session ID', () => {
    test('creates a new session', async () => {
      const store = createMockStore();
      const session = createSession({ store });
      const context = createMockContext({
        cookie: 'foo=bar',
      });

      await session(context);

      expect(context.request).toHaveProperty('session');
      expect(typeof context.request.session).toBe('object');
    });
  });

  describe('when passed a context with a cookie header that includes an invalid session ID', () => {
    test('creates a new session', async () => {
      const store = createMockStore();
      const session = createSession({ store });
      const context = createMockContext({
        cookie: 'session_id=invalid id',
      });

      await session(context);

      expect(context.request).toHaveProperty('session');
      expect(typeof context.request.session).toBe('object');
    });
  });

  describe('when passed a context with a cookie header that includes a valid session ID', () => {
    test('creates a new session with the existing data', async () => {
      const sessionId = 'mock session id';
      const sessionObj = {
        mockKey: 'mock value',
      };
      const store = createMockStore([[sessionId, sessionObj]]);
      const session = createSession({ store });
      const context = createMockContext({
        cookie: `session_id=${sessionId}`,
      });

      await session(context);

      expect(context.request).toHaveProperty('session');
      expect(typeof context.request.session).toBe('object');
      expect(context.request.session).toHaveProperty('mockKey', 'mock value');
    });
  });

  describe('when passed a context with a cookie header that includes a valid session ID before other non-session cookies', () => {
    test('creates a new session with the existing data', async () => {
      const sessionId = 'mock session id';
      const sessionObj = {
        mockKey: 'mock value',
      };
      const store = createMockStore([[sessionId, sessionObj]]);
      const session = createSession({ store });
      const context = createMockContext({
        cookie: `session_id=${sessionId};foo=bar`,
      });

      await session(context);

      expect(context.request).toHaveProperty('session');
      expect(typeof context.request.session).toBe('object');
      expect(context.request.session).toHaveProperty('mockKey', 'mock value');
    });
  });

  describe('when the session store throws an error after calling `.set()`', () => {
    test('the error is logged', async done => {
      jest
        .spyOn(console, 'error')
        .mockImplementationOnce(err => {
          expect(err).toEqual(Error('mock error'));
          done();
        });

      const sessionId = 'throw mock error';
      const store = createMockStore(null, true);
      const session = createSession({ store });
      const context = createMockContext({
        cookie: `session_id=${sessionId}`,
      });

      await session(context);

      context[responseSymbol].emit('finish');
    });
  });
});

/**
 * randomBytesAsync()
 */

describe('randomBytesAsync()', () => {
  describe('when passed a number', () => {
    test('resolves with a buffer of the given size', async () => {
      const size = 10;
      const result = await randomBytesAsync(size);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(Buffer.from('mock buffer'));
    });
  });

  describe('when passed a number that triggers the mock error', () => {
    test('rejects with an error', async () => {
      const promise = randomBytesAsync(100);
      await expect(promise).rejects.toThrow(Error('mock error'));
    });
  });
});
