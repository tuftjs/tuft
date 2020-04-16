import { handleResponseWithContext } from '../../src/route-handlers';
import {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} from '../../src/constants';

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockStream = {
  respond: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
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
    test('when the handler throws an error', async () => {
      const err = Error('handler error');
      const mockHandler = jest.fn(() => { throw err; });

      const mockHeaders = {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/',
      };

      const result = handleResponseWithContext(
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
});
