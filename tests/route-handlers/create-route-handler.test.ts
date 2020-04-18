import type { TuftRoute } from '../../src/route-map';
import type { TuftContext } from '../../src/context';

import { defaultErrorHandler, createRouteHandler } from '../../src/route-handlers';
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../src/constants';

function mockPlugin(t: TuftContext) {
  t.request.foo = 42;
}

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);



afterAll(() => {
  mockConsoleError.mockRestore();
  mockExit.mockRestore();
});

describe('defaultErrorHandler()', () => {
  test('returns an object with a status property', () => {
    expect(defaultErrorHandler()).toEqual({ status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  });
});

describe('createRouteHandler()', () => {
  const errorHandler = () => { return {}; };

  describe('when the body argument is set to true', () => {
    const route = {
      response: () => {
        return {};
      },
      plugins: [],
      errorHandler,
      includeBody: true,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });


  describe('when passed a response handler', () => {
    const route = {
      response: () => {
        return {};
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response handler without an error handler', () => {
    const route = {
      response: () => {
        return {};
      },
      plugins: [],
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a status property', () => {
    const route = {
      response: {
        status: 418,
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleEmptyResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleEmptyResponse');
    });
  });

  describe('when passed a response object with a redirect property', () => {
    const route = {
      response: {
        redirect: '/foo',
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleRedirectResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleRedirectResponse');
    });
  });

  describe('when passed a response object with a redirect property and plugins', () => {
    const route = {
      response: {
        redirect: '/foo',
      },
      plugins: [
        mockPlugin,
      ],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a body property', () => {
    describe('and a contentType property set to \'text\'', () => {
      const route = {
        response: {
          contentType: 'text',
          body: 'abc',
        },
        plugins: [],
        errorHandler,
      };

      test('returns bound handleBodyResponse', () => {
        const result = createRouteHandler(route);
        expect(result.name).toBe('bound handleBodyResponse');
      });
    });

    describe('and a contentType property set to \'json\'', () => {
      const route = {
        response: {
          contentType: 'json',
          body: 'abc',
        },
        plugins: [],
        errorHandler,
      };

      test('returns bound handleBodyResponse', () => {
        const result = createRouteHandler(route);
        expect(result.name).toBe('bound handleBodyResponse');
      });
    });

    describe('and a contentType property set to \'buffer\'', () => {
      const route = {
        response: {
          contentType: 'buffer',
          body: Buffer.from('abc'),
        },
        plugins: [],
        errorHandler,
      };

      test('returns bound handleBodyResponse', () => {
        const result = createRouteHandler(route);
        expect(result.name).toBe('bound handleBodyResponse');
      });
    });
  });

  describe('when passed a response object with a boolean body property', () => {
    const route = {
      response: {
        body: true,
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleBodyResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with a string body property', () => {
    const route = {
      response: {
        body: 'abc',
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleBodyResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with a buffer body property', () => {
    const route = {
      response: {
        body: Buffer.from('abc'),
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleBodyResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with an object body property', () => {
    const route = {
      response: {
        body: {},
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleBodyResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleBodyResponse');
    });
  });

  describe('when passed a response object with a symbol body property', () => {
    const route = {
      response: {
        body: Symbol(),
      },
      plugins: [],
      errorHandler,
    };

    test('exits the program with an error', () => {
      const expectedError = TypeError('\'symbol\' is not a supported response body type.');
      const result = createRouteHandler(route);
      expect(result).toBeUndefined();
      expect(mockConsoleError).toHaveBeenCalledWith(expectedError);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when passed a response object with a body property and plugins', () => {
    const route = {
      response: {
        body: {},
      },
      plugins: [
        mockPlugin,
      ],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a file property', () => {
    const route = {
      response: {
        file: __filename,
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleFileResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleFileResponse');
    });
  });

  describe('when passed a response object with a file property and plugins', () => {
    const route = {
      response: {
        file: __filename,
      },
      plugins: [
        mockPlugin,
      ],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response object with a stream property', () => {
    const route: TuftRoute = {
      response: {
        stream: async (write) => {
          await write('abc');
        },
      },
      plugins: [],
      errorHandler,
    };

    test('returns bound handleStreamResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleStreamResponse');
    });
  });

  describe('when passed a response object with a stream property and plugins', () => {
    const route: TuftRoute = {
      response: {
        stream: async (write) => {
          await write('abc');
        },
      },
      plugins: [
        mockPlugin,
      ],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed an empty response object', () => {
    const route = {
      response: {},
      plugins: [],
      errorHandler,
    };

    test('returns bound handleEmptyResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleEmptyResponse');
    });
  });

  describe('when passed an empty response object and plugins', () => {
    const route = {
      response: {},
      plugins: [
        mockPlugin,
      ],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });
});
