import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { Stats } from 'fs';
import type { TuftContextOptions } from './context';
import type {
  TuftRoute,
  TuftResponse,
  TuftHandler,
  TuftPreHandler,
  TuftResponder,
} from './route-map';
import { constants } from 'http2';
import { createTuftContext } from './context';
import { httpErrorCodes, HttpError } from './utils';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_LOCATION,
  HTTP2_HEADER_LAST_MODIFIED,
} from './constants';

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} = constants;

const EMPTY_ARRAY: [] = [];

Object.freeze(EMPTY_ARRAY);

/**
 * Accepts an object containing route properties and returns a function that is capable of handling
 * that route. The returned function is a bound version of one of the response handlers, with the
 * specific properties of the provided route passed as arguments.
 */

export function createResponseHandler(route: TuftRoute) {
  const { response, params } = route;

  const preHandlers = route.preHandlers ?? EMPTY_ARRAY;
  const responders = route.responders ?? EMPTY_ARRAY;
  const options = { params };

  if (typeof response === 'function') {
    return handleResponseHandler.bind(null, response, preHandlers, responders, options);
  }

  if (typeof response.json === 'object') {
    // Serialize the provided value in advance so that it doesn't get serialized for every request.
    response.json = JSON.stringify(response.json);
  }

  if (preHandlers.length > 0) {
    // There are pre-handlers, so a bound handleResponseHandler must be returned.
    return handleResponseHandler.bind(
      null,
      returnResponse.bind(null, response),
      preHandlers,
      responders,
      options,
    );
  }

  // There are no pre-handlers, so the response object can be handled directly.
  return handleResponseObject.bind(null, response, responders, {});
}

/**
 * Returns the passed response object.
 */

export function returnResponse(response: TuftResponse) {
  return response;
}

/**
 * Passes the provided response object to the provided responder functions. If all the responder
 * functions return the same response object, it is then passed to 'handleUnknownResponse'.
 */

export async function handleResponseObject(
  response: TuftResponse,
  responders: TuftResponder[],
  outgoingHeaders: OutgoingHttpHeaders,
  stream: ServerHttp2Stream,
) {
  for (let i = 0; i < responders.length; i++) {
    const responder = responders[i];

    if (await responder(response, stream, outgoingHeaders) !== response) {
      return;
    }
  }

  handleUnknownResponse(response, stream, outgoingHeaders);
}

/**
 * Handles the following four functions:
 *
 * 1. Create an instance of TuftContext using the provided options.
 * 2. Call each of the provided pre-handlers. If a pre-handler returns a response object, then stop
 *    further execution of any remaining pre-handlers.
 * 3. If a response object was not returned by a pre-handler, then call the provided response
 *    handler.
 * 4. Pass the returned response object to the provided responder functions. If all the responder
 *    functions return the same response object, it is then passed to 'handleUnknownResponse'.
 */

export async function handleResponseHandler(
  handler: TuftHandler,
  preHandlers: TuftPreHandler[],
  responders: TuftResponder[],
  contextOptions: TuftContextOptions,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  const t = createTuftContext(stream, headers, contextOptions);

  let response: TuftResponse | void;

  for (let i = 0; i < preHandlers.length && response === undefined; i++) {
    const preHandler = preHandlers[i];
    response = await preHandler(t);
  }

  if (response === undefined) {
    response = await handler(t);
  }

  if (typeof response !== 'object' || response === null) {
    throw TypeError('\'' + response + '\' is not a valid Tuft response object.');
  }

  for (let i = 0; i < responders.length; i++) {
    const responder = responders[i];

    if (await responder(response, stream, t.outgoingHeaders) !== response) {
      return;
    }
  }

  handleUnknownResponse(response, stream, t.outgoingHeaders);
}

/**
 * Determines which of the built-in responder functions to call based on the properties present
 * in the provided response object.
 */

export function handleUnknownResponse(
  response: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const { error, redirect, raw, text, html, json, file, status } = response;

  if (error) {
    handleHttpErrorResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (redirect) {
    handleRedirectResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (raw) {
    handleBufferResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (text) {
    handleTextResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (html) {
    handleHtmlResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (json) {
    handleJsonResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (file) {
    handleFileResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (status) {
    handleStatusResponse(response, stream, outgoingHeaders);
    return;
  }

  // No valid properties were found, so respond with a '200 OK' status code and end the stream.
  stream.respond({
    [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
  }, { endStream: true });
}

/**
 * Responds with an HTTP error status code based on the provided string.
 */

export function handleHttpErrorResponse(
  { error }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const status = httpErrorCodes[error as HttpError] ?? HTTP_STATUS_BAD_REQUEST;
  outgoingHeaders[HTTP2_HEADER_STATUS] = status;

  stream.respond(outgoingHeaders, { endStream: true });
}

/**
 * Responds by redirecting the client to the provided path or URI.
 */

export function handleRedirectResponse(
  { redirect }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_STATUS] = HTTP_STATUS_FOUND;
  outgoingHeaders[HTTP2_HEADER_LOCATION] = redirect;
  stream.respond(outgoingHeaders, { endStream: true });
}

/**
 * Responds with the provided value as a buffer and 'content-type' set to
 * 'application/octet-stream'.
 */

export function handleBufferResponse(
  { raw, status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const body = raw as Buffer;

  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = 'application/octet-stream';
  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = body.length;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  stream.respond(outgoingHeaders);
  stream.end(body);
}

/**
 * Responds with the provided value as a string and 'content-type' set to 'text/plain'.
 */

export function handleTextResponse(
  { text, status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const body = typeof text === 'string' ? text : (text as number | boolean).toString();

  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = 'text/plain; charset=utf-8';
  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = body.length;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  stream.respond(outgoingHeaders);
  stream.end(body);
}

/**
 * Responds with the provided value as a string and 'content-type' set to 'text/html'.
 */

export function handleHtmlResponse(
  { html, status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const body = html as string;

  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = 'text/html; charset=utf-8';
  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = body.length;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  stream.respond(outgoingHeaders);
  stream.end(body);
}

/**
 * Responds with the provided value as a JSON string and 'content-type' set to 'application/json'.
 */

export function handleJsonResponse(
  { json, status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const body = typeof json === 'string' ? json : JSON.stringify(json);

  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = 'application/json; charset=utf-8';
  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = body.length;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  stream.respond(outgoingHeaders);
  stream.end(body);
}

/**
 * Responds with a file, where the provided value is a file pathname.
 */

export function handleFileResponse(
  { file, status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = 'application/octet-stream';

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  const options = {
    statCheck,
    onError: onError.bind(null, stream),
  };

  stream.respondWithFile(file as string, outgoingHeaders, options);
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
 * Responds with the provided number as an HTTP status code.
 */

export function handleStatusResponse(
  { status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  stream.respond(outgoingHeaders, { endStream: true });
}
