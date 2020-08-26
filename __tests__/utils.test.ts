import { createPromise } from '../src/utils';

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
