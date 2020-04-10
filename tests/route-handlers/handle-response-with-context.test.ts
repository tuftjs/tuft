import { constants } from 'http2';
import { handleResponseWithContext } from '../../src/route-handlers';

import {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_LENGTH_REQUIRED,
  HTTP2_HEADER_CONTENT_LENGTH,
} from '../../src/constants';

const { NGHTTP2_STREAM_CLOSED } = constants;

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockStream = {
  respond: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  [Symbol.asyncIterator]() {
    return {
      next() {
        return Promise.resolve({ done: true });
      }
    };
  }
};

describe('handleResponseWithContext()', () => {
  beforeEach(() => {
    mockStream.respond.mockClear();
    mockStream.close.mockClear();
    mockStream.on.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('handleErrorResponse() is called', () => {
    test('when the handler returns an error', async () => {
      const err = Error('handler error');
      const mockHandler = jest.fn(() => { return err });
      const mockErrorHandler = jest.fn();

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        mockHandler,
        mockErrorHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockErrorHandler).toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });

  describe('handleErrorResponse() is NOT called', () => {
    test('when the handler does not return or throw an error', async () => {
      const mockHandler = jest.fn(() => {});
      const mockErrorHandler = jest.fn();

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        mockHandler,
        mockErrorHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockErrorHandler).not.toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });

  describe('stream.respond() is called', () => {
    test('when \'content-length\' header is missing', async () => {
      const mockHandler = jest.fn(() => {});
      const mockErrorHandler = jest.fn();

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'POST',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        mockHandler,
        mockErrorHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_LENGTH_REQUIRED,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockErrorHandler).not.toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });

    test('when the handler throws an error', async () => {
      const err = Error('handler error');
      const mockHandler = jest.fn(() => { throw err });
      const mockErrorHandler = jest.fn();

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        mockHandler,
        mockErrorHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockErrorHandler).not.toHaveBeenCalled();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('stream.close() is called', () => {
    test('when \'content-length\' header does not match body length', async () => {
      const mockHandler = jest.fn(() => {});
      const mockErrorHandler = jest.fn();

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'POST',
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_LENGTH]: 42,
      };

      const result = handleResponseWithContext(
        mockHandler,
        mockErrorHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockErrorHandler).not.toHaveBeenCalled();
      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_STREAM_CLOSED);
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });
});
