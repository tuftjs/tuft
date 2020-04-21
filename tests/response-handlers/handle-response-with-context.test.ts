import { handleResponseWithContext } from '../../src/response-handlers';
import { HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH } from '../../src/constants';

const mockStream = {
  respond: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
};

describe('handleResponseWithContext()', () => {
  beforeEach(() => {
    mockStream.respond.mockClear();
    mockStream.close.mockClear();
    mockStream.on.mockClear();
  });

  describe('when passed a mock handler', () => {
    test('mock handler is called', async () => {
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
      expect(mockHandler).toHaveBeenCalled();
    });
  });
});
