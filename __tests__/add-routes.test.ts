import { createRouteMap } from '../src';

describe('Add a route', () => {
  test('/foo', () => {
    const expectedResult = {
      preHandlers: [],
      response: {
        status: 200,
      },
    };

    const routes = createRouteMap();

    routes.set('GET /foo', {
      response: {
        status: 200,
      },
    });

    expect(routes.get('GET /foo')).toEqual(expectedResult);
  });
});
