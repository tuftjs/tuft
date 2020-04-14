import { TuftContext, createTuftContext, createTuftContextWithBody } from '../src/context';
import { HTTP2_HEADER_STATUS, HTTP_STATUS_OK, HTTP2_HEADER_METHOD, HTTP2_METHOD_GET, HTTP2_HEADER_PATH, HTTP2_HEADER_COOKIE, HTTP2_METHOD_POST, HTTP2_HEADER_CONTENT_LENGTH, HTTP2_HEADER_CONTENT_TYPE } from '../src/constants';

describe('TuftContext', () => {
  const mockStream = {
    on: jest.fn((_, callback) => {
      callback();
    }),
    sentHeaders: {},
    pushAllowed: false,
  };

  const params = {
    stream: mockStream,
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
    const t = new TuftContext(params);
    expect(t).toHaveProperty('outgoingHeaders', {});
    expect(t).toHaveProperty('sentHeaders', mockStream.sentHeaders);
    expect(t).toHaveProperty('pushAllowed', false);
  });

  describe('TuftContext.prototype.setHeader()', () => {
    //@ts-ignore
    const t = new TuftContext(params);

    test('returns undefined', () => {
      expect(t.setHeader(HTTP2_HEADER_STATUS, HTTP_STATUS_OK)).toBeUndefined();
    });
  });

  describe('TuftContext.prototype.getHeader()', () => {
    //@ts-ignore
    const t = new TuftContext(params);
    t.setHeader(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);

    test('returns the expected value', () => {
      expect(t.getHeader(HTTP2_HEADER_STATUS)).toBe(HTTP_STATUS_OK);
    });
  });

  describe('TuftContext.prototype.setCookie()', () => {
    //@ts-ignore
    const t = new TuftContext(params);

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
      const t = new TuftContext(params);

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
      const t = new TuftContext(params);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { invalidProperty: 42 });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo']);
      });
    });

    describe('when passed an options object with \'secure\' and \'httpOnly\' set to false', () => {
      //@ts-ignore
      const t = new TuftContext(params);

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
      const t = new TuftContext(params);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'strict' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=Strict']);
      });
    });

    describe('when passed an options object with \'sameSite\' set to \'lax\'', () => {
      //@ts-ignore
      const t = new TuftContext(params);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'lax' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=Lax']);
      });
    });

    describe('when passed an options object with \'sameSite\' set to \'none\'', () => {
      //@ts-ignore
      const t = new TuftContext(params);

      test('adds the expected cookie entry', () => {
        t.setCookie('a', 'foo', { sameSite: 'none' });
        expect(t.outgoingHeaders).toHaveProperty('set-cookie', ['a=foo; SameSite=None']);
      });
    });

    describe('when passed an options object with \'sameSite\' set to an invalid value', () => {
      //@ts-ignore
      const t = new TuftContext(params);

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

  describe('with option \'parseCookies\' set to true', () => {
    const mockHeaders = {
      [HTTP2_HEADER_METHOD]: HTTP2_METHOD_GET,
      [HTTP2_HEADER_PATH]: '/foo/bar/baz',
      [HTTP2_HEADER_COOKIE]: 'cookie-name-0=cookie-value-0;cookie-name-1=cookie-value-1',
    };

    const options = { parseCookies: true };

    test('returns an instance of TuftContext', () => {
      //@ts-ignore
      const result = createTuftContext(mockStream, mockHeaders, options);
      expect(result).toBeInstanceOf(TuftContext);
    });
  });
});

