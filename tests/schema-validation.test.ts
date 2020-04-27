import { findInvalidSchemaEntry } from '../src/schema-validation';

/**
 * findInvalidSchemaEntry()
 */

describe('findInvalidSchemaEntry()', () => {
  describe('when passed', () => {
    describe('an object with all possible valid properties', () => {
      test('returns null', () => {
        const result = findInvalidSchemaEntry({
          response: {},
          method: 'GET',
          path: '/',
          errorHandler: () => {},
        });

        expect(result).toBeNull();
      });
    });

    describe('an object with the `response` property set to a function', () => {
      test('returns null', () => {
        const result = findInvalidSchemaEntry({
          response: () => {},
        });

        expect(result).toBeNull();
      });
    });

    describe('a non-object', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry(42);

        expect(result).toBe('42 is not a valid route schema object.');
      });
    });

    describe('a named function', () => {
      test('returns the expected string', () => {
        const namedFunction = () => {};
        const result = findInvalidSchemaEntry(namedFunction);

        expect(result).toBe('[Function: namedFunction] is not a valid route schema object.');
      });
    });

    describe('an anonymous function', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry(() => {});

        expect(result).toBe('[Function: anonymous] is not a valid route schema object.');
      });
    });

    describe('an object with an invalid property', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ invalid: 42 });

        expect(result).toBe('\'invalid\' is not a valid route schema property.');
      });
    });

    describe('an object with the `response` property set to null', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ response: null });

        expect(result).toBe('null is not a valid response object.');
      });
    });

    describe('an object with the `method` property set to an invalid request method string', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ method: 'LINK' });

        expect(result).toBe('\'LINK\' is not a valid request method.');
      });
    });

    describe('an object with the `method` property set to a buffer', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ method: Buffer.from('abc') });

        expect(result).toBe('[Buffer] is not a valid request method.');
      });
    });

    describe('an object with the `path` property set to a symbol', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ path: Symbol() });

        expect(result).toBe('Symbol() is not a valid path.');
      });
    });

    describe('an object with the `path` property set to an object', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ path: {} });

        expect(result).toBe('[Object] is not a valid path.');
      });
    });

    describe('an object with the `path` property set to an array', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ path: [] });

        expect(result).toBe('[Array] is not a valid path.');
      });
    });

    describe('an object with the `errorHandler` property set to a number', () => {
      test('returns the expected string', () => {
        const result = findInvalidSchemaEntry({ errorHandler: 42 });

        expect(result).toBe('42 is not a valid error handler.');
      });
    });
  });
});
