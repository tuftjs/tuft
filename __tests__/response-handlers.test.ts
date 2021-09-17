import type { TuftPrehandler, TuftResponder } from '../src/route-map';
import type { HttpError } from '../src/utils';

import { createResponseHandler, returnResponse, handleResponse } from '../src/response-handlers';
import {
  DEFAULT_HTTP_STATUS,
  HTTP_HEADER_ACCEPT_RANGES,
  HTTP_HEADER_CONTENT_LENGTH,
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_LAST_MODIFIED,
  HTTP_HEADER_LOCATION,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_OK,
  HTTP_STATUS_TEAPOT,
} from '../src/constants';
import { join } from 'path';
import { statSync } from 'fs';

const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => { });

const mockExit = jest
  .spyOn(process, 'exit')
  .mockImplementation(() => undefined as never);

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
    writeHead: jest.fn(),
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

beforeEach(() => {
  mockConsoleError.mockClear();
  mockExit.mockClear();
});

afterAll(() => {
  jest.restoreAllMocks();
});

/**
 * createResponseHandler()
 */

describe('createResponseHandler()', () => {
  describe('when passed a response handler', () => {
    test('returns bound handleResponse()', () => {
      const result = createResponseHandler({
        response: () => {
          return {};
        },
      });

      expect(result.name).toBe('bound handleResponse');
    });
  });

  describe('when passed a response object', () => {
    test('returns bound handleResponse()', () => {
      const result = createResponseHandler({
        response: {},
      });

      expect(result.name).toBe('bound handleResponse');
    });
  });

  describe('when passed a response object with a `json` property', () => {
    test('returns bound handleResponse()', () => {
      const result = createResponseHandler({
        response: {
          json: {},
        },
      });

      expect(result.name).toBe('bound handleResponse');
    });
  });

  describe('when prehandlers and responders are both set', () => {
    test('returns bound handleResponse()', () => {
      const result = createResponseHandler({
        response: {},
        prehandlers: [],
        responders: [],
      });

      expect(result.name).toBe('bound handleResponse');
    });
  });

  describe('when the response property is set to an invalid value', () => {
    test('exits with an error', () => {
      const result = createResponseHandler({
        //@ts-expect-error
        response: 'INVALID_VALUE',
      });

      const expectedError = Error('\'INVALID_VALUE\' is not a valid response handler or response object.');

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
 * handleResponse()
 */

describe('handleResponse()', () => {
  describe('when passed a handler that returns an object', () => {
    test('calls that handler', async () => {
      const handler = jest.fn(() => {
        return {};
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
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
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        //@ts-ignore
        handler,
        prehandlers,
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
      const prehandlers = [
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

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse,
      );

      await expect(result).resolves.toBeUndefined();
      expect(prehandlers[0]).toHaveBeenCalled();
      expect(prehandlers[0]).toHaveReturnedWith({ status: HTTP_STATUS_TEAPOT });
    });
  });

  describe('when passed a pre-handler that returns undefined', () => {
    test('resolves to be undefined', async () => {
      const handler = () => {
        return {};
      };
      const prehandlers = [jest.fn()];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse,
      );

      await expect(result).resolves.toBeUndefined();
      expect(prehandlers[0]).toHaveBeenCalled();
      expect(prehandlers[0]).toHaveReturned();
    });
  });

  describe('when passed a responder that returns the passed response object', () => {
    test('resolves to be undefined', async () => {
      const response = {};
      const handler = () => {
        return response;
      };
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [jest.fn((response: {}) => response)];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
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
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [jest.fn(() => { })];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
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

  describe('when passed a handler that returns an object with `text`', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        text: 'foo'
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
        [HTTP_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
        [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(responseObject.text),
      });
      expect(mockResponse.end).toHaveBeenCalledWith(responseObject.text);
    });
  });

  describe('when passed a handler that returns an object with `text` and custom status', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        status: HTTP_STATUS_TEAPOT,
        text: 'foo',
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_TEAPOT, {
        [HTTP_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
        [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(responseObject.text),
      });
      expect(mockResponse.end).toHaveBeenCalledWith(responseObject.text);
    });
  });

  describe('when passed a handler that returns an object with `json`', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        json: { foo: 42 },
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      const expectedBody = JSON.stringify(responseObject.json);

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
        [HTTP_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
        [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(expectedBody),
      });
      expect(mockResponse.end).toHaveBeenCalledWith(expectedBody);
    });
  });

  describe('when passed a handler that returns an object with `json` set to a string', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        json: JSON.stringify({ foo: 42 }),
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      const expectedBody = responseObject.json;

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
        [HTTP_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
        [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(expectedBody),
      });
      expect(mockResponse.end).toHaveBeenCalledWith(expectedBody);
    });
  });

  describe('when passed a handler that returns an object with `json` and custom status', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        status: HTTP_STATUS_TEAPOT,
        json: { foo: 42 },
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      const expectedBody = JSON.stringify(responseObject.json);

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_TEAPOT, {
        [HTTP_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
        [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(expectedBody),
      });
      expect(mockResponse.end).toHaveBeenCalledWith(expectedBody);
    });
  });

  describe('when passed a handler that returns an object with `html`', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        html: '<h1>foo</h1>'
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
        [HTTP_HEADER_CONTENT_TYPE]: 'text/html; charset=UTF-8',
        [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(responseObject.html),
      });
      expect(mockResponse.end).toHaveBeenCalledWith(responseObject.html);
    });
  });

  describe('when passed a handler that returns an object with `html` and custom status', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        status: HTTP_STATUS_TEAPOT,
        html: '<h1>foo</h1>'
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_TEAPOT, {
        [HTTP_HEADER_CONTENT_TYPE]: 'text/html; charset=UTF-8',
        [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(responseObject.html),
      });
      expect(mockResponse.end).toHaveBeenCalledWith(responseObject.html);
    });
  });

  describe('when passed a handler that returns an object with `raw`', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        raw: Buffer.from('foo'),
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
        [HTTP_HEADER_CONTENT_TYPE]: 'application/octet-stream',
        [HTTP_HEADER_CONTENT_LENGTH]: responseObject.raw.length,
      });
      expect(mockResponse.end).toHaveBeenCalledWith(responseObject.raw);
    });
  });

  describe('when passed a handler that returns an object with `raw` and custom status', () => {
    test('calls that handler and the expected response methods', async () => {
      const responseObject = {
        status: HTTP_STATUS_TEAPOT,
        raw: Buffer.from('foo'),
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveReturnedWith(responseObject);
      expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_TEAPOT, {
        [HTTP_HEADER_CONTENT_TYPE]: 'application/octet-stream',
        [HTTP_HEADER_CONTENT_LENGTH]: responseObject.raw.length,
      });
      expect(mockResponse.end).toHaveBeenCalledWith(responseObject.raw);
    });
  });

  describe('file response', () => {
    describe('when passed a handler that returns an object with `file`', () => {
      test('calls that handler and the expected response methods', done => {
        const responseObject = {
          file: join(__dirname, '../mock-assets/abc.txt'),
        };
        const handler = jest.fn(() => {
          return responseObject;
        });
        const prehandlers: TuftPrehandler[] = [];
        const responders: TuftResponder[] = [];
        const contextOptions = {};
        const mockRequest = createMockRequest();
        const mockResponse = createMockResponse();

        const expectedModifiedValue = statSync(responseObject.file).mtime.toUTCString();

        mockResponse.end = jest.fn(() => {
          expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
            [HTTP_HEADER_CONTENT_TYPE]: 'text/plain',
            [HTTP_HEADER_ACCEPT_RANGES]: 'none',
            [HTTP_HEADER_LAST_MODIFIED]: expectedModifiedValue,
          });
          expect(mockResponse.end).toHaveBeenCalledWith();
          done();
        });

        const result = handleResponse(
          handler,
          prehandlers,
          responders,
          contextOptions,
          mockRequest,
          mockResponse
        );

        expect(result).resolves.toBeUndefined().then(() => {
          expect(handler).toHaveBeenCalled();
          expect(handler).toHaveReturnedWith(responseObject);
        });
      });
    });

    describe('when passed a handler that returns an object with `file` and `status`', () => {
      test('calls that handler and the expected response methods', done => {
        const responseObject = {
          file: join(__dirname, '../mock-assets/abc.txt'),
          status: HTTP_STATUS_TEAPOT,
        };
        const handler = jest.fn(() => {
          return responseObject;
        });
        const prehandlers: TuftPrehandler[] = [];
        const responders: TuftResponder[] = [];
        const contextOptions = {};
        const mockRequest = createMockRequest();
        const mockResponse = createMockResponse();

        const expectedModifiedValue = statSync(responseObject.file).mtime.toUTCString();

        mockResponse.end = jest.fn(() => {
          expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_TEAPOT, {
            [HTTP_HEADER_CONTENT_TYPE]: 'text/plain',
            [HTTP_HEADER_ACCEPT_RANGES]: 'none',
            [HTTP_HEADER_LAST_MODIFIED]: expectedModifiedValue,
          });
          expect(mockResponse.end).toHaveBeenCalledWith();
          done();
        });

        const result = handleResponse(
          handler,
          prehandlers,
          responders,
          contextOptions,
          mockRequest,
          mockResponse
        );

        expect(result).resolves.toBeUndefined().then(() => {
          expect(handler).toHaveBeenCalled();
          expect(handler).toHaveReturnedWith(responseObject);
        });
      });
    });

    describe('when passed a handler that returns an object with `file` of unknown type', () => {
      test('calls that handler and the expected response methods', done => {
        const responseObject = {
          file: join(__dirname, '../mock-assets/abc.foo'),
        };
        const handler = jest.fn(() => {
          return responseObject;
        });
        const prehandlers: TuftPrehandler[] = [];
        const responders: TuftResponder[] = [];
        const contextOptions = {};
        const mockRequest = createMockRequest();
        const mockResponse = createMockResponse();

        const expectedModifiedValue = statSync(responseObject.file).mtime.toUTCString();

        mockResponse.end = jest.fn(() => {
          expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
            [HTTP_HEADER_CONTENT_TYPE]: 'application/octet-stream',
            [HTTP_HEADER_ACCEPT_RANGES]: 'none',
            [HTTP_HEADER_LAST_MODIFIED]: expectedModifiedValue,
          });
          expect(mockResponse.end).toHaveBeenCalledWith();
          done();
        });

        const result = handleResponse(
          handler,
          prehandlers,
          responders,
          contextOptions,
          mockRequest,
          mockResponse
        );

        expect(result).resolves.toBeUndefined().then(() => {
          expect(handler).toHaveBeenCalled();
          expect(handler).toHaveReturnedWith(responseObject);
        });
      });
    });

    describe('when passed a handler that returns an object with `file` and has custom headers', () => {
      test('calls that handler and the expected response methods', done => {
        const customDateString = (new Date()).toUTCString();
        const responseObject = {
          file: join(__dirname, '../mock-assets/abc.txt'),
        };
        const handler = jest.fn(t => {
          t.setHeader(HTTP_HEADER_CONTENT_TYPE, 'text/plain');
          t.setHeader(HTTP_HEADER_ACCEPT_RANGES, 'bytes');
          t.setHeader(HTTP_HEADER_LAST_MODIFIED, customDateString);
          return responseObject;
        });
        const prehandlers: TuftPrehandler[] = [];
        const responders: TuftResponder[] = [];
        const contextOptions = {};
        const mockRequest = createMockRequest();
        const mockResponse = createMockResponse();

        mockResponse.end = jest.fn(() => {
          expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
            [HTTP_HEADER_CONTENT_TYPE]: 'text/plain',
            [HTTP_HEADER_ACCEPT_RANGES]: 'bytes',
            [HTTP_HEADER_LAST_MODIFIED]: customDateString,
          });
          expect(mockResponse.end).toHaveBeenCalledWith();
          done();
        });

        const result = handleResponse(
          handler,
          prehandlers,
          responders,
          contextOptions,
          mockRequest,
          mockResponse
        );

        expect(result).resolves.toBeUndefined().then(() => {
          expect(handler).toHaveBeenCalled();
          expect(handler).toHaveReturnedWith(responseObject);
        });
      });
    });

    describe('when passed a handler that returns an object with `file` and `length`', () => {
      test('calls that handler and the expected response methods', done => {
        const responseObject = {
          file: join(__dirname, '../mock-assets/abc.txt'),
          length: 1,
        };
        const handler = jest.fn(() => {
          return responseObject;
        });
        const prehandlers: TuftPrehandler[] = [];
        const responders: TuftResponder[] = [];
        const contextOptions = {};
        const mockRequest = createMockRequest();
        const mockResponse = createMockResponse();

        const expectedModifiedValue = statSync(responseObject.file).mtime.toUTCString();

        mockResponse.end = jest.fn(() => {
          expect(mockResponse.writeHead).toHaveBeenCalledWith(DEFAULT_HTTP_STATUS, {
            [HTTP_HEADER_CONTENT_TYPE]: 'text/plain',
            [HTTP_HEADER_ACCEPT_RANGES]: 'none',
            [HTTP_HEADER_LAST_MODIFIED]: expectedModifiedValue,
          });
          expect(mockResponse.end).toHaveBeenCalledWith();
          done();
        });

        const result = handleResponse(
          handler,
          prehandlers,
          responders,
          contextOptions,
          mockRequest,
          mockResponse
        );

        expect(result).resolves.toBeUndefined().then(() => {
          expect(handler).toHaveBeenCalled();
          expect(handler).toHaveReturnedWith(responseObject);
        });
      });
    });

    describe('when passed a handler that returns an object with `file` pointing to a non-existent file path', () => {
      test('calls that handler and the expected response methods',  done => {
        const responseObject = {
          file: './does_not_exist',
        };
        const handler = jest.fn(() => {
          return responseObject;
        });
        const prehandlers: TuftPrehandler[] = [];
        const responders: TuftResponder[] = [];
        const contextOptions = {};
        const mockRequest = createMockRequest();
        const mockResponse = createMockResponse();

        mockResponse.emit = jest.fn((name, err) => {
          expect(name).toBe('error');
          expect(err.code).toBe('ENOENT');
          expect(mockResponse.emit).toHaveBeenCalled();
          expect(mockResponse.end).not.toHaveBeenCalled();
          done();
        });

        const result = handleResponse(
          handler,
          prehandlers,
          responders,
          contextOptions,
          mockRequest,
          mockResponse
        );

        expect(result).resolves.toBeUndefined().then(() => {
          expect(handler).toHaveBeenCalled();
          expect(handler).toHaveReturnedWith(responseObject);
        });
      });
    });
  });

  describe('when passed a handler that returns an object with `redirect`', () => {
    test('calls that handler and the expected response methods', done => {
      const responseObject = {
        redirect: '/foo',
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      expect(result).resolves.toBeUndefined().then(() => {
        expect(handler).toHaveBeenCalled();
        expect(handler).toHaveReturnedWith(responseObject);
        expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_FOUND, {
          [HTTP_HEADER_LOCATION]: responseObject.redirect,
        });
        expect(mockResponse.end).toHaveBeenCalledWith();
        done();
      });
    });
  });

  describe('when passed a handler that returns an object with `error`', () => {
    test('calls that handler and the expected response methods', done => {
      const responseObject = {
        error: 'TEAPOT' as HttpError,
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      const expectedBody = 'I\'m a Teapot';

      expect(result).resolves.toBeUndefined().then(() => {
        expect(handler).toHaveBeenCalled();
        expect(handler).toHaveReturnedWith(responseObject);
        expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_TEAPOT, {
          [HTTP_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
          [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(expectedBody),
        });
        expect(mockResponse.end).toHaveBeenCalledWith(expectedBody);
        done();
      });
    });
  });

  describe('when passed a handler that returns an object with `error` set to an invalud value', () => {
    test('calls that handler and the expected response methods', done => {
      const responseObject = {
        error: 'FOO' as HttpError,
      };
      const handler = jest.fn(() => {
        return responseObject;
      });
      const prehandlers: TuftPrehandler[] = [];
      const responders: TuftResponder[] = [];
      const contextOptions = {};
      const mockRequest = createMockRequest();
      const mockResponse = createMockResponse();

      const result = handleResponse(
        handler,
        prehandlers,
        responders,
        contextOptions,
        mockRequest,
        mockResponse
      );

      const expectedBody = 'Bad Request';

      expect(result).resolves.toBeUndefined().then(() => {
        expect(handler).toHaveBeenCalled();
        expect(handler).toHaveReturnedWith(responseObject);
        expect(mockResponse.writeHead).toHaveBeenCalledWith(HTTP_STATUS_BAD_REQUEST, {
          [HTTP_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
          [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(expectedBody),
        });
        expect(mockResponse.end).toHaveBeenCalledWith(expectedBody);
        done();
      });
    });
  });
});
