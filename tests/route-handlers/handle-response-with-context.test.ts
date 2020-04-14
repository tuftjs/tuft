import { constants } from 'http2';
import { handleResponseWithContext } from '../../src/route-handlers';
import { createTuftContext, createTuftContextWithBody } from '../../src/context';

import {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_LENGTH_REQUIRED,
  HTTP_STATUS_PAYLOAD_TOO_LARGE,
} from '../../src/constants';

const { NGHTTP2_STREAM_CLOSED } = constants;

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockStream = {
  respond: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  [Symbol.asyncIterator]() {
    return {
      i: 0,
      next() {
        if (this.i < 1) {
          this.i++;
          return Promise.resolve({ value: Buffer.from('"abc"'), done: false });
        }

        return Promise.resolve({ done: true });
      }
    };
  }
};

afterAll(() => {
  mockConsoleError.mockRestore();
});

describe('handleResponseWithContext()', () => {
  beforeEach(() => {
    mockStream.respond.mockClear();
    mockStream.close.mockClear();
    mockStream.on.mockClear();
  });

  describe('handleErrorResponse() is called', () => {
    test('when the handler returns an error', async () => {
      const err = Error('handler error');
      const mockHandler = jest.fn(() => { return err; });

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        createTuftContext,
        mockHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });

  describe('handleErrorResponse() is NOT called', () => {
    test('when the handler does not return or throw an error', async () => {
      const mockHandler = jest.fn(() => {});

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        createTuftContext,
        mockHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });

  describe('stream.respond() is called', () => {
    test('when \'content-length\' header is missing', async () => {
      const mockHandler = jest.fn(() => {});

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'POST',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        createTuftContextWithBody,
        mockHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_LENGTH_REQUIRED,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });

    test('when body size exceeds the set maximum', async () => {
      const mockHandler = jest.fn(() => {});

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'POST',
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: '5',
      };

      const result = handleResponseWithContext(
        createTuftContextWithBody,
        mockHandler,
        { parseText: 1 },
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_PAYLOAD_TOO_LARGE ,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });

    test('when the handler throws an error', async () => {
      const err = Error('handler error');
      const mockHandler = jest.fn(() => { throw err; });

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
        createTuftContext,
        mockHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.close).not.toHaveBeenCalled();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('stream.close() is called', () => {
    test('when \'content-length\' header does not match body length', async () => {
      const mockHandler = jest.fn(() => {});

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'POST',
        [HTTP2_HEADER_PATH]: '/',
        [HTTP2_HEADER_CONTENT_LENGTH]: 42,
      };

      const result = handleResponseWithContext(
        createTuftContextWithBody,
        mockHandler,
        {},
        //@ts-ignore
        mockStream,
        mockHeaders,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.close).toHaveBeenCalledWith(NGHTTP2_STREAM_CLOSED);
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });
});
