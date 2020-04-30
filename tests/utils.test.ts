import { constants } from 'http2';
import { getSupportedRequestMethods, createPromise, statCheck, onError } from '../src/utils';
import {
  HTTP2_METHOD_DELETE,
  HTTP2_METHOD_GET,
  HTTP2_METHOD_HEAD,
  HTTP2_METHOD_OPTIONS,
  HTTP2_METHOD_PATCH,
  HTTP2_METHOD_POST,
  HTTP2_METHOD_PUT,
  HTTP2_METHOD_TRACE,
  HTTP2_HEADER_STATUS,
} from '../src/constants';

const {
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
} = constants;

const mockStream = {
  respond: jest.fn(),
  end: jest.fn(),
  emit: jest.fn(),
};

beforeEach(() => {
  mockStream.respond.mockClear();
  mockStream.end.mockClear();
  mockStream.emit.mockClear();
});

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

/**
 * statCheck()
 */

describe('statCheck()', () => {
  describe('when passed a mock stat argument', () => {
    test('calls stat.mtime.toUTCString()', () => {
      const date = new Date();
      const mockStat = {
        mtime: {
          toUTCString: jest.fn(() => {
            return date.toUTCString();
          }),
        },
      };
      //@ts-ignore
      const result = statCheck(mockStat, {});

      expect(result).toBeUndefined();
      expect(mockStat.mtime.toUTCString).toHaveBeenCalled();
    });
  });
});

/**
 * onError()
 */

describe('onError()', () => {
  describe('when passed a stream and a `ENOENT` error', () => {
    test('stream.respond() is called with the expected argument', () => {
      const err = Error('mock error') as NodeJS.ErrnoException;
      err.code = 'ENOENT';

      const result = onError(
        //@ts-ignore
        mockStream,
        err,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_NOT_FOUND,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalled();
      expect(mockStream.emit).toHaveBeenCalledWith('error', err);
    });
  });

  describe('when passed a stream and a generic error', () => {
    test('stream.respond() is called with the expected argument', () => {
      const err = Error('mock error') as NodeJS.ErrnoException;
      const result = onError(
        //@ts-ignore
        mockStream,
        err,
      );

      const expectedHeaders = {
        [HTTP2_HEADER_STATUS]: HTTP_STATUS_INTERNAL_SERVER_ERROR,
      };

      expect(result).toBeUndefined();
      expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
      expect(mockStream.end).toHaveBeenCalled();
      expect(mockStream.emit).toHaveBeenCalledWith('error', err);
    });
  });
});
