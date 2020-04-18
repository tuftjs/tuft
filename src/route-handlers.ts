import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { TuftContext, TuftContextOptions } from './context';
import type {
  TuftRoute,
  TuftResponse,
  TuftHandler,
  TuftPluginHandler,
  TuftStreamHandler,
  TuftErrorHandler,
} from './route-map';

import { promises as fsPromises } from 'fs';
import { constants } from 'http2';
import { createTuftContext } from './context';
import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_LOCATION,
  HTTP_STATUS_OK,
  HTTP_STATUS_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} from './constants';

const { NGHTTP2_STREAM_CLOSED } = constants;
const DEFAULT_HTTP_STATUS = HTTP_STATUS_OK;

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

export function createRouteHandler(route: TuftRoute) {
  const { response,errorHandler, params } = route;
  const pluginHandlers = route.plugins ?? [];

  const options = { params };

  const boundHandleErrorResponse = handleErrorResponse.bind(
    null,
    errorHandler ?? defaultErrorHandler,
  );

  if (typeof response === 'function') {
    // The route contains a handler function
    const boundHandleResponse = handleUnknownResponse.bind(
      null,
      boundHandleErrorResponse,
      pluginHandlers,
      response,
    );

    return handleResponseWithContext.bind(null, boundHandleResponse, options);
  }

  if (!response.status) {
    response.status = response.redirect ? HTTP_STATUS_FOUND : DEFAULT_HTTP_STATUS;
  }

  if (response.redirect) {
    if (pluginHandlers.length > 0) {
      const boundHandleResponse = handleRedirectResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        pluginHandlers,
        response,
      );

      // The route contains pre-handlers, so return a handler that uses TuftContext
      return handleResponseWithContext.bind(null, boundHandleResponse, options);
    }

    return handleRedirectResponse.bind(null, response);
  }

  if (response.body) {
    // The route contains a body, which should be pre-processed based on its content type.
    let { contentType, body } = response;

    contentType = contentType && mimeTypeMap[contentType];

    if (contentType) {
      if (contentType === 'text/plain' || contentType === 'text/html') {
        body = body.toString();
      }
      else if (contentType === 'application/json') {
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

    if (pluginHandlers.length > 0) {
      const boundHandleResponse = handleBodyResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        pluginHandlers,
        response,
      );

      // The route contains pre-handlers, so return a handler that uses TuftContext
      return handleResponseWithContext.bind(null, boundHandleResponse, options);
    }

    return handleBodyResponse.bind(null, response);
  }

  else if (response.file) {
    if (pluginHandlers.length > 0) {
      const boundHandleResponse = handleFileResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        pluginHandlers,
        response,
      );

      // The route contains pre-handlers, so return a handler that uses TuftContext
      return handleResponseWithContext.bind(null, boundHandleResponse, options);
    }

    return handleFileResponse.bind(null, response);
  }

  else if (response.stream) {
    if (pluginHandlers.length > 0) {
      const boundHandleResponse = handleStreamResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        pluginHandlers,
        response,
      );

      // The route contains pre-handlers, so return a handler that uses TuftContext
      return handleResponseWithContext.bind(null, boundHandleResponse, options);
    }

    return handleStreamResponse.bind(null, response);
  }

  else {
    if (pluginHandlers.length > 0) {
      const boundHandleResponse = handleEmptyResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        pluginHandlers,
        response,
      );

      // The route contains pre-handlers, so return a handler that uses TuftContext
      return handleResponseWithContext.bind(null, boundHandleResponse, options);
    }

    return handleEmptyResponse.bind(null, response);
  }
}

// Creates an instance of TuftContext and passes it to the user-defined route handler.
export async function handleResponseWithContext(
  handleResponse: (
    stream: ServerHttp2Stream,
    t: TuftContext
  ) => void | Error | Promise<void | Error>,
  options: TuftContextOptions,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  try {
    const context = createTuftContext(stream, headers, options);
    await handleResponse(stream, context);
  }

  catch (err) {
    // An unknown error occurred. Respond with status code 500.
    const outgoingHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR };
    stream.respond(outgoingHeaders, { endStream: true });
  }
}

export function handleRedirectResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const outgoingHeaders = {
    [HTTP2_HEADER_STATUS]: response.status,
    [HTTP2_HEADER_LOCATION]: response.redirect,
  };
  stream.respond(outgoingHeaders, { endStream: true });
}

export async function handleRedirectResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  pluginHandlers: TuftPluginHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < pluginHandlers.length; i++) {
      const pluginHandler = pluginHandlers[i];
      await pluginHandler(t);
    }
  }

  catch (err) {
    handleError(err, stream, t);
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, response.status);
  t.setHeader(HTTP2_HEADER_LOCATION, response.redirect);
  stream.respond(t.outgoingHeaders, { endStream: true });
}

// Handles routes that do not contain a response body, send a file, or implement a stream.
export function handleEmptyResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const outgoingHeaders = { [HTTP2_HEADER_STATUS]: response.status };
  stream.respond(outgoingHeaders, { endStream: true });
}

// Same as above, except that pre-handlers are executed and any resulting errors are handled.
export async function handleEmptyResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  pluginHandlers: TuftPluginHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < pluginHandlers.length; i++) {
      const pluginHandler = pluginHandlers[i];
      await pluginHandler(t);
    }
  }

  catch (err) {
    handleError(err, stream, t);
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, response.status);
  stream.respond(t.outgoingHeaders, { endStream: true });
}

// Handles routes that send a file.
export async function handleFileResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const fileHandle = await fsPromises.open(response.file as string, 'r');
  const stat = await fileHandle.stat();

  const outgoingHeaders = {
    [HTTP2_HEADER_STATUS]: response.status,
    [HTTP2_HEADER_CONTENT_LENGTH]: stat.size,
  };
  stream.respondWithFD(fileHandle, outgoingHeaders);
}

