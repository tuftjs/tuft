// Default options for instances of RouteMap
export const ROUTE_MAP_DEFAULT_BASE_PATH        = '';
export const ROUTE_MAP_DEFAULT_PATH             = '/';
export const ROUTE_MAP_DEFAULT_TRAILING_SLASH   = null;

// Default options for instances of TuftServer and TuftSecureServer
export const TUFT_SERVER_DEFAULT_HOST = 'localhost';
export const TUFT_SERVER_DEFAULT_PORT = 0;

// HTTP/2 request methods
export const HTTP2_METHOD_DELETE    = 'DELETE';
export const HTTP2_METHOD_GET       = 'GET';
export const HTTP2_METHOD_HEAD      = 'HEAD';
export const HTTP2_METHOD_OPTIONS   = 'OPTIONS';
export const HTTP2_METHOD_PATCH     = 'PATCH';
export const HTTP2_METHOD_POST      = 'POST';
export const HTTP2_METHOD_PUT       = 'PUT';
export const HTTP2_METHOD_TRACE     = 'TRACE';

// HTTP/2 headers
export const HTTP2_HEADER_STATUS            = ':status';
export const HTTP2_HEADER_METHOD            = ':method';
export const HTTP2_HEADER_PATH              = ':path';
export const HTTP2_HEADER_SCHEME            = ':scheme';
export const HTTP2_HEADER_CONTENT_LENGTH    = 'content-length';
export const HTTP2_HEADER_CONTENT_TYPE      = 'content-type';
export const HTTP2_HEADER_COOKIE            = 'cookie';
export const HTTP2_HEADER_SET_COOKIE        = 'set-cookie';
export const HTTP2_HEADER_LOCATION          = 'location';

// Default options for bodyParserPlugin
export const DEFAULT_MAX_BODY_SIZE = 1_048_576; // in bytes
