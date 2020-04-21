import type { TuftPluginHandler } from '../../src/route-map';
import { constants } from 'http2';
import { handleBodyResponse, handleBodyResponseWithPreHandlers } from '../../src/route-handlers';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE,
} from '../../src/constants';

const { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST } = constants;

const mockStream = {
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

describe('handleBodyResponse()', () => {
  test('stream.respond() is called with the expected arguments', () => {
    const contentType = 'text/plain';
    const body = 'Hello, world!';
    const response = {
      status: HTTP_STATUS_OK,
      contentType,
      body,
    };

    const result = handleBodyResponse(
      response,
      //@ts-ignore
      mockStream,
    );

    expect(result).toBeUndefined();

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
      [HTTP2_HEADER_CONTENT_TYPE]: contentType,
      [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
    };

    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    expect(mockStream.end).toHaveBeenCalledWith(body);
  });
});

describe('handleBodyResponseWithPreHandlers()', () => {
  describe('when a plugin DOES NOT return an http error response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const pluginHandlers = [() => {}];
      const contentType = 'text/plain';
      const body = 'Hello, world!';
      const response = {
        status: HTTP_STATUS_OK,
        contentType,
        body,
      };

      const result = handleBodyResponseWithPreHandlers(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, contentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, body.length);

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_TYPE]: contentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
      };

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(body);
    });
  });

  describe('when a plugin DOES return an http error response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const pluginHandlers: TuftPluginHandler[] = [() => {
        return { error: 'BAD_REQUEST' };
      }];
      const contentType = 'text/plain';
      const body = 'Hello, world!';
      const response = {
        status: HTTP_STATUS_OK,
        contentType,
        body,
      };

      const result = handleBodyResponseWithPreHandlers(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_BAD_REQUEST);
      expect(mockContext.setHeader)
        .not.toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, contentType);
      expect(mockContext.setHeader)
        .not.toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, body.length);

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_BAD_REQUEST };

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
      expect(mockStream.end).not.toHaveBeenCalled();
    });
  });
});
