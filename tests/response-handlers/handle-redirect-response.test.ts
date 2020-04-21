import type { TuftPluginHandler } from '../../src/route-map';
import { constants } from 'http2';
import {
  handleRedirectResponse,
  handleRedirectResponseWithPlugins,
} from '../../src/response-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_LOCATION } from '../../src/constants';

const { HTTP_STATUS_FOUND, HTTP_STATUS_BAD_REQUEST } = constants;

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

describe('handleRedirectResponse()', () => {
  test('stream.respond() is called with the expected arguments', () => {
    const response = {
      status: HTTP_STATUS_FOUND,
      redirect: '/foo',
    };

    const result = handleRedirectResponse(
      response,
      //@ts-ignore
      mockStream,
    );

    expect(result).toBeUndefined();

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: HTTP_STATUS_FOUND,
      [HTTP2_HEADER_LOCATION]: '/foo',
    };

    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
  });
});

describe('handleRedirectResponseWithPlugins()', () => {
  describe('when a plugin DOES NOT return an http error response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const pluginHandlers = [() => {}];
      const response = {
        status: HTTP_STATUS_FOUND,
        redirect: '/foo',
      };

      const result = handleRedirectResponseWithPlugins(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_FOUND);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_LOCATION, '/foo');

      const expectedHeaders = mockContext.outgoingHeaders;

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when a plugin DOES return an http error response', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const pluginHandlers: TuftPluginHandler[] = [() => {
        return { error: 'BAD_REQUEST' };
      }];
      const response = {
        status: HTTP_STATUS_FOUND,
        redirect: '/foo',
      };

      const result = handleRedirectResponseWithPlugins(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_BAD_REQUEST);
      expect(mockContext.setHeader).not.toHaveBeenCalledWith(HTTP2_HEADER_LOCATION, '/foo');

      const expectedHeaders = mockContext.outgoingHeaders;

      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });
});
