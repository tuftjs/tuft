import type { IncomingMessage, ServerResponse } from 'http';
import type { TuftContextOptions } from './context';
import type {
  TuftRoute,
  TuftResponse,
  TuftHandler,
  TuftPreHandler,
  TuftResponder,
} from './route-map';

import { stat, createReadStream } from 'fs';
import { createTuftContext } from './context';
import { httpErrorCodes, HttpError } from './utils';
import {
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_CONTENT_LENGTH,
  HTTP_HEADER_LOCATION,
  HTTP_HEADER_LAST_MODIFIED,
  HTTP_HEADER_ACCEPT_RANGES,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_BAD_REQUEST,
  DEFAULT_HTTP_STATUS,
} from './constants';

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
  return handleResponseObject.bind(null, response, responders);
}

/**
 * An identity function for the purpose of turning a response object into a response handler.
 */

export function returnResponse(response: TuftResponse) {
  return response;
}

/**
 * Passes the provided response object to the provided responder functions. If all the responder
 * functions return the same response object, it is then passed to 'handleUnknownResponse'.
 */

export async function handleResponseObject(
  tuftResponse: TuftResponse,
  responders: TuftResponder[],
  _: IncomingMessage,
  response: ServerResponse,
) {
  for (let i = 0; i < responders.length; i++) {
    const responder = responders[i];

    if (await responder(tuftResponse, response) !== tuftResponse) {
      return;
    }
  }

  handleUnknownResponse(tuftResponse, response);
}

/**
 * Handles the following four operations:
 *   1. Create an instance of TuftContext using the provided options.
 *   2. Call each of the provided pre-handlers. If a pre-handler returns a response object, then
 *      stop further execution of any remaining pre-handlers.
 *   3. If a response object was not returned by a pre-handler, then call the provided response
 *      handler.
 *   4. Pass the returned response object to the provided responder functions. If all the responder
 *      functions return the same response object, it is then passed to 'handleUnknownResponse'.
 */

export async function handleResponseHandler(
  handler: TuftHandler,
  preHandlers: TuftPreHandler[],
  responders: TuftResponder[],
  contextOptions: TuftContextOptions,
  request: IncomingMessage,
  response: ServerResponse,
) {
  const t = createTuftContext(request, response, contextOptions);

  let tuftResponse: TuftResponse | void;

  for (let i = 0; i < preHandlers.length && tuftResponse === undefined; i++) {
    const preHandler = preHandlers[i];
    tuftResponse = await preHandler(t);
  }

  if (tuftResponse === undefined) {
    tuftResponse = await handler(t);
  }

  if (typeof tuftResponse !== 'object' || tuftResponse === null) {
    throw TypeError('\'' + tuftResponse + '\' is not a valid Tuft response object.');
  }

  for (let i = 0; i < responders.length; i++) {
    const responder = responders[i];

    if (await responder(tuftResponse, response) !== tuftResponse) {
      return;
    }
  }

  handleUnknownResponse(tuftResponse, response);
}

/**
 * Determines which of the built-in responder functions to call based on the properties present
 * in the provided response object.
 */

export function handleUnknownResponse(
  tuftResponse: TuftResponse,
  response: ServerResponse,
) {
  const { error, redirect, raw, text, html, json, file, status } = tuftResponse;

  if (error) {
    handleHttpErrorResponse(tuftResponse, response);
    return;
  }

  if (redirect) {
    handleRedirectResponse(tuftResponse, response);
    return;
  }

  if (raw) {
    handleBufferResponse(tuftResponse, response);
    return;
  }

  if (text) {
    handleTextResponse(tuftResponse, response);
    return;
  }

  if (html) {
    handleHtmlResponse(tuftResponse, response);
    return;
  }

  if (json) {
    handleJsonResponse(tuftResponse, response);
    return;
  }

  if (file) {
    handleFileResponse(tuftResponse, response);
    return;
  }

  if (status) {
    handleStatusResponse(tuftResponse, response);
    return;
  }

  // No valid properties were found, so respond with a '200 OK' status code and end the stream.
  response
    .writeHead(DEFAULT_HTTP_STATUS)
    .end();
}

