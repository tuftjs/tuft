import type { TuftContext } from '../../src/context';

import { createRouteHandler } from '../../src/route-handlers';

function mockPlugin(t: TuftContext) {
  t.request.foo = 42;
}

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

afterAll(() => {
  mockConsoleError.mockRestore();
  mockExit.mockRestore();
});

describe('createRouteHandler()', () => {
  describe('when passed a response handler', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createRouteHandler({
        response: () => {
          return {};
        },
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with an `error` property', () => {
    test('returns bound handleEmptyResponse()', () => {
      const result = createRouteHandler({
        response: { error: 'TEAPOT' },
      });

      expect(result.name).toBe('bound handleEmptyResponse');
    });
  });

  describe('when passed a response object with a `status` property', () => {
    test('returns bound handleEmptyResponse()', () => {
      const result = createRouteHandler({
        response: { status: 418 },
      });

      expect(result.name).toBe('bound handleEmptyResponse');
    });
  });

  describe('when passed a response object with a `redirect` property', () => {
    test('returns bound handleRedirectResponse()', () => {
      const result = createRouteHandler({
        response: { redirect: '/foo' },
      });

      expect(result.name).toBe('bound handleRedirectResponse');
    });
  });

  describe('when passed a response object with a `redirect` property and plugins', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createRouteHandler({
        response: { redirect: '/foo' },
        plugins: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a `body` property', () => {
    describe('and a `contentType` property set to `text`', () => {
      test('returns bound handleBodyResponse()', () => {
        const result = createRouteHandler({
          response: {
            contentType: 'text',
            body: 'abc',
          },
        });

        expect(result.name).toBe('bound handleBodyResponse');
      });
    });

    describe('and a `contentType` property set to `json`', () => {
      test('returns bound handleBodyResponse()', () => {
        const result = createRouteHandler({
          response: {
            contentType: 'json',
            body: 'abc',
          },
        });

        expect(result.name).toBe('bound handleBodyResponse');
      });
    });

    describe('and a `contentType` property set to `buffer`', () => {
      test('returns bound handleBodyResponse()', () => {
        const result = createRouteHandler({
          response: {
            contentType: 'buffer',
            body: Buffer.from('abc'),
          },
        });

        expect(result.name).toBe('bound handleBodyResponse');
      });
    });
  });

  describe('when passed a response object with a `body` property of type boolean', () => {
    test('returns bound handleBodyResponse()', () => {
      const result = createRouteHandler({
        response: { body: true },
      });

      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with a `body` property of type string', () => {
    test('returns bound handleBodyResponse()', () => {
      const result = createRouteHandler({
        response: { body: 'abc' },
      });

      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with a `body` property of type Buffer', () => {
    test('returns bound handleBodyResponse()', () => {
      const result = createRouteHandler({
        response: { body: Buffer.from('abc') },
      });

      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with a `body` property of type object', () => {
    test('returns bound handleBodyResponse()', () => {
      const result = createRouteHandler({
        response: { body: {} },
      });

      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with a `body` property of type symbol', () => {
    test('logs an error and exits with a non-zero exit code', () => {
      const expectedError = TypeError('\'symbol\' is not a supported response body type.');
      const result = createRouteHandler({
        response: { body: Symbol() },
      });

      expect(result).toBeUndefined();
      expect(mockConsoleError).toHaveBeenCalledWith(expectedError);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when passed a response object with a `body` property and plugins', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createRouteHandler({
        response: { body: {} },
        plugins: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a `file` property', () => {
    test('returns bound handleFileResponse()', () => {
      const result = createRouteHandler({
        response: { file: __filename },
      });

      expect(result.name).toBe('bound handleFileResponse');
    });
  });

  describe('when passed a response object with a `file` property and plugins', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createRouteHandler({
        response: { file: __filename },
        plugins: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a `stream` property', () => {
    test('returns bound handleStreamResponse()', () => {
      const result = createRouteHandler({
        response: {
          stream: async (write) => {
            await write('abc');
          },
        },
      });

      expect(result.name).toBe('bound handleStreamResponse');
    });
  });

  describe('when passed a response object with a `stream` property and plugins', () => {
    test('returns bound handleResponseWithContext()', () => {
      const result = createRouteHandler({
        response: {
          stream: async (write) => {
            await write('abc');
          },
        },
        plugins: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed an empty response object', () => {
    test('returns bound handleEmptyResponse()', () => {
      const result = createRouteHandler({ response: {} });

      expect(result.name).toBe('bound handleEmptyResponse');
    });
  });

  describe('when passed an empty response object and plugins', () => {
    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler({
        response: {},
        plugins: [mockPlugin],
      });

      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });
});
