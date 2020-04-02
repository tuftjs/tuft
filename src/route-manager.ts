import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { RouteMap, TuftRoute } from './route-map';

import { createRouteHandler } from './route-handlers';
import { pathSegmentCache } from './utils';
import { requestMethods } from './utils';

const sym_handler         = Symbol('sym_handler');
const sym_next            = Symbol('sym_next');
const sym_wildcard        = Symbol('sym_wildcard');
const sym_doubleWildcard  = Symbol('sym_doubleWildcard');

type RouteTreeBranch = {
  [sym_handler]?: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void | Promise<void>,
  [sym_next]: RouteTreeNode,
};

type RouteTreeNode = {
  [key: string]: RouteTreeBranch,
  [sym_wildcard]?: RouteTreeBranch,
  [sym_doubleWildcard]?: RouteTreeBranch,
}

export class RouteManager {
  private readonly _routes: { [method: string]: RouteStore } = {};

  constructor(routeMaps: RouteMap | RouteMap[]) {
    for (const method of requestMethods) {
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
  private readonly _routeTree: RouteTreeNode = {};

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

      if (node[segment] === undefined) {
        node[segment] = { [sym_next]: {} };
      }

      if (i === pathSegments.length - 1) {
        node[segment]![sym_handler] = createRouteHandler(route);
        break;
      }

      node = node[segment]![sym_next];
    }
  }

  get(path: string) {
    let routeHandler;

    let node: RouteTreeNode = this._routeTree;
    let doubleWildcard: RouteTreeBranch = defaultDoubleWildcard;
    let value: RouteTreeBranch;

    const pathSegments = pathSegmentCache.get(path);

    if (pathSegments !== undefined) {
      for (let i = 0; i < pathSegments.length; i++) {
        const pathSegment = pathSegments[i];

        doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;
        value = node[pathSegment] ?? node[sym_wildcard] ?? doubleWildcard;

        const isFinalSegment = i === pathSegments.length - 1;
        const isDoubleWildcard = value === doubleWildcard;

        if (isFinalSegment || isDoubleWildcard) {
          routeHandler = value[sym_handler];

          if (routeHandler !== undefined) {
            break;
          }
        }

        node = value[sym_next];
      }
    }

    else {
      const pathSegments: string[] = [];

      for (let begin = 1, end; begin > 0; begin = end + 1) {
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
    }

    return routeHandler ?? doubleWildcard[sym_handler] ?? null;
  }
}
