import type { TuftContextOptions } from './context';
import type {
  TuftRoute,
  TuftResponse,
  TuftHandler,
  TuftPreHandler,
  TuftResponder,
} from './route-map';
import type { IncomingMessage, ServerResponse } from 'http';

import { createTuftContext } from './context';
import { httpErrorCodes, HttpError } from './utils';
import importedMimeTypes from './data/mime-types.json';
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
import { stat, createReadStream } from 'fs';
import { extname } from 'path';
import { STATUS_CODES } from 'http';

const EMPTY_ARRAY: [] = [];

Object.freeze(EMPTY_ARRAY);

const mimeTypes: { [key: string]: string } = importedMimeTypes;

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

  if (typeof tuftResponse !== 'object' || tuftResponse === null || Buffer.isBuffer(tuftResponse)) {
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
  const { status, error, redirect, raw, text, html, json, file } = tuftResponse;

  // Use default status code if one is not provided.
  response.statusCode = status ?? DEFAULT_HTTP_STATUS;

  if (text !== undefined) {
    handleTextResponse(text, response);
    return;
  }

  else if (html !== undefined) {
    handleHtmlResponse(html, response);
    return;
  }

  else if (json !== undefined) {
    handleJsonResponse(json, response);
    return;
  }

  else if (raw !== undefined) {
    handleBufferResponse(raw, response);
    return;
  }

  else if (file !== undefined) {
    const { offset, length } = tuftResponse;
    handleFileResponse(file, offset, length, response);
    return;
  }

  else if (redirect !== undefined) {
    handleRedirectResponse(redirect, response);
    return;
  }

  else if (error !== undefined) {
    handleHttpErrorResponse(error, response);
    return;
  }

  // No valid response properties were found, so end the response without sending a body.
  response.end();
}

/**
 * Responds with an HTTP error status code based on the provided string.
 */

export function handleHttpErrorResponse(
  error: HttpError,
  response: ServerResponse,
) {
  const status = httpErrorCodes[error] ?? HTTP_STATUS_BAD_REQUEST;
  const body = STATUS_CODES[status] as string;

  // Set the error status code.
  response.statusCode = status;

  // Set headers for text content type.
  response.setHeader(HTTP_HEADER_CONTENT_TYPE, 'text/plain; charset=UTF-8');
  response.setHeader(HTTP_HEADER_CONTENT_LENGTH, Buffer.byteLength(body));

  // End the response.
  response.end(body);
}

/**
 * Responds by redirecting the client to the provided path or URI.
 */

export function handleRedirectResponse(
  redirect: string,
  response: ServerResponse,
) {
  // Set the status code to '302 Found'.
  response.statusCode = HTTP_STATUS_FOUND;

  // Set the 'location' header to point to the redirect URL.
  response.setHeader(HTTP_HEADER_LOCATION, redirect);

  // End the response.
  response.end();
}

/**
 * Responds with the provided value as a buffer and 'content-type' set to
 * 'application/octet-stream'.
 */

export function handleBufferResponse(
  raw: Buffer,
  response: ServerResponse,
) {
  const body = raw;

  // Set headers for text content type.
  response.setHeader(HTTP_HEADER_CONTENT_TYPE, 'application/octet-stream');
  response.setHeader(HTTP_HEADER_CONTENT_LENGTH, body.length);

  // End the response.
  response.end(body);
}

/**
 * Responds with the provided value as a string and 'content-type' set to 'text/plain'.
 */

export function handleTextResponse(
  text: string | number | boolean,
  response: ServerResponse,
) {
  const body = (text as string | number | boolean).toString();

  // Set headers for text content type.
  response.setHeader(HTTP_HEADER_CONTENT_TYPE, 'text/plain; charset=UTF-8');
  response.setHeader(HTTP_HEADER_CONTENT_LENGTH, Buffer.byteLength(body));

  // End the response.
  response.end(body);
}

/**
 * Responds with the provided value as a string and 'content-type' set to 'text/html'.
 */

export function handleHtmlResponse(
  html: string,
  response: ServerResponse,
) {
  const body = html;

  // Set headers for HTML content type.
  response.setHeader(HTTP_HEADER_CONTENT_TYPE, 'text/html; charset=UTF-8');
  response.setHeader(HTTP_HEADER_CONTENT_LENGTH, Buffer.byteLength(body));

  // End the response.
  response.end(body);
}

/**
 * Responds with the provided value as a JSON string and 'content-type' set to 'application/json'.
 */

export function handleJsonResponse(
  json: string | { [key in string | number]: any },
  response: ServerResponse,
) {
  const body = typeof json === 'string' ? json : JSON.stringify(json);

  // Set headers for JSON content type.
  response.setHeader(HTTP_HEADER_CONTENT_TYPE, 'application/json; charset=UTF-8');
  response.setHeader(HTTP_HEADER_CONTENT_LENGTH, Buffer.byteLength(body));

  // End the response.
  response.end(body);
}

/**
 * Responds with a file, where the provided value is a file pathname.
 */

export function handleFileResponse(
  file: string,
  offset: number = 0,
  length: number | undefined,
  response: ServerResponse,
) {
  stat(file as string, (err, stats) => {
    if (err) {
      response.emit('error', err);
      return;
    }

    const headers = response.getHeaders();

    const modified = headers[HTTP_HEADER_LAST_MODIFIED] ?? stats.mtime.toUTCString();
    const range = headers[HTTP_HEADER_ACCEPT_RANGES] ?? 'none';

    const contentType = headers[HTTP_HEADER_CONTENT_TYPE]
      ?? mimeTypes[extname(file as string)]
      ?? 'application/octet-stream';

    // Set headers for file response.
    response.setHeader(HTTP_HEADER_CONTENT_TYPE, contentType);
    response.setHeader(HTTP_HEADER_LAST_MODIFIED, modified);
    response.setHeader(HTTP_HEADER_ACCEPT_RANGES, range);

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
