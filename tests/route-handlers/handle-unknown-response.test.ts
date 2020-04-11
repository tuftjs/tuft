import fs = require('fs');
import { constants } from 'http2';
import { handleUnknownResponse } from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_CONTENT_LENGTH, HTTP2_HEADER_CONTENT_TYPE } from '../../src/constants';

const { NGHTTP2_STREAM_CLOSED } = constants;

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
    callback(Error('mock stream error'));
  }),
  end: jest.fn(),
};

const mockTuftContext: any = {
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockTuftContext.outgoingHeaders[key] = value;
  }),
};

const mockFileHandle = {
  stat: jest.fn(async () => {
    return { size: 42 };
  }),
};

const mockStreamHandler = jest.fn(async (write: any) => {
  await write('foo');
  await write('bar');
  await write('baz');
});

describe('handleUnknownResponse()', () => {
  beforeEach(() => {
    mockTuftContext.outgoingHeaders = {};
    mockTuftContext.setHeader.mockClear();
    mockStream.respond.mockClear();
    mockStream.end.mockClear();
    mockStream.close.mockClear();
    mockStream.respondWithFD.mockClear();
    mockFileHandle.stat.mockClear();
  });

  describe('with a handler that throws an error', () => {
    test('rejects with an error', async () => {
      const err = Error('handler error');
      const handler = () => { throw err };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      await expect(result).resolves.toBe(err);
      expect(mockTuftContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
    });
  });

  describe('with a handler that returns null', () => {
    test('calls stream.close() with the expected argument', async () => {
      const handler = () => null;
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_STREAM_CLOSED);
    });
  });

  describe('with status code 418 and no content', () => {
    test('calls stream.respond() with the expected arguments', async () => {
      const handler = () => {
        return { status: 418 };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, 418);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders, { endStream: true });
    });
  });

  describe('with a declared content type of \'text\'', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = 'Hello, world!';
      const handler = () => {
        return {
          contentType: 'text',
          body,
        };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = body;
      const expectedContentType = 'text/plain';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a declared content type of \'json\'', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = { hello: 'world' };
      const handler = () => {
        return {
          contentType: 'json',
          body,
        };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = JSON.stringify(body);
      const expectedContentType = 'application/json';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a declared content type of \'buffer\'', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = Buffer.from('Hello, world!');
      const handler = () => {
        return {
          contentType: 'buffer',
          body,
        };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = body;
      const expectedContentType = 'application/octet-stream';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a boolean body', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = true;
      const handler = () => {
        return { body };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = JSON.stringify(body);
      const expectedContentType = 'application/json';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a string body', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = 'Hello, world!';
      const handler = () => {
        return { body };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = body;
      const expectedContentType = 'text/plain';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with a buffer body', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = Buffer.from('Hello, world!');
      const handler = () => {
        return { body };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = body;
      const expectedContentType = 'application/octet-stream';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with an object body', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = { hello: 'world' };
      const handler = () => {
        return { body };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = JSON.stringify(body);
      const expectedContentType = 'application/json';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });

  describe('with an unsupported body type', () => {
    test('calls stream.close() and rejects with an error', async () => {
      const body = Symbol();
      const handler = () => {
        return { body };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      await expect(result).rejects.toThrow('\'symbol\' is not a supported response body type.');
      expect(mockTuftContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_STREAM_CLOSED);
    });
  });

  describe('with a file path', () => {
    //@ts-ignore
    const mockFsOpen = jest.spyOn(fs.promises, 'open').mockImplementation(async () => {
      return {
        stat: async () => {
          return { size: 42 };
        },
      };
    });

    afterAll(() => {
      mockFsOpen.mockRestore();
    });

    test('calls stream.respondWithFD()', async () => {
      const file = __filename;
      const handler = () => {
        return { file };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalled();
      expect(mockStream.respondWithFD).toHaveBeenCalled();
    });
  });

  describe('with a file handle', () => {
    test('calls stream.respondWithFD() with the expected arguments', async () => {
      const file = mockFileHandle;
      const handler = () => {
        return { file };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        //@ts-ignore
        handler,
        mockStream,
        mockTuftContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, 42);
      expect(mockStream.respondWithFD).toHaveBeenCalledWith(mockFileHandle, mockTuftContext.outgoingHeaders);
    });
  });

  describe('with a stream handler', () => {
    test('calls stream.write() and stream.end() with the expected arguments', async () => {
      const stream = mockStreamHandler;
      const handler = () => {
        return { stream };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStreamHandler).toHaveBeenCalled();
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.write).toHaveBeenCalled();
      expect(mockStream.end).toHaveBeenCalled();
    });

    test('calls stream.write() and then rejects with an error', async () => {
      const stream = mockStreamHandler;
      const handler = () => {
        return { stream };
      };
      const preHandlers = [() => {}];

      const result = handleUnknownResponse(
        preHandlers,
        handler,
        //@ts-ignore
        mockStreamWithError,
        mockTuftContext,
      );

      await expect(result).rejects.toThrow('mock stream error');
      expect(mockStreamHandler).toHaveBeenCalled();
      expect(mockStreamWithError.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStreamWithError.write).toHaveBeenCalled();
      expect(mockStreamWithError.end).not.toHaveBeenCalled();
    });
  });
});
