import { constants } from 'http2';
import {
  handleRedirectResponse,
  handleRedirectResponseWithPlugins,
} from '../../src/response-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_LOCATION } from '../../src/constants';

const { HTTP_STATUS_FOUND } = constants;

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

const mockCallPlugins = jest.fn(async () => 0);
const mockcallPluginsWithError = jest.fn(async () => 1);

beforeEach(() => {
  mockStream.respond.mockClear();
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
  mockCallPlugins.mockClear();
  mockcallPluginsWithError.mockClear();
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

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: response.status,
      [HTTP2_HEADER_LOCATION]: response.redirect,
    };

    expect(result).toBeUndefined();
    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
  });
});

describe('handleRedirectResponseWithPlugins()', () => {
  describe('when callPlugins() returns 0', () => {
    test('stream.respond() is called with the expected arguments', async () => {
      const response = {
        status: HTTP_STATUS_FOUND,
        redirect: '/foo',
      };

      const result = handleRedirectResponseWithPlugins(
        mockCallPlugins,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: response.status,
        [HTTP2_HEADER_LOCATION]: response.redirect,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_FOUND);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_LOCATION, '/foo');
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
    });
  });

  describe('when callPlugins() returns 1', () => {
    test('stream.respond() is not called', async () => {
      const response = {
        status: HTTP_STATUS_FOUND,
        redirect: '/foo',
      };

      const result = handleRedirectResponseWithPlugins(
        mockcallPluginsWithError,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.respond).not.toHaveBeenCalled();
    });
  });
});
