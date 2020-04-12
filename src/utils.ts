import {
  HTTP2_METHOD_CONENCT,
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_GET,
  HTTP2_METHOD_HEAD,
  HTTP2_METHOD_OPTIONS,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
  HTTP2_METHOD_TRACE,
} from './constants';

/**
 * Returns an array of strings, which represents a list of all the valid HTTP/2 request methods
 * that the application accepts.
 */

export function getValidRequestMethods() {
  return [
    HTTP2_METHOD_CONENCT,
    HTTP2_METHOD_DELETE,
    HTTP2_METHOD_GET,
    HTTP2_METHOD_HEAD,
    HTTP2_METHOD_OPTIONS,
    HTTP2_METHOD_PATCH,
    HTTP2_METHOD_POST,
    HTTP2_METHOD_PUT,
    HTTP2_METHOD_TRACE,
  ];
}

type DoneCallback = (err?: Error | null, ...args: any[]) => void;

/**
 * A convenience function for converting a callback-based function to a promise-based function.
 * Accepts a function that receives an error-first callback as its first and only argument. If the
 * callback is then called with an error as its first argument, the promise will reject with that
 * error. Otherwise, the promise will be resolved with any remaining arguments being returned as an
 * array.
 */

export function createPromise(fn: (callback: DoneCallback) => void) {
  return new Promise((resolve, reject) => {
    const callback: DoneCallback = (err, ...args) => {
      err ? reject(err) : resolve(args);
    };

    fn(callback);
  });
}
