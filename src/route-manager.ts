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

/**
 * Creates an instance of RouteStore for each valid HTTP request method, and adds the routes in the
 * provided route map to one of the stores based on its method.
 */

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

  /**
   * Searches for and returns a route handler based on the provided method and path. Returns
   * undefined if no route exists.
   */

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

/**
 * Stores route handlers in a tree data structure, where each node in the tree represents a path
 * segment.
 */

export class RouteStore {
  private readonly _routeTree: RouteTreeNode = {};

  /**
   * Adds a route handler to the store, indexed by the given path.
   */

  set(path: string, route: TuftRoute, body: boolean = false) {
    const routeHandlerParams = Object.assign({}, route);

    const params: { [key: string]: string } = {};
    const pathSegments = path.split('/').slice(1);

    const doubleWildcardIndex = pathSegments.indexOf('{**}');

    if (doubleWildcardIndex >= 0) {
      // A double wildcard was found, so ignore any successive path segments.
      pathSegments.splice(doubleWildcardIndex + 1);
    }

    let i, node;

    // Iterate over each path segment, adding them as nodes in the route tree.
    for (i = 0, node = this._routeTree; i < pathSegments.length; i++) {
      const str = pathSegments[i];

      let segment;

      if (str.startsWith('{') && str.endsWith('}')) {
        // This is a wildcard segment.
        if (!wildcardRegexp.test(str)) {
          // This is a named wildcard segment, extract the param name.
          params[i] = str.slice(1, str.length - 1);
        }

        // Index the wildcard path segment using the corresponding symbol.
        segment = str === '{**}' ? sym_doubleWildcard : sym_wildcard;
      }

      else {
        // This is not a wildcard, so index by the given path segment directly.
        segment = str;
      }

      const hasParams = Object.keys(params).length > 0;

      if (hasParams) {
        routeHandlerParams.params = params;
      }

      if (node[segment] === undefined) {
        // A node does not exist for this path segment, so create one.
        node[segment] = { [sym_next]: {} };
      }

      if (i === pathSegments.length - 1) {
        // This is the last path segment, so create a handler and add it to the current node.
        node[segment]![sym_handler] = createRouteHandler(routeHandlerParams, body);
        break;
      }

      // Update the node pointer to point to the next node.
      node = node[segment]![sym_next];
    }
  }

  /**
   * Retrieve the route handler for the given path from the store. Returns undefined if no such
   * route exists.
   */

  get(path: string) {
    let begin = 1;
    let end = path.indexOf('/', begin);
    let node = this._routeTree;
    let doubleWildcard: RouteTreeBranch = { [sym_next]: {} };
    let branch: RouteTreeBranch;
    let pathSegment: string;

    // Traverse the route tree, checking to see if a node for each path segment exists.
    while (end >= 0) {
      pathSegment = path.slice(begin, end);

      doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;
      branch = node[pathSegment] ?? node[sym_wildcard] ?? doubleWildcard;

      if (branch === doubleWildcard) {
        // The current branch points to a double wildcard handler only, so return it.
        return doubleWildcard[sym_handler];
      }

      // Update the node pointer to point to the next node.
      node = branch[sym_next];
      begin = end + 1;
      end = path.indexOf('/', begin);
    }

    pathSegment = path.slice(begin);

    doubleWildcard = node[sym_doubleWildcard] ?? doubleWildcard;

    // This is the final path segment, so retrieve the route handler from the current node that
    // best matches the path segment. A specific match is preferred over a wildcard match. A single
    // wildcard match is preferred over a double wildcard match.
    const routeHandler = node[pathSegment]?.[sym_handler]
      ?? node[sym_wildcard]?.[sym_handler]
      ?? doubleWildcard[sym_handler];

    return routeHandler;
  }
}
