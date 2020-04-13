import { constants } from 'http2';
import { handleErrorResponse } from '../../src/route-handlers';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE
} from '../../src/constants';

const { NGHTTP2_STREAM_CLOSED } = constants;

const mockStream = {
  respond: jest.fn(),
  respondWithFD: jest.fn(),
  write: jest.fn((_, __, callback) => callback()),
  end: jest.fn(),
  close: jest.fn(),
};

const mockTuftContext: any = {
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockTuftContext.outgoingHeaders[key] = value;
  }),
};

const err = Error('mock handleErrorResponse() error');

describe('handleErrorResponse()', () => {
  beforeEach(() => {
    mockTuftContext.outgoingHeaders = {};
    mockTuftContext.setHeader.mockClear();
    mockStream.respond.mockClear();
    mockStream.end.mockClear();
    mockStream.close.mockClear();
  });

  describe('with a handler than returns null', () => {
    test('calls stream.close() with the expected argument', async () => {
      const handler = () => null;

      const result = handleErrorResponse(
        handler,
        err,
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

      const result = handleErrorResponse(
        handler,
        err,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, 418);
      expect(mockStream.respond)
        .toHaveBeenCalledWith(mockTuftContext.outgoingHeaders, { endStream: true });
    });
  });

  describe('with a body', () => {
    test('calls stream.response() and stream.end() with the expected arguments', async () => {
      const body = 'Hello, world!';
      const handler = () => {
        return { body };
      };

      const result = handleErrorResponse(
        handler,
        err,
        //@ts-ignore
        mockStream,
        mockTuftContext,
      );

      const expectedContent = body;
      const expectedContentType = 'text/plain';

      await expect(result).resolves.toBeUndefined();
      expect(mockTuftContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, expectedContentType);
      expect(mockTuftContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, expectedContent.length);
      expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(expectedContent);
    });
  });
});
