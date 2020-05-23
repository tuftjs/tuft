import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { TuftRouteMap, TuftRoute } from './route-map';
import { createResponseHandler } from './response-handlers';
import { supportedRequestMethods } from './utils';

/**
 * Creates an instance of RouteStore for each supported HTTP request method, and adds each route in
 * the provided route map to its corresponding store.
 */

export class RouteManager {
  private readonly _routes: { [method: string]: RouteStore } = {};

  constructor(routes: TuftRouteMap) {
    for (const method of supportedRequestMethods) {
      this._routes[method] = new RouteStore();
    }

    for (const [key, route] of routes) {
      const [method, path] = key.split(' ');

      this._routes[method].set(path, route);

      if (route.trailingSlash && !path.endsWith('/')) {
        // Add the same route, but with a trailing slash.
        this._routes[method].set(path + '/', route);
      }
    }
  }

  /**
   * Searches for and returns a response handler based on the provided method and path. Returns
   * undefined if no route exists.
   */

  find(method: string, path: string) {
    return this._routes[method].get(path);
  }
}

const symHandler         = Symbol('handler');
const symNext            = Symbol('next');
const symWildcard        = Symbol('wildcard');
const symDoubleWildcard  = Symbol('doubleWildcard');

type RouteTreeBranch = {
  [symHandler]?: (stream: ServerHttp2Stream, headers: IncomingHttpHeaders) => void | Promise<void>,
  [symNext]: RouteTreeNode,
};

type RouteTreeNode = Map<string | symbol, RouteTreeBranch>;

const wildcardRegexp = /{\*\*?}/;

/**
 * Stores response handlers in a tree data structure, where each branch of the tree represents a
 * path segment.
 */

export class RouteStore {
  private readonly _routeTree: RouteTreeNode = new Map();

  /**
   * Adds a response handler to the store, indexed by the given path.
   */

  set(path: string, route: TuftRoute) {
    const handlerParams = Object.create(route);

    const params: { [key: string]: string } = {};
    const pathSegments = path.split('/').slice(1);

    const doubleWildcardIndex = pathSegments.indexOf('{**}');

    if (doubleWildcardIndex >= 0) {
      // A double wildcard is present, so ignore any successive path segments.
      pathSegments.splice(doubleWildcardIndex + 1);
    }

    let i, node;

    // Iterate over the path segments, adding them as branches to the route tree.
    for (i = 0, node = this._routeTree; i < pathSegments.length; i++) {
      const str = pathSegments[i];

      let segment;

      if (str.startsWith('{') && str.endsWith('}')) {
        // This is a wildcard segment.
        if (!wildcardRegexp.test(str)) {
          // This wildcard segment contains a named parameter.
          params[i] = str.slice(1, str.length - 1);
        }

        // Index the wildcard segment using its corresponding symbol.
        segment = str === '{**}' ? symDoubleWildcard : symWildcard;
      }

      else {
        // This is not a wildcard segment, so index by the given path segment directly.
        segment = str;
      }

      const branch: RouteTreeBranch = node.get(segment) ?? { [symNext]: new Map() };

      if (!node.has(segment)) {
        // Add the newly created branch to the current node.
        node.set(segment, branch);
      }

      if (i === pathSegments.length - 1) {
        // This is the last path segment.
        if (Object.keys(params).length > 0) {
          // Update the response handler params to include the route params.
          handlerParams.params = params;
        }

        // Create a response handler and add it to the current branch.
        branch[symHandler] = createResponseHandler(handlerParams);
        break;
      }

      // Update the pointer so that it points to the next node.
      node = branch[symNext];
    }
  }

  /**
   * Retrieves the response handler for the given path from the store and returns it. Returns
   * undefined if there is no handler for the given path.
   */

  get(path: string) {
    let begin = 1;
    let end = path.indexOf('/', begin);
    let pathSegment: string;
    let doubleWildcard: RouteTreeBranch = { [symNext]: new Map() };
    let branch: RouteTreeBranch;
    let node: RouteTreeNode = this._routeTree;

    // Traverse the route tree, checking to see if a branch exists for each path segment.
    while (end >= 0) {
      pathSegment = path.slice(begin, end);

      doubleWildcard = node.get(symDoubleWildcard) ?? doubleWildcard;
      branch = node.get(pathSegment) ?? node.get(symWildcard) ?? doubleWildcard;

      if (branch === doubleWildcard) {
        // The current node only contains a double wildcard branch, so return its handler. If no
        // handler is present, then undefined will be returned, which is the expected behavior.
        return doubleWildcard[symHandler];
      }

      // Update the pointer to point to the next node.
      node = branch[symNext];
      begin = end + 1;
      end = path.indexOf('/', begin);
    }

    pathSegment = path.slice(begin);

    // This is the final path segment, so retrieve the response handler from the current node that
    // best matches the path segment according to the following rules:
    //   1. A specific match takes precedence over a single wildcard match.
    //   2. A single wildcard match takes precedence over a double wildcard match.
    //   3. If there is no double wildcard match for the current segment, use the value of
    //      the 'doubleWildcard' variable.
    const responseHandler = node.get(pathSegment)?.[symHandler]
      ?? node.get(symWildcard)?.[symHandler]
      ?? node.get(symDoubleWildcard)?.[symHandler]
      ?? doubleWildcard[symHandler];

    return responseHandler;
  }
}
