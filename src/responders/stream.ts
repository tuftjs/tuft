import type { ServerHttp2Stream, OutgoingHttpHeaders } from 'http2';
import type { TuftResponse } from '../route-map';
import { createPromise } from '../utils';

export async function streamResponder(
  response: TuftResponse,
  stream: ServerHttp2Stream,
  outgoingHeaders: OutgoingHttpHeaders,
) {
  if (typeof response.writeStream === 'function') {
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
}
