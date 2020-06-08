import type { ServerHttp2Stream, OutgoingHttpHeaders } from 'http2';
import type { TuftResponse } from '../route-map';
import { createPromise } from '../utils';
import { HTTP2_HEADER_STATUS } from '../constants';

type StreamWriter = (chunk: any, encoding?: BufferEncoding) => Promise<Error | any[]>;

declare module '../route-map' {
  interface TuftResponse {
    writeStream?: (write: StreamWriter) => void | Promise<void>;
  }
}

/**
 * Returns the 'streamResponder' responder function, which allows writing multiple chunks of data to
 * the outgoing response body.
 */

export function createWriteStreamResponder() {
  return async function writeStreamResponder(
    response: TuftResponse,
    stream: ServerHttp2Stream,
    outgoingHeaders: OutgoingHttpHeaders,
  ) {
    const { writeStream, status } = response;

    if (typeof writeStream === 'function') {
      // A callback has been provided.
      if (status) {
        // Add the provided status to the outgoing headers.
        outgoingHeaders[HTTP2_HEADER_STATUS] = status;
      }

      stream.respond(outgoingHeaders);

      let isDrained = true;

      // Wait for all chunks to be written to the stream.
      await writeStream((chunk, encoding) => {
        return createPromise(done => {
          if (!isDrained) {
            stream.once('drain', () => {
              isDrained = stream.write(chunk, encoding, done);
            });
            return;
          }

          isDrained = stream.write(chunk, encoding, done);
        });
      });

      // Writing is complete, so end the stream.
      stream.end();
      return;
    }

    // A 'writeStream' callback was not provided, so return the passed response object.
    return response;
  };
}
