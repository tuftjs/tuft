import type { ServerResponse } from 'http';
import type { TuftResponse } from '../route-map';
import { createPromise } from '../utils';

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
    tuftResponse: TuftResponse,
    response: ServerResponse,
  ) {
    const { writeStream, status } = tuftResponse;

    if (typeof writeStream !== 'function') {
      // A 'writeStream' callback was not provided, so return the passed response object.
      return tuftResponse;
    }

    if (status) {
      // Add the provided status to the outgoing headers.
      response.statusCode = status;
    }

    let isDrained = true;

    // Wait for all chunks to be written to the stream.
    await writeStream((chunk, encoding) => {
      return createPromise(done => {
        if (!isDrained) {
          response.once('drain', () => {
            if (encoding !== undefined) {
              response.setDefaultEncoding(encoding);
            }

            isDrained = response.write(chunk, done);
          });
          return;
        }

        if (encoding !== undefined) {
          response.setDefaultEncoding(encoding);
        }

        isDrained = response.write(chunk, done);
      });
    });

    // Writing is complete, so end the stream.
    response.end();
  };
}