describe('createTuftContextWithBody()', () => {
  const mockStream = {
    on: jest.fn((_, callback) => {
      callback();
    }),
  };

  const mockStreamWithNoBody = {
    on: jest.fn((_, callback) => {
      callback();
    }),
    [Symbol.asyncIterator]() {
      return {
        next() {
          return Promise.resolve({ done: true });
        }
      };
    }
  };

  const mockStreamWithOneBodyChunk = {
    on: jest.fn((_, callback) => {
      callback();
    }),
    [Symbol.asyncIterator]() {
      return {
        i: 0,
        next() {
          if (this.i < 1) {
            this.i++;
            return Promise.resolve({ value: Buffer.from('"abc"'), done: false });
          }

          return Promise.resolve({ done: true });
        }
      };
    }
  };

  const mockStreamWithTwoBodyChunks = {
    on: jest.fn((_, callback) => {
      callback();
    }),
    [Symbol.asyncIterator]() {
      return {
        i: 0,
        next() {
          if (this.i < 2) {
            this.i++;
            return Promise.resolve({ value: Buffer.from('"abc"'), done: false });
          }

          return Promise.resolve({ done: true });
        }
      };
    }
  };

  const mockStreamUrlEncoded = {
    on: jest.fn((_, callback) => {
      callback();
    }),
    [Symbol.asyncIterator]() {
      return {
        i: 0,
        next() {
          if (this.i < 1) {
            this.i++;
            return Promise.resolve({ value: Buffer.from('abc=123&xyz=456'), done: false });
          }

          return Promise.resolve({ done: true });
        }
      };
    }
  };

  beforeAll(() => {
    mockStream.on.mockClear();
    mockStreamWithNoBody.on.mockClear();
    mockStreamWithOneBodyChunk.on.mockClear();
    mockStreamWithTwoBodyChunks.on.mockClear();
  });

  describe('with \'method\' header set to \'POST\'', () => {
    describe('with a path that includes a query string', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/foo?bar=baz',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('with option \'params\' set', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/foo/bar/baz',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      const options = {
        params: {
          0: 'one',
          2: 'three',
        },
      };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders, options);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('with option \'parseCookies\' set to true', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/foo/bar/baz',
        [HTTP2_HEADER_COOKIE]: 'cookie-name-0=cookie-value-0;cookie-name-1=cookie-value-1',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      const options = { parseCookies: true };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders, options);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });


    describe('and no body', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
      };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithNoBody, mockHeaders);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('and a body with one chunk', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('and a body with more than one chunk', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '10',
      };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithTwoBodyChunks, mockHeaders);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('and a missing \'content-length\' header', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
      };

      test('throws an error', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders);
        await expect(result).rejects.toThrow('ERR_CONTENT_LENGTH_REQUIRED');
      });
    });

    describe('and a \'content-length\' value that does not match body length', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '10',
      };

      test('throws an error', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders);
        await expect(result).rejects.toThrow('ERR_CONTENT_LENGTH_MISMATCH');
      });
    });

    describe('and a missing \'content-type\' header', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('and \'parseText\' set to a value less than body length', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      const options = { parseText: 1 };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders, options);
        await expect(result).rejects.toThrow('ERR_BODY_LIMIT_EXCEEDED');
      });
    });

    describe('and \'parseText\' set to a value greater than body length', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      const options = { parseText: 100 };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders, options);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('and \'parseJson\' set to a value less than body length', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      const options = { parseJson: 1 };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders, options);
        await expect(result).rejects.toThrow('ERR_BODY_LIMIT_EXCEEDED');
      });
    });

    describe('and \'parseJson\' set to a value greater than body length', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      const options = { parseJson: 100 };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamWithOneBodyChunk, mockHeaders, options);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });

    describe('and \'parseUrlEncoded\' set to a value less than body length', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/x-www-form-urlencoded',
        [HTTP2_HEADER_CONTENT_LENGTH]: '15',
      };

      const options = { parseUrlEncoded: 1 };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamUrlEncoded, mockHeaders, options);
        await expect(result).rejects.toThrow('ERR_BODY_LIMIT_EXCEEDED');
      });
    });

    describe('and \'parseUrlEncoded\' set to a value greater than body length', () => {
      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: HTTP2_METHOD_POST,
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/x-www-form-urlencoded',
        [HTTP2_HEADER_CONTENT_LENGTH]: '15',
      };

      const options = { parseUrlEncoded: 100 };

      test('returns an instance of TuftContext', async () => {
        //@ts-ignore
        const result = createTuftContextWithBody(mockStreamUrlEncoded, mockHeaders, options);
        await expect(result).resolves.toBeInstanceOf(TuftContext);
      });
    });
  });
});
