import type { OutgoingHttpHeaders, ServerHttp2Stream } from 'http2';
import type { Stats } from 'fs';
import { constants } from 'http2';
import { HTTP2_HEADER_LAST_MODIFIED, HTTP2_HEADER_STATUS } from './constants';

const {
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_GET,
  HTTP2_METHOD_HEAD,
  HTTP2_METHOD_OPTIONS,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
  HTTP2_METHOD_TRACE,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_PAYMENT_REQUIRED,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_METHOD_NOT_ALLOWED,
  HTTP_STATUS_NOT_ACCEPTABLE,
  HTTP_STATUS_PROXY_AUTHENTICATION_REQUIRED,
  HTTP_STATUS_REQUEST_TIMEOUT,
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_GONE,
  HTTP_STATUS_LENGTH_REQUIRED,
  HTTP_STATUS_PRECONDITION_FAILED,
  HTTP_STATUS_PAYLOAD_TOO_LARGE,
  HTTP_STATUS_URI_TOO_LONG,
  HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE,
  HTTP_STATUS_RANGE_NOT_SATISFIABLE,
  HTTP_STATUS_EXPECTATION_FAILED,
  HTTP_STATUS_TEAPOT,
  HTTP_STATUS_MISDIRECTED_REQUEST,
  HTTP_STATUS_UNPROCESSABLE_ENTITY,
  HTTP_STATUS_LOCKED,
  HTTP_STATUS_FAILED_DEPENDENCY,
  HTTP_STATUS_UPGRADE_REQUIRED,
  HTTP_STATUS_PRECONDITION_REQUIRED,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  HTTP_STATUS_REQUEST_HEADER_FIELDS_TOO_LARGE,
  HTTP_STATUS_UNAVAILABLE_FOR_LEGAL_REASONS,
  HTTP_STATUS_INTERNAL_SERVER_ERROR ,
  HTTP_STATUS_NOT_IMPLEMENTED,
  HTTP_STATUS_BAD_GATEWAY,
  HTTP_STATUS_SERVICE_UNAVAILABLE,
  HTTP_STATUS_GATEWAY_TIMEOUT,
  HTTP_STATUS_HTTP_VERSION_NOT_SUPPORTED,
  HTTP_STATUS_VARIANT_ALSO_NEGOTIATES,
  HTTP_STATUS_INSUFFICIENT_STORAGE,
  HTTP_STATUS_LOOP_DETECTED,
  HTTP_STATUS_NOT_EXTENDED,
  HTTP_STATUS_NETWORK_AUTHENTICATION_REQUIRED,
} = constants;

export type HttpError =
  'BAD_REQUEST' |
  'PAYMENT_REQUIRED' |
  'FORBIDDEN' |
  'NOT_FOUND' |
  'METHOD_NOT_ALLOWED' |
  'NOT_ACCEPTABLE' |
  'PROXY_AUTHENTICATION_REQUIRED' |
  'REQUEST_TIMEOUT' |
  'STATUS_CONFLICT' |
  'STATUS_GONE' |
  'LENGTH_REQUIRED' |
  'PRECONDITION_FAILED' |
  'PAYLOAD_TOO_LARGE' |
  'URI_TOO_LONG' |
  'UNSUPPORTED_MEDIA_TYPE' |
  'RANGE_NOT_SATISFIABLE' |
  'EXPECTATION_FAILED' |
  'TEAPOT' |
  'MISDIRECTED_REQUEST' |
  'UNPROCESSABLE_ENTITY' |
  'LOCKED' |
  'FAILED_DEPENDENCY' |
  'UPGRADE_REQUIRED' |
  'PRECONDITION_REQUIRED' |
  'TOO_MANY_REQUESTS' |
  'REQUEST_HEADER_FIELDS_TOO_LARGE' |
  'UNAVAILABLE_FOR_LEGAL_REASONS' |
  'INTERNAL_SERVER_ERROR' |
  'NOT_IMPLEMENTED' |
  'BAD_GATEWAY' |
  'SERVICE_UNAVAILABLE' |
  'GATEWAY_TIMEOUT' |
  'HTTP_VERSION_NOT_SUPPORTED' |
  'VARIANT_ALSO_NEGOTIATES' |
  'INSUFFICIENT_STORAGE' |
  'LOOP_DETECTED' |
  'NOT_EXTENDED' |
  'NETWORK_AUTHENTICATION_REQUIRED';

/**
 * Returns an array of strings, which represents a list of all the valid HTTP/2 request methods
 * that the application supports.
 */

