import type { RouteMap, TuftRoute } from './route-map';

import { createRouteHandler } from './route-handlers';
import { pathSegmentCache } from './utils';
import { getRequestMethods } from './utils';

const sym_handler: unique symbol = Symbol('handler');
const sym_next: unique symbol = Symbol('next');
const sym_wildcard: unique symbol = Symbol('{*}');
const sym_doubleWildcard: unique symbol = Symbol('{**}');

type RouteTreeNode = {
  [sym_handler]?: any,
  [sym_next]: RouteTree,
};

type RouteTree = {
  [key: string]: RouteTreeNode,
  [sym_wildcard]?: RouteTreeNode,
  [sym_doubleWildcard]?: RouteTreeNode,
}

export class RouteManager {
  private readonly _routes: { [method: string]: RouteStore } = {};

  constructor(routeMaps: RouteMap | RouteMap[]) {
    for (const method of getRequestMethods()) {
      this._routes[method] = new RouteStore();
    }

    [routeMaps].flat()
      .forEach(routeMap => this.add(routeMap));
  }

  add(routeMap: RouteMap) {
    for (const [key, route] of routeMap) {
      const [method, path] = key.split(' ');
      this._routes[method].set(path, route);

      if (route.trailingSlash) {
        this._routes[method].set(path + '/', route);
      }
    }
  }

  find(method: string, path: string) {
    return this._routes[method]?.get(path);
  }
}

const wildcardRegexp = /{\*\*?}/;
const defaultDoubleWildcard = { [sym_next]: {} };

class RouteStore {
  private readonly _routeTree: RouteTree = {};

  set(path: string, route: TuftRoute) {
    const params = [];
    const pathSegments = path.split('/').slice(1);

    const doubleWildcardIndex = pathSegments.indexOf('{**}');

    if (doubleWildcardIndex >= 0) {
      pathSegments.splice(doubleWildcardIndex + 1);
    }

    let i, node;

    for (i = 0, node = this._routeTree; i < pathSegments.length; i++) {
      const str = pathSegments[i];

      let segment;

      if (str.startsWith('{') && str.endsWith('}')) {
        if (wildcardRegexp.test(str)) {
          params.push({ n: i, key: str.slice(1, str.length - 1) });
        }

        segment = str === '{**}' ? sym_doubleWildcard : sym_wildcard;
      }

      else {
        segment = str;
      }

      if (params.length) {
        route.params = params;
      }

      node[segment] = node[segment] ?? { [sym_next]: {} };

      if (i === pathSegments.length - 1) {
        node[segment]![sym_handler] = createRouteHandler(route);
        break;
      }

      node = node[segment]![sym_next];
    }
  }

  get(path: string) {
    let routeHandler;

    let node = this._routeTree;
    let doubleWildcard: RouteTreeNode = defaultDoubleWildcard;
    let begin;
    let end;
    let value;

    const pathSegments: string[] = [];

    for (begin = 1; begin > 0; begin = end + 1) {
      end = path.indexOf('/', begin);

      const pathSegment = path.slice(begin, end >= 0 ? end : undefined);
      pathSegments.push(pathSegment);

      doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;
      value = node[pathSegment] ?? node[sym_wildcard] ?? doubleWildcard;

      const isFinalSegment = end === -1;
      const isDoubleWildcard = value === doubleWildcard;

      if (isFinalSegment || isDoubleWildcard) {
        routeHandler = value[sym_handler];

        if (routeHandler !== undefined) {
          break;
        }
      }

      node = value[sym_next];
    }

    pathSegmentCache.set(path, pathSegments);

    return routeHandler ?? doubleWildcard[sym_handler] ?? null;
  }
}
