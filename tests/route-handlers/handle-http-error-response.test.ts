import type { ServerHttp2Stream } from 'http2';
import type { TuftResponse } from '../../src/route-map';
import type { HttpError } from '../../src/utils';
import { constants } from 'http2';
import { handleHttpErrorResponse } from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_CONTENT_TYPE, HTTP2_HEADER_CONTENT_LENGTH } from '../../src/constants';

const { HTTP_STATUS_TEAPOT } = constants;

const mockStream = {
  destroyed: false,
  respond: jest.fn(),
  end: jest.fn(),
};

const mockContext: any = {
  request: {},
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockContext.outgoingHeaders[key] = value;
  }),
};

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.end.mockClear();
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
});

describe('handleHttpErrorResponse()', () => {
  describe('when passed a valid HTTP error string', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const response: TuftResponse = { error: 'TEAPOT' };

      const result = handleHttpErrorResponse(
        response,
        mockStream as unknown as ServerHttp2Stream,
        mockContext,
      );

      expect(result).toBeUndefined();

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT };

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
      expect(mockStream.end).not.toHaveBeenCalled();
    });
  });

  describe('when passed a valid HTTP error string and a body', () => {
    test('stream.respond() is called with the expected arguments', () => {
      const body = 'I\'m a teapot!';
      const response: TuftResponse = {
        error: 'TEAPOT',
        body,
      };

      const result = handleHttpErrorResponse(
        response,
        mockStream as unknown as ServerHttp2Stream,
        mockContext,
      );

      expect(result).toBeUndefined();

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT,
        [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
        [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
      };

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(body);
    });
  });

  describe('when passed an invalid HTTP error string', () => {
    test('throws an error', () => {
      const response: TuftResponse = { error: 'FOO' as HttpError };

      const testFn = () => {
        handleHttpErrorResponse(
          response,
          mockStream as unknown as ServerHttp2Stream,
          mockContext,
        );
      };

      expect(testFn).toThrow('The \'error\' property must refer to a valid HTTP error.');
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
    });
  });

  describe('when passed a valid HTTP error string and stream.destroyed is set to true', () => {
    beforeAll(() => {
      mockStream.destroyed = true;
    });

    afterAll(() => {
      mockStream.destroyed = false;
    });

    test('stream.respond() is not called', () => {
      const response: TuftResponse = { error: 'TEAPOT' };

      const result = handleHttpErrorResponse(
        response,
        mockStream as unknown as ServerHttp2Stream,
        mockContext,
      );

      expect(result).toBeUndefined();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
    });
  });
});
