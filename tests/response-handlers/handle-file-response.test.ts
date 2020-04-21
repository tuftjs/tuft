import type { TuftPluginHandler } from '../../src/route-map';
import { promises as fsPromises } from 'fs';
import { constants } from 'http2';
import { handleFileResponse, handleFileResponseWithPlugins } from '../../src/response-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_CONTENT_LENGTH } from '../../src/constants';

const { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST } = constants;

const CONTENT_LENGTH = 42;

const mockFileHandle = {
  stat: async () => {
    return { size: CONTENT_LENGTH };
  },
} as fsPromises.FileHandle;

const mockFsOpen = jest.spyOn(fsPromises, 'open').mockImplementation(async () => mockFileHandle);

const mockStream = {
  respond: jest.fn(),
  respondWithFD: jest.fn(),
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
  mockStream.respondWithFD.mockClear();
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
});

afterAll(() => {
  mockFsOpen.mockRestore();
});

describe('handleFileResponse()', () => {
  test('stream.respondWithFD() is called with the expected arguments', async () => {
    const response = {
      status: HTTP_STATUS_OK,
      file: __filename,
    };

    const result = handleFileResponse(
      response,
      //@ts-ignore
      mockStream
    );

    await expect(result).resolves.toBeUndefined();

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
      [HTTP2_HEADER_CONTENT_LENGTH]: CONTENT_LENGTH,
    };

    expect(mockStream.respond).not.toHaveBeenCalled();
    expect(mockStream.respondWithFD).toHaveBeenCalledWith(mockFileHandle, expectedHeaders);
  });
});

describe('handleFileResponseWithPlugins()', () => {
  describe('when a plugin DOES NOT return an http error response', () => {
    test('stream.respondWithFD() is called with the expected arguments', async () => {
      const pluginHandlers = [() => {}];
      const response = {
        status: HTTP_STATUS_OK,
        file: __filename,
      };

      const result = handleFileResponseWithPlugins(
        pluginHandlers,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, CONTENT_LENGTH);

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
        [HTTP2_HEADER_CONTENT_LENGTH]: CONTENT_LENGTH,
      };

      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.respondWithFD).toHaveBeenCalledWith(mockFileHandle, expectedHeaders);
    });
  });

  describe('when a plugin DOES return an http error response', () => {
    test('stream.respondWithFD() is called with the expected arguments', async () => {
      const pluginHandlers: TuftPluginHandler[] = [() => {
        return { error: 'BAD_REQUEST' };
      }];
      const response = {
        status: HTTP_STATUS_OK,
        file: __filename,
      };

      const result = handleFileResponseWithPlugins(
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
      expect(mockStream.respondWithFD).not.toHaveBeenCalled();
    });
  });
});
