import { findInvalidSchemaEntry
} from '../src/schema-validation';

describe('findInvalidSchemaEntry()', () => {
  describe('returns null when passed a route schema', () => {
    test('with all possible valid properties', () => {
      const schema = {
        response: {},
        method: 'GET',
        path: '/',
        errorHandler: () => {},
      };
      expect(findInvalidSchemaEntry(schema)).toBeNull();
    });

    test('with `response` set to a function', () => {
      const schema = {
        response: () => {},
      };
      expect(findInvalidSchemaEntry(schema)).toBeNull();
    });
  });

  describe('returns the expected string when passed', () => {
    test('a non-object', () => {
      expect(findInvalidSchemaEntry(42)).toBe('42 is not a valid route schema object.');
    });

    test('a named function', () => {
      const foo = () => {};
      expect(findInvalidSchemaEntry(foo))
        .toBe('[Function: foo] is not a valid route schema object.');
    });

    test('an anonymous function', () => {
      expect(findInvalidSchemaEntry(() => {}))
        .toBe('[Function: anonymous] is not a valid route schema object.');
    });

    test('an object with an invalid property', () => {
      expect(findInvalidSchemaEntry({ invalid: 42 }))
        .toBe('\'invalid\' is not a valid route schema property.');
    });

    test('an object with `response` set to null', () => {
      expect(findInvalidSchemaEntry({ response: null }))
        .toBe('null is not a valid response object.');
    });

    test('an object with `method` set to an invalid request method string', () => {
      expect(findInvalidSchemaEntry({ method: 'LINK' }))
        .toBe('\'LINK\' is not a valid request method.');
    });

    test('an object with `method` set to a buffer', () => {
      expect(findInvalidSchemaEntry({ method: Buffer.from('abc') }))
        .toBe('[Buffer] is not a valid request method.');
    });

    test('an object with `path` set to a symbol', () => {
      expect(findInvalidSchemaEntry({ path: Symbol() }))
        .toBe('Symbol() is not a valid path.');
    });

    test('an object with `path` set to an object', () => {
      expect(findInvalidSchemaEntry({ path: {} }))
        .toBe('[Object] is not a valid path.');
    });

    test('an object with `path` set to an array', () => {
      expect(findInvalidSchemaEntry({ path: [] }))
        .toBe('[Array] is not a valid path.');
    });

    test('an object with `errorHandler` set to a number', () => {
      expect(findInvalidSchemaEntry({ errorHandler: 42 }))
        .toBe('42 is not a valid error handler.');
    });
  });
});
