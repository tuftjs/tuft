import type { TuftPreHandler, TuftResponder } from '../src/route-map';
import type { HttpError } from '../src/utils';

import {
  DEFAULT_HTTP_STATUS,
  HTTP_STATUS_OK,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_TEAPOT,
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_ACCEPT_RANGES,
  HTTP_HEADER_LAST_MODIFIED,
  HTTP_HEADER_CONTENT_LENGTH,
  HTTP_HEADER_LOCATION,
} from '../src/constants';
import {
  createResponseHandler,
  returnResponse,
  handleResponseObject,
  handleResponseHandler,
  handleUnknownResponse,
  handleHttpErrorResponse,
  handleRedirectResponse,
  handleFileResponse,
  handleBufferResponse,
  handleTextResponse,
  handleHtmlResponse,
  handleJsonResponse,
} from '../src/response-handlers';
import { join } from 'path';

function createMockRequest(method: string = 'GET', url: string = '/') {
  const mockRequest: any = {
    headers: {},
    socket: {},
    method,
    url,
    on: jest.fn((_, callback) => {
      callback();
    }),
  };

  return mockRequest;
}

function createMockResponse() {
  const mockResponse: any = {
    _headers: {},
    statusCode: HTTP_STATUS_OK,
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    setHeader: jest.fn((name: string, value: string | number) => {
      mockResponse._headers[name] = value;
      return mockResponse;
    }),
    getHeader: jest.fn((name: string) => {
      return mockResponse._headers[name];
    }),
    getHeaders: jest.fn(() => mockResponse._headers),
  };

  return mockResponse;
}

