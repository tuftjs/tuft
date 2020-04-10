import type { RouteMap } from './route-map';

import { RouteStore } from './route-store';
import { getValidRequestMethods } from './utils';

export class RouteManager {
  private readonly _routes: { [method: string]: RouteStore } = {};

  constructor(routes: RouteMap) {
    for (const method of getValidRequestMethods()) {
      this._routes[method] = new RouteStore();
    }

    for (const [key, route] of routes) {
      const [method, path] = key.split(' ');
      this._routes[method].set(path, route);

      if (route.trailingSlash) {
        this._routes[method].set(path + '/', route);
      }
    }
  }

  find(method: string, path: string) {
    return this._routes[method].get(path);
  }
}
