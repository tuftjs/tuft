import { createWriteStreamResponder } from '../../src/responders/write-stream';

const mockStream = {
  respond: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
};

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.write.mockClear();
  mockStream.end.mockClear();
});

const writeStreamResponder = createWriteStreamResponder();

/**
 * writeStreamResponder()
 */

describe('writeStreamResponder()', () => {
  describe('when passed an object with a `writeStream` property set to a function', () => {
    test('stream.respond(), stream.write(), and stream.end() are called', async () => {
      const response = {
        writeStream: (write: any) => {
          write('abc');
        },
      };
      const result = writeStreamResponder(
        response,
        //@ts-expect-error
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalled();
      expect(mockStream.write).toHaveBeenCalled();
      expect(mockStream.end).toHaveBeenCalled();
    });
  });

  describe('when passed an object with a `writeStream` property and a `status` property', () => {
    test('stream.respond(), stream.write(), and stream.end() are called', async () => {
      const response = {
        status: 200,
        writeStream: (write: any) => {
          write('abc');
        },
      };
      const result = writeStreamResponder(
        response,
        //@ts-expect-error
        mockStream,
        {},
      );

      await expect(result).resolves.toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalled();
      expect(mockStream.write).toHaveBeenCalled();
      expect(mockStream.end).toHaveBeenCalled();
    });
  });

  describe('when passed an empty object', () => {
    test('returns the same object', async () => {
      const response = {};
      const result = writeStreamResponder(
        response,
        //@ts-expect-error
        mockStream,
        {},
      );

      await expect(result).resolves.toBe(response);
      expect(mockStream.respond).not.toHaveBeenCalled();
      expect(mockStream.write).not.toHaveBeenCalled();
      expect(mockStream.end).not.toHaveBeenCalled();
    });
  });
});
