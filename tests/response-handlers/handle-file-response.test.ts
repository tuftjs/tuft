import { promises as fsPromises } from 'fs';
import { constants } from 'http2';
import { handleFileResponse, handleFileResponseWithPlugins } from '../../src/response-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_CONTENT_LENGTH } from '../../src/constants';

const { HTTP_STATUS_OK } = constants;

const CONTENT_LENGTH = 42;

const mockFileHandle = {
  stat: async () => {
    return { size: CONTENT_LENGTH };
  },
} as fsPromises.FileHandle;

const mockFsOpen = jest.spyOn(fsPromises, 'open').mockImplementation(async () => mockFileHandle);

const mockStream = {
  respondWithFD: jest.fn(),
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
  mockStream.respondWithFD.mockClear();
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
  mockCallPlugins.mockClear();
  mockcallPluginsWithError.mockClear();
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

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: response.status,
      [HTTP2_HEADER_CONTENT_LENGTH]: CONTENT_LENGTH,
    };

    await expect(result).resolves.toBeUndefined();
    expect(mockStream.respondWithFD).toHaveBeenCalledWith(mockFileHandle, expectedHeaders);
  });
});

describe('handleFileResponseWithPlugins()', () => {
  describe('when callPlugins() returns 0', () => {
    test('stream.respondWithFD() is called with the expected arguments', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        file: __filename,
      };

      const result = handleFileResponseWithPlugins(
        mockCallPlugins,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: response.status,
        [HTTP2_HEADER_CONTENT_LENGTH]: CONTENT_LENGTH,
      };

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_OK);
      expect(mockContext.setHeader)
        .toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, CONTENT_LENGTH);
      expect(mockStream.respondWithFD).toHaveBeenCalledWith(mockFileHandle, expectedHeaders);
    });
  });

  describe('when callPlugins() returns 1', () => {
    test('stream.respondWithFD() is not called', async () => {
      const response = {
        status: HTTP_STATUS_OK,
        file: __filename,
      };

      const result = handleFileResponseWithPlugins(
        mockcallPluginsWithError,
        response,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockContext.setHeader).not.toHaveBeenCalled();
      expect(mockStream.respondWithFD).not.toHaveBeenCalled();
    });
  });
});
