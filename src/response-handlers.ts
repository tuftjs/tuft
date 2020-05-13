import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
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
import { getHttpErrorMap, HttpError, statCheck, onError } from './utils';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_LOCATION,
} from './constants';

const {
  HTTP_STATUS_OK,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_BAD_REQUEST,
} = constants;

const EMPTY_ARRAY: [] = [];

Object.freeze(EMPTY_ARRAY);

const httpErrorMap: { [key: string]: number } = getHttpErrorMap();

/**
 * Accepts an object containing route properties and returns a function that is capable of handling
 * that route. Passing a boolean as an optional second argument indicates whether or not a
 * TuftContext that parses the request body should be created.
 *
 * The returned function is a bound version of one of the route handlers, with the specific
 * properties of the provided route passed as arguments.
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
    response.json = JSON.stringify(response.json);
  }

  if (preHandlers.length > 0) {
    return handleResponseHandler.bind(
      null,
      returnResponse.bind(null, response),
      preHandlers,
      responders,
      options,
    );
  }

  return handleResponseObject.bind(null, response, responders, {});
}

export function returnResponse(response: TuftResponse) {
  return response;
}

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

  stream.respond({
    [HTTP2_HEADER_STATUS]: HTTP_STATUS_OK,
  }, { endStream: true });
}

export function handleHttpErrorResponse(
  { error }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const status = httpErrorMap[error as HttpError] ?? HTTP_STATUS_BAD_REQUEST;
  outgoingHeaders[HTTP2_HEADER_STATUS] = status;

  stream.respond(outgoingHeaders, { endStream: true });
}

export function handleRedirectResponse(
  { redirect }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_STATUS] = HTTP_STATUS_FOUND;
  outgoingHeaders[HTTP2_HEADER_LOCATION] = redirect;
  stream.respond(outgoingHeaders, { endStream: true });
}

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

export function handleFileResponse(
  { file, status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = 'text/plain; charset=utf-8';

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
 * Accepts a number, which represents an HTTP status code, and adds it to the outgoing HTTP headers
 * object before responding to the client.
 */

export function handleStatusResponse(
  { status }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  stream.respond(outgoingHeaders, { endStream: true });
}
