import { PassThrough } from 'stream';
import { streamSymbol } from '../../src/context';
import { createBodyParser } from '../../src/pre-handlers/body-parser';

type MockTuftContext = {
  request: {
    headers: {
      [key: string]: string;
    };
    [key: string]: any;
  };
  [streamSymbol]: PassThrough;
};

function createMockContext(): MockTuftContext {
  return {
    request: {
      headers: {},
    },
    [streamSymbol]: new PassThrough(),
  };
}

const textChunks = [
  Buffer.from('foo'),
  Buffer.from('bar'),
  Buffer.from('baz'),
];

const jsonChunks = [
  Buffer.from('{"abc"'),
  Buffer.from(':123}'),
];

const urlEncodedChunks = [
  Buffer.from('abc='),
  Buffer.from('123'),
  Buffer.from('&'),
  Buffer.from('def='),
  Buffer.from('456'),
];

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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with only one chunk of data', () => {
      const context = createMockContext();
      const [chunk] = textChunks;

      context.request.headers['content-type'] = 'text/plain';
      context.request.headers['content-length'] = chunk.length.toString();

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end(chunk);

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', chunk);
      });
    });

    describe('when passed a stream with data', () => {
      const context = createMockContext();
      const expectedBody = Buffer.concat(textChunks);

      context.request.headers['content-type'] = 'text/plain';
      context.request.headers['content-length'] = expectedBody.length.toString();

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        textChunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', expectedBody);
      });
    });

    describe('when passed a stream with data and no `content-type` header', () => {
      const context = createMockContext();
      const expectedBody = Buffer.concat(textChunks);

      context.request.headers['content-length'] = expectedBody.length.toString();

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        textChunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', expectedBody);
      });
    });

    describe('when passed a stream with data but no `content-length` header', () => {
      const context = createMockContext();

      context.request.headers['content-type'] = 'text/plain';

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        textChunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data', () => {
      const context = createMockContext();
      const expectedBody = Buffer.concat(textChunks);

      context.request.headers['content-type'] = 'text/plain';
      context.request.headers['content-length'] = expectedBody.length.toString();

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        textChunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', expectedBody.toString());
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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data that exceeds the set body size limit', () => {
      const context = createMockContext();
      const expectedBody = Buffer.concat(textChunks);

      context.request.headers['content-type'] = 'text/plain';
      context.request.headers['content-length'] = expectedBody.length.toString();

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        textChunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data', () => {
      const context = createMockContext();
      const expectedBody = Buffer.concat(jsonChunks);

      context.request.headers['content-type'] = 'application/json';
      context.request.headers['content-length'] = expectedBody.length.toString();

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        jsonChunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', { abc: 123 });
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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data that exceeds the set body size limit', () => {
      const context = createMockContext();
      const expectedBody = Buffer.concat(jsonChunks);

      context.request.headers['content-type'] = 'application/json';
      context.request.headers['content-length'] = expectedBody.length.toString();

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        jsonChunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data', () => {
      const context = createMockContext();
      const chunks = urlEncodedChunks.slice(0, 2);
      const expectedBody = Buffer.concat(chunks);

      context.request.headers['content-type'] = 'application/x-www-form-urlencoded';
      context.request.headers['content-length'] = expectedBody.length.toString();

      test('adds a `body` property set to the expected value to the request object', async () => {
        const promise = bodyParser(context);
        chunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', { abc: '123' });
      });
    });
  });

  describe('when passed a stream with data that includes two key/value pairs', () => {
    const context = createMockContext();
    const expectedBody = Buffer.concat(urlEncodedChunks);

    context.request.headers['content-type'] = 'application/x-www-form-urlencoded';
    context.request.headers['content-length'] = expectedBody.length.toString();

    test('adds a `body` property set to the expected value to the request object', async () => {
      const promise = bodyParser(context);
      urlEncodedChunks.forEach(chunk => context[streamSymbol].write(chunk));
      context[streamSymbol].end();

      await expect(promise).resolves.toBeUndefined();
      expect(context.request).toHaveProperty('body', { abc: '123', def: '456' });
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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

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
      const context = createMockContext();

      test('adds a `body` property set to null to the request object', async () => {
        const promise = bodyParser(context);
        context[streamSymbol].end();

        await expect(promise).resolves.toBeUndefined();
        expect(context.request).toHaveProperty('body', null);
      });
    });

    describe('when passed a stream with data that exceeds the set body size limit', () => {
      const context = createMockContext();
      const chunks = urlEncodedChunks.slice(0, 2);

      context.request.headers['content-type'] = 'application/x-www-form-urlencoded';
      context.request.headers['content-length'] = chunks.length.toString();

      test('rejects with an error', async () => {
        const promise = bodyParser(context);
        chunks.forEach(chunk => context[streamSymbol].write(chunk));
        context[streamSymbol].end();

        await expect(promise).resolves.toEqual({ error: 'PAYLOAD_TOO_LARGE' });
        expect(context.request).not.toHaveProperty('body');
      });
    });
  });
});
