import {
  HTTP2_METHOD_CONENCT,
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_GET,
  HTTP2_METHOD_HEAD,
  HTTP2_METHOD_OPTIONS,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
  HTTP2_METHOD_TRACE,
} from './constants';

export function getValidRequestMethods() {
  return [
    HTTP2_METHOD_CONENCT,
    HTTP2_METHOD_DELETE,
    HTTP2_METHOD_GET,
    HTTP2_METHOD_HEAD,
    HTTP2_METHOD_OPTIONS,
    HTTP2_METHOD_PATCH,
    HTTP2_METHOD_POST,
    HTTP2_METHOD_PUT,
    HTTP2_METHOD_TRACE,
  ];
}

type DoneCallback = (err?: Error | null, ...args: any[]) => void;

export function createPromise(callback: (done: DoneCallback) => void) {
  return new Promise((resolve, reject) => {
    const done: DoneCallback = (err, ...args) => {
      err ? reject(err) : resolve(args);
    };

    callback(done);
  });
}