export function getSupportedRequestMethods() {
  return [
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

export function getHttpErrorMap() {
  return {
    'BAD_REQUEST':                        HTTP_STATUS_BAD_REQUEST,
    'PAYMENT_REQUIRED':                   HTTP_STATUS_PAYMENT_REQUIRED,
    'FORBIDDEN':                          HTTP_STATUS_FORBIDDEN,
    'NOT_FOUND':                          HTTP_STATUS_NOT_FOUND,
    'METHOD_NOT_ALLOWED':                 HTTP_STATUS_METHOD_NOT_ALLOWED,
    'NOT_ACCEPTABLE':                     HTTP_STATUS_NOT_ACCEPTABLE,
    'PROXY_AUTHENTICATION_REQUIRED':      HTTP_STATUS_PROXY_AUTHENTICATION_REQUIRED,
    'REQUEST_TIMEOUT':                    HTTP_STATUS_REQUEST_TIMEOUT,
    'STATUS_CONFLICT':                    HTTP_STATUS_CONFLICT,
    'STATUS_GONE':                        HTTP_STATUS_GONE,
    'LENGTH_REQUIRED':                    HTTP_STATUS_LENGTH_REQUIRED,
    'PRECONDITION_FAILED':                HTTP_STATUS_PRECONDITION_FAILED,
    'PAYLOAD_TOO_LARGE':                  HTTP_STATUS_PAYLOAD_TOO_LARGE,
    'URI_TOO_LONG':                       HTTP_STATUS_URI_TOO_LONG,
    'UNSUPPORTED_MEDIA_TYPE':             HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE,
    'RANGE_NOT_SATISFIABLE':              HTTP_STATUS_RANGE_NOT_SATISFIABLE,
    'EXPECTATION_FAILED':                 HTTP_STATUS_EXPECTATION_FAILED,
    'TEAPOT':                             HTTP_STATUS_TEAPOT,
    'MISDIRECTED_REQUEST':                HTTP_STATUS_MISDIRECTED_REQUEST,
    'UNPROCESSABLE_ENTITY':               HTTP_STATUS_UNPROCESSABLE_ENTITY,
    'LOCKED':                             HTTP_STATUS_LOCKED,
    'FAILED_DEPENDENCY':                  HTTP_STATUS_FAILED_DEPENDENCY,
    'UPGRADE_REQUIRED':                   HTTP_STATUS_UPGRADE_REQUIRED,
    'PRECONDITION_REQUIRED':              HTTP_STATUS_PRECONDITION_REQUIRED,
    'TOO_MANY_REQUESTS':                  HTTP_STATUS_TOO_MANY_REQUESTS,
    'REQUEST_HEADER_FIELDS_TOO_LARGE':    HTTP_STATUS_REQUEST_HEADER_FIELDS_TOO_LARGE,
    'UNAVAILABLE_FOR_LEGAL_REASONS':      HTTP_STATUS_UNAVAILABLE_FOR_LEGAL_REASONS,
    'INTERNAL_SERVER_ERROR':              HTTP_STATUS_INTERNAL_SERVER_ERROR,
    'NOT_IMPLEMENTED':                    HTTP_STATUS_NOT_IMPLEMENTED,
    'BAD_GATEWAY':                        HTTP_STATUS_BAD_GATEWAY,
    'SERVICE_UNAVAILABLE':                HTTP_STATUS_SERVICE_UNAVAILABLE,
    'GATEWAY_TIMEOUT':                    HTTP_STATUS_GATEWAY_TIMEOUT,
    'HTTP_VERSION_NOT_SUPPORTED':         HTTP_STATUS_HTTP_VERSION_NOT_SUPPORTED,
    'VARIANT_ALSO_NEGOTIATES':            HTTP_STATUS_VARIANT_ALSO_NEGOTIATES,
    'INSUFFICIENT_STORAGE':               HTTP_STATUS_INSUFFICIENT_STORAGE,
    'LOOP_DETECTED':                      HTTP_STATUS_LOOP_DETECTED,
    'NOT_EXTENDED':                       HTTP_STATUS_NOT_EXTENDED,
    'NETWORK_AUTHENTICATION_REQUIRED':    HTTP_STATUS_NETWORK_AUTHENTICATION_REQUIRED,
  };
}

type DoneCallback = (err?: Error | null, ...args: any[]) => void;

/**
 * A convenience function for converting a callback-based function to a promise-based function.
 * Accepts a function that receives an error-first callback as its first and only argument. If the
 * callback is then invoked with an error as its first argument, the promise will reject with that
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

/**
 * Passed as an option to stream.respondWithFile() to add a 'last-modified' header to the response.
 */

export function statCheck(stat: Stats, headers: OutgoingHttpHeaders) {
  headers[HTTP2_HEADER_LAST_MODIFIED] = stat.mtime.toUTCString();
}

/**
 * Error handler to be passed as an option to stream.respondWithFile().
 */

export function onError(stream: ServerHttp2Stream, err: NodeJS.ErrnoException) {
  if (err.code === 'ENOENT') {
    stream.respond({
      [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND,
    });
  }

  else {
    stream.respond({
      [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
    });
  }

  stream.end();
  stream.emit('error', err);
}

/**
 * Flattens two-dimensional arrays. Required to support Node v10.x, which does not implement
 * Array.prototype.flat().
 */

export function arrayFlat2D(arr: any[]): any[] {
  return arr.reduce((acc, val) => acc.concat(val), []);
}
