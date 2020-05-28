import type { TuftPreHandler, TuftResponder } from '../src/route-map';
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
  statCheck,
  onError
} from '../src/response-handlers';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_LOCATION,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_ACCEPT_RANGES,
  HTTP2_HEADER_LAST_MODIFIED,
} from '../src/constants';

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_TEAPOT,
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
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

const mockStream = {
  respond: jest.fn(),
  respondWithFile: jest.fn(),
  end: jest.fn(),
  emit: jest.fn(),
};

const mockContext: any = {
  request: {},
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockContext.outgoingHeaders[key] = value;
  }),
};

const mockDate = new Date();

const mockStat = {
  mtime: {
    toUTCString: jest.fn(() => {
      return mockDate.toUTCString();
    }),
  },
};

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.respondWithFile.mockClear();
  mockStream.end.mockClear();
  mockStream.emit.mockClear();
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
        response: () => { },
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
        preHandlers: [() => { }],
        responders: [() => { }],
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
      const responders = [jest.fn((response: {}) => response)];
      const outgoingHeaders = {};

      const result = handleResponseObject(
        response,
        responders,
        outgoingHeaders,
        //@ts-expect-error
        mockStream,
      );

      await expect(result).resolves.toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith(response, mockStream, outgoingHeaders);
      expect(responders[0]).toHaveReturnedWith(response);
    });
  });

  describe('when passed a responder that does not return the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const responders = [jest.fn(() => { })];
      const outgoingHeaders = {};

      const result = handleResponseObject(
        response,
        responders,
        outgoingHeaders,
        //@ts-expect-error
        mockStream,
      );

      await expect(result).resolves.toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith(response, mockStream, outgoingHeaders);
      expect(responders[0]).toHaveReturned();
      expect(responders[0]).not.toHaveReturnedWith(response);
    });
  });
});

/**
 * handleResponseHandler()
 */

describe('handleResponseHandler()', () => {
  describe('when passed a handler that returns an object', () => {
    test('calls that handler', async () => {
      const handler = jest.fn(() => {
        return {};
      });
      const preHandlers: TuftPreHandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        //@ts-expect-error
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith({});
    });
  });

  describe('when passed a handler that returns null', () => {
    test('rejects with an error', async () => {
      const handler = jest.fn(() => {
        return null;
      });
      const preHandlers: TuftPreHandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};

      const result = handleResponseHandler(
        //@ts-ignore
        handler,
        preHandlers,
        responders,
        contextOptions,
        //@ts-ignore
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).rejects.toThrow('\'null\' is not a valid Tuft response object.');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('when passed a pre-handler that returns a response', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const preHandlers = [
        jest.fn(() => {
          return {
            status: HTTP_STATUS_TEAPOT,
          };
        }),
      ];
      const responders: TuftResponder[] = [];
      const contextOptions = {};

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        //@ts-expect-error
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(preHandlers[0]).toHaveBeenCalled();
      expect(preHandlers[0]).toHaveReturnedWith({ status: HTTP_STATUS_TEAPOT });
    });
  });

  describe('when passed a pre-handler that returns undefined', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const preHandlers = [jest.fn()];
      const responders: TuftResponder[] = [];
      const contextOptions = {};

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        //@ts-expect-error
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(preHandlers[0]).toHaveBeenCalled();
      expect(preHandlers[0]).toHaveReturned();
    });
  });

  describe('when passed a responder that returns the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const handler = () => {
        return response;
      };
      const preHandlers: TuftPreHandler[] = [];
      const responders: TuftResponder[] = [jest.fn((response: {}) => response)];
      const contextOptions = {};

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        //@ts-expect-error
        mockStream,
        mockIncomingHeaders,
      );

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK };

      await expect(result).resolves.toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith(response, mockStream, expectedHeaders);
      expect(responders[0]).toHaveReturnedWith(response);
    });
  });

  describe('when passed a responder that does not return the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const handler = () => {
        return response;
      };
      const preHandlers: TuftPreHandler[] = [];
      const responders: TuftResponder[] = [jest.fn(() => { })];
      const contextOptions = {};

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        //@ts-expect-error
        mockStream,
        mockIncomingHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith({}, mockStream, {});
      expect(responders[0]).toHaveReturned();
      expect(responders[0]).not.toHaveReturnedWith({});
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
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `redirect` property', () => {
    test('returns undefined', () => {
      const response = {
        redirect: '/foo',
      };
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `raw` property', () => {
    test('returns undefined', () => {
      const response = {
        raw: Buffer.from('abc'),
      };
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `text` property', () => {
    test('returns undefined', () => {
      const response = {
        text: 'abc',
      };
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with an `html` property', () => {
    test('returns undefined', () => {
      const response = {
        html: '<h1>abc</h1>',
      };
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `json` property', () => {
    test('returns undefined', () => {
      const response = {
        json: JSON.stringify('abc'),
      };
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `file` property', () => {
    test('returns undefined', () => {
      const response = {
        file: __filename,
      };
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `status` property', () => {
    test('returns undefined', () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
      };
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed an empty response', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const response = {};
      const outgoingHeaders = {};

      const result = handleUnknownResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
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
      const outgoingHeaders = {};

      const result = handleHttpErrorResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
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
      const outgoingHeaders = {};

      const result = handleHttpErrorResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
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
      const outgoingHeaders = {};

      const result = handleRedirectResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
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
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const raw = Buffer.from('abc');
      const response = {
        status: HTTP_STATUS_OK,
        raw,
      };
      const outgoingHeaders = {};

      const result = handleBufferResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/octet-stream',
        [HTTP2_HEADER_CONTENT_LENGTH]: raw.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(raw);
    });
  });

  describe('without a status property', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const raw = Buffer.from('abc');
      const response = {
        raw,
      };
      const outgoingHeaders = {};

      const result = handleBufferResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/octet-stream',
        [HTTP2_HEADER_CONTENT_LENGTH]: raw.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(raw);
    });
  });
});

/**
 * handleTextResponse()
 */

describe('handleTextResponse()', () => {
  describe('with a status property', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const text = 'abc';
      const response = {
        status: HTTP_STATUS_OK,
        text,
      };
      const outgoingHeaders = {};

      const result = handleTextResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: text.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(text);

    });
  });

  describe('without a status property', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const text = 'abc';
      const response = {
        text,
      };
      const outgoingHeaders = {};

      const result = handleTextResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: text.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(text);
    });
  });

  describe('when passed a boolean value', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const text = true;
      const response = {
        text,
      };
      const outgoingHeaders = {};

      const result = handleTextResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: text.toString().length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(text.toString());
    });
  });
});

