import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { TuftContextOptions } from './context';
import type {
  TuftRoute,
  TuftResponse,
  TuftHandler,
  TuftPluginHandler,
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
  const { response, params } = route;

  const pluginHandlers = route.plugins ?? EMPTY_ARRAY;
  const responders = route.responders ?? EMPTY_ARRAY;

  const options = { params };

  if (typeof response === 'function') {
    return handleResponseHandler.bind(null, response, pluginHandlers, responders, options);
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
    return handleResponseHandler.bind(
      null,
      returnResponse.bind(null, response),
      pluginHandlers,
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
  pluginHandlers: TuftPluginHandler[],
  responders: TuftResponder[],
  contextOptions: TuftContextOptions,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  const t = createTuftContext(stream, headers, contextOptions);

  for (let i = 0; i < pluginHandlers.length; i++) {
    const handler = pluginHandlers[i];
    const response = await handler(t) as TuftResponse;

    if (response?.error) {
      handleHttpErrorResponse(response, stream, t.outgoingHeaders);
      return;
    }
  }

  const response = await handler(t);

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
  const { error, redirect, body, file, status } = response;

  if (error) {
    handleHttpErrorResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (redirect) {
    handleRedirectResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (body !== undefined) {
    if (status) {
      outgoingHeaders[HTTP2_HEADER_STATUS] = status;
    }

    handleBodyResponse(response, stream, outgoingHeaders);
    return;
  }

  else if (file) {
    if (status) {
      outgoingHeaders[HTTP2_HEADER_STATUS] = status;
    }

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
  { error, body, contentType }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  const status = httpErrorMap[error as HttpError] ?? HTTP_STATUS_BAD_REQUEST;
  outgoingHeaders[HTTP2_HEADER_STATUS] = status;

  if (body !== undefined) {
    handleBodyResponse({ body, contentType }, stream, outgoingHeaders);
    return;
  }

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

export function handleBodyResponse(
  { body, type }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  let contentType;

  if (type) {
    contentType = mimeTypeMap[type];

    if (contentType === 'text/plain' || contentType === 'text/html') {
      contentType += '; charset=utf-8';
      body = body.toString();
    }

    else if (contentType === 'application/json' && typeof body !== 'string') {
      contentType = 'application/json; charset=utf-8';
      body = JSON.stringify(body);
    }

    else if (contentType === 'application/json') {
      contentType = 'application/json; charset=utf-8';
    }

    else {
      throw TypeError('\'' + type + '\' is not a valid value for \'contentType\'');
    }
  }

  else {
    switch (typeof body) {
      case 'boolean':
      case 'number': {
        contentType = 'text/plain; charset=utf-8';
        body = body.toString();
        break;
      }
      case 'string': {
        contentType = 'text/plain; charset=utf-8';
        break;
      }
      case 'object': {
        if (Buffer.isBuffer(body)) {
          contentType = 'application/octet-stream';
          break;
        }

        contentType = 'application/json; charset=utf-8';
        body = JSON.stringify(body);
        break;
      }
      default:
        throw TypeError('\'' + typeof body + '\' is not a supported response body type.');
    }
  }

  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = contentType;
  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = body.length;

  stream.respond(outgoingHeaders);
  stream.end(body);
}

export function handleFileResponse(
  { file }: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = 'text/plain';

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
