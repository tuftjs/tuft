import type { TuftPreHandler, TuftResponder } from '../src/route-map';
import type { HttpError } from '../src/utils';

import {
  HTTP_STATUS_OK,
  HTTP_STATUS_TEAPOT,
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_ACCEPT_RANGES,
  HTTP_HEADER_LAST_MODIFIED
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
  handleStatusResponse,
  handleBufferResponse,
  handleTextResponse,
  handleHtmlResponse,
  handleJsonResponse,
} from '../src/response-handlers';

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
    writeHead: jest.fn((statusCode: number, headers: any) => {
      mockResponse.statusCode = statusCode;
      for (const header in headers) {
        mockResponse._headers[header] = headers[header];
      }
      return mockResponse;
    }),
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
    test('returns undefined', async () => {
      const response = {
        error: 'TEAPOT' as HttpError,
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `redirect` property', () => {
    test('returns undefined', async () => {
      const response = {
        redirect: '/foo',
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `raw` property', () => {
    test('returns undefined', async () => {
      const response = {
        raw: Buffer.from('abc'),
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `text` property', () => {
    test('returns undefined', async () => {
      const response = {
        text: 'abc',
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with an `html` property', () => {
    test('returns undefined', async () => {
      const response = {
        html: '<h1>abc</h1>',
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `json` property', () => {
    test('returns undefined', async () => {
      const response = {
        json: JSON.stringify('abc'),
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `file` property', () => {
    test('returns undefined', async () => {
      const response = {
        file: __filename,
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed a response with a `status` property', () => {
    test('returns undefined', async () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
      };
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('when passed an empty response', () => {
    test('response.end() is called', async () => {
      const response = {};
      const mockResponse = createMockResponse();

      const result = await handleUnknownResponse(
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
    test('response.end() is called', () => {
      const response = {
        error: 'TEAPOT' as HttpError,
      };
      const mockResponse = createMockResponse();

      const result = handleHttpErrorResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('when passed an invalid value for `error`', () => {
    test('response.end() is called', () => {
      const response = {
        error: 'FOO' as HttpError,
      };
      const mockResponse = createMockResponse();

      const result = handleHttpErrorResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

/**
 * handleRedirectResponse()
 */

describe('handleRedirectResponse()', () => {
  describe('when passed a string for the `url` parameter', () => {
    test('response.end() is called', () => {
      const response = {
        redirect: '/foo',
      };
      const mockResponse = createMockResponse();

      const result = handleRedirectResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

/**
 * handleBufferResponse()
 */

describe('handleBufferResponse()', () => {
  describe('with a status property', () => {
    test('response.end() is called', () => {
      const raw = Buffer.from('abc');
      const response = {
        status: HTTP_STATUS_OK,
        raw,
      };
      const mockResponse = createMockResponse();

      const result = handleBufferResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('without a status property', () => {
    test('response.end() is called', () => {
      const raw = Buffer.from('abc');
      const response = {
        raw,
      };
      const mockResponse = createMockResponse();

      const result = handleBufferResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

/**
 * handleTextResponse()
 */

describe('handleTextResponse()', () => {
  describe('with a status property', () => {
    test('response.end() is called', () => {
      const text = 'abc';
      const response = {
        status: HTTP_STATUS_OK,
        text,
      };
      const mockResponse = createMockResponse();

      const result = handleTextResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('without a status property', () => {
    test('response.end() is called', () => {
      const text = 'abc';
      const response = {
        text,
      };
      const mockResponse = createMockResponse();

      const result = handleTextResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('when passed a boolean value', () => {
    test('response.end() is called', () => {
      const text = true;
      const response = {
        text,
      };
      const mockResponse = createMockResponse();

      const result = handleTextResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

/**
 * handleHtmlResponse()
 */

describe('handleHtmlResponse()', () => {
  describe('with a status property', () => {
    test('response.end() is called', () => {
      const html = '<h1>abc</h1>';
      const response = {
        status: HTTP_STATUS_OK,
        html,
      };
      const mockResponse = createMockResponse();

      const result = handleHtmlResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('without a status property', () => {
    test('response.end() is called', () => {
      const html = '<h1>abc</h1>';
      const response = {
        html,
      };
      const mockResponse = createMockResponse();

      const result = handleHtmlResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

/**
 * handleJsonResponse()
 */

describe('handleJsonResponse()', () => {
  describe('with a status property', () => {
    test('response.end() is called', () => {
      const json = { abc: 123 };
      const response = {
        status: HTTP_STATUS_OK,
        json,
      };
      const mockResponse = createMockResponse();

      const result = handleJsonResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('without a status property', () => {
    test('response.end() is called', () => {
      const json = { abc: 123 };
      const response = {
        json,
      };
      const mockResponse = createMockResponse();

      const result = handleJsonResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('when passed a value that is already serialized', () => {
    test('response.end() is called', () => {
      const json = JSON.stringify({ abc: 123 });
      const response = {
        json,
      };
      const mockResponse = createMockResponse();

      const result = handleJsonResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});

/**
 * handleFileResponse()
 */

describe('handleFileResponse()', () => {
  describe('with a status property', () => {
    test('response.end() is not called', done => {
      const response = {
        status: HTTP_STATUS_OK,
        file: __filename,
      };
      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse.writeHead).toHaveBeenCalled();
        expect(mockResponse.end).toHaveBeenCalled();
        done();
      });

      const result = handleFileResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('without a status property', () => {
    test('response.end() is not called', done => {
      const response = {
        file: __filename,
      };
      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse.writeHead).toHaveBeenCalled();
        expect(mockResponse.end).toHaveBeenCalled();
        done();
      });

      const result = handleFileResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('with `content-type`, `accept-ranges`, and `last-modified` headers', () => {
    test('response.end() is not called', done => {
      const response = {
        file: __filename,
      };

      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse.writeHead).toHaveBeenCalled();
        expect(mockResponse.end).toHaveBeenCalled();
        done();
      });

      mockResponse.setHeader(HTTP_HEADER_CONTENT_TYPE, 'application/octet-stream');
      mockResponse.setHeader(HTTP_HEADER_ACCEPT_RANGES, 'none');
      mockResponse.setHeader(HTTP_HEADER_LAST_MODIFIED, (new Date()).toUTCString());

      const result = handleFileResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('with a length property', () => {
    test('response.end() is not called', done => {
      const response = {
        file: __filename,
        length: 1
      };
      const mockResponse = createMockResponse();

      mockResponse.end = jest.fn(() => {
        expect(mockResponse.writeHead).toHaveBeenCalled();
        expect(mockResponse.end).toHaveBeenCalled();
        done();
      });

      const result = handleFileResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('with an non-existent file path', () => {
    test('response.end() is not called', done => {
      const response = {
        file: './does_not_exist',
      };
      const mockResponse = createMockResponse();

      mockResponse.emit = jest.fn((name, err) => {
        expect(name).toBe('error');
        expect(err.code).toBe('ENOENT');
        expect(mockResponse.writeHead).not.toHaveBeenCalled();
        expect(mockResponse.emit).toHaveBeenCalled();
        done();
      });

      const result = handleFileResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
    });
  });
});

/**
 * handleStatusResponse()
 */

describe('handleStatusResponse()', () => {
  describe('when passed a `status` argument of 418', () => {
    test('response.end() is called', () => {
      const response = {
        status: HTTP_STATUS_TEAPOT,
      };
      const mockResponse = createMockResponse();

      const result = handleStatusResponse(
        response,
        mockResponse,
      );

      expect(result).toBeUndefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