afterAll(() => {
  jest.restoreAllMocks();
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
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const returnValue = await handleResponseObject(
        response,
        responders,
        mockRequest,
        mockResponse,
      );

      expect(returnValue).toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith(response, mockResponse);
      expect(responders[0]).toHaveReturnedWith(response);
    });
  });

  describe('when passed a responder that does not return the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const responders = [jest.fn(() => { })];
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const returnValue = await handleResponseObject(
        response,
        responders,
        mockRequest,
        mockResponse,
      );

      expect(returnValue).toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith(response, mockResponse);
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
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
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
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponseHandler(
        //@ts-ignore
        handler,
        preHandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse,
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
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse,
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
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse,
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
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse,
      );

      await expect(result).resolves.toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith(response, mockResponse);
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
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponseHandler(
        handler,
        preHandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse,
      );

      await expect(result).resolves.toBeUndefined();
      expect(responders[0]).toHaveBeenCalledWith(response, mockResponse);
      expect(responders[0]).toHaveReturned();
      expect(responders[0]).not.toHaveReturnedWith(response);
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
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `redirect` property', () => {
    test('returns undefined', () => {
      const response = {
        redirect: '/foo',
      };
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `raw` property', () => {
    test('returns undefined', () => {
      const response = {
        raw: Buffer.from('abc'),
      };
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `text` property', () => {
    test('returns undefined', () => {
      const response = {
        text: 'abc',
      };
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with an `html` property', () => {
    test('returns undefined', () => {
      const response = {
        html: '<h1>abc</h1>',
      };
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `json` property', () => {
    test('returns undefined', () => {
      const response = {
        json: JSON.stringify('abc'),
      };
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `file` property', () => {
    test('returns undefined', () => {
      const response = {
        file: __filename,
      };
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `status` property', () => {
    test('returns undefined', () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
      };
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed an empty response', () => {
    test('response.end() is called', () => {
      const response = {};
      const mockResponse = createMockResponse();

      const result = handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

/**
 * handleHttpErrorResponse()
 */

describe('handleHttpErrorResponse', () => {
  describe('when passed a valid value for `error`', () => {
    test('the expected status code, headers, and body are set', () => {
      const error = 'TEAPOT';
      const mockResponse = createMockResponse();

      const expectedBody = 'I\'m a Teapot';
      const result = handleHttpErrorResponse(error, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_TEAPOT);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain; charset=UTF-8');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, expectedBody.length);
      expect(mockResponse.end).toHaveBeenCalledWith(expectedBody);
    });
  });

  describe('when passed an invalid value for `error`', () => {
    test('the expected status code, headers, and body are set', () => {
      const error = 'FOO';
      const mockResponse = createMockResponse();

      const expectedBody = 'Bad Request';
      const result = handleHttpErrorResponse(
        //@ts-expect-error
        error,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_BAD_REQUEST);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain; charset=UTF-8');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, expectedBody.length);
      expect(mockResponse.end).toHaveBeenCalledWith(expectedBody);
    });
  });
});

/**
 * handleRedirectResponse()
 */

describe('handleRedirectResponse()', () => {
  describe('when passed a string for the `url` parameter', () => {
    test('the expected status code, headers, and body are set', () => {
      const redirect = '/foo';
      const mockResponse = createMockResponse();

      const result = handleRedirectResponse(redirect, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(HTTP_STATUS_FOUND);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(HTTP_HEADER_LOCATION, redirect);
      expect(mockResponse.end).toHaveBeenCalledWith();
    });
  });
});

/**
 * handleBufferResponse()
 */

describe('handleBufferResponse()', () => {
  describe('when passed a buffer value', () => {
    test('the expected status code, headers, and body are set', () => {
      const raw = Buffer.from('abc');
      const mockResponse = createMockResponse();

      const result = handleBufferResponse(raw, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(DEFAULT_HTTP_STATUS);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'application/octet-stream');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, raw.length);
      expect(mockResponse.end).toHaveBeenCalledWith(raw);
    });
  });
});

/**
 * handleTextResponse()
 */

describe('handleTextResponse()', () => {
  describe('when passed a string value', () => {
    test('the expected status code, headers, and body are set', () => {
      const text = 'abc';
      const mockResponse = createMockResponse();

      const result = handleTextResponse(text, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(DEFAULT_HTTP_STATUS);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain; charset=UTF-8');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, text.length);
      expect(mockResponse.end).toHaveBeenCalledWith(text);
    });
  });

  describe('when passed a number value', () => {
    test('response.end() is called with that value as a string', () => {
      const text = 100;
      const mockResponse = createMockResponse();

      const result = handleTextResponse(text, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(DEFAULT_HTTP_STATUS);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain; charset=UTF-8');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, text.toString().length);
      expect(mockResponse.end).toHaveBeenCalledWith(text.toString());
    });
  });
});

/**
 * handleHtmlResponse()
 */

describe('handleHtmlResponse()', () => {
  describe('when passed a string value', () => {
    test('the expected status code, headers, and body are set', () => {
      const html = '<h1>abc</h1>';
      const mockResponse = createMockResponse();

      const result = handleHtmlResponse(html, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(DEFAULT_HTTP_STATUS);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/html; charset=UTF-8');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, html.length);
      expect(mockResponse.end).toHaveBeenCalledWith(html);
    });
  });
});

/**
 * handleJsonResponse()
 */

describe('handleJsonResponse()', () => {
  describe('when passed an object', () => {
    test('the expected status code, headers, and body are set', () => {
      const json = { abc: 123 };
      const mockResponse = createMockResponse();

      const result = handleJsonResponse(json, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(DEFAULT_HTTP_STATUS);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'application/json; charset=UTF-8');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, JSON.stringify(json).length);
      expect(mockResponse.end).toHaveBeenCalledWith(JSON.stringify(json));
    });
  });

  describe('when passed a value that is already a serialized string', () => {
    test('response.end() is called with that same value', () => {
      const json = JSON.stringify({ abc: 123 });
      const mockResponse = createMockResponse();

      const result = handleJsonResponse(json, mockResponse);

      expect(result).toBeUndefined();
      expect(mockResponse.statusCode).toBe(DEFAULT_HTTP_STATUS);
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'application/json; charset=UTF-8');
      expect(mockResponse.setHeader)
        .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_LENGTH, json.length);
      expect(mockResponse.end).toHaveBeenCalledWith(json);
    });
  });
});

/**
 * handleFileResponse()
 */

describe('handleFileResponse()', () => {
  describe('when passed a valid filename', () => {
    test('the expected status code, headers, and body are set', done => {
      const file = join(__dirname, '../mock-assets/abc.txt');
      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse.statusCode).toBe(DEFAULT_HTTP_STATUS);
        expect(mockResponse.setHeader)
          .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
        expect(mockResponse.setHeader)
          .toHaveBeenCalledWith(HTTP_HEADER_ACCEPT_RANGES, 'none');
        expect(mockResponse._headers).toHaveProperty(HTTP_HEADER_LAST_MODIFIED);
        expect(mockResponse.end).toHaveBeenCalledWith();
        done();
      });

      const result = handleFileResponse(
        file,
        undefined,
        undefined,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a filename with an unknown file type', () => {
    test('the `content-type` header is set to `application/octet-stream`', done => {
      const file = join(__dirname, '../mock-assets/abc.foo');
      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse.setHeader)
          .toHaveBeenCalledWith(HTTP_HEADER_CONTENT_TYPE, 'application/octet-stream');
        expect(mockResponse.end).toHaveBeenCalledWith();
        done();
      });

      const result = handleFileResponse(
        file,
        undefined,
        undefined,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('with custom `content-type`, `accept-ranges`, and `last-modified` headers', () => {
    test('does not alter the those custom headers', done => {
      const file = join(__dirname, '../mock-assets/abc.foo');
      const customDateString = (new Date()).toUTCString();
      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse.setHeader).toHaveBeenCalledTimes(6);
        expect(mockResponse._headers).toHaveProperty(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
        expect(mockResponse._headers).toHaveProperty(HTTP_HEADER_ACCEPT_RANGES, 'bytes');
        expect(mockResponse._headers).toHaveProperty(HTTP_HEADER_LAST_MODIFIED, customDateString);
        expect(mockResponse.end).toHaveBeenCalledWith();
        done();
      });

      mockResponse.setHeader(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
      mockResponse.setHeader(HTTP_HEADER_ACCEPT_RANGES, 'bytes');
      mockResponse.setHeader(HTTP_HEADER_LAST_MODIFIED, customDateString);

      const result = handleFileResponse(
        file,
        undefined,
        undefined,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('with a length property', () => {
    test('the expected status code, headers, and body are set', done => {
      const file = join(__dirname, '../mock-assets/abc.txt');
      const length = 1;
      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse._headers).toHaveProperty(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
        expect(mockResponse._headers).toHaveProperty(HTTP_HEADER_ACCEPT_RANGES, 'none');
        expect(mockResponse._headers).toHaveProperty(HTTP_HEADER_LAST_MODIFIED);
        expect(mockResponse.end).toHaveBeenCalledWith();
        done();
      });

      const result = handleFileResponse(
        file,
        undefined,
        length,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('with a non-existent file path', () => {
    test('an error is emitted', done => {
      const file = './does_not_exist';
      const mockResponse = createMockResponse();

      mockResponse.emit = jest.fn((name, err) => {
        expect(name).toBe('error');
        expect(err.code).toBe('ENOENT');
        expect(mockResponse.emit).toHaveBeenCalled();
        expect(mockResponse.end).not.toHaveBeenCalled();
        done();
      });

      const result = handleFileResponse(
        file,
        undefined,
        undefined,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });
});
