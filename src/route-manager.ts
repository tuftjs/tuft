import type { RouteMap } from './route-map';

import { RouteStore } from './route-store';
import { getValidRequestMethods } from './utils';
import {
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
} from './constants';

const methodsWithBody = [
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
];

export class RouteManager {
  private readonly _routes: { [method: string]: RouteStore } = {};

  constructor(routes: RouteMap) {
    for (const method of getValidRequestMethods()) {
      this._routes[method] = new RouteStore();
    }

    for (const [key, route] of routes) {
      const [method, path] = key.split(' ');
      const includeBody = methodsWithBody.includes(method);
      this._routes[method].set(path, route, includeBody);

      if (route.trailingSlash) {
        this._routes[method].set(path + '/', route, includeBody);
      }
    }
  }

  find(method: string, path: string) {
    return this._routes[method].get(path);
  }
}
