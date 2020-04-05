import type { ServerHttp2Stream, IncomingHttpHeaders } from 'http2';
import type { TuftRoute, TuftResponse, TuftHandler, TuftPreHandler, TuftStreamHandler, TuftErrorHandler } from './route-map';
import type { TuftContext, TuftContextOptions } from './tuft-context';

import { promises as fsPromises } from 'fs';
import { createTuftContext } from './tuft-context';

import {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP_STATUS_OK,
  HTTP_STATUS_LENGTH_REQUIRED,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} from './constants';

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

function handleEmptyResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const outgoingHeaders = { [HTTP2_HEADER_STATUS]: response.status };
  stream.respond(outgoingHeaders, { endStream: true });
}

async function handleEmptyResponseWithPreHandlers(
  response: TuftResponse,
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
    }
  }

  catch (err) {
    return err;
  }

  if (stream.destroyed) {
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, response.status);
  stream.respond(t.outgoingHeaders, { endStream: true });
}

async function handleFileResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const fileHandle = await fsPromises.open(response.file as string, 'r');
  const stat = await fileHandle.stat();

  if (stream.destroyed) {
    return;
  }

  const outgoingHeaders = {
    [HTTP2_HEADER_STATUS]: response.status,
    [HTTP2_HEADER_CONTENT_LENGTH]: stat.size,
  };
  stream.respondWithFD(fileHandle, outgoingHeaders);
}

async function handleFileResponseWithPreHandlers(
  response: TuftResponse,
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
    }
  }

  catch (err) {
    return err;
  }

  const fileHandle = await fsPromises.open(response.file as string, 'r');
  const stat = await fileHandle.stat();

  if (stream.destroyed) {
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, response.status);
  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);
  stream.respondWithFD(fileHandle, t.outgoingHeaders);
}

async function handleFDResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const fileHandle = response.file as fsPromises.FileHandle;
  const stat = await fileHandle.stat();

  if (stream.destroyed) {
    return;
  }

  const outgoingHeaders = {
    [HTTP2_HEADER_STATUS]: response.status,
    [HTTP2_HEADER_CONTENT_LENGTH]: stat.size,
  };
  stream.respondWithFD(fileHandle, outgoingHeaders);
}

async function handleFDResponseWithPreHandlers(
  response: TuftResponse,
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
    }
  }

  catch (err) {
    return err;
  }

  const fileHandle = response.file as fsPromises.FileHandle;
  const stat = await fileHandle.stat();

  if (stream.destroyed) {
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, status);
  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);
  stream.respondWithFD(fileHandle, t.outgoingHeaders);
}

async function handleStreamResponse(response: TuftResponse, stream: ServerHttp2Stream) {
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

async function handleStreamResponseWithPreHandlers(
  response: TuftResponse,
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
    }
  }

  catch (err) {
    return err;
  }

  if (stream.destroyed) {
    return;
  }

  t.setHeader(HTTP2_HEADER_STATUS, status);
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

function handleBodyResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const { status, contentType, body } = response;

  const outgoingHeaders = {
    [HTTP2_HEADER_STATUS]: status,
    [HTTP2_HEADER_CONTENT_TYPE]: contentType,
    [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
  };
  stream.respond(outgoingHeaders);
  stream.end(body);
}

async function handleBodyResponseWithPreHandlers(
  response: TuftResponse,
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
    }
  }

  catch (err) {
    return err;
  }

  if (stream.destroyed) {
    return;
  }

  const { status, contentType, body } = response;

  t.setHeader(HTTP2_HEADER_STATUS, status);
  t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);
  stream.respond(t.outgoingHeaders);
  stream.end(body);
}

async function handleUnknownResponse(
  preHandlers: TuftPreHandler[],
  handler: TuftHandler,
  stream: ServerHttp2Stream,
  t: TuftContext,
) {
  let result: TuftResponse | undefined;

  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](t);
    }

    result = await handler(t);
  }

  catch (err) {
    return err;
  }

  if (result === null || typeof result !== 'object') {
    return;
  }

  let { status, contentType, body, file, stream: streamHandler } = result;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (body !== undefined) {
    contentType = contentType && mimeTypeMap[contentType];

    if (!contentType) {
      switch (typeof body) {
        case 'boolean': {
          contentType = 'application/json';
          break;
        }
        case 'number': {
          contentType = 'text/plain';
          break;
        }
        case 'string': {
          contentType = 'text/plain';
          break;
        }
        case 'object': {
          contentType = Buffer.isBuffer(body)
            ? 'application/octet-stream'
            : 'application/json';

          break;
        }
        default: {
          return;
        }
      }
    }

    if (contentType === 'text/plain') {
      body = body.toString();
    }

    else if (contentType === 'application/json') {
      body = JSON.stringify(body);
    }

    if (stream.destroyed) {
      return;
    }

    t.setHeader(HTTP2_HEADER_STATUS, status);
    t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);
    stream.respond(t.outgoingHeaders);
    stream.end(body);

    return;
  }

  if (file) {
    const fileHandle = typeof file === 'string'
      ? await fsPromises.open(file, 'r')
      : file;

    const stat = await fileHandle.stat();

    if (stream.destroyed) {
      return;
    }

    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);
    stream.respondWithFD(fileHandle, t.outgoingHeaders);

    return;
  }

  if (streamHandler) {
    if (stream.destroyed) {
      return;
    }

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

  if (stream.destroyed) {
    return;
  }

  stream.respond(t.outgoingHeaders, { endStream: true });
}

