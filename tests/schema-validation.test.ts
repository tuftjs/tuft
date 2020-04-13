import { findInvalidSchemaEntry } from '../src/schema-validation';

describe('findInvalidSchemaEntry()', () => {
  describe('returns null', () => {
    test('when passed a route schema with all possible valid properties', () => {
      const schema = {
        method: 'GET',
        path: '/',
        preHandlers: [() => {}],
        response: {},
        errorHandler: () => {},
      };
      expect(findInvalidSchemaEntry(schema)).toBeNull();
    });
  });

  describe('returns the expected string', () => {
    test('when passed a non-object', () => {
      expect(findInvalidSchemaEntry(42)).toBe('42 is not a valid route schema object.');
    });

    test('when passed a named function', () => {
      const foo = () => {};
      expect(findInvalidSchemaEntry(foo))
        .toBe('[Function: foo] is not a valid route schema object.');
    });

    test('when passed an anonymous function', () => {
      expect(findInvalidSchemaEntry(() => {}))
        .toBe('[Function: anonymous] is not a valid route schema object.');
    });

    test('when passed an object with an invalid property', () => {
      expect(findInvalidSchemaEntry({ invalid: 42 }))
        .toBe('\'invalid\' is not a valid route schema property.');
    });

    test('when passed an object with an invalid request method', () => {
      expect(findInvalidSchemaEntry({ method: 'LINK' }))
        .toBe('\'LINK\' is not a valid request method.');
    });

    test('when passed an object with a non-string as the request method', () => {
      expect(findInvalidSchemaEntry({ method: Buffer.from('abc') }))
        .toBe('[Buffer] is not a valid request method.');
    });

    test('when passed an object with an invalid path', () => {
      expect(findInvalidSchemaEntry({ path: Symbol() }))
        .toBe('Symbol() is not a valid path.');
    });

    test('when passed an object with an invalid pre-handler', () => {
      expect(findInvalidSchemaEntry({ preHandlers: [{}] }))
        .toBe('[Object] is not a valid pre-handler.');
    });

    test('when passed an object with an invalid response object', () => {
      expect(findInvalidSchemaEntry({ response: null }))
        .toBe('null is not a valid response object.');
    });

    test('when passed an object with an invalid error handler', () => {
      expect(findInvalidSchemaEntry({ errorHandler: [] }))
        .toBe('[Array] is not a valid error handler.');
    });
  });
});
