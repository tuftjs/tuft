import type { ServerHttp2Stream, IncomingHttpHeaders, OutgoingHttpHeaders } from 'http2';
import type { TuftRoute, TuftResponse, TuftHandler, TuftPreHandler, TuftErrorHandler } from './route-map';
import type { Transaction } from './transaction';

import { constants } from 'http2';
import { promises as fsPromises } from 'fs';
import { createTransaction } from './transaction';

const {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} = constants;

const mimeTypes: { [key: string]: string } = {
  'text':                     'text/plain',
  'text/plain':               'text/plain',
  'html':                     'text/html',
  'text/html':                'text/html',
  'json':                     'application/json',
  'application/json':         'application/json',
  'buffer':                   'application/octet-stream',
  'application/octet-stream': 'application/octet-stream',
};

function handleEmptyResponse(response: { status?: number }, stream: ServerHttp2Stream) {
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
  response: { status?: number },
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  txn: Transaction,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](txn);
    }
  }

  catch (err) {
    return err;
  }

  const { status } = response;

  if (status) {
    txn.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(txn.outgoingHeaders, { endStream: true });
}

async function handleFileResponse(
  response: { status?: number, file: string },
  stream: ServerHttp2Stream,
) {
  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status, file } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  const fileHandle = await fsPromises.open(file, 'r');
  const stat = await fileHandle.stat();

  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = stat.size;

  if (stream.destroyed) {
    return;
  }

  stream.respondWithFD(fileHandle, outgoingHeaders);
}

async function handleFileResponseWithPreHandlers(
  response: { status?: number, file: string },
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  txn: Transaction,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](txn);
    }
  }

  catch (err) {
    return err;
  }

  const { status, file } = response;

  if (status) {
    txn.setHeader(HTTP2_HEADER_STATUS, status);
  }

  const fileHandle = await fsPromises.open(file, 'r');
  const stat = await fileHandle.stat();

  txn.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);

  if (stream.destroyed) {
    return;
  }

  stream.respondWithFD(fileHandle, txn.outgoingHeaders);
}

async function handleFDResponse(
  response: { status?: number, file: fsPromises.FileHandle },
  stream: ServerHttp2Stream,
) {
  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status, file: fileHandle } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  const stat = await fileHandle.stat();

  outgoingHeaders[HTTP2_HEADER_CONTENT_LENGTH] = stat.size;

  if (stream.destroyed) {
    return;
  }

  stream.respondWithFD(fileHandle, outgoingHeaders);
}

async function handleFDResponseWithPreHandlers(
  response: { status?: number, file: fsPromises.FileHandle },
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  txn: Transaction,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](txn);
    }
  }

  catch (err) {
    return err;
  }

  const { status, file: fileHandle } = response;

  if (status) {
    txn.setHeader(HTTP2_HEADER_STATUS, status);
  }

  const stat = await fileHandle.stat();

  txn.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);

  if (stream.destroyed) {
    return;
  }

  stream.respondWithFD(fileHandle, txn.outgoingHeaders);
}

async function handleStreamResponse(
  response: {
    status?: number,
    stream: (write: (chunk: any, encoding?: string) => Promise<void>) => Promise<void>,
  },
  stream: ServerHttp2Stream,
) {

  const outgoingHeaders: OutgoingHttpHeaders = {};

  const { status } = response;

  if (status) {
    outgoingHeaders[HTTP2_HEADER_STATUS] = status;
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(outgoingHeaders);

  await response.stream((chunk: any, encoding?: string) => {
    return new Promise((resolve, reject) => {
      stream.write(chunk, encoding, (err) => {
        err ? reject(err) : resolve();
      });
    });
  });

  stream.end();
}

async function handleStreamResponseWithPreHandlers(
  response: {
    status?: number,
    stream: (write: (chunk: any, encoding?: string) => Promise<void>) => Promise<void>,
  },
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  txn: Transaction,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](txn);
    }
  }

  catch (err) {
    return err;
  }

  const { status } = response;

  if (status) {
    txn.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(txn.outgoingHeaders);

  await response.stream((chunk: any, encoding?: string) => {
    return new Promise((resolve, reject) => {
      stream.write(chunk, encoding, (err) => {
        err ? reject(err) : resolve();
      });
    });
  });

  stream.end();
}

function handleBodyResponse(
  response: {
    status?: number,
    contentType: string,
    body: any,
  },
  stream: ServerHttp2Stream,
) {
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
  response: {
    status?: number,
    body: any,
    contentType: string,
  },
  preHandlers: TuftPreHandler[],
  stream: ServerHttp2Stream,
  txn: Transaction,
) {
  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](txn);
    }
  }

  catch (err) {
    return err;
  }

  const { status, contentType, body } = response;

  if (status) {
    txn.setHeader(HTTP2_HEADER_STATUS, status);
  }

  txn.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
  txn.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);

  if (stream.destroyed) {
    return;
  }

  stream.respond(txn.outgoingHeaders);
  stream.end(body);
}

