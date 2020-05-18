import { cloneDeep } from 'lodash';
import { symStream } from '../../src/context';
import { createBodyParser } from '../../src/pre-handlers/body-parser';

type Callback = (...args: any[]) => void;

type MockTuftContext = {
  request: {
    headers: {
      [key: string]: string;
    },
    [key: string]: any;
  },
  [symStream]: {
    _callbacks: {
      data: Callback[],
      end: Callback[],
    },
    on: (event: 'data' | 'end', callback: Callback) => void,
    emitData: (data: any) => void,
    emitEnd: () => void,
  },
};

const mockContext: MockTuftContext = {
  request: {
    headers: {},
  },
  [symStream]: {
    _callbacks: {
      data: [],
      end: [],
    },
    on(event, callback) {
      this._callbacks[event].push(callback);
    },
    emitData(data) {
      this._callbacks.data.forEach((callback: Callback) => callback(data));
    },
    emitEnd() {
      this._callbacks.end.forEach((callback: Callback) => callback());
    }
  }
};

/**
 * createBodyParser() without an options argument
 */

describe('createBodyParser() without an options argument', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser();
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with only one chunk of data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'text/plain',
        'content-length': '3',
      };

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', Buffer.from('foo'));
      });
    });

    describe('when passed a stream with data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'text/plain',
        'content-length': '11',
      };

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo '));
        context[symStream].emitData(Buffer.from('bar '));
        context[symStream].emitData(Buffer.from('baz'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', Buffer.from('foo bar baz'));
      });
    });

    describe('when passed a stream with data and no `content-type` header', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-length': '11',
      };

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo '));
        context[symStream].emitData(Buffer.from('bar '));
        context[symStream].emitData(Buffer.from('baz'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', Buffer.from('foo bar baz'));
      });
    });

    describe('when passed a stream with data but no `content-length` header', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'text/plain',
      };

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo '));
        context[symStream].emitData(Buffer.from('bar '));
        context[symStream].emitData(Buffer.from('baz'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toEqual({ error: 'LENGTH_REQUIRED' });
        expect(context.request).not.toHaveProperty('body');
      });
    });
  });
});

/**
 * createBodyParser() with option `text` set to true
 */

describe('createBodyParser() with option `text` set to true', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ text: true });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'text/plain',
        'content-length': '11',
      };

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo '));
        context[symStream].emitData(Buffer.from('bar '));
        context[symStream].emitData(Buffer.from('baz'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', 'foo bar baz');
      });
    });
  });
});

/**
 * createBodyParser() with option `text` set to 0
 */

describe('createBodyParser() with option `text` set to 0', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ text: 0 });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });
  });
});

/**
 * createBodyParser() with option `text` set to 1
 */

describe('createBodyParser() with option `text` set to 1', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ text: 1 });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data that exceeds the set body size limit', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'text/plain',
        'content-length': '11',
      };

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo '));
        context[symStream].emitData(Buffer.from('bar '));
        context[symStream].emitData(Buffer.from('baz'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toEqual({ error: 'PAYLOAD_TOO_LARGE' });
        expect(context.request).not.toHaveProperty('body');
      });
    });
  });
});

/**
 * createBodyParser() with option `json` set to true
 */

describe('createBodyParser() with option `json` set to true', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ json: true });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'application/json',
        'content-length': '10',
      };

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('{"foo"'));
        context[symStream].emitData(Buffer.from(':42}'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', { foo: 42 });
      });
    });
  });
});

/**
 * createBodyParser() with option `json` set to 0
 */

describe('createBodyParser() with option `json` set to 0', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ json: 0 });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });
  });
});

/**
 * createBodyParser() with option `json` set to 1
 */

describe('createBodyParser() with option `json` set to 1', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ json: 1 });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data that exceeds the set body size limit', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'application/json',
        'content-length': '10',
      };

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('{"foo"'));
        context[symStream].emitData(Buffer.from(':42}'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toEqual({ error: 'PAYLOAD_TOO_LARGE' });
        expect(context.request).not.toHaveProperty('body');
      });
    });
  });
});

/**
 * createBodyParser() with option `urlEncoded` set to true
 */

describe('createBodyParser() with option `urlEncoded` set to true', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ urlEncoded: true });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': '6',
      };

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo='));
        context[symStream].emitData(Buffer.from('42'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', { foo: '42' });
      });
    });
  });

  describe('when passed a stream with data that includes two key/value pairs', () => {
    const context = cloneDeep(mockContext);
    context.request.headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': '14',
    };

    test('adds a `body` property set to the expected value to the request object', async () => {
      const promise = bodyParser(context);
      context[symStream].emitData(Buffer.from('foo='));
      context[symStream].emitData(Buffer.from('42'));
      context[symStream].emitData(Buffer.from('&'));
      context[symStream].emitData(Buffer.from('bar='));
      context[symStream].emitData(Buffer.from('baz'));
      context[symStream].emitEnd();

      await expect(promise).resolves.toBeUndefined();
      expect(context.request).toHaveProperty('body', { foo: '42', bar: 'baz' });
    });
  });
});

/**
 * createBodyParser() with option `urlEncoded` set to 0
 */

describe('createBodyParser() with option `urlEncoded` set to 0', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ urlEncoded: 0 });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });
  });
});

/**
 * createBodyParser() with option `urlEncoded` set to 1
 */

describe('createBodyParser() with option `urlEncoded` set to 1', () => {
  let bodyParser: (t: MockTuftContext) => Promise<void>;

  test('returns a function named `bodyParser`', () => {
    //@ts-expect-error
    bodyParser = createBodyParser({ urlEncoded: 1 });
    expect(typeof bodyParser).toBe('function');
    expect(bodyParser.name).toBe('bodyParser');
  });

  describe('bodyParser()', () => {
    describe('when passed a stream with NO data', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {};

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[symStream].emitEnd();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data that exceeds the set body size limit', () => {
      const context = cloneDeep(mockContext);
      context.request.headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': '6',
      };

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        context[symStream].emitData(Buffer.from('foo='));
        context[symStream].emitData(Buffer.from('42'));
        context[symStream].emitEnd();

        await expect(promise).resolves.toEqual({ error: 'PAYLOAD_TOO_LARGE' });
        expect(context.request).not.toHaveProperty('body');
      });
    });
  });
});
