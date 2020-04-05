import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { RouteMap, TuftRoute } from './route-map';

import { createRouteHandler } from './route-handlers';
import { getValidRequestMethods } from './utils';

const sym_handler         = Symbol('handler');
const sym_next            = Symbol('next');
const sym_wildcard        = Symbol('wildcard');
const sym_doubleWildcard  = Symbol('doubleWildcard');

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
    for (const method of getValidRequestMethods()) {
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
    const routeHandlerParams = Object.assign({}, route);

    const params: { [key: string]: string } = {};
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
        if (!wildcardRegexp.test(str)) {
          params[i] = str.slice(1, str.length - 1);
        }

        segment = str === '{**}' ? sym_doubleWildcard : sym_wildcard;
      }

      else {
        segment = str;
      }

      const hasParams = Object.keys(params).length > 0;

      if (hasParams) {
        routeHandlerParams.params = params;
      }

      if (node[segment] === undefined) {
        node[segment] = { [sym_next]: {} };
      }

      if (i === pathSegments.length - 1) {
        node[segment]![sym_handler] = createRouteHandler(routeHandlerParams);
        break;
      }

      node = node[segment]![sym_next];
    }
  }

  get(path: string) {
    let routeHandler;

    let node: RouteTreeNode = this._routeTree;
    let doubleWildcard: RouteTreeBranch = defaultDoubleWildcard;
    let branch: RouteTreeBranch;

    let begin = 1;
    let end = path.indexOf('/', begin);
    let pathSegment;

    while (end >= 0) {
      pathSegment = path.slice(begin, end);

      doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;
      branch = node[pathSegment] ?? node[sym_wildcard] ?? doubleWildcard;

      const isDoubleWildcard = branch === doubleWildcard;

      if (isDoubleWildcard) {
        routeHandler = branch[sym_handler];

        if (routeHandler !== undefined) {
          return routeHandler ?? doubleWildcard[sym_handler];
        }
      }

      node = branch[sym_next];

      begin = end + 1;
      end = path.indexOf('/', begin);
    }

    pathSegment = path.slice(begin);

    doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;
    branch = node[pathSegment] ?? node[sym_wildcard] ?? doubleWildcard;

    routeHandler = branch[sym_handler];

    return routeHandler ?? doubleWildcard[sym_handler];
  }
}
