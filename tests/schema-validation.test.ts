import { findInvalidSchemaEntry, findInvalidResponseEntry } from '../src/schema-validation';

describe('findInvalidSchemaEntry()', () => {
  describe('returns null when passed a route schema', () => {
    test('with all possible valid properties', () => {
      const schema = {
        method: 'GET',
        path: '/',
        response: {},
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

    test('an object with `response` set to null', () => {
      expect(findInvalidSchemaEntry({ response: null }))
        .toBe('null is not a valid response object.');
    });

    test('an object with `response` set to an object containing an invalid property', () => {
      const schema = {
        response: { invalid: 42, },
      };
      expect(findInvalidSchemaEntry(schema))
        .toBe('\'invalid\' is not a valid response object property.');
    });
  });
});

describe('findInvalidResponseEntry()', () => {
  describe('returns null', () => {
    test('when passed a response object with all possible valid properties', () => {
      const response = {
        error: 'TEAPOT',
        status: 418,
        redirect: '/',
        contentType: 'text',
        body: 'abc',
        stream: () => {},
        file: './some_file',
      };
      expect(findInvalidResponseEntry(response)).toBeNull();
    });
  });

  describe('returns the expected string when passed', () => {
    test('an object with `error` set to a number', () => {
      expect(findInvalidResponseEntry({ error: 42 }))
        .toBe('42 is not a valid value for \'error\'');
    });

    test('an object with `error` set to an invalid string value', () => {
      expect(findInvalidResponseEntry({ error: 'FOO' }))
        .toBe('\'FOO\' is not a valid value for \'error\'');
    });

    test('an object with `status` set to a string', () => {
      expect(findInvalidResponseEntry({ status: 'FOO' }))
        .toBe('\'FOO\' is not a valid value for \'status\'');
    });

    test('an object with `redirect` set to a number', () => {
      expect(findInvalidResponseEntry({ redirect: 42 }))
        .toBe('42 is not a valid value for \'redirect\'');
    });

    test('an object with `contentType` set to a number', () => {
      expect(findInvalidResponseEntry({ contentType: 42 }))
        .toBe('42 is not a valid value for \'contentType\'');
    });

    test('an object with `stream` set to a number', () => {
      expect(findInvalidResponseEntry({ stream: 42 }))
        .toBe('42 is not a valid value for \'stream\'');
    });

    test('an object with `file` set to a number', () => {
      expect(findInvalidResponseEntry({ file: 42 }))
        .toBe('42 is not a valid value for \'file\'');
    });
  });
});
