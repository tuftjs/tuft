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
  handleFileResponse,
  handleStatusResponse,
  handleBufferResponse,
  handleTextResponse,
  handleHtmlResponse,
  handleJsonResponse,
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

  describe('when passed a response object with a `json` property', () => {
    test('returns bound handleResponseObject()', () => {
      const result = createResponseHandler({
        response: {
          json: {},
        },
      });

      expect(result.name).toBe('bound handleResponseObject');
    });
  });

  describe('when passed a response object with plugins and responders', () => {
    test('returns bound handleResponseHandler()', () => {
      const result = createResponseHandler({
        response: {},
        preHandlers: [() => {}],
        responders: [() => {}]
      });

      expect(result.name).toBe('bound handleResponseHandler');
    });
  });

  describe('when passed a response object without plugins', () => {
    test('returns bound handleResponseObject()', () => {
      const result = createResponseHandler({
        response: {},
      });

      expect(result.name).toBe('bound handleResponseObject');
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

  describe('when passed a pre-handler that returns a response', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const preHandler = () => {
        return {
          status: HTTP_STATUS_TEAPOT,
        };
      };
      const result = handleResponseHandler(
        handler,
        [preHandler],
        [],
        {},
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('when passed a pre-handler that returns undefined', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const preHandler = () => {};
      const result = handleResponseHandler(
        handler,
        [preHandler],
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

  describe('when passed a response with a `raw` property', () => {
    test('returns undefined', () => {
      const response = {
        raw: Buffer.from('abc'),
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

  describe('when passed a response with a `text` property', () => {
    test('returns undefined', () => {
      const response = {
        text: 'abc',
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

  describe('when passed a response with an `html` property', () => {
    test('returns undefined', () => {
      const response = {
        html: '<h1>abc</h1>',
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

  describe('when passed a response with a `json` property', () => {
    test('returns undefined', () => {
      const response = {
        json: JSON.stringify('abc'),
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
 * handleBufferResponse()
 */

describe('handleBufferResponse()', () => {
  describe('with a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const raw = Buffer.from('abc');
      const response = {
        status: HTTP_STATUS_OK,
        raw,
      };

      const result = handleBufferResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/octet-stream',
        [HTTP2_HEADER_CONTENT_LENGTH]: raw.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });

  describe('without a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const raw = Buffer.from('abc');
      const response = {
        raw,
      };

      const result = handleBufferResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/octet-stream',
        [HTTP2_HEADER_CONTENT_LENGTH]: raw.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });
});

/**
 * handleTextResponse()
 */

describe('handleTextResponse()', () => {
  describe('with a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const text = 'abc';
      const response = {
        status: HTTP_STATUS_OK,
        text,
      };

      const result = handleTextResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: text.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });

  describe('without a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const text = 'abc';
      const response = {
        text,
      };

      const result = handleTextResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: text.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });

  describe('when passed a boolean value', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const text = true;
      const response = {
        text,
      };

      const result = handleTextResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: text.toString().length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });
});

/**
 * handleHtmlResponse()
 */

describe('handleHtmlResponse()', () => {
  describe('with a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const html = '<h1>abc</h1>';
      const response = {
        status: HTTP_STATUS_OK,
        html,
      };

      const result = handleHtmlResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: html.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });

  describe('without a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const html = '<h1>abc</h1>';
      const response = {
        html,
      };

      const result = handleHtmlResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: html.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });
});

/**
 * handleJsonResponse()
 */

describe('handleJsonResponse()', () => {
  describe('with a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const json = { abc: 123 };
      const response = {
        status: HTTP_STATUS_OK,
        json,
      };

      const result = handleJsonResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: JSON.stringify(json).length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });

  describe('without a status property', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const json = { abc: 123 };
      const response = {
        json,
      };

      const result = handleJsonResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: JSON.stringify(json).length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });

  describe('when passed a value that is already serialized', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const json = JSON.stringify({ abc: 123 });
      const response = {
        json,
      };

      const result = handleJsonResponse(
        response,
        //@ts-ignore
        mockStream,
        {},
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: json.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    });
  });
});

/**
 * handleFileResponse()
 */

describe('handleFileResponse()', () => {
  describe('with a status property', () => {
    test('stream.respondWithFile() is called', () => {
      const response = {
        status: HTTP_STATUS_OK,
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

  describe('without a status property', () => {
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
