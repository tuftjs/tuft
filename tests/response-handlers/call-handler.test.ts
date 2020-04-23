import type { HttpError } from '../../src/utils';
import { callHandlerWithErrorHandler } from '../../src/response-handlers';

const errorResponse = {
  error: 'TEAPOT' as HttpError,
};

const errorHandler = () => {
  return errorResponse;
};

const invalidErrorHandler = () => {
  return null;
};

const mockContext: any = {
  request: {},
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockContext.outgoingHeaders[key] = value;
  }),
};

beforeEach(() => {
  mockContext.outgoingHeaders = {};
  mockContext.setHeader.mockClear();
});

describe('callHandlerWithErrorHandler()', () => {
  describe('when the provided handler does not throw or return an error', () => {
    test('returns the expected result', async () => {
      const response = {};
      const handler = () => {
        return response;
      };

      const result = callHandlerWithErrorHandler(
        handler,
        errorHandler,
        mockContext,
      );

      expect(result).resolves.toBe(response);
    });
  });

  describe('when the provided handler throws an error', () => {
    test('returns the expected result', async () => {
      const handler = () => {
        throw Error('mock error');
      };

      const result = callHandlerWithErrorHandler(
        handler,
        errorHandler,
        mockContext,
      );

      expect(result).resolves.toEqual(errorResponse);
    });
  });

  describe('when the provided handler throws an error but the error handler does not return a valid error response', () => {
    test('throws an error', async () => {
      const handler = () => {
        throw Error('mock error');
      };

      const result = callHandlerWithErrorHandler(
        handler,
        //@ts-ignore
        invalidErrorHandler,
        mockContext,
      );

      expect(result).rejects.toThrow('Tuft error handlers must return a Tuft error object.');
    });
  });

  describe('when the provided handler returns an Error object', () => {
    test('returns the expected result', async () => {
      const handler = () => {
        return Error('mock error');
      };

      const result = callHandlerWithErrorHandler(
        handler,
        errorHandler,
        mockContext,
      );

      expect(result).resolves.toEqual(errorResponse);
    });
  });

  describe('when the provided handler returns an Error object but the error handler does not return a valid error response', () => {
    test('throws an error', async () => {
      const handler = () => {
        return Error('mock error');
      };

      const result = callHandlerWithErrorHandler(
        handler,
        //@ts-ignore
        invalidErrorHandler,
        mockContext,
      );

      expect(result).rejects.toThrow('Tuft error handlers must return a Tuft error object.');
    });
  });
});
