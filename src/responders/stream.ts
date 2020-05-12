import type { ServerHttp2Stream, OutgoingHttpHeaders } from 'http2';
import type { TuftResponse } from '../route-map';
import { createPromise } from '../utils';
import { HTTP2_HEADER_STATUS } from '../constants';

export function createStreamResponder() {
  return async function streamResponder(
    response: TuftResponse,
    stream: ServerHttp2Stream,
    outgoingHeaders: OutgoingHttpHeaders,
  ) {
    const { writeStream, status } = response;

    if (typeof writeStream === 'function') {
      if (status) {
        outgoingHeaders[HTTP2_HEADER_STATUS] = status;
      }

      stream.respond(outgoingHeaders);

      await response.writeStream((chunk: any, encoding?: string) => {
        return createPromise(done => {
          stream.write(chunk, encoding, done);
        });
      });

      stream.end();
      return;
    }

    return response;
  };
}
