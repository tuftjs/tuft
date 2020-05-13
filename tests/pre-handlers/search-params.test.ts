import { URLSearchParams } from 'url';
import { createSearchParams } from '../../src/pre-handlers/search-params';

type MockTuftContext = {
  request: {
    search: string;
    [key: string]: any;
  };
};

const mockContextWithoutSearch: MockTuftContext = {
  request: {
    search: '',
  },
};

const mockContextWithSearch: MockTuftContext = {
  request: {
    search: '?a=1',
  },
};

/**
 * createSearchParams()
 */

describe('createSearchParams()', () => {
  let searchParams: (t: MockTuftContext) => void;

  test('returns a function named `searchParams`', () => {
    searchParams = createSearchParams();
    expect(typeof searchParams).toBe('function');
    expect(searchParams.name).toBe('searchParams');
  });

  describe('searchParams()', () => {
    describe('when passed a request object with the search property set to an empty string', () => {
      test('adds a `searchParams` property set to an empty URLSearchParams object', () => {
        searchParams(mockContextWithoutSearch);
        expect(mockContextWithoutSearch.request)
          .toHaveProperty('searchParams', new URLSearchParams());
      });
    });

    describe('when passed a request object with the search property set to a query string', () => {
      test('adds a `searchParams` property set to an empty URLSearchParams object', () => {
        searchParams(mockContextWithSearch);
        expect(mockContextWithSearch.request)
          .toHaveProperty('searchParams', new URLSearchParams('?a=1'));
      });
    });
  });
});
