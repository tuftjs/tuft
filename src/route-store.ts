import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { TuftRoute } from './route-map';

import { createRouteHandler } from './route-handlers';

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
