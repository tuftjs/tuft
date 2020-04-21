import type { TuftPluginHandler } from '../../src/route-map';
import { constants } from 'http2';
import {
  handleStreamResponse,
  handleStreamResponseWithPreHandlers,
} from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS } from '../../src/constants';

const { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST } = constants;

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

      await expect(result).resolves.toBeUndefined();

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK };

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

      await expect(result).rejects.toThrow('mock stream error');

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK };

      expect(mockStreamWithError.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStreamWithError.write).toHaveBeenCalledTimes(1);
      expect(mockStreamWithError.end).not.toHaveBeenCalled();

      expect(mockStreamHandler).toHaveBeenCalled();
    });
  });
});

describe('handleStreamResponseWithPreHandlers()', () => {
  describe('when the provided stream handler DOES NOT throw an error', () => {
    test('stream.respond(), stream.write(), and stream.end() are all called', async () => {
      const pluginHandlers = [() => {}];
      const response = {
        status: HTTP_STATUS_OK,
        stream: mockStreamHandler,
      };

      const result = handleStreamResponseWithPreHandlers(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK };

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.write).toHaveBeenCalledTimes(3);
      expect(mockStream.end).toHaveBeenCalled();

      expect(mockStreamHandler).toHaveBeenCalled();
    });
  });

  describe('when the provided stream handler DOES throw an error', () => {
    test('stream.respond(), stream.write(), and stream.end() are all called', async () => {
      const pluginHandlers = [() => {}];
      const response = {
        status: HTTP_STATUS_OK,
        stream: mockStreamHandler,
      };

      const result = handleStreamResponseWithPreHandlers(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStreamWithError,
        mockContext,
      );

      await expect(result).rejects.toThrow('mock stream error');
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK };

      expect(mockStreamWithError.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStreamWithError.write).toHaveBeenCalledTimes(1);
      expect(mockStreamWithError.end).not.toHaveBeenCalled();

      expect(mockStreamHandler).toHaveBeenCalled();
    });

    describe('when a plugin returns an http error response', () => {
      test('stream.respond() is called with the expected arguments', async () => {
        const pluginHandlers: TuftPluginHandler[] = [() => {
          return { error: 'BAD_REQUEST' };
        }];
        const response = {
          status: HTTP_STATUS_OK,
          stream: mockStreamHandler,
        };

        const result = handleStreamResponseWithPreHandlers(
          pluginHandlers,
          response,
          //@ts-ignore
          mockStream,
          mockContext,
        );

        await expect(result).resolves.toBeUndefined();

        expect(mockContext.setHeader)
          .toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_BAD_REQUEST);

        const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_BAD_REQUEST };

        expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
        expect(mockStreamWithError.write).not.toHaveBeenCalled();
        expect(mockStreamWithError.end).not.toHaveBeenCalled();

        expect(mockStreamHandler).not.toHaveBeenCalled();
      });
    });
  });
});
