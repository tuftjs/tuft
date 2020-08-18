// HTTP request methods.
export const HTTP_METHOD_DELETE    = 'DELETE';
export const HTTP_METHOD_GET       = 'GET';
export const HTTP_METHOD_HEAD      = 'HEAD';
export const HTTP_METHOD_OPTIONS   = 'OPTIONS';
export const HTTP_METHOD_PATCH     = 'PATCH';
export const HTTP_METHOD_POST      = 'POST';
export const HTTP_METHOD_PUT       = 'PUT';
export const HTTP_METHOD_TRACE     = 'TRACE';

// HTTP headers.
export const HTTP_HEADER_COOKIE            = 'Cookie';
export const HTTP_HEADER_SET_COOKIE        = 'Set-Cookie';
export const HTTP_HEADER_LOCATION          = 'Location';
export const HTTP_HEADER_CONTENT_LENGTH    = 'Content-Length';
export const HTTP_HEADER_CONTENT_RANGE     = 'Content-Range';
export const HTTP_HEADER_CONTENT_TYPE      = 'Content-Type';
export const HTTP_HEADER_LAST_MODIFIED     = 'Last-Modified';
export const HTTP_HEADER_ACCEPT_RANGES     = 'Accept-Ranges';

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

// Default options for instances of TuftServer and TuftSecureServer.
export const TUFT_SERVER_DEFAULT_HOST = 'localhost';
export const TUFT_SERVER_DEFAULT_PORT = 0;

// Default options for the bodyParser pre-handler.
export const DEFAULT_MAX_BODY_SIZE = 1_048_576; // in bytes
