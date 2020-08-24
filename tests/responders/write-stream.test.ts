import { createWriteStreamResponder } from '../../src/responders/write-stream';

let mockIsDrained = true;

const mockResponse = {
  write: jest.fn(() => {
    mockIsDrained = !mockIsDrained;
    return mockIsDrained;
  }),
  end: jest.fn(),
  once: jest.fn((event, callback) => {
    if (event === 'drain') callback();
  }),
  setDefaultEncoding: jest.fn(),
};

beforeEach(() => {
  mockIsDrained = true;
  mockResponse.write.mockClear();
  mockResponse.end.mockClear();
  mockResponse.once.mockClear();
});

const writeStreamResponder = createWriteStreamResponder();

/**
 * writeStreamResponder()
 */

describe('writeStreamResponder()', () => {
  describe('when passed an object with a `writeStream` property set to a function', () => {
    test('response.write(), response.end(), and response.once() are called', async () => {
      const response = {
        writeStream: (write: any) => {
          write('a');
          write('b');
          write('c');
        },
      };
      const result = writeStreamResponder(
        response,
        //@ts-expect-error
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockResponse.once).toHaveBeenCalled();
    });
  });

  describe('when passed an object with a `writeStream` property and a `status` property', () => {
    test('response.write(), response.end(), and response.once() are called', async () => {
      const response = {
        status: 200,
        writeStream: (write: any) => {
          write('a');
          write('b');
          write('c');
        },
      };
      const result = writeStreamResponder(
        response,
        //@ts-expect-error
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockResponse.once).toHaveBeenCalled();
    });
  });

  describe('when passed an object with a `writeStream` property that uses an `encoding` argument', () => {
    test('response.write(), response.end(), and response.once() are called', async () => {
      const response = {
        writeStream: (write: any) => {
          write('a', 'utf-8');
          write('b', 'utf-8');
          write('c', 'utf-8');
        },
      };
      const result = writeStreamResponder(
        response,
        //@ts-expect-error
        mockResponse
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockResponse.once).toHaveBeenCalled();
      expect(mockResponse.setDefaultEncoding).toHaveBeenCalledWith('utf-8');
    });
  });

  describe('when passed an empty object', () => {
    test('returns the same object', async () => {
      const response = {};
      const result = writeStreamResponder(
        response,
        //@ts-expect-error
        mockResponse
      );

      await expect(result).resolves.toBe(response);
      expect(mockResponse.write).not.toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
      expect(mockResponse.once).not.toHaveBeenCalled();
    });
  });
});
