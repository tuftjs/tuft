import { constants } from 'http2';
import { handleBodyResponse, handleBodyResponseWithPlugins } from '../../src/response-handlers';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE,
} from '../../src/constants';

const { HTTP_STATUS_OK } = constants;

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

const mockCallPlugins = jest.fn(async () => 0);
const mockcallPluginsWithError = jest.fn(async () => 1);

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.end.mockClear();
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
  mockCallPlugins.mockClear();
  mockcallPluginsWithError.mockClear();
});

describe('handleBodyResponse()', () => {
  test('stream.respond() is called with the expected arguments', () => {
    const response = {
      status: HTTP_STATUS_OK,
      contentType: 'text/plain',
      body: 'Hello, world!',
    };

    const result = handleBodyResponse(
      response,
      //@ts-ignore
      mockStream,
    );

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: response.status,
      [HTTP2_HEADER_CONTENT_TYPE]: response.contentType,
      [HTTP2_HEADER_CONTENT_LENGTH]: response.body.length,
    };

    expect(result).toBeUndefined();
    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    expect(mockStream.end).toHaveBeenCalledWith(response.body);
  });
});

describe('handleBodyResponseWithPlugins()', () => {
  describe('when callPlugins() returns 0', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        contentType: 'text/plain',
        body: 'Hello, world!',
      };

      const result = handleBodyResponseWithPlugins(
        mockCallPlugins,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: response.status,
        [HTTP2_HEADER_CONTENT_TYPE]: response.contentType,
        [HTTP2_HEADER_CONTENT_LENGTH]: response.body.length,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, response.contentType);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, response.body.length);
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalledWith(response.body);
    });
  });

  describe('when callPlugins() returns 1', () => {
    test('stream.respond() is not called', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        contentType: 'text/plain',
        body: 'Hello, world!',
      };

      const result = handleBodyResponseWithPlugins(
        mockcallPluginsWithError,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
    });
  });
});
