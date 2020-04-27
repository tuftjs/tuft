import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { TuftContext, TuftContextOptions } from './context';
import type {
  TuftRoute,
  TuftResponse,
  TuftHandler,
  TuftPluginHandler,
  TuftErrorHandler,
  TuftResponder,
} from './route-map';

import { promises as fsPromises } from 'fs';
import { constants } from 'http2';
import { createTuftContext } from './context';
import { getHttpErrorMap, HttpError } from './utils';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_LOCATION,
} from './constants';

const {
  HTTP_STATUS_FOUND,
  HTTP_STATUS_BAD_REQUEST,
} = constants;

const httpErrorMap: { [key: string]: number } = getHttpErrorMap();

const mimeTypeMap: { [key: string]: string } = {
  'text':                       'text/plain',
  'text/plain':                 'text/plain',
  'html':                       'text/html',
  'text/html':                  'text/html',
  'json':                       'application/json',
  'application/json':           'application/json',
  'buffer':                     'application/octet-stream',
  'application/octet-stream':   'application/octet-stream',
};

/**
 * Accepts an object containing route properties and returns a function that is capable of handling
 * that route. Passing a boolean as an optional second argument indicates whether or not a
 * TuftContext that parses the request body should be created.
 *
 * The returned function is a bound version of one of the route handlers, with the specific
 * properties of the provided route passed as arguments.
 */

export function createResponseHandler(route: TuftRoute) {
  const { response, errorHandler, params } = route;

  const pluginHandlers = route.plugins ?? [];
  const responders = route.responders ?? [];

  const options = { params };

  if (errorHandler) {
    for (const [i, handler] of pluginHandlers.entries()) {
      pluginHandlers[i] = callHandlerWithErrorHandling.bind(null, handler, errorHandler);
    }
  }

  if (typeof response === 'function') {
    const handler = errorHandler
      ? callHandlerWithErrorHandling.bind(null, response, errorHandler)
      : response;
    const boundHandleResponse = callResponseHandler.bind(null, handler, responders);

    return handleResponseWithContext.bind(null, pluginHandlers, boundHandleResponse, options);
  }

  if (response.body !== undefined) {
    let { contentType, body } = response;

    contentType = contentType && mimeTypeMap[contentType];

    if (contentType) {
      if (contentType === 'text/plain' || contentType === 'text/html') {
        body = body.toString();
      }
      else if (contentType === 'application/json' && typeof body !== 'string') {
        body = JSON.stringify(body);
      }
    }

    else {
      switch (typeof body) {
        case 'boolean':
        case 'number': {
          contentType = 'application/json';
          body = body.toString();
          break;
        }
        case 'string': {
          contentType = 'text/plain';
          break;
        }
        case 'object': {
          if (Buffer.isBuffer(body)) {
            contentType = 'application/octet-stream';
            break;
          }

          contentType = 'application/json';
          body = JSON.stringify(body);
          break;
        }
        default: {
          const err = TypeError(`'${typeof body}' is not a supported response body type.`);
          console.error(err);
          return process.exit(1);
        }
      }
    }

    response.contentType = contentType;
    response.body = body;
  }

  if (pluginHandlers.length > 0) {
    const handler = errorHandler
      ? callHandlerWithErrorHandling.bind(null, returnResponse.bind(null, response), errorHandler)
      : returnResponse.bind(null, response);
    const boundHandleResponse = callResponseHandler.bind(null, handler, responders);

    return handleResponseWithContext.bind(null, pluginHandlers, boundHandleResponse, options);
  }

  return handleResponseWithoutContext.bind(null, responders, response);
}

export function returnResponse(response: TuftResponse) {
  return response;
}

export async function handleResponseWithContext(
  requestPluginHandlers: TuftPluginHandler[],
  handleResponse: (
    stream: ServerHttp2Stream,
    t: TuftContext
  ) => void | Error | Promise<void | Error>,
  options: TuftContextOptions,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  const t = createTuftContext(stream, headers, options);

  for (let i = 0; i < requestPluginHandlers.length; i++) {
    const handler = requestPluginHandlers[i];
    const response = await handler(t) as TuftResponse;

    if (response?.error) {
      handleHttpErrorResponse(response, stream, t.outgoingHeaders);
      return;
    }
  }

  await handleResponse(stream, t);
}

