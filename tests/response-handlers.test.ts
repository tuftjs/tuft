import type { TuftContext } from '../src/context';
import type { HttpError } from '../src/utils';

import { constants } from 'http2';
import { promises as fsPromises } from 'fs';
import {
  createResponseHandler,
  returnResponse,
  handleResponseObject,
  handleResponseHandler,
  handleUnknownResponse,
  handleHttpErrorResponse,
  handleRedirectResponse,
  handleBodyResponse,
  handleFileResponse,
  handleStatusResponse,
} from '../src/response-handlers';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_LOCATION,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
} from '../src/constants';

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_TEAPOT,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FOUND,
} = constants;

const CONTENT_LENGTH = 42;

function mockPlugin(t: TuftContext) {
  t.request.foo = 42;
}

const mockIncomingHeaders = {
  [HTTP2_HEADER_METHOD]: 'GET',
  [HTTP2_HEADER_PATH]: '/',
};

const mockFileHandle = {
  stat: async () => {
    return { size: CONTENT_LENGTH };
  },
} as fsPromises.FileHandle;

const mockFsOpen = jest.spyOn(fsPromises, 'open').mockImplementation(async () => mockFileHandle);
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const mockStream = {
  respond: jest.fn(),
  respondWithFile: jest.fn(),
  end: jest.fn(),
};

const mockContext: any = {
  request: {},
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockContext.outgoingHeaders[key] = value;
  }),
};

const mockErrorHandler = jest.fn(() => {
  return {
    error: 'TEAPOT' as HttpError,
  };
});

const invalidMockErrorHandler1 = jest.fn(() => {
  return {};
});

const invalidMockErrorHandler2 = jest.fn(() => {
  return;
});

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.respondWithFile.mockClear();
  mockStream.end.mockClear();
  mockErrorHandler.mockClear();
  invalidMockErrorHandler1.mockClear();
  invalidMockErrorHandler2.mockClear();
});

afterAll(() => {
  mockFsOpen.mockRestore();
  mockConsoleError.mockRestore();
  mockExit.mockRestore();
});

/**
 * createResponseHandler()
 */

describe('createResponseHandler()', () => {
  describe('when passed a response handler', () => {
    test('returns bound handleResponseHandler()', () => {
      const result = createResponseHandler({
        response: () => {},
      });

      expect(result.name).toBe('bound handleResponseHandler');
    });
  });

  describe('when passed a response object with plugins', () => {
    test('returns bound handleResponseHandler()', () => {
      const result = createResponseHandler({
        response: {},
        plugins: [mockPlugin],
        responders: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseHandler');
    });
  });

  describe('when passed a response object with a `body` property', () => {
    describe('and a `contentType` property set to `text`', () => {
      test('returns bound handleResponseObject()', () => {
        const result = createResponseHandler({
          response: {
            contentType: 'text',
            body: 'abc',
          },
        });

        expect(result.name).toBe('bound handleResponseObject');
      });
    });

    describe('and a `contentType` property set to `json`', () => {
      test('returns bound handleResponseObject()', () => {
        const result = createResponseHandler({
          response: {
            contentType: 'json',
            body: { abc: 123 },
          },
        });

        expect(result.name).toBe('bound handleResponseObject');
      });
    });

    describe('and a `contentType` property set to `buffer`', () => {
      test('returns bound handleResponseObject()', () => {
        const result = createResponseHandler({
          response: {
            contentType: 'buffer',
            body: Buffer.from('abc'),
          },
        });

        expect(result.name).toBe('bound handleResponseObject');
      });
    });
  });

  describe('when passed a response object with a `body` property of type boolean', () => {
    test('returns bound handleResponseObject()', () => {
      const result = createResponseHandler({
        response: { body: true },
      });

      expect(result.name).toBe('bound handleResponseObject');
    });
  });

  describe('when passed a response object with a `body` property of type string', () => {
    test('returns bound handleResponseObject()', () => {
      const result = createResponseHandler({
        response: { body: 'abc' },
      });

      expect(result.name).toBe('bound handleResponseObject');
    });
  });

  describe('when passed a response object with a `body` property of type Buffer', () => {
    test('returns bound handleResponseObject()', () => {
      const result = createResponseHandler({
        response: { body: Buffer.from('abc') },
      });

      expect(result.name).toBe('bound handleResponseObject');
    });
  });

  describe('when passed a response object with a `body` property of type object', () => {
    test('returns bound handleResponseObject()', () => {
      const result = createResponseHandler({
        response: { body: {} },
      });

      expect(result.name).toBe('bound handleResponseObject');
    });
  });

  describe('when passed a response object with a `body` property of type symbol', () => {
    test('logs an error and exits with a non-zero exit code', () => {
      const expectedError = TypeError('\'symbol\' is not a supported response body type.');
      const result = createResponseHandler({
        response: { body: Symbol() },
      });

      expect(result).toBeUndefined();
      expect(mockConsoleError).toHaveBeenCalledWith(expectedError);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});

/**
 * returnResponse()
 */

describe('returnResponse()', () => {
  test('returns the passed object', () => {
    const obj = {};
    expect(returnResponse(obj)).toBe(obj);
  });
});

/**
 * handleResponseObject()
 */

describe('handleResponseObject()', () => {
  describe('when passed a responder that returns the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const responder = (response: {}) => response;

      const result = handleResponseObject(
        response,
        [responder],
        {},
        //@ts-ignore
        mockStream,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a responder that does not return the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const responder = () => {};

      const result = handleResponseObject(
        response,
        [responder],
        {},
        //@ts-ignore
        mockStream,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });
});

/**
 * handleResponseHandler()
 */

describe('handleResponseHandler()', () => {
  describe('when passed a handler that returns an object', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const result = handleResponseHandler(
        handler,
        [],
        [],
        {},
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a handler that returns null', () => {
    test('rejects with an error', async () => {
      const handler = () => {
        return null;
      };
      const result = handleResponseHandler(
        //@ts-ignore
        handler,
        [],
        [],
        {},
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).rejects.toThrow('\'null\' is not a valid Tuft response object.');
    });
  });

  describe('when passed a plugin handler that returns an error response', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const pluginHandler = () => {
        return {
          error: 'TEAPOT' as HttpError,
        };
      };
      const result = handleResponseHandler(
        handler,
        [pluginHandler],
        [],
        {},
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a plugin handler that returns undefined', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const pluginHandler = () => {};
      const result = handleResponseHandler(
        handler,
        [pluginHandler],
        [],
        {},
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a responder that returns the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const handler = () => {
        return response;
      };
      const responder = (response: {}) => response;
      const result = handleResponseHandler(
        handler,
        [],
        [responder],
        {},
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a responder that does not return the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const handler = () => {
        return response;
      };
      const responder = () => {};
      const result = handleResponseHandler(
        handler,
        [],
        [responder],
        {},
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });
});

/**
 * handleUnknownResponse()
 */

describe('handleUnknownResponse()', () => {
  describe('when passed a response with an `error` property', () => {
    test('returns undefined', () => {
      const response = {
        error: 'TEAPOT' as HttpError,
      };

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `redirect` property', () => {
    test('returns undefined', () => {
      const response = {
        redirect: '/foo',
      };

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `body` property', () => {
    test('returns undefined', () => {
      const response = {
        body: 'abc',
      };

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with both `body` and `status` properties', () => {
    test('returns undefined', () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
        body: 'abc',
      };

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `file` property', () => {
    test('returns undefined', () => {
      const response = {
        file: __filename,
      };

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with both `file` and `status` properties', () => {
    test('returns undefined', () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
        file: __filename,
      };

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `status` property', () => {
    test('returns undefined', () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
      };

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed an empty response', () => {
    test('returns undefined and stream.respond() is called with the expected arguments', () => {
      const response = {};

      const result = handleUnknownResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toBeCalledWith(expectedHeaders, { endStream: true });
    });
  });
});

/**
 * handleHttpErrorResponse()
 */

describe('handleHttpErrorResponse', () => {
  describe('when passed a valid value for `error`', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const response = {
        error: 'TEAPOT' as HttpError,
      };

      const result = handleHttpErrorResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when passed an invalid value for `error`', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const response = {
        error: 'FOO' as HttpError,
      };

      const result = handleHttpErrorResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_BAD_REQUEST,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when passed an object with a `body` property', () => {
    test('return undefined', () => {
      const response = {
        body: 'abc',
      };

      const result = handleHttpErrorResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(result).toBeUndefined();
    });
  });
});

/**
 * handleRedirectResponse()
 */

describe('handleRedirectResponse()', () => {
  describe('when passed a string for the `url` parameter', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const response = {
        redirect: '/foo',
      };
      const result = handleRedirectResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_FOUND,
        [HTTP2_HEADER_LOCATION]: response.redirect,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });
});

/**
 * handleBodyResponse()
 */

describe('handleBodyResponse()', () => {
  describe('when passed a `type` argument of `text/html`', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = '<p>abc</p>';
      const type = 'html';

      const result = handleBodyResponse(
        { body, type },
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(body);
    });
  });

  describe('when passed a `type` argument of `json`', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = { abc: 123 };
      const type = 'json';

      const result = handleBodyResponse(
        { body, type },
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: JSON.stringify(body).length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(JSON.stringify(body));
    });
  });

  describe('when passed a `type` argument of `json` and the body is already a string', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = '{"abc":123}';
      const type = 'json';

      const result = handleBodyResponse(
        { body, type },
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(body);
    });
  });

  describe('when passed an invalid `type` value', () => {
    test('throws an error', () => {
      const body = { abc: 123 };
      const type = 'foo';

      const fn = () => handleBodyResponse(
        { body, type },
        //@ts-ignore
        mockStream,
        {},
      );

      expect(fn).toThrow(`'${type}' is not a valid value for 'contentType'`);
    });
  });

  describe('when passed a `body` argument of type boolean with `type` argument undefined', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = true;

      const result = handleBodyResponse(
        { body },
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: body.toString().length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(body.toString());
    });
  });

  describe('when passed a `body` argument of type string with `type` argument undefined', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = 'abc';

      const result = handleBodyResponse(
        { body },
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(body);
    });
  });

  describe('when passed a `body` argument of type buffer with `type` argument undefined', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = Buffer.from('abc');

      const result = handleBodyResponse(
        { body },
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/octet-stream',
        [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(body);
    });
  });

  describe('when passed a `body` argument of type object with `type` argument undefined', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = { abc: 123 };

      const result = handleBodyResponse(
        { body },
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: JSON.stringify(body).length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(JSON.stringify(body));
    });
  });

  describe('when passed a `body` argument of type symbol with `type` argument undefined', () => {
    test('throws an error', () => {
      const body = Symbol();

      const fn = () => handleBodyResponse(
        { body },
        //@ts-ignore
        mockStream,
        {},
      );

      expect(fn).toThrow(`'${typeof body}' is not a supported response body type.`);
    });
  });
});

/**
 * handleFileResponse()
 */

describe('handleFileResponse()', () => {
  test('stream.respondWithFile() is called', () => {
    const response = {
      file: __filename,
    };
    const result = handleFileResponse(
      response,
      //@ts-ignore
      mockStream,
      {},
    );

    expect(result).toBeUndefined();
    expect(mockStream.respondWithFile).toHaveBeenCalled();
  });
});

/**
 * handleStatusResponse()
 */

describe('handleStatusResponse()', () => {
  describe('when passed a `status` argument of 418', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
      };
      const result = handleStatusResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });
});
