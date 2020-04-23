import { constants } from 'http2';
import { handleStreamResponse, handleStreamResponseWithPlugins } from '../../src/response-handlers';
import { HTTP2_HEADER_STATUS } from '../../src/constants';

const { HTTP_STATUS_OK } = constants;

const mockStream = {
  respond: jest.fn(),
  write: jest.fn((_, __, callback) => {
    callback();
  }),
  end: jest.fn(),
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

const mockStreamHandler = jest.fn(async (write: any) => {
  await write('foo', 'utf8');
  await write('bar', 'utf8');
  await write('baz', 'utf8');
});

const mockCallPlugins = jest.fn(async () => 0);
const mockcallPluginsWithError = jest.fn(async () => 1);

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.write.mockClear();
  mockStream.end.mockClear();
  mockStreamWithError.respond.mockClear();
  mockStreamWithError.write.mockClear();
  mockStreamWithError.end.mockClear();
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
  mockStreamHandler.mockClear();
  mockCallPlugins.mockClear();
  mockcallPluginsWithError.mockClear();
});

describe('handleStreamResponse()', () => {
  describe('when the provided stream handler DOES NOT throw an error', () => {
    test('stream.respond(), stream.write(), and stream.end() are all called', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        stream: mockStreamHandler,
      };

      const result = handleStreamResponse(
        response,
        //@ts-ignore
        mockStream,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: response.status,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.write).toHaveBeenCalledTimes(3);
      expect(mockStream.end).toHaveBeenCalled();
      expect(mockStreamHandler).toHaveBeenCalled();
    });
  });

  describe('when the provided stream handler DOES throw an error', () => {
    test('stream.write() is called and then rejects with an error', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        stream: mockStreamHandler,
      };

      const result = handleStreamResponse(
        response,
        //@ts-ignore
        mockStreamWithError,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: response.status,
      };

      await expect(result).rejects.toThrow('mock stream error');
      expect(mockStreamWithError.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStreamWithError.write).toHaveBeenCalledTimes(1);
      expect(mockStreamWithError.end).not.toHaveBeenCalled();
      expect(mockStreamHandler).toHaveBeenCalled();
    });
  });
});

describe('handleStreamResponseWithPlugins()', () => {
  describe('when callPlugins() returns 0 and the provided stream handler does not throw', () => {
    test('stream.respond(), stream.write(), and stream.end() are all called', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        stream: mockStreamHandler,
      };

      const result = handleStreamResponseWithPlugins(
        mockCallPlugins,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: response.status,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.write).toHaveBeenCalledTimes(3);
      expect(mockStream.end).toHaveBeenCalled();
      expect(mockStreamHandler).toHaveBeenCalled();
    });
  });

  describe('when callPlugins() returns 0 and the provided stream handler throws an error', () => {
    test('stream.respond(), stream.write(), and stream.end() are all called', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        stream: mockStreamHandler,
      };

      const result = handleStreamResponseWithPlugins(
        mockCallPlugins,
        response,
        //@ts-ignore
        mockStreamWithError,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: response.status,
      };

      await expect(result).rejects.toThrow('mock stream error');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);
      expect(mockStreamWithError.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStreamWithError.write).toHaveBeenCalledTimes(1);
      expect(mockStreamWithError.end).not.toHaveBeenCalled();
      expect(mockStreamHandler).toHaveBeenCalled();
    });

    describe('when callPlugins() returns 1', () => {
      test('stream.respond() is not called', async () => {
        const response = {
          status: HTTP_STATUS_OK,
          stream: mockStreamHandler,
        };

        const result = handleStreamResponseWithPlugins(
          mockcallPluginsWithError,
          response,
          //@ts-ignore
          mockStream,
          mockContext,
        );

        await expect(result).resolves.toBeUndefined();
        expect(mockContext.setHeader).not.toHaveBeenCalled();
        expect(mockStream.respond).not.toHaveBeenCalled();
        expect(mockStreamWithError.write).not.toHaveBeenCalled();
        expect(mockStreamWithError.end).not.toHaveBeenCalled();
        expect(mockStreamHandler).not.toHaveBeenCalled();
      });
    });
  });
});