export async function handleResponseWithoutContext(
  responsePluginHandlers: TuftResponder[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
) {
  const outgoingHeaders = {};

  for (let i = 0; i < responsePluginHandlers.length; i++) {
    const handler = responsePluginHandlers[i];

    if (await handler(response, stream, outgoingHeaders) !== response) {
      return;
    }
  }

  if (await handleResponse(response, stream, outgoingHeaders) !== response) {
    return;
  }

  stream.respond(undefined, { endStream: true });
}

export async function callHandlerWithErrorHandling(
  handler: TuftHandler | TuftPluginHandler,
  handleError: TuftErrorHandler,
  t: TuftContext,
) {
  let e;
  let result;

  try {
    result = await handler(t);
  }

  catch (err) {
    e = err;
  }

  if (result instanceof Error) {
    e = result;
  }

  if (e) {
    const response = await handleError(e, t);

    if (!response?.error) {
      throw Error('Error handlers must return a Tuft error object.');
    }

    return response;
  }

  return result;
}

export async function callResponseHandler(
  handler: TuftHandler,
  responsePluginHandlers: TuftResponder[],
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  const response = await handler(t) as TuftResponse;

  if (response === null || typeof response !== 'object') {
    throw TypeError(`'${response}' is not a valid Tuft response object.`);
  }

  for (let i = 0; i < responsePluginHandlers.length; i++) {
    const handler = responsePluginHandlers[i];

    if (await handler(response, stream, t.outgoingHeaders) !== response) {
      return;
    }
  }

  if (await handleResponse(response, stream, t.outgoingHeaders) !== response) {
    return;
  }

  stream.respond(undefined, { endStream: true });
}

export async function handleResponse(
  response: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const { error, redirect, status, body, contentType, file } = response;

  if (error) {
    handleHttpErrorResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (redirect) {
    handleRedirectResponse(redirect, stream, outgoingHeaders);
    return;
  }

  else if (body !== undefined) {
    if (status) {
      outgoingHeaders[HTTP2_HEADER_STATUS] = status;
    }

    handleBodyResponse(body, contentType, stream, outgoingHeaders);
    return;
  }

  else if (file) {
    if (status) {
      outgoingHeaders[HTTP2_HEADER_STATUS] = status;
    }

    await handleFileResponse(file, stream, outgoingHeaders);
    return;
  }

  else if (status) {
    handleStatusResponse(status, stream, outgoingHeaders);
    return;
  }

  return response;
}

export function handleHttpErrorResponse(
  { error, body, contentType }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const status = httpErrorMap[error as HttpError] ?? HTTP_STATUS_BAD_REQUEST;
  outgoingHeaders[HTTP2_HEADER_STATUS] = status;

  if (body !== undefined) {
    handleBodyResponse(body, contentType, stream, outgoingHeaders);
    return;
  }

  stream.respond(outgoingHeaders, { endStream: true });
}

export function handleRedirectResponse(
  url: string,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_STATUS] = HTTP_STATUS_FOUND;
  outgoingHeaders[HTTP2_HEADER_LOCATION] = url;
  stream.respond(outgoingHeaders, { endStream: true });
}

export function handleBodyResponse(
  body: any,
  type: string | undefined,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  let contentType;

  if (type) {
    contentType = mimeTypeMap[type];

    if (contentType === 'text/plain' || contentType === 'text/html') {
      body = body.toString();
    }

    else if (contentType === 'application/json' && typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    else {
      throw TypeError(`${type} is not a valid value for 'contentType'`);
    }
  }

  else {
    switch (typeof body) {
      case 'boolean':
      case 'number': {
        contentType = 'text/plain';
        body = body.toString();
        break;
      }
      case 'string': {
        contentType = 'text/plain';
        break;
      }
      case 'object': {
        if (Buffer.isBuffer(body)) {
          contentType = 'application/octet-stream';
          break;
        }

        contentType = 'application/json';
        body = JSON.stringify(body);
        break;
      }
      default:
        throw TypeError(`'${typeof body}' is not a supported response body type.`);
    }
  }

  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = contentType;
  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = body.length;

  stream.respond(outgoingHeaders);
  stream.end(body);
}

export async function handleFileResponse(
  file: string | fsPromises.FileHandle,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const fileHandle = typeof file === 'string'
    ? await fsPromises.open(file, 'r')
    : file;
  const stat = await fileHandle.stat();

  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = stat.size;
  stream.respondWithFD(fileHandle, outgoingHeaders);
  return;
}

export function handleStatusResponse(
  status: number,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  stream.respond(outgoingHeaders, { endStream: true });
}