/**
 * handleHtmlResponse()
 */

describe('handleHtmlResponse()', () => {
  describe('with a status property', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const html = '<h1>abc</h1>';
      const response = {
        status: HTTP_STATUS_OK,
        html,
      };
      const outgoingHeaders = {};

      const result = handleHtmlResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: html.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(html);
    });
  });

  describe('without a status property', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const html = '<h1>abc</h1>';
      const response = {
        html,
      };
      const outgoingHeaders = {};

      const result = handleHtmlResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: html.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(html);
    });
  });
});

/**
 * handleJsonResponse()
 */

describe('handleJsonResponse()', () => {
  describe('with a status property', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const json = { abc: 123 };
      const response = {
        status: HTTP_STATUS_OK,
        json,
      };
      const outgoingHeaders = {};

      const result = handleJsonResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: JSON.stringify(json).length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(JSON.stringify(json));
    });
  });

  describe('without a status property', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const json = { abc: 123 };
      const response = {
        json,
      };
      const outgoingHeaders = {};

      const result = handleJsonResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: JSON.stringify(json).length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(JSON.stringify(json));
    });
  });

  describe('when passed a value that is already serialized', () => {
    test('stream.respond() and stream.end() are called with the expected arguments', () => {
      const json = JSON.stringify({ abc: 123 });
      const response = {
        json,
      };
      const outgoingHeaders = {};

      const result = handleJsonResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
        [HTTP2_HEADER_CONTENT_LENGTH]: json.length,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(json);
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
      const outgoingHeaders = {};

      const result = handleFileResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
      expect(outgoingHeaders).toHaveProperty(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);
      expect(mockStream.respondWithFile).toHaveBeenCalled();
    });
  });

  describe('without a status property', () => {
    test('stream.respondWithFile() is called', () => {
      const response = {
        file: __filename,
      };
      const outgoingHeaders = {};

      const result = handleFileResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      expect(result).toBeUndefined();
      expect(outgoingHeaders).not.toHaveProperty(HTTP2_HEADER_STATUS);
      expect(mockStream.respondWithFile).toHaveBeenCalled();
    });
  });
});


/**
 * statCheck()
 */

describe('statCheck()', () => {
  describe('adds the expected headers to the headers object', () => {
    test('when passed an empty headers object', () => {
      const headers = {};

      //@ts-expect-error
      const result = statCheck(mockStat, headers);

      expect(result).toBeUndefined();
      expect(headers).toHaveProperty(HTTP2_HEADER_CONTENT_TYPE, 'application/octet-stream');
      expect(headers).toHaveProperty(HTTP2_HEADER_ACCEPT_RANGES, 'none');
      expect(headers).toHaveProperty(HTTP2_HEADER_LAST_MODIFIED, mockDate.toUTCString());
      expect(mockStat.mtime.toUTCString).toHaveBeenCalled();
    });

    test('when passed a headers object with properties already set', () => {
      const dateStr = new Date().toUTCString();
      const headers = {
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_ACCEPT_RANGES]: 'bytes',
        [HTTP2_HEADER_LAST_MODIFIED]: dateStr,
      };

      //@ts-expect-error
      const result = statCheck(mockStat, headers);

      expect(result).toBeUndefined();
      expect(headers).toHaveProperty(HTTP2_HEADER_CONTENT_TYPE, 'text/plain');
      expect(headers).toHaveProperty(HTTP2_HEADER_ACCEPT_RANGES, 'bytes');
      expect(headers).toHaveProperty(HTTP2_HEADER_LAST_MODIFIED, dateStr);
      expect(mockStat.mtime.toUTCString).toHaveBeenCalled();
    });
  });
});

/**
 * onError()
 */

describe('onError()', () => {
  describe('when passed a stream and an error', () => {
    test('stream.emit() is called with the expected argument', () => {
      const err = Error('mock error') as NodeJS.ErrnoException;
      const result = onError(
        //@ts-expect-error
        mockStream,
        err,
      );

      expect(result).toBeUndefined();
      expect(mockStream.emit).toHaveBeenCalledWith('error', err);
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
      const outgoingHeaders = {};
      const result = handleStatusResponse(
        response,
        //@ts-expect-error
        mockStream,
        outgoingHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });
});
