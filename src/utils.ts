import { constants } from 'http2';

type Callback = (err?: Error | null, ...args: any[]) => void;

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

export const supportedRequestMethods = [
  constants.HTTP2_METHOD_DELETE,
  constants.HTTP2_METHOD_GET,
  constants.HTTP2_METHOD_HEAD,
  constants.HTTP2_METHOD_OPTIONS,
  constants.HTTP2_METHOD_PATCH,
  constants.HTTP2_METHOD_POST,
  constants.HTTP2_METHOD_PUT,
  constants.HTTP2_METHOD_TRACE,
];

export const httpErrorCodes = {
  'BAD_REQUEST':                        constants.HTTP_STATUS_BAD_REQUEST,
  'PAYMENT_REQUIRED':                   constants.HTTP_STATUS_PAYMENT_REQUIRED,
  'FORBIDDEN':                          constants.HTTP_STATUS_FORBIDDEN,
  'NOT_FOUND':                          constants.HTTP_STATUS_NOT_FOUND,
  'METHOD_NOT_ALLOWED':                 constants.HTTP_STATUS_METHOD_NOT_ALLOWED,
  'NOT_ACCEPTABLE':                     constants.HTTP_STATUS_NOT_ACCEPTABLE,
  'PROXY_AUTHENTICATION_REQUIRED':      constants.HTTP_STATUS_PROXY_AUTHENTICATION_REQUIRED,
  'REQUEST_TIMEOUT':                    constants.HTTP_STATUS_REQUEST_TIMEOUT,
  'STATUS_CONFLICT':                    constants.HTTP_STATUS_CONFLICT,
  'STATUS_GONE':                        constants.HTTP_STATUS_GONE,
  'LENGTH_REQUIRED':                    constants.HTTP_STATUS_LENGTH_REQUIRED,
  'PRECONDITION_FAILED':                constants.HTTP_STATUS_PRECONDITION_FAILED,
  'PAYLOAD_TOO_LARGE':                  constants.HTTP_STATUS_PAYLOAD_TOO_LARGE,
  'URI_TOO_LONG':                       constants.HTTP_STATUS_URI_TOO_LONG,
  'UNSUPPORTED_MEDIA_TYPE':             constants.HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE,
  'RANGE_NOT_SATISFIABLE':              constants.HTTP_STATUS_RANGE_NOT_SATISFIABLE,
  'EXPECTATION_FAILED':                 constants.HTTP_STATUS_EXPECTATION_FAILED,
  'TEAPOT':                             constants.HTTP_STATUS_TEAPOT,
  'MISDIRECTED_REQUEST':                constants.HTTP_STATUS_MISDIRECTED_REQUEST,
  'UNPROCESSABLE_ENTITY':               constants.HTTP_STATUS_UNPROCESSABLE_ENTITY,
  'LOCKED':                             constants.HTTP_STATUS_LOCKED,
  'FAILED_DEPENDENCY':                  constants.HTTP_STATUS_FAILED_DEPENDENCY,
  'UPGRADE_REQUIRED':                   constants.HTTP_STATUS_UPGRADE_REQUIRED,
  'PRECONDITION_REQUIRED':              constants.HTTP_STATUS_PRECONDITION_REQUIRED,
  'TOO_MANY_REQUESTS':                  constants.HTTP_STATUS_TOO_MANY_REQUESTS,
  'REQUEST_HEADER_FIELDS_TOO_LARGE':    constants.HTTP_STATUS_REQUEST_HEADER_FIELDS_TOO_LARGE,
  'UNAVAILABLE_FOR_LEGAL_REASONS':      constants.HTTP_STATUS_UNAVAILABLE_FOR_LEGAL_REASONS,
  'INTERNAL_SERVER_ERROR':              constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
  'NOT_IMPLEMENTED':                    constants.HTTP_STATUS_NOT_IMPLEMENTED,
  'BAD_GATEWAY':                        constants.HTTP_STATUS_BAD_GATEWAY,
  'SERVICE_UNAVAILABLE':                constants.HTTP_STATUS_SERVICE_UNAVAILABLE,
  'GATEWAY_TIMEOUT':                    constants.HTTP_STATUS_GATEWAY_TIMEOUT,
  'HTTP_VERSION_NOT_SUPPORTED':         constants.HTTP_STATUS_HTTP_VERSION_NOT_SUPPORTED,
  'VARIANT_ALSO_NEGOTIATES':            constants.HTTP_STATUS_VARIANT_ALSO_NEGOTIATES,
  'INSUFFICIENT_STORAGE':               constants.HTTP_STATUS_INSUFFICIENT_STORAGE,
  'LOOP_DETECTED':                      constants.HTTP_STATUS_LOOP_DETECTED,
  'NOT_EXTENDED':                       constants.HTTP_STATUS_NOT_EXTENDED,
  'NETWORK_AUTHENTICATION_REQUIRED':    constants.HTTP_STATUS_NETWORK_AUTHENTICATION_REQUIRED,
};

/**
 * A convenience function for converting a callback-based function to a promise-based function.
 * Accepts a function that receives an error-first callback as its first and only argument. If the
 * callback is then invoked with an error as its first argument, the promise will reject with that
 * error. Otherwise, the promise will be resolved with any remaining arguments being returned as an
 * array.
 */

export function createPromise(fn: (callback: Callback) => void) {
  return new Promise<Error | any[]>((resolve, reject) => {
    const callback: Callback = (err, ...args) => {
      err ? reject(err) : resolve(args);
    };

    fn(callback);
  });
}
