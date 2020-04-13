import type { TuftRoute } from '../../src/route-map';
import { defaultErrorHandler, createRouteHandler } from '../../src/route-handlers';
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../src/constants';

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
      preHandlers: [],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route, true);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });

  describe('when passed a response handler', () => {
    const route = {
      response: () => {
        return {};
      },
      preHandlers: [],
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
      preHandlers: [],
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
      preHandlers: [],
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
      preHandlers: [],
      errorHandler,
    };

    test('returns bound handleRedirectResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleRedirectResponse');
    });
  });

  describe('when passed a response object with a redirect property and pre-handlers', () => {
    const route = {
      response: {
        redirect: '/foo',
      },
      preHandlers: [() => {}],
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
        preHandlers: [],
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
        preHandlers: [],
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
        preHandlers: [],
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
      preHandlers: [],
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
      preHandlers: [],
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
      preHandlers: [],
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
      preHandlers: [],
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
      preHandlers: [],
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

  describe('when passed a response object with a body property and pre-handlers', () => {
    const route = {
      response: {
        body: {},
      },
      preHandlers: [() => {}],
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
      preHandlers: [],
      errorHandler,
    };

    test('returns bound handleFileResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleFileResponse');
    });
  });

  describe('when passed a response object with a file property and pre-handlers', () => {
    const route = {
      response: {
        file: __filename,
      },
      preHandlers: [() => {}],
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
      preHandlers: [],
      errorHandler,
    };

    test('returns bound handleStreamResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleStreamResponse');
    });
  });

  describe('when passed a response object with a stream property and pre-handlers', () => {
    const route: TuftRoute = {
      response: {
        stream: async (write) => {
          await write('abc');
        },
      },
      preHandlers: [() => {}],
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
      preHandlers: [],
      errorHandler,
    };

    test('returns bound handleEmptyResponse', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleEmptyResponse');
    });
  });

  describe('when passed an empty response object and pre-handlers', () => {
    const route = {
      response: {},
      preHandlers: [() => {}],
      errorHandler,
    };

    test('returns bound handleResponseWithContext', () => {
      const result = createRouteHandler(route);
      expect(result.name).toBe('bound handleResponseWithContext');
    });
  });
});
