import type { TuftContext } from '../context';
import {
  DEFAULT_MAX_BODY_SIZE,
  HTTP2_HEADER_CONTENT_LENGTH,
  HTTP2_HEADER_CONTENT_TYPE,
} from '../constants';


type BodyParserOptions = {
  text?: boolean | number,
  json?: boolean | number,
  urlEncoded?: boolean | number,
}

export function bodyParserPlugin({ text, json, urlEncoded }: BodyParserOptions = {}) {
  let maxTextSize: number;
  let maxJsonSize: number;
  let maxUrlEncodedSize: number;

  if (typeof text === 'number') {
    maxTextSize = text === 0 ? Infinity : text;
  }

  else if (text === true) {
    maxTextSize = DEFAULT_MAX_BODY_SIZE;
  }

  if (typeof json === 'number') {
    maxJsonSize = json === 0 ? Infinity : json;
  }

  else if (json === true) {
    maxJsonSize = DEFAULT_MAX_BODY_SIZE;
  }

  if (typeof urlEncoded === 'number') {
    maxUrlEncodedSize = urlEncoded === 0 ? Infinity : urlEncoded;
  }

  else if (urlEncoded === true) {
    maxUrlEncodedSize = DEFAULT_MAX_BODY_SIZE;
  }

  return async function bodyParser(t: TuftContext) {
    const { stream, request } = t;

    const chunks: Buffer[] = [];

    await new Promise<void>(resolve => {
      stream.on('data', (chunk: any) => {
        chunks.push(chunk as Buffer);
      });

      stream.on('end', resolve);
    });

    let body: null | Buffer | string | { [key in string | number]: any };

    body = null;

    if (chunks.length > 0) {
      const { headers } = request;
      const contentLengthString = headers[HTTP2_HEADER_CONTENT_LENGTH];

      if (!contentLengthString) {
        // The 'content-length' header is missing.
        throw Error('ERR_CONTENT_LENGTH_REQUIRED');
      }

      body = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);

      if (body.length !== parseInt(contentLengthString)) {
        // Value of the 'content-length' header does not match the size of the request body.
        throw Error('ERR_CONTENT_LENGTH_MISMATCH');
      }

      const contentType = headers[HTTP2_HEADER_CONTENT_TYPE];

      if (contentType) {
        if (maxTextSize && /^text\//.test(contentType)) {
          if (body.length > maxTextSize) {
            throw Error('ERR_BODY_LIMIT_EXCEEDED');
          }

          body = body.toString();
        }

        else if (maxJsonSize && contentType === 'application/json') {
          if (body.length > maxJsonSize) {
            throw Error('ERR_BODY_LIMIT_EXCEEDED');
          }

          body = JSON.parse(body.toString());
        }

        else if (maxUrlEncodedSize && contentType === 'application/x-www-form-urlencoded') {
          if (body.length > maxUrlEncodedSize) {
            throw Error('ERR_BODY_LIMIT_EXCEEDED');
          }

          body = parseUrlEncodedStr(body.toString());
        }
      }
    }

    t.request.body = body;
  };
}

/**
 * Accepts a string that represents an 'application/x-www-form-urlencoded' request body, and returns
 * the key/value pairs in that string in the form of an object.
 */

function parseUrlEncodedStr(urlEncodedStr: string): { [key: string]: string } {
  const result: { [key: string]: string } = {};

  let begin, end, str, i, name, value;

  for (begin = 0, end; end !== -1; begin = end + 1) {
    end = urlEncodedStr.indexOf('&', begin);

    str = urlEncodedStr.slice(begin, end < 0 ? undefined : end);

    i = str.indexOf('=');
    name = str.slice(0, i);
    value = str.slice(i + 1);

    result[name] = value;
  }

  return result;
}