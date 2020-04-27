import type { TuftContext } from '../src/context';
import type { HttpError } from '../src/utils';
import type { TuftResponse } from '../src/route-map';

import { constants } from 'http2';
import { promises as fsPromises } from 'fs';
import {
  createResponseHandler,
  returnResponse,
  handleResponseWithContext,
  handleResponseWithoutContext,
  callHandlerWithErrorHandling,
  callResponseHandler,
  handleResponse,
  handleHttpErrorResponse,
  handleRedirectResponse,
  handleBodyResponse,
  handleFileResponse,
  handleStatusResponse,
} from '../src/response-handlers';
import {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_LOCATION,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
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

function mockResponsePluginThatReturnsResponse(response: TuftResponse) {
  return response;
}

function mockResponsePluginThatReturnsUndefined() {
  return;
}

function mockResponsePluginThatReturnsErrObject() {
  return { error: 'TEAPOT' as HttpError };
}

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
    test('returns bound handleResponseWithContext()', () => {
      const result = createResponseHandler({
        response: () => {
          return {};
        },
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response handler with plugins', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createResponseHandler({
        response: () => {
          return {};
        },
        plugins: [mockPlugin],
        responders: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response handler with an error handler', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createResponseHandler({
        response: () => {
          return {};
        },
        errorHandler: () => {
          return {};
        },
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with plugins', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createResponseHandler({
        response: {},
        plugins: [mockPlugin],
        responders: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with plugins and an error handler', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createResponseHandler({
        response: {},
        plugins: [mockPlugin],
        responders: [mockPlugin],
        errorHandler: () => {
          return {};
        },
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a `body` property', () => {
    describe('and a `contentType` property set to `text`', () => {
      test('returns bound handleResponseWithoutContext()', () => {
        const result = createResponseHandler({
          response: {
            contentType: 'text',
            body: 'abc',
          },
        });

        expect(result.name).toBe('bound handleResponseWithoutContext');
      });
    });

    describe('and a `contentType` property set to `json`', () => {
      test('returns bound handleResponseWithoutContext()', () => {
        const result = createResponseHandler({
          response: {
            contentType: 'json',
            body: { abc: 123 },
          },
        });

        expect(result.name).toBe('bound handleResponseWithoutContext');
      });
    });

    describe('and a `contentType` property set to `buffer`', () => {
      test('returns bound handleResponseWithoutContext()', () => {
        const result = createResponseHandler({
          response: {
            contentType: 'buffer',
            body: Buffer.from('abc'),
          },
        });

        expect(result.name).toBe('bound handleResponseWithoutContext');
      });
    });
  });

  describe('when passed a response object with a `body` property of type boolean', () => {
    test('returns bound handleResponseWithoutContext()', () => {
      const result = createResponseHandler({
        response: { body: true },
      });

      expect(result.name).toBe('bound handleResponseWithoutContext');
    });
  });

  describe('when passed a response object with a `body` property of type string', () => {
    test('returns bound handleResponseWithoutContext()', () => {
      const result = createResponseHandler({
        response: { body: 'abc' },
      });

      expect(result.name).toBe('bound handleResponseWithoutContext');
    });
  });

  describe('when passed a response object with a `body` property of type Buffer', () => {
    test('returns bound handleResponseWithoutContext()', () => {
      const result = createResponseHandler({
        response: { body: Buffer.from('abc') },
      });

      expect(result.name).toBe('bound handleResponseWithoutContext');
    });
  });

  describe('when passed a response object with a `body` property of type object', () => {
    test('returns bound handleResponseWithoutContext()', () => {
      const result = createResponseHandler({
        response: { body: {} },
      });

      expect(result.name).toBe('bound handleResponseWithoutContext');
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
 * handleResponseWithContext()
 */

describe('handleResponseWithContext()', () => {
  const mockHandleResponse = jest.fn();

  const headers = {
    [HTTP2_HEADER_METHOD]: 'GET',
    [HTTP2_HEADER_PATH]: '/',
  };

  describe('when an error object is NOT returned', () => {
    test('mockHandleResponse() is called', async () => {
      mockHandleResponse.mockClear();

      const result = handleResponseWithContext(
        [mockPlugin],
        mockHandleResponse,
        {},
        //@ts-ignore
        mockStream,
        headers,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockHandleResponse).toHaveBeenCalled();
    });
  });

  describe('when an error object is returned', () => {
    test('mockHandleResponse() is NOT called', async () => {
      mockHandleResponse.mockClear();

      const result = handleResponseWithContext(
        [mockResponsePluginThatReturnsErrObject],
        mockHandleResponse,
        {},
        //@ts-ignore
        mockStream,
        headers,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockHandleResponse).not.toHaveBeenCalled();
    });
  });
});

/**
 * handleResponseWithoutContext()
 */

describe('handleResponseWithoutContext()', () => {
  describe('when the passed response object has a `status` property', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const response = { status: HTTP_STATUS_TEAPOT };
      const result = handleResponseWithoutContext(
        [mockResponsePluginThatReturnsResponse],
        response,
        //@ts-ignore
        mockStream,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when the passed response object has no properties', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const result = handleResponseWithoutContext(
        [mockResponsePluginThatReturnsResponse],
        {},
        //@ts-ignore
        mockStream,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when the passed response plugin returns undefined', () => {
    test('stream.respond() is NOT called', async () => {
      const result = handleResponseWithoutContext(
        [mockResponsePluginThatReturnsUndefined],
        {},
        //@ts-ignore
        mockStream,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });
});

/**
 * callHandlerWithErrorHandling()
 */

describe('callHandlerWithErrorHandling()', () => {
  describe('when passed a handler that does not throw or return an error', () => {
    test('returns the expected object', async () => {
      const response = {};
      const handler = () => response;

      const result = callHandlerWithErrorHandling(
        handler,
        mockErrorHandler,
        mockContext
      );

      await expect(result).resolves.toBe(response);
      expect(mockErrorHandler).not.toHaveBeenCalled();
    });
  });

  describe('when passed a handler that returns an error', () => {
    test('returns the expected object', async () => {
      const err = Error('mock error');
      const handler = () => err;

      const result = callHandlerWithErrorHandling(
        handler,
        mockErrorHandler,
        mockContext
      );

      await expect(result).resolves.toEqual({ error: 'TEAPOT' });
      expect(mockErrorHandler).toHaveBeenCalledWith(err, mockContext);
    });
  });

  describe('when passed a handler that throws an error and invalidMockErrorHandler1', () => {
    test('rejects with an error', async () => {
      const err = Error('mock error');
      const handler = () => {
        throw err;
      };

      const result = callHandlerWithErrorHandling(
        handler,
        invalidMockErrorHandler1,
        mockContext
      );

      await expect(result).rejects.toThrow('Error handlers must return a Tuft error object.');
      expect(invalidMockErrorHandler1).toHaveBeenCalledWith(err, mockContext);
    });
  });

  describe('when passed a handler that throws an error and invalidMockErrorHandler2', () => {
    test('rejects with an error', async () => {
      const err = Error('mock error');
      const handler = () => {
        throw err;
      };

      const result = callHandlerWithErrorHandling(
        handler,
        //@ts-ignore
        invalidMockErrorHandler2,
        mockContext
      );

      await expect(result).rejects.toThrow('Error handlers must return a Tuft error object.');
      expect(invalidMockErrorHandler2).toHaveBeenCalledWith(err, mockContext);
    });
  });
});

/**
 * callResponseHandler()
 */

describe('callResponseHandler()', () => {
  describe('when passed a handler that returns an non-empty response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const response = { status: HTTP_STATUS_TEAPOT };
      const handler = () => response;

      const result = callResponseHandler(
        handler,
        [mockResponsePluginThatReturnsResponse],
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when passed a handler that returns an empty response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const response = {};
      const handler = () => response;

      const result = callResponseHandler(
        handler,
        [mockResponsePluginThatReturnsResponse],
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when passed a response plugin that does not return the original response', () => {
    test('stream.respond() is not called', async () => {
      const response = {};
      const handler = () => response;

      const result = callResponseHandler(
        handler,
        [() => {}],
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });

  describe('when passed a handler that returns a number', () => {
    test('rejects with an error', async () => {
      const response = 42;
      const handler = () => response;

      const result = callResponseHandler(
        //@ts-ignore
        handler,
        [mockResponsePluginThatReturnsResponse],
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).rejects.toThrow(`'${response}' is not a valid Tuft response object.`);
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });
});

/**
 * handleResponse()
 */

describe('handleResponse()', () => {
  describe('when passed a response with an `error` property', () => {
    test('returns undefined', async () => {
      const response = {
        error: 'TEAPOT' as HttpError,
      };

      const result = handleResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a response with a `redirect` property', () => {
    test('returns undefined', async () => {
      const response = {
        redirect: '/foo',
      };

      const result = handleResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a response with a `body` property', () => {
    test('returns undefined', async () => {
      const response = {
        body: 'abc',
      };

      const result = handleResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a response with both `body` and `status` properties', () => {
    test('returns undefined', async () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
        body: 'abc',
      };

      const result = handleResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a response with a `file` property', () => {
    test('returns undefined', async () => {
      const response = {
        file: __filename,
      };

      const result = handleResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a response with both `file` and `status` properties', () => {
    test('returns undefined', async () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
        file: __filename,
      };

      const result = handleResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a response with a `status` property', () => {
    test('returns undefined', async () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
      };

      const result = handleResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
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
      const url = '/foo';
      const result = handleRedirectResponse(
        url,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_FOUND,
        [HTTP2_HEADER_LOCATION]: url,
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
        body,
        type,
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
        body,
        type,
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

  describe('when passed an invalid `type` value', () => {
    test('throws an error', () => {
      const body = { abc: 123 };
      const type = 'foo';

      const fn = () => handleBodyResponse(
        body,
        type,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(fn).toThrow(`${type} is not a valid value for 'contentType'`);
    });
  });

  describe('when passed a `body` argument of type boolean with `type` argument undefined', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const body = true;

      const result = handleBodyResponse(
        body,
        undefined,
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
        body,
        undefined,
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
        body,
        undefined,
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
        body,
        undefined,
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
        body,
        undefined,
        //@ts-ignore
        mockStream,
        {},
      );

      expect(fn).toThrow(`'${typeof body}' is not a supported response body type.`);
    });
  });
});

/**
 * handleBodyResponse()
 */

describe('handleFileResponse()', () => {
  test('stream.respondWithFile() is called with the expected arguments', () => {
    const file = __filename;
    const result = handleFileResponse(
      file,
      //@ts-ignore
      mockStream,
      {},
    );

    expect(result).toBeUndefined();
    expect(mockStream.respondWithFile).toHaveBeenCalledWith(file, {});
  });
});

/**
 * handleBodyResponse()
 */

describe('handleStatusResponse()', () => {
  describe('when passed a `status` argument of 418', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const result = handleStatusResponse(
        HTTP_STATUS_TEAPOT,
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