// Same as above, except that pre-handlers are executed and any resulting errors are handled.
export async function handleFileResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  pluginHandlers: TuftPluginHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < pluginHandlers.length; i++) {
      const pluginHandler = pluginHandlers[i];
      await pluginHandler(t);
    }
  }

  catch (err) {
    handleError(err, stream, t);
    return;
  }

  const fileHandle = await fsPromises.open(response.file as string, 'r');
  const stat = await fileHandle.stat();

  t.setHeader(HTTP2_HEADER_STATUS, response.status);
  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);
  stream.respondWithFD(fileHandle, t.outgoingHeaders);
}

// Handles routes that implement a writable stream.
export async function handleStreamResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  stream.respond({ [HTTP2_HEADER_STATUS]: response.status });

  const streamHandler = response.stream as TuftStreamHandler;

  await streamHandler((chunk: any, encoding?: string) => {
    return new Promise((resolve, reject) => {
      stream.write(chunk, encoding, (err) => {
        err ? reject(err) : resolve();
      });
    });
  });

  stream.end();
}

// Same as above, except that pre-handlers are executed and any resulting errors are handled.
export async function handleStreamResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  pluginHandlers: TuftPluginHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < pluginHandlers.length; i++) {
      const pluginHandler = pluginHandlers[i];
      await pluginHandler(t);
    }
  }

  catch (err) {
    handleError(err, stream, t);
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, response.status);
  stream.respond(t.outgoingHeaders);

  const streamHandler = response.stream as TuftStreamHandler;

  await streamHandler((chunk: any, encoding?: string) => {
    return new Promise((resolve, reject) => {
      stream.write(chunk, encoding, (err) => {
        err ? reject(err) : resolve();
      });
    });
  });

  stream.end();
}

// Handles routes that include a response body.
export function handleBodyResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const { status, contentType, body } = response;

  const outgoingHeaders = {
    [HTTP2_HEADER_STATUS]: status,
    [HTTP2_HEADER_CONTENT_TYPE]: contentType,
    [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
  };
  stream.respond(outgoingHeaders);
  stream.end(body);
}

// Same as above, except that pre-handlers are executed and any resulting errors are handled.
export async function handleBodyResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  pluginHandlers: TuftPluginHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < pluginHandlers.length; i++) {
      const pluginHandler = pluginHandlers[i];
      await pluginHandler(t);
    }
  }

  catch (err) {
    handleError(err, stream, t);
    return;
  }

  const { status, contentType, body } = response;

  t.setHeader(HTTP2_HEADER_STATUS, status);
  t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);
  stream.respond(t.outgoingHeaders);
  stream.end(body);
}

// Converts the provided body value to a type that can be written to the response stream.
function handleUnknownBodyResponse(
  stream: ServerHttp2Stream,
  t: TuftContext,
  body: any,
  contentType?: string,
) {
  if (contentType) {
    contentType = mimeTypeMap[contentType];

    if (contentType === 'text/plain' || contentType === 'text/html') {
      body = body.toString();
    }

    else if (contentType === 'application/json') {
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
        stream.close(NGHTTP2_STREAM_CLOSED);
        throw TypeError(`'${typeof body}' is not a supported response body type.`);
      }
    }
  }

  t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);
  stream.respond(t.outgoingHeaders);
  stream.end(body);
}

// Handles routes where the response is not known in advance, and instead is determined by the
// result of a user-defined handler function.
export async function handleUnknownResponse(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  pluginHandlers: TuftPluginHandler[],
  handler: TuftHandler,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  let result: TuftResponse | null;

  try {
    for (let i = 0; i < pluginHandlers.length; i++) {
      const pluginHandler = pluginHandlers[i];
      await pluginHandler(t);
    }

    result = await handler(t);
  }

  catch (err) {
    handleError(err, stream, t);
    return;
  }

  if (result === null || typeof result !== 'object') {
    stream.close(NGHTTP2_STREAM_CLOSED);
    return;
  }

  let { status, contentType, body, file, stream: streamHandler } = result;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (body !== undefined) {
    handleUnknownBodyResponse(stream, t, body, contentType);
    return;
  }

  if (file) {
    const fileHandle = typeof file === 'string'
      ? await fsPromises.open(file, 'r')
      : file;

    const stat = await fileHandle.stat();

    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);
    stream.respondWithFD(fileHandle, t.outgoingHeaders);

    return;
  }

  if (streamHandler) {
    stream.respond(t.outgoingHeaders);

    await streamHandler((chunk: any, encoding?: string) => {
      return new Promise((resolve, reject) => {
        stream.write(chunk, encoding, (err) => {
          err ? reject(err) : resolve();
        });
      });
    });

    stream.end();
    return;
  }

  stream.respond(t.outgoingHeaders, { endStream: true });
}

// Passes any thrown errors from user-defined pre-handler or handler functions to a user-defined
// error handler.
export async function handleErrorResponse(
  errorHandler: TuftErrorHandler,
  err: Error,
  stream: ServerHttp2Stream,
  t: TuftContext
) {
  const result = await errorHandler(err, t);

  if (result === null || typeof result !== 'object') {
    stream.close(NGHTTP2_STREAM_CLOSED);
    return;
  }

  let { status, contentType, body } = result;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (body !== undefined) {
    handleUnknownBodyResponse(stream, t, body, contentType);
    return;
  }

  stream.respond(t.outgoingHeaders, { endStream: true });
}

export function defaultErrorHandler() {
  return { status: HTTP_STATUS_INTERNAL_SERVER_ERROR };
}
