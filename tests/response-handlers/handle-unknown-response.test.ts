import type { TuftResponse } from '../../src/route-map';
import { promises as fsPromises } from 'fs';
import { constants } from 'http2';
import {
  handleUnknownResponse,
  handleUnknownResponsePluginWrapper,
} from '../../src/response-handlers';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE,
} from '../../src/constants';

const { NGHTTP2_NO_ERROR, HTTP_STATUS_TEAPOT, HTTP_STATUS_BAD_REQUEST } = constants;

const CONTENT_LENGTH = 42;

const mockStream = {
  respond: jest.fn(),
  respondWithFD: jest.fn(),
  write: jest.fn((_, __, callback) => callback()),
  end: jest.fn(),
  close: jest.fn(),
};

const mockStreamWithError = {
  respond: jest.fn(),
  write: jest.fn((_, __, callback) => {
    const err = Error('mock stream error');
    callback(err);
  }),
  end: jest.fn(),
};

const mockContext: any = {
  request: {},
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockContext.outgoingHeaders[key] = value;
  }),
};

const mockFileHandle = {
  stat: async () => {
    return { size: CONTENT_LENGTH };
  },
} as fsPromises.FileHandle;

const mockFsOpen = jest.spyOn(fsPromises, 'open').mockImplementation(async () => mockFileHandle);

const mockStreamHandler = jest.fn(async (write: any) => {
  await write('foo', 'utf8');
  await write('bar', 'utf8');
  await write('baz', 'utf8');
});

const mockCallPlugins = jest.fn(async () => 0);
const mockcallPluginsWithError = jest.fn(async () => 1);

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.respondWithFD.mockClear();
  mockStream.write.mockClear();
  mockStream.end.mockClear();
  mockStream.close.mockClear();
  mockStreamWithError.respond.mockClear();
  mockStreamWithError.write.mockClear();
  mockStreamWithError.end.mockClear();
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
  mockStreamHandler.mockClear();
  mockCallPlugins.mockClear();
  mockcallPluginsWithError.mockClear();
});

afterAll(() => {
  mockFsOpen.mockRestore();
});

