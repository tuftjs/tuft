import type { TuftContextOptions } from './context';
import type {
  TuftRoute,
  TuftResponse,
  TuftHandler,
  TuftPrehandler,
  TuftResponder,
} from './route-map';
import type { IncomingMessage, ServerResponse } from 'http';

import { createTuftContext } from './context';
import { httpErrorCodes } from './utils';
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
  DEFAULT_RESPONSE_BODY,
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

  const preHandlers = route.prehandlers ?? EMPTY_ARRAY;
  const responders = route.responders ?? EMPTY_ARRAY;
  const options = { params };

  let handler: TuftHandler;

  if (typeof response === 'object' && response !== null && !Buffer.isBuffer(response)) {
    if (typeof response.json === 'object') {
      // Serialize the provided value so that it doesn't get serialized on every request.
      response.json = JSON.stringify(response.json);
    }
    handler = returnResponse.bind(null, response);
  }

  else if (typeof response === 'function') {
    handler = response;
  }

  else {
    const err = Error(`'${response}' is not a valid response handler or response object.`);
    console.error(err);
    return process.exit(1);
  }

  return handleResponse.bind(null, handler, preHandlers, responders, options);
}

/**
 * An identity function for the purpose of turning a response object into a response handler.
 */

export function returnResponse(response: TuftResponse) {
  return response;
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

export async function handleResponse(
  handler: TuftHandler,
  prehandlers: TuftPrehandler[],
  responders: TuftResponder[],
  contextOptions: TuftContextOptions,
  request: IncomingMessage,
  response: ServerResponse,
) {
  const t = createTuftContext(request, response, contextOptions);

  let tuftResponse: TuftResponse | void;

  for (let i = 0; i < prehandlers.length && tuftResponse === undefined; i++) {
    const preHandler = prehandlers[i];
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

  const { status, error, redirect, raw, text, html, json, file } = tuftResponse;

  if (text !== undefined) {
    // The response body is text.
    const body = (text as string | number | boolean).toString();

    response.writeHead(status !== undefined ? status : DEFAULT_HTTP_STATUS, {
      // Set headers for text content type.
      [HTTP_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
      [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body),
    });

    // End the response.
    response.end(body);
  }

  else if (json !== undefined) {
    // The response body is JSON.
    const body = typeof json === 'string' ? json : JSON.stringify(json);

    response.writeHead(status !== undefined ? status : DEFAULT_HTTP_STATUS, {
      // Set headers for JSON content type.
      [HTTP_HEADER_CONTENT_TYPE]: 'application/json; charset=UTF-8',
      [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body),
    });

    // End the response.
    response.end(body);
  }

  else if (html !== undefined) {
    // The response body is HTML.
    const body = html;

    response.writeHead(status !== undefined ? status : DEFAULT_HTTP_STATUS, {
      // Set headers for HTML content type.
      [HTTP_HEADER_CONTENT_TYPE]: 'text/html; charset=UTF-8',
      [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body),
    });

    // End the response.
    response.end(body);
  }

  else if (raw !== undefined) {
    // The response body is a buffer.
    const body = raw;

    response.writeHead(status !== undefined ? status : DEFAULT_HTTP_STATUS, {
      // Set headers for text content type.
      [HTTP_HEADER_CONTENT_TYPE]: 'application/octet-stream',
      [HTTP_HEADER_CONTENT_LENGTH]: body.length,
    });

    // End the response.
    response.end(body);
  }

  else if (file !== undefined) {
    // The response body is a file.
    const { offset = 0, length } = tuftResponse;
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
      response.writeHead(status !== undefined ? status : DEFAULT_HTTP_STATUS, {
        [HTTP_HEADER_CONTENT_TYPE]: contentType,
        [HTTP_HEADER_LAST_MODIFIED]: modified,
        [HTTP_HEADER_ACCEPT_RANGES]: range,
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

  else if (redirect !== undefined) {
    // Redirect to the provided location.

    // Set the status code to '302 Found'.
    response.writeHead(HTTP_STATUS_FOUND, {
      // Set the 'location' header to point to the redirect URL.
      [HTTP_HEADER_LOCATION]: redirect
    });

    // End the response.
    response.end();
  }

  else if (error !== undefined) {
    // Respond with an HTTP error status code.
    const errorCode = httpErrorCodes[error];
    const status = errorCode !== undefined ? errorCode : HTTP_STATUS_BAD_REQUEST;
    const body = STATUS_CODES[status] as string;

    // Set the error status code.
    response.writeHead(status, {
      // Set headers for text content type.
      [HTTP_HEADER_CONTENT_TYPE]: 'text/plain; charset=UTF-8',
      [HTTP_HEADER_CONTENT_LENGTH]: Buffer.byteLength(body),
    });

    // End the response.
    response.end(body);
  }

  else if (status !== undefined) {
    response.statusCode = status;
    response.end();
  }

  else {
    // No valid response properties were found, so send the default response.
    response.statusCode = DEFAULT_HTTP_STATUS;
    response.end(DEFAULT_RESPONSE_BODY);
  }
}
