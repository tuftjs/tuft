import { parse } from 'querystring';
import { TuftContext, symStream } from '../context';
import { createPromise } from '../utils';
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

/**
 * Returns the 'bodyParser' pre-handler function, customized based on the included options, which
 * attaches the request body to the request object under the 'body' property. By default, the body
 * is a buffer, but can be converted to text or an object if the appropriate options are set and
 * the request body type is compatible.
 */

export function createBodyParser({ text, json, urlEncoded }: BodyParserOptions = {}) {
  let maxTextSize: number;
  let maxJsonSize: number;
  let maxUrlEncodedSize: number;

  if (typeof text === 'number') {
    // Convert bodies of type 'text/*' up to the user defined limit.
    maxTextSize = text === 0 ? Infinity : text;
  }

  else if (text === true) {
    // Convert bodies of type 'text/*' up to the default limit.
    maxTextSize = DEFAULT_MAX_BODY_SIZE;
  }

  if (typeof json === 'number') {
    // Convert bodies of type 'application/json' up to the user defined limit.
    maxJsonSize = json === 0 ? Infinity : json;
  }

  else if (json === true) {
    // Convert bodies of type 'application/json' up to the default limit.
    maxJsonSize = DEFAULT_MAX_BODY_SIZE;
  }

  if (typeof urlEncoded === 'number') {
    // Convert bodies of type 'application/x-www-form-urlencoded' up to the user defined limit.
    maxUrlEncodedSize = urlEncoded === 0 ? Infinity : urlEncoded;
  }

  else if (urlEncoded === true) {
    // Convert bodies of type 'application/x-www-form-urlencoded' up to the default limit.
    maxUrlEncodedSize = DEFAULT_MAX_BODY_SIZE;
  }

  return async function bodyParser(t: TuftContext) {
    const stream = t[symStream];

    const chunks: Buffer[] = [];

    // Add each 'chunk' of the request body to the 'chunks' array.
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Wait for the stream to end so that we know all chunks have been added.
    await createPromise(done => {
      stream.on('end', done);
    });

    let body: null | Buffer | string | { [key in string | number]: any };

    // If there is no request body, 'body' will remain as 'null'.
    body = null;

    if (chunks.length > 0) {
      // There is a request body.
      const { headers } = t.request;

      if (!headers[HTTP2_HEADER_CONTENT_LENGTH]) {
        // The 'content-length' header is missing.
        return {
          error: 'LENGTH_REQUIRED',
        };
      }

      // If there are multiple buffers, concatenate them into a single buffer.
      body = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);

      const contentType = headers[HTTP2_HEADER_CONTENT_TYPE];

      if (contentType) {
        // The 'content-type' header is present.
        if (maxTextSize && /^text\//.test(contentType)) {
          // The body should be converted to a string.
          if (body.length > maxTextSize) {
            return {
              error: 'PAYLOAD_TOO_LARGE',
            };
          }

          body = body.toString();
        }

        else if (maxJsonSize && contentType === 'application/json') {
          // The body should be converted to an object.
          if (body.length > maxJsonSize) {
            return {
              error: 'PAYLOAD_TOO_LARGE',
            };
          }

          body = JSON.parse(body.toString());
        }

        else if (maxUrlEncodedSize && contentType === 'application/x-www-form-urlencoded') {
          // The body should be converted to an object.
          if (body.length > maxUrlEncodedSize) {
            return {
              error: 'PAYLOAD_TOO_LARGE',
            };
          }

          body = parse(body.toString());
        }
      }
    }

    // Attach the parsed request body to the request object.
    t.request.body = body;
  };
}
