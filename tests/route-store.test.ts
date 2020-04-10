import { RouteStore } from '../src/route-store';

describe('RouteStore', () => {
  const store = new RouteStore();

  describe('RouteStore.prototype.set()', () => {
    describe('with an argument of \'/foo\'', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo', {
            preHandlers: [],
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of \'/foo/{bar}\'', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo/{bar}', {
            preHandlers: [],
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of \'/foo/bar/{*}\'', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/foo/bar/{*}', {
            preHandlers: [],
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });

    describe('with an argument of \'/{**}\'', () => {
      test('does not throw an error', () => {
        function setRoute() {
          store.set('/{**}', {
            preHandlers: [],
            response: {},
          });
        }

        expect(setRoute).not.toThrow();
      });
    });
  });
});


describe('RouteStore', () => {
  const store = new RouteStore();

  store.set('/foo', {
    preHandlers: [],
    response: {},
  });

  store.set('/foo/{*}', {
    preHandlers: [],
    response: {},
  });

  store.set('/foo/bar/{*}', {
    preHandlers: [],
    response: {},
  });

  store.set('/bar/{**}', {
    preHandlers: [],
    response: {},
  });

  describe('RouteStore.prototype.get()', () => {
    describe('with an argument of \'/foo\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/foo')).toBe('function');
      });
    });

    describe('with an argument of \'/foo/bar\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/foo/bar')).toBe('function');
      });
    });

    describe('with an argument of \'/foo/bar/baz\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/foo/bar/baz')).toBe('function');
      });
    });

    describe('with an argument of \'/bar/baz\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/bar/baz')).toBe('function');
      });
    });

    describe('with an argument of \'/bar/bar/bar\'', () => {
      test('returns a function', () => {
        expect(typeof store.get('/bar/bar/bar')).toBe('function');
      });
    });

    describe('with an argument of \'/bar\'', () => {
      test('returns undefined', () => {
        expect(store.get('/bar')).toBeUndefined();
      });
    });
  });
});