describe('handleUnknownResponse()', () => {
  describe('with a handler that returns null', () => {
    test('calls stream.close() with the expected arguments', async () => {
      const handler = () => null;

      const result = handleUnknownResponse(
        //@ts-ignore
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_NO_ERROR);
    });
  });

  describe('with a handler that returns a status code of 418 and no content', () => {
    test('calls stream.respond() with the expected arguments', async () => {
      const handler = () => {
        return { status: HTTP_STATUS_TEAPOT };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_TEAPOT);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('with a handler that returns a declared content type of `text`', () => {
    test('calls stream.respond() and stream.end() with the expected arguments', async () => {
      const contentType = 'text';
      const body = 'Hello, world!';
      const handler = () => {
        return { contentType, body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedContent = body;
      const expectedContentType = 'text/plain';
      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: expectedContentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: expectedContent.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a handler that returns a declared content type of `json`', () => {
    test('calls stream.respond() and stream.end() with the expected arguments', async () => {
      const contentType = 'json';
      const body = { hello: 'world' };
      const handler = () => {
        return { contentType, body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedContent = JSON.stringify(body);
      const expectedContentType = 'application/json';
      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: expectedContentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: expectedContent.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a handler that returns a declared content type of `buffer`', () => {
    test('calls stream.respond() and stream.end() with the expected arguments', async () => {
      const contentType = 'buffer';
      const body = Buffer.from('Hello, world!');
      const handler = () => {
        return { contentType, body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedContent = body;
      const expectedContentType = 'application/octet-stream';
      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: expectedContentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: expectedContent.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a body of type boolean', () => {
    test('calls stream.respond() and stream.end() with the expected arguments', async () => {
      const body = true;
      const handler = () => {
        return { body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedContent = JSON.stringify(body);
      const expectedContentType = 'application/json';
      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: expectedContentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: expectedContent.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a body of type string', () => {
    test('calls stream.respond() and stream.end() with the expected arguments', async () => {
      const body = 'Hello, world!';
      const handler = () => {
        return { body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedContent = body;
      const expectedContentType = 'text/plain';
      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: expectedContentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: expectedContent.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a body of type buffer', () => {
    test('calls stream.respond() and stream.end() with the expected arguments', async () => {
      const body = Buffer.from('Hello, world!');
      const handler = () => {
        return { body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedContent = body;
      const expectedContentType = 'application/octet-stream';
      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: expectedContentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: expectedContent.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a body of type object', () => {
    test('calls stream.respond() and stream.end() with the expected arguments', async () => {
      const body = { hello: 'world' };
      const handler = () => {
        return { body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedContent = JSON.stringify(body);
      const expectedContentType = 'application/json';
      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_TYPE]: expectedContentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: expectedContent.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a body of type symbol', () => {
    test('calls stream.close() and rejects with an error', async () => {
      const body = Symbol();
      const handler = () => {
        return { body };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).rejects.toThrow('\'symbol\' is not a supported response body type.');
      expect(mockContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_NO_ERROR);
    });
  });

  describe('with a file path', () => {
    test('calls stream.respondWithFD() with the expected arguments', async () => {
      const file = __filename;
      const handler = () => {
        return { file };
      };

      const result = handleUnknownResponse(
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_LENGTH]: CONTENT_LENGTH,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, CONTENT_LENGTH);
      expect(mockStream.respondWithFD).toHaveBeenCalledWith(mockFileHandle ,expectedHeaders);
    });
  });

  describe('with a file handle', () => {
    test('calls stream.respondWithFD() with the expected arguments', async () => {
      const file = mockFileHandle;
      const handler = () => {
        return { file };
      };

      const result = handleUnknownResponse(
        //@ts-ignore
        handler,
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_CONTENT_LENGTH]: CONTENT_LENGTH,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, CONTENT_LENGTH);
      expect(mockStream.respondWithFD).toHaveBeenCalledWith(mockFileHandle, expectedHeaders);
    });
  });

  describe('with a stream handler', () => {
    describe('when the provided stream handler DOES NOT throw an error', () => {
      test('calls stream.write() and stream.end() with the expected arguments', async () => {
        const stream = mockStreamHandler;
        const handler = () => {
          return { stream };
        };

        const result = handleUnknownResponse(
          handler,
          //@ts-ignore
          mockStream,
          mockContext,
        );

        await expect(result).resolves.toBeUndefined();
        expect(mockStream.respond).toHaveBeenCalledWith({});
        expect(mockStream.write).toHaveBeenCalledTimes(3);
        expect(mockStream.end).toHaveBeenCalled();
        expect(mockStreamHandler).toHaveBeenCalled();
      });
    });

    describe('when the provided stream handler DOES throw an error', () => {
      test('calls stream.write() and then rejects with an error', async () => {
        const stream = mockStreamHandler;
        const handler = () => {
          return { stream };
        };

        const result = handleUnknownResponse(
          handler,
          //@ts-ignore
          mockStreamWithError,
          mockContext,
        );

        await expect(result).rejects.toThrow('mock stream error');
        expect(mockStreamWithError.respond).toHaveBeenCalled();
        expect(mockStreamWithError.write).toHaveBeenCalled();
        expect(mockStreamWithError.end).not.toHaveBeenCalled();
        expect(mockStreamHandler).toHaveBeenCalled();
      });
    });

    describe('when a handler returns an http error response', () => {
      test('stream.respond() is called with the expected arguments', async () => {
        const response: TuftResponse = { error: 'BAD_REQUEST' };
        const handler = () => {
          return response;
        };

        const result = handleUnknownResponse(
          handler,
          //@ts-ignore
          mockStream,
          mockContext,
        );

        const expectedHeaders = {
          [HTTP2_HEADER_STATUS]: HTTP_STATUS_BAD_REQUEST,
        };

        await expect(result).resolves.toBeUndefined();
        expect(mockContext.setHeader)
          .toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_BAD_REQUEST);
        expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
      });
    });
  });
});

describe('handleUnknownResponsePluginWrapper()', () => {
  describe('when callPlugins() returns 0', () => {
    test('returns undefined', async () => {
      const callPlugins = async () => 0;
      const handler = () => {
        return {};
      };

      const result = handleUnknownResponsePluginWrapper(
        callPlugins,
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBeUndefined();
    });
  });

  describe('when callPlugins() returns 1', () => {
    test('returns undefined', async () => {
      const callPlugins = async () => 1;
      const handler = () => {
        return {};
      };

      const result = handleUnknownResponsePluginWrapper(
        callPlugins,
        handler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBeUndefined();
    });
  });
});
