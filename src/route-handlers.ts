import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { TuftRoute, TuftResponse, TuftHandler, TuftPreHandler, TuftStreamHandler, TuftErrorHandler } from './route-map';
import type { TuftContext, TuftContextOptions } from './context';

import { promises as fsPromises } from 'fs';
import { createContext } from './context';

const HTTP2_HEADER_STATUS         = ':status';
const HTTP2_HEADER_CONTENT_TYPE   = 'content-type';
const HTTP2_HEADER_CONTENT_LENGTH = 'content-length';

const HTTP_STATUS_BAD_REQUEST           = 400;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

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
  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  if (stream.destroyed) {
    return;
  }

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

  const { status } = response;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(t.outgoingHeaders, { endStream: true });
}

async function handleFileResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status, file } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  const fileHandle = await fsPromises.open(file as string, 'r');
  const stat = await fileHandle.stat();

  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = stat.size;

  if (stream.destroyed) {
    return;
  }

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

  const { status, file } = response;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  const fileHandle = await fsPromises.open(file as string, 'r');
  const stat = await fileHandle.stat();

  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);

  if (stream.destroyed) {
    return;
  }

  stream.respondWithFD(fileHandle, t.outgoingHeaders);
}

async function handleFDResponse(response: TuftResponse, stream: ServerHttp2Stream) {
  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  const fileHandle = response.file as fsPromises.FileHandle;
  const stat = await fileHandle.stat();

  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = stat.size;

  if (stream.destroyed) {
    return;
  }

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

  const { status } = response;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  const fileHandle = response.file as fsPromises.FileHandle;
  const stat = await fileHandle.stat();

  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);

  if (stream.destroyed) {
    return;
  }

  stream.respondWithFD(fileHandle, t.outgoingHeaders);
}

async function handleStreamResponse(response: TuftResponse, stream: ServerHttp2Stream) {

  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(outgoingHeaders);

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

  const { status } = response;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (stream.destroyed) {
    return;
  }

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
  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status, contentType, body } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  outgoingHeaders[HTTP2_HEADER_CONTENT_TYPE] = contentType;
  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = body.length;

  if (stream.destroyed) {
    return;
  }

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

  const { status, contentType, body } = response;

  if (status) {
    t.setHeader(HTTP2_HEADER_STATUS, status);
  }

  t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
  t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);

  if (stream.destroyed) {
    return;
  }

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

    t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);

    if (stream.destroyed) {
      return;
    }

    stream.respond(t.outgoingHeaders);
    stream.end(body);

    return;
  }

  if (file) {
    const fileHandle = typeof file === 'string'
      ? await fsPromises.open(file, 'r')
      : file;

    const stat = await fileHandle.stat();

    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);

    if (stream.destroyed) {
      return;
    }

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

    t.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
    t.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);

    if (stream.destroyed) {
      return;
    }

    stream.respond(t.outgoingHeaders);
    stream.end(body);

    return;
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(t.outgoingHeaders, { endStream: true });
}

async function handleResponseWithTransaction(
  handleResponse: (stream: ServerHttp2Stream, t: TuftContext) => Promise<void | Error>,
  handleErrorResponse: (err: Error, stream: ServerHttp2Stream, t: TuftContext) => Promise<void>,
  options: TuftContextOptions,
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  try {
    const t = await createContext(stream, headers, options);
    const err = await handleResponse(stream, t);

    if (err) {
      console.error(err);
      handleErrorResponse(err, stream, t);
    }
  }

  catch (err) {
    if (err.message === 'ERR_CONTENT_LENGTH_MISMATCH') {
      stream.respond({ [HTTP2_HEADER_STATUS]: HTTP_STATUS_BAD_REQUEST });
      stream.end('An incomplete request body was received.');
      return;
    }

    console.error(err);

    if (stream.destroyed) {
      return;
    }

    stream.respond({ [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR }, { endStream: true });
  }
}

function defaultErrorHandler() {
  return { status: HTTP_STATUS_INTERNAL_SERVER_ERROR };
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
    return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
  }

  else if (response.body) {
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
      return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleBodyResponse.bind(null, response);
  }

  else if (response.file) {
    if (typeof response.file === 'string') {
      if (preHandlers) {
        const boundHandleResponse = handleFileResponseWithPreHandlers.bind(null, response, preHandlers);
        return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
      }

      return handleFileResponse.bind(null, response);
    }

    else {
      if (preHandlers) {
        const boundHandleResponse = handleFDResponseWithPreHandlers.bind(null, response, preHandlers);
        return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
      }

      return handleFDResponse.bind(null, response);
    }
  }

  else if (response.stream) {
    if (preHandlers) {
      const boundHandleResponse = handleStreamResponseWithPreHandlers.bind(null, response, preHandlers);
      return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleStreamResponse.bind(null, response);
  }

  else {
    if (preHandlers) {
      const boundHandleResponse = handleEmptyResponseWithPreHandlers.bind(null, response, preHandlers);
      return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleEmptyResponse.bind(null, response);
  }
}