/**
 * Responds with an HTTP error status code based on the provided string.
 */

export function handleHttpErrorResponse(
  { error }: TuftResponse,
  response: ServerResponse,
) {
  const status = httpErrorCodes[error as HttpError] ?? HTTP_STATUS_BAD_REQUEST;

  response
    .writeHead(status)
    .end();
}

/**
 * Responds by redirecting the client to the provided path or URI.
 */

export function handleRedirectResponse(
  { redirect }: TuftResponse,
  response: ServerResponse,
) {
  response
    .writeHead(HTTP_STATUS_FOUND, {
      [HTTP_HEADER_LOCATION]: redirect as string,
    })
    .end();
}

/**
 * Responds with the provided value as a buffer and 'content-type' set to
 * 'application/octet-stream'.
 */

export function handleBufferResponse(
  { raw, status }: TuftResponse,
  response: ServerResponse,
) {
  const body = raw as Buffer;

  response
    .writeHead(status ?? DEFAULT_HTTP_STATUS, {
      [HTTP_HEADER_CONTENT_TYPE]: 'application/octet-stream',
      [HTTP_HEADER_CONTENT_LENGTH]: body.length,
    })
    .end(body);
}

/**
 * Responds with the provided value as a string and 'content-type' set to 'text/plain'.
 */

export function handleTextResponse(
  { text, status }: TuftResponse,
  response: ServerResponse,
) {
  const body = (text as string | number | boolean).toString();

  response
    .writeHead(status ?? DEFAULT_HTTP_STATUS, {
      [HTTP_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
      [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body),
    })
    .end(body);
}

/**
 * Responds with the provided value as a string and 'content-type' set to 'text/html'.
 */

export function handleHtmlResponse(
  { html, status }: TuftResponse,
  response: ServerResponse,
) {
  const body = html as string;

  response
    .writeHead(status ?? DEFAULT_HTTP_STATUS, {
      [HTTP_HEADER_CONTENT_TYPE]: 'text/html; charset=UTF-8',
      [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body),
    })
    .end(body);
}

/**
 * Responds with the provided value as a JSON string and 'content-type' set to 'application/json'.
 */

export function handleJsonResponse(
  { json, status }: TuftResponse,
  response: ServerResponse,
) {
  const body = typeof json === 'string' ? json : JSON.stringify(json);

  response
    .writeHead(status ?? DEFAULT_HTTP_STATUS, {
      [HTTP_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
      [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body),
    })
    .end(body);
}

/**
 * Responds with a file, where the provided value is a file pathname.
 */

export function handleFileResponse(
  { file, status, offset = 0, length }: TuftResponse,
  response: ServerResponse,
) {
  stat(file as string, (err, stats) => {
    if (err) {
      response.emit('error', err);
      return;
    }

    const headers = response.getHeaders();

    response.writeHead(status ?? DEFAULT_HTTP_STATUS, {
      [HTTP_HEADER_CONTENT_TYPE]: headers[HTTP_HEADER_CONTENT_TYPE] ?? 'application/octet-stream',
      [HTTP_HEADER_ACCEPT_RANGES]: headers[HTTP_HEADER_ACCEPT_RANGES] ?? 'none',
      [HTTP_HEADER_LAST_MODIFIED]: headers[HTTP_HEADER_LAST_MODIFIED] ?? stats.mtime.toUTCString(),
    });

    const options: {
      start: number,
      end?: number,
    } = {
      start: offset,
    };

    if (length) {
      options.end = offset + length;
    }

    const stream = createReadStream(file as string, options);
    stream.pipe(response);
  });
}

/**
 * Responds with the provided number as an HTTP status code.
 */

export function handleStatusResponse(
  { status }: TuftResponse,
  response: ServerResponse,
) {
  response
    .writeHead(status as number)
    .end();
}