async function handleErrorResponse(
  errorHandler: TuftErrorHandler,
  err: Error,
  stream: ServerHttp2Stream,
  t: TuftContext
) {
  const result = await errorHandler(err, t);

  if (!result || typeof result !== 'object') {
    return;
  }

  let { status, contentType, body } = result;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (body !== undefined) {
    contentType = contentType && mimeTypeMap[contentType];

    if (!contentType) {
      switch (typeof body) {
        case 'boolean': {
          contentType = 'application/json';
          break;
        }
        case 'number': {
          contentType = 'text/plain';
          break;
        }
        case 'string': {
          contentType = 'text/plain';
          break;
        }
        case 'object': {
          contentType = Buffer.isBuffer(body)
            ? 'application/octet-stream'
            : 'application/json';

          break;
        }
        default: {
          return;
        }
      }
    }

    if (contentType === 'text/plain') {
      body = body.toString();
    }

    else if (contentType === 'application/json') {
      body = JSON.stringify(body);
    }

    if (stream.destroyed) {
      return;
    }

    t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);
    stream.respond(t.outgoingHeaders);
    stream.end(body);

    return;
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(t.outgoingHeaders, { endStream: true });
}

async function handleResponseWithContext(
  handleResponse: (stream: ServerHttp2Stream, t: TuftContext) => void | Error | Promise<void | Error>,
  handleErrorResponse: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => void | Promise<void>,
  options: TuftContextOptions,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  try {
    const t = await createTuftContext(stream, headers, options);
    const err = await handleResponse(stream, t);

    if (err) {
      console.error(err);
      handleErrorResponse(err, stream, t);
    }
  }

  catch (err) {
    console.error(err);

    if (stream.destroyed) {
      return;
    }

    if (err.message === 'ERR_MISSING_METHOD_HEADER' || err.message === 'ERR_MISSING_PATH_HEADER') {
      stream.close();
      return;
    }

    else if (err.message === 'ERR_CONTENT_LENGTH_REQUIRED') {
      const outgoingHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_LENGTH_REQUIRED };
      stream.respond(outgoingHeaders, { endStream: true });
      return;
    }

    else if (err.message === 'ERR_CONTENT_LENGTH_MISMATCH') {
      stream.close();
      return;
    }

    const outgoingHeaders = { [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR };
    stream.respond(outgoingHeaders, { endStream: true });
  }
}

export function createRouteHandler({
  response,
  preHandlers,
  errorHandler,
  params,
  parseCookies,
  parseText,
  parseJson,
  parseUrlEncoded,
}: TuftRoute) {
  const boundHandleErrorResponse = handleErrorResponse.bind(null, errorHandler ?? defaultErrorHandler);

  const options = {
    params,
    parseCookies,
    parseText,
    parseJson,
    parseUrlEncoded,
  };

  if (typeof response === 'function') {
    const boundHandleResponse = handleUnknownResponse.bind(null, preHandlers, response);
    return handleResponseWithContext.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
  }

  if (!response.status) {
    response.status = HTTP_STATUS_OK;
  }

  if (response.body) {
    let { contentType, body } = response;

    contentType = contentType && mimeTypeMap[contentType];

    if (!contentType) {
      switch (typeof body) {
        case 'boolean': {
          contentType = 'application/json';
          break;
        }
        case 'number': {
          contentType = 'text/plain';
          break;
        }
        case 'string': {
          contentType = 'text/plain';
          break;
        }
        case 'object': {
          contentType = Buffer.isBuffer(body)
            ? 'application/octet-stream'
            : 'application/json';

          break;
        }
        default: {
          throw TypeError('Invalid body type.');
        }
      }
    }

    if (contentType === 'application/json') {
      body = JSON.stringify(body);
    }

    else if (contentType !== 'application/octet-stream') {
      body = body.toString();
    }

    response.contentType = contentType;
    response.body = body;

    if (preHandlers) {
      const boundHandleResponse = handleBodyResponseWithPreHandlers.bind(null, response, preHandlers);
      return handleResponseWithContext.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleBodyResponse.bind(null, response);
  }

  else if (response.file) {
    if (typeof response.file === 'string') {
      if (preHandlers) {
        const boundHandleResponse = handleFileResponseWithPreHandlers.bind(null, response, preHandlers);
        return handleResponseWithContext.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
      }

      return handleFileResponse.bind(null, response);
    }

    else {
      if (preHandlers) {
        const boundHandleResponse = handleFDResponseWithPreHandlers.bind(null, response, preHandlers);
        return handleResponseWithContext.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
      }

      return handleFDResponse.bind(null, response);
    }
  }

  else if (response.stream) {
    if (preHandlers) {
      const boundHandleResponse = handleStreamResponseWithPreHandlers.bind(null, response, preHandlers);
      return handleResponseWithContext.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleStreamResponse.bind(null, response);
  }

  else {
    if (preHandlers) {
      const boundHandleResponse = handleEmptyResponseWithPreHandlers.bind(null, response, preHandlers);
      return handleResponseWithContext.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleEmptyResponse.bind(null, response);
  }
}

function defaultErrorHandler() {
  return { status: HTTP_STATUS_INTERNAL_SERVER_ERROR };
}
