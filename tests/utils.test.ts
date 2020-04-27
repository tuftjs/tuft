import { getSupportedRequestMethods, createPromise } from '../src/utils';
import {
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_GET,
  HTTP2_METHOD_HEAD,
  HTTP2_METHOD_OPTIONS,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
  HTTP2_METHOD_TRACE,
} from '../src/constants';

/**
 * getValidRequestMethods()
 */

describe('getValidRequestMethods()', () => {
  test('returns an array of HTTP request methods as strings', () => {
    const result = getSupportedRequestMethods();
    expect(result).toContain(HTTP2_METHOD_DELETE);
    expect(result).toContain(HTTP2_METHOD_GET);
    expect(result).toContain(HTTP2_METHOD_HEAD);
    expect(result).toContain(HTTP2_METHOD_OPTIONS);
    expect(result).toContain(HTTP2_METHOD_PATCH);
    expect(result).toContain(HTTP2_METHOD_POST);
    expect(result).toContain(HTTP2_METHOD_PUT);
    expect(result).toContain(HTTP2_METHOD_TRACE);
  });
});

/**
 * createPromise()
 */

describe('createPromise()', () => {
  test('returns a promise that resolves to the expected value', async () => {
    const result = createPromise(done => done(null, 42));
    await expect(result).resolves.toEqual([42]);
  });

  test('returns a promise that rejects with an error', async () => {
    const err = Error('mock error');
    const result = createPromise(done => done(err));
    await expect(result).rejects.toThrow(err.message);
  });
});
