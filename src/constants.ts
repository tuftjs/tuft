// Default options for instances of RouteMap
export const ROUTE_MAP_DEFAULT_TRAILING_SLASH     = null;
export const ROUTE_MAP_DEFAULT_PARSE_COOKIES      = null;
export const ROUTE_MAP_DEFAULT_PARSE_JSON         = null;
export const ROUTE_MAP_DEFAULT_PARSE_BODY_LIMIT   = 10_485_760; // in bytes
export const ROUTE_MAP_DEFAULT_BASE_PATH          = '';
export const ROUTE_MAP_DEFAULT_PATH               = '/';
export const ROUTE_MAP_DEFAULT_ERROR_HANDLER      = null;

// Default options for instances of TuftServer and TuftSecureServer
export const HTTP2_SERVER_DEFAULT_HOST            = 'localhost';
export const HTTP2_SERVER_DEFAULT_PORT            = 3000;

// HTTP/2 request methods
export const HTTP2_METHOD_CONENCT                 = 'CONNECT';
export const HTTP2_METHOD_DELETE                  = 'DELETE';
export const HTTP2_METHOD_GET                     = 'GET';
export const HTTP2_METHOD_HEAD                    = 'HEAD';
export const HTTP2_METHOD_OPTIONS                 = 'OPTIONS';
export const HTTP2_METHOD_PATCH                   = 'PATCH';
export const HTTP2_METHOD_POST                    = 'POST';
export const HTTP2_METHOD_PUT                     = 'PUT';
export const HTTP2_METHOD_TRACE                   = 'TRACE';

// HTTP/2 headers
export const HTTP2_HEADER_STATUS                  = ':status';
export const HTTP2_HEADER_METHOD                  = ':method';
export const HTTP2_HEADER_PATH                    = ':path';
export const HTTP2_HEADER_SCHEME                  = ':scheme';
export const HTTP2_HEADER_CONTENT_LENGTH          = 'content-length';
export const HTTP2_HEADER_CONTENT_TYPE            = 'content-type';
export const HTTP2_HEADER_COOKIE                  = 'cookie';
export const HTTP2_HEADER_SET_COOKIE              = 'set-cookie';
export const HTTP2_HEADER_LOCATION                = 'location';

// HTTP status codes
export const HTTP_STATUS_OK                       = 200;
export const HTTP_STATUS_FOUND                    = 302;
export const HTTP_STATUS_METHOD_NOT_ALLOWED       = 405;
export const HTTP_STATUS_LENGTH_REQUIRED          = 411;
export const HTTP_STATUS_INTERNAL_SERVER_ERROR    = 500;
