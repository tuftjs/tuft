import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { RouteMap, TuftRoute } from './route-map';

import { createRouteHandler } from './route-handlers';
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

const wildcardRegexp = /{\*\*?}/;

export class RouteStore {
  private readonly _routeTree: RouteTreeNode = {};

  set(path: string, route: TuftRoute, body: boolean = false) {
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
        node[segment]![sym_handler] = createRouteHandler(routeHandlerParams, body);
        break;
      }

      node = node[segment]![sym_next];
    }
  }

  get(path: string) {
    let begin = 1;
    let end = path.indexOf('/', begin);
    let node = this._routeTree;
    let doubleWildcard: RouteTreeBranch = { [sym_next]: {} };
    let branch: RouteTreeBranch;
    let pathSegment: string;

    while (end >= 0) {
      pathSegment = path.slice(begin, end);

      doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;
      branch = node[pathSegment] ?? node[sym_wildcard] ?? doubleWildcard;

      if (branch === doubleWildcard) {
        return doubleWildcard[sym_handler];
      }

      node = branch[sym_next];
      begin = end + 1;
      end = path.indexOf('/', begin);
    }

    pathSegment = path.slice(begin);

    doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;

    const routeHandler = node[pathSegment]?.[sym_handler]
      ?? node[sym_wildcard]?.[sym_handler]
      ?? doubleWildcard[sym_handler];

    return routeHandler;
  }
}
