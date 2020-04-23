import type { HttpError } from '../../src/utils';
import { callPlugins, callPluginsWithErrorHandler } from '../../src/response-handlers';

const errorHandler = () => {
  return {
    error: 'TEAPOT' as HttpError,
  };
};

const invalidErrorHandler = () => {
  return null;
};

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

describe('callPlugins()', () => {
  describe('when the provided plugin does not return an error response', () => {
    test('returns 0', async () => {
      const pluginHandler = () => {};
      const result = callPlugins(
        [pluginHandler],
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBe(0);
    });
  });

  describe('when the provided plugin returns an error response', () => {
    test('returns 1', async () => {
      const pluginHandler = () => {
        return {
          error: 'TEAPOT' as HttpError,
        };
      };

      const result = callPlugins(
        [pluginHandler],
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBe(1);
    });
  });
});

describe('callPluginsWithErrorHandler()', () => {
  describe('when the provided plugin does not return an error response', () => {
    test('returns 0', async () => {
      const pluginHandler = () => {};
      const result = callPluginsWithErrorHandler(
        [pluginHandler],
        errorHandler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBe(0);
    });
  });

  describe('when the provided plugin throws an Error', () => {
    test('returns 1', async () => {
      const pluginHandler = () => {
        throw Error();
      };

      const result = callPluginsWithErrorHandler(
        [pluginHandler],
        errorHandler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBe(1);
    });
  });

  describe('when the provided plugin throws an Error but the error handler does not return a valid error response', () => {
    test('rejects with an error', async () => {
      const pluginHandler = () => {
        throw Error();
      };

      const result = callPluginsWithErrorHandler(
        [pluginHandler],
        //@ts-ignore
        invalidErrorHandler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).rejects.toThrow('Tuft error handlers must return a Tuft error object.');
    });
  });

  describe('when the provided plugin returns an Error object', () => {
    test('returns 1', async () => {
      const pluginHandler = () => {
        return Error();
      };

      const result = callPluginsWithErrorHandler(
        [pluginHandler],
        errorHandler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBe(1);
    });
  });

  describe('when the provided plugin returns an Error object but the error handler does not return a valid error response', () => {
    test('rejects with an error', async () => {
      const pluginHandler = () => {
        return Error();
      };

      const result = callPluginsWithErrorHandler(
        [pluginHandler],
        //@ts-ignore
        invalidErrorHandler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).rejects.toThrow('Tuft error handlers must return a Tuft error object.');
    });
  });

  describe('when the provided plugin returns an error response', () => {
    test('returns 1', async () => {
      const pluginHandler = () => {
        return {
          error: 'TEAPOT' as HttpError,
        };
      };

      const result = callPluginsWithErrorHandler(
        [pluginHandler],
        errorHandler,
        //@ts-ignore
        mockStream,
        mockContext,
      );

      expect(result).resolves.toBe(1);
    });
  });
});
