// HTTP request methods.
export const HTTP_METHOD_DELETE    = 'DELETE';
export const HTTP_METHOD_GET       = 'GET';
export const HTTP_METHOD_HEAD      = 'HEAD';
export const HTTP_METHOD_OPTIONS   = 'OPTIONS';
export const HTTP_METHOD_PATCH     = 'PATCH';
export const HTTP_METHOD_POST      = 'POST';
export const HTTP_METHOD_PUT       = 'PUT';
export const HTTP_METHOD_TRACE     = 'TRACE';

// Standard HTTP headers.
export const HTTP_HEADER_COOKIE            = 'cookie';
export const HTTP_HEADER_SET_COOKIE        = 'set-cookie';
export const HTTP_HEADER_LOCATION          = 'location';
export const HTTP_HEADER_CONTENT_LENGTH    = 'content-length';
export const HTTP_HEADER_CONTENT_RANGE     = 'content-range';
export const HTTP_HEADER_CONTENT_TYPE      = 'content-type';
export const HTTP_HEADER_LAST_MODIFIED     = 'last-modified';
export const HTTP_HEADER_ACCEPT_RANGES     = 'accept-ranges';

// Defacto standard HTTP headers.
export const HTTP_HEADER_X_FORWARDED_FOR    = 'x-forwarded-for';
export const HTTP_HEADER_X_FORWARDED_PORT   = 'x-forwarded-port';
export const HTTP_HEADER_X_FORWARDED_PROTO  = 'x-forwarded-proto';

// HTTP status codes.
export const HTTP_STATUS_OK                       = 200;
export const HTTP_STATUS_PARTIAL_CONTENT          = 206;
export const HTTP_STATUS_FOUND                    = 302;
export const HTTP_STATUS_BAD_REQUEST              = 400;
export const HTTP_STATUS_NOT_FOUND                = 404;
export const HTTP_STATUS_TEAPOT                   = 418;
export const HTTP_STATUS_INTERNAL_SERVER_ERROR    = 500;
export const HTTP_STATUS_NOT_IMPLEMENTED          = 501;

// Default options for instances of RouteMap.
export const ROUTE_MAP_DEFAULT_BASE_PATH        = '';
export const ROUTE_MAP_DEFAULT_PATH             = '/';
export const ROUTE_MAP_DEFAULT_TRAILING_SLASH   = null;
export const ROUTE_MAP_DEFAULT_TRUST_PROXY      = true;

// Default options for instances of TuftServer and TuftSecureServer.
export const TUFT_SERVER_DEFAULT_HOST = '127.0.0.1';
export const TUFT_SERVER_DEFAULT_PORT = 0;

// Default HTTP status for responses.
export const DEFAULT_HTTP_STATUS = HTTP_STATUS_OK;
export const DEFAULT_RESPONSE_BODY = 'OK';

// Default options for the bodyParser pre-handler.
export const DEFAULT_MAX_BODY_SIZE = 1_048_576; // in bytes
