import { finished as finishedStream } from 'stream';
import { promisify } from 'util';
import { unescape } from 'querystring';
import { TuftContext, streamSymbol } from '../context';
import {
  DEFAULT_MAX_BODY_SIZE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE,
} from '../constants';

const finished = promisify(finishedStream);

/**
 * Returns the 'bodyParser' pre-handler function, customized based on the included options, which
 * attaches the request body to the request object under the 'body' property. By default, the body
 * is a buffer, but can be converted to text or an object if the appropriate options are set and
 * the request body type is compatible.
 */

export function createBodyParser(type: string, maxSize: number = DEFAULT_MAX_BODY_SIZE) {
  let regexp: RegExp;
  let convertFn: (buf: Buffer) => Buffer | string | object;

  switch (type) {
    case 'raw':
      regexp = /^application\/octet-stream/;
      convertFn = convertRaw;
      break;
    case 'text':
      regexp = /^text\//;
      convertFn = convertText;
      break;
    case 'json':
      regexp = /^application\/json/;
      convertFn = convertJson;
      break;
    case 'urlEncoded':
      regexp = /^application\/x-www-form-urlencoded/;
      convertFn = convertUrlEncoded;
      break;
  }

  if (maxSize <= 0) {
    maxSize = Infinity;
  }

  return async function bodyParser(t: TuftContext) {
    const stream = t[streamSymbol];
    const { headers } = t.request;

    const contentType = headers[HTTP2_HEADER_CONTENT_TYPE];

    if (!contentType || !regexp.test(contentType)) {
      return;
    }

    let expectedContentLength: string | number | undefined = headers[HTTP2_HEADER_CONTENT_LENGTH];

    if (!expectedContentLength) {
      // The 'content-length' header is missing.
      return {
        error: 'LENGTH_REQUIRED',
      };
    }

    expectedContentLength = parseInt(expectedContentLength, 10);

    if (Number.isNaN(expectedContentLength)) {
      // The 'content-length' header string does not parse to a valid number.
      return {
        error: 'BAD_REQUEST',
      };
    }

    if (expectedContentLength > maxSize) {
      return {
        error: 'PAYLOAD_TOO_LARGE',
      };
    }

    const buf = Buffer.allocUnsafe(expectedContentLength);
    let pos = 0;
    let isTooLarge = false;

    stream.on('data', (chunk: Buffer) => {
      const offset = pos + chunk.length;

      if (offset > (expectedContentLength as number)) {
        isTooLarge = true;
        return;
      }

      chunk.copy(buf, pos);
      pos = offset;
    });

    // Wait for the stream to end so that we know all chunks have been added.
    await finished(stream, { writable: false });

    if (isTooLarge) {
      return {
        error: 'PAYLOAD_TOO_LARGE',
      };
    }

    if (pos !== expectedContentLength) {
      return {
        error: 'BAD_REQUEST',
      };
    }

    t.request.body = convertFn(buf);
  };
}

function convertRaw(buf: Buffer) {
  return buf;
}

function convertText(buf: Buffer) {
  return buf.toString('utf-8');
}

function convertJson(buf: Buffer) {
  return JSON.parse(buf.toString('utf-8'));
}

function convertUrlEncoded(buf: Buffer) {
  return parseUrlEncodedStr(buf.toString('utf-8'));
}

/**
 * Accepts a string that represents an 'application/x-www-form-urlencoded' request body, and returns
 * the key/value pairs in that string in the form of an object.
 */

function parseUrlEncodedStr(urlEncodedStr: string): { [key: string]: string } {
  const unescapedStr = unescape(urlEncodedStr);
  const result: { [key: string]: string } = {};

  let begin, end, str, i, key, value;

  for (begin = 0, end; end !== -1; begin = end + 1) {
    // Determine the end index of the current key/value pair.
    end = unescapedStr.indexOf('&', begin);

    // Extract the current key/value pair from the passed string.
    str = unescapedStr.slice(begin, end < 0 ? undefined : end);

    i = str.indexOf('=');
    key = str.slice(0, i);
    value = str.slice(i + 1);

    result[key] = value;
  }

  return result;
}