async function handleUnknownResponse(
  preHandlers: TuftPreHandler[],
  handler: TuftHandler,
  stream: ServerHttp2Stream,
  txn: Transaction,
) {
  let result: TuftResponse | undefined;

  try {
    for (let i = 0; i < preHandlers.length; i++) {
      await preHandlers[i](txn);
    }

    result = await handler(txn);
  }

  catch (err) {
    return err;
  }

  if (result === null || typeof result !== 'object') {
    return;
  }

  let { status, contentType, body, file, stream: streamHandler } = result;

  if (status) {
    txn.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (body !== undefined) {
    contentType = contentType && mimeTypes[contentType];

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

    txn.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
    txn.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);

    if (stream.destroyed) {
      return;
    }

    stream.respond(txn.outgoingHeaders);
    stream.end(body);

    return;
  }

  if (file) {
    const fileHandle = typeof file === 'string'
      ? await fsPromises.open(file, 'r')
      : file;

    const stat = await fileHandle.stat();

    txn.setHeader(HTTP2_HEADER_CONTENT_LENGTH, stat.size);

    if (stream.destroyed) {
      return;
    }

    stream.respondWithFD(fileHandle, txn.outgoingHeaders);

    return;
  }

  if (streamHandler) {
    if (stream.destroyed) {
      return;
    }

    stream.respond(txn.outgoingHeaders);

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

  stream.respond(txn.outgoingHeaders, { endStream: true });
}

async function handleErrorResponse(
  errorHandler: TuftErrorHandler,
  err: Error,
  stream: ServerHttp2Stream,
  txn: Transaction
) {
  const result = await errorHandler(err, txn);

  if (!result || typeof result !== 'object') {
    return;
  }

  let { status, contentType, body } = result;

  if (status) {
    txn.setHeader(HTTP2_HEADER_STATUS, status);
  }

  if (body !== undefined) {
    contentType = contentType && mimeTypes[contentType];

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

    txn.setHeader(HTTP2_HEADER_CONTENT_TYPE, contentType);
    txn.setHeader(HTTP2_HEADER_CONTENT_LENGTH, body.length);

    if (stream.destroyed) {
      return;
    }

    stream.respond(txn.outgoingHeaders);
    stream.end(body);

    return;
  }

  if (stream.destroyed) {
    return;
  }

  stream.respond(txn.outgoingHeaders, { endStream: true });
}

async function handleResponseWithTransaction(
  handleResponse: (stream: ServerHttp2Stream, txn: Transaction) => Promise<void | Error>,
  handleErrorResponse: (err: Error, stream: ServerHttp2Stream, txn: Transaction) => Promise<void>,
  options: {
    errorHandler?: TuftErrorHandler;
    params?: {
      n: number;
      key: string;
    }[];
    parseCookies?: boolean,
    parseText?: boolean | number,
    parseJson?: boolean | number,
    parseUrlEncoded?: boolean | number,
  },
  stream: ServerHttp2Stream,
  headers: IncomingHttpHeaders,
) {
  try {
    const txn = await createTransaction(stream, headers, options);

    const err = await handleResponse(stream, txn);

    if (err) {
      console.error(err);
      handleErrorResponse(err, stream, txn);
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

function createRouteHandler({
  response,
  preHandlers,
  errorHandler,
  params,
  parseCookies,
  parseText,
  parseJson,
  parseUrlEncoded,
}: TuftRoute) {
  preHandlers = Object.assign([], preHandlers);

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
    response = Object.assign({}, response);

    let { contentType, body } = response;

    contentType = contentType && mimeTypes[contentType];

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
      const boundHandleResponse = handleBodyResponseWithPreHandlers.bind(null, Object.create(response), preHandlers);
      return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleBodyResponse.bind(null, Object.create(response));
  }

  else if (response.file) {
    if (typeof response.file === 'string') {
      if (preHandlers) {
        const boundHandleResponse = handleFileResponseWithPreHandlers.bind(null, Object.create(response), preHandlers);
        return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
      }

      return handleFileResponse.bind(null, Object.create(response));
    }

    else {
      if (preHandlers) {
        const boundHandleResponse = handleFDResponseWithPreHandlers.bind(null, Object.create(response), preHandlers);
        return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
      }

      return handleFDResponse.bind(null, Object.create(response));
    }
  }

  else if (response.stream) {
    if (preHandlers) {
      const boundHandleResponse = handleStreamResponseWithPreHandlers.bind(null, Object.create(response), preHandlers);
      return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleStreamResponse.bind(null, Object.create(response));
  }

  else {
    if (preHandlers) {
      const boundHandleResponse = handleEmptyResponseWithPreHandlers.bind(null, Object.create(response), preHandlers);
      return handleResponseWithTransaction.bind(null, boundHandleResponse, boundHandleErrorResponse, options);
    }

    return handleEmptyResponse.bind(null, Object.create(response));
  }
}

export { createRouteHandler };
