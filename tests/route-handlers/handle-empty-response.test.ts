import type { TuftPluginHandler } from '../../src/route-map';
import { constants } from 'http2';
import { handleEmptyResponse, handleEmptyResponseWithPreHandlers } from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS } from '../../src/constants';

const { HTTP_STATUS_TEAPOT, HTTP_STATUS_BAD_REQUEST } = constants;

const mockStream = {
  respond: jest.fn(),
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
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
});

describe('handleEmptyResponse()', () => {
  test('stream.respond() is called with the expected arguments', () => {
    const response = { status: HTTP_STATUS_TEAPOT };

    const result = handleEmptyResponse(
      response,
      //@ts-ignore
      mockStream,
    );

    expect(result).toBeUndefined();

    const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT };

    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
  });
});

describe('handleEmptyResponseWithPreHandlers()', () => {
  describe('when a plugin DOES NOT return an http error response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const pluginHandlers = [() => undefined];
      const response = { status: HTTP_STATUS_TEAPOT };

      const result = handleEmptyResponseWithPreHandlers(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_TEAPOT);

      const expectedHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_TEAPOT };

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when a plugin DOES return an http error response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const pluginHandlers: TuftPluginHandler[] = [() => {
        return { error: 'BAD_REQUEST' };
      }];
      const response = { status: HTTP_STATUS_TEAPOT };

      const result = handleEmptyResponseWithPreHandlers(
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
    });
  });
});
