import type { TuftContext } from '../../src/context';
import { URLSearchParams } from 'url';
import { createSearchParams } from '../../src/pre-handlers/search-params';

type MockTuftContext = {
  request: {
    search: string;
    [key: string]: any;
  };
};

function createMockContext(withSearch = false) {
  const mockContext: MockTuftContext = {
    request: {
      search: '',
    },
  };

  if (withSearch) {
    mockContext.request.search = '?a=1';
  }

  return mockContext;
}

/**
 * createSearchParams()
 */

describe('createSearchParams()', () => {
  test('returns a function named `searchParams`', () => {
    const searchParams = createSearchParams();
    expect(typeof searchParams).toBe('function');
    expect(searchParams.name).toBe('searchParams');
  });

  describe('searchParams()', () => {
    describe('when passed a request object with the search property set to an empty string', () => {
      test('adds a `searchParams` property set to an empty URLSearchParams object', () => {
        const searchParams = createSearchParams();
        const context = createMockContext();
        searchParams(context as TuftContext);
        expect(context.request).toHaveProperty('searchParams', new URLSearchParams());
      });
    });

    describe('when passed a request object with the search property set to a query string', () => {
      test('adds a `searchParams` property set to an empty URLSearchParams object', () => {
        const searchParams = createSearchParams();
        const context = createMockContext(true);
        searchParams(context as TuftContext);
        expect(context.request).toHaveProperty('searchParams', new URLSearchParams('?a=1'));
      });
    });
  });
});
