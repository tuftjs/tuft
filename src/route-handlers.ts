import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { TuftContext, TuftContextOptions } from './context';
import type { TuftRoute, TuftResponse, TuftHandler, TuftPreHandler, TuftStreamHandler, TuftErrorHandler } from './route-map';

import { promises as fsPromises } from 'fs';
import { constants } from 'http2';
import { createTuftContext, createTuftContextWithBody } from './context';

import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP_STATUS_OK,
  HTTP_STATUS_LENGTH_REQUIRED,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} from './constants';

const { NGHTTP2_STREAM_CLOSED } = constants;
const DEFAULT_HTTP_STATUS = HTTP_STATUS_OK;

const mimeTypeMap: { [key: string]: string } = {
  'text':                     'text/plain',
  'text/plain':               'text/plain',
  'html':                     'text/html',
  'text/html':                'text/html',
  'json':                     'application/json',
  'application/json':         'application/json',
  'buffer':                   'application/octet-stream',
  'application/octet-stream': 'application/octet-stream',
};

export function handleEmptyResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const outgoingHeaders = { [HTTP2_HEADER_STATUS]: response.status };
  stream.respond(outgoingHeaders, { endStream: true });
}

export async function handleEmptyResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  preHandlers: TuftPreHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
    }
  }

  catch (err) {
    handleError(err, stream, t);
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, response.status);
  stream.respond(t.outgoingHeaders, { endStream: true });
}

export async function handleFileResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const fileHandle = await fsPromises.open(response.file as string, 'r');
  const stat = await fileHandle.stat();

  const outgoingHeaders = {
    [HTTP2_HEADER_STATUS]: response.status,
    [HTTP2_HEADER_CONTENT_LENGTH]: stat.size,
  };
  stream.respondWithFD(fileHandle, outgoingHeaders);
}

export async function handleFileResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  preHandlers: TuftPreHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
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

export async function handleStreamResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  preHandlers: TuftPreHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
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

export async function handleBodyResponseWithPreHandlers(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  preHandlers: TuftPreHandler[],
  response: TuftResponse,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
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

export async function handleUnknownResponse(
  handleError: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  preHandlers: TuftPreHandler[],
  handler: TuftHandler,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  let result: TuftResponse | null;

  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
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

export async function handleResponseWithContext(
  createTuftContext: (
    stream: ServerHttp2Stream,
    headers: IncomingHttpHeaders,
    options: TuftContextOptions,
  ) => Promise<TuftContext>,
  handleResponse: (stream: ServerHttp2Stream, t: TuftContext) => void | Error | Promise<void | Error>,
  options: TuftContextOptions,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  try {
    const t = await createTuftContext(stream, headers, options);
    await handleResponse(stream, t);
  }

  catch (err) {
    switch (err.message) {
      case 'ERR_CONTENT_LENGTH_REQUIRED': {
        const outgoingHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_LENGTH_REQUIRED };
        stream.respond(outgoingHeaders, { endStream: true });
        break;
      }
      case 'ERR_CONTENT_LENGTH_MISMATCH': {
        stream.close(NGHTTP2_STREAM_CLOSED);
        break;
      }
      default: {
        const outgoingHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR };
        stream.respond(outgoingHeaders, { endStream: true });
      }
    }
  }
}

export function createRouteHandler(route: TuftRoute, body: boolean = false) {
  const { response, preHandlers, errorHandler } = route;

  const options = {
    params: route.params,
    parseCookies: route.parseCookies,
    parseText: route.parseText,
    parseJson: route.parseJson,
    parseUrlEncoded: route.parseUrlEncoded,
  };

  const createContext = body ? createTuftContextWithBody : createTuftContext;

  const boundHandleErrorResponse = handleErrorResponse.bind(null, errorHandler ?? defaultErrorHandler);

  if (typeof response === 'function') {
    const boundHandleResponse = handleUnknownResponse.bind(
      null,
      boundHandleErrorResponse,
      preHandlers,
      response
    );

    return handleResponseWithContext.bind(null, createContext, boundHandleResponse, options);
  }

  if (!response.status) {
    response.status = DEFAULT_HTTP_STATUS;
  }

  if (response.body) {
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

    if (preHandlers.length > 0) {
      const boundHandleResponse = handleBodyResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        preHandlers,
        response,
      );

      return handleResponseWithContext.bind(null, createContext, boundHandleResponse, options);
    }

    return handleBodyResponse.bind(null, response);
  }

  else if (response.file) {
    if (preHandlers.length > 0) {
      const boundHandleResponse = handleFileResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        preHandlers,
        response,
      );

      return handleResponseWithContext.bind(null, createContext, boundHandleResponse, options);
    }

    return handleFileResponse.bind(null, response);
  }

  else if (response.stream) {
    if (preHandlers.length > 0) {
      const boundHandleResponse = handleStreamResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        preHandlers,
        response,
      );

      return handleResponseWithContext.bind(null, createContext, boundHandleResponse, options);
    }

    return handleStreamResponse.bind(null, response);
  }

  else {
    if (preHandlers.length > 0) {
      const boundHandleResponse = handleEmptyResponseWithPreHandlers.bind(
        null,
        boundHandleErrorResponse,
        preHandlers,
        response,
      );

      return handleResponseWithContext.bind(null, createContext, boundHandleResponse, options);
    }

    return handleEmptyResponse.bind(null, response);
  }
}

export function defaultErrorHandler() {
  return { status: HTTP_STATUS_INTERNAL_SERVER_ERROR };
}
