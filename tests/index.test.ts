import { TuftRouteMap } from '../src/route-map';
import { createSearchParams } from '../src';
import { createCookieParser } from '../src';
import { createBodyParser } from '../src';
import { createWriteStreamResponder } from '../src';
import { createPromise } from '../src';
import { tuft } from '../src';

describe('Named exported functions', () => {
  test('are defined', () => {
    expect(createSearchParams).toBeDefined();
    expect(createCookieParser).toBeDefined();
    expect(createBodyParser).toBeDefined();
    expect(createWriteStreamResponder).toBeDefined();
    expect(createPromise).toBeDefined();
  });
});

describe('Invoking the default exported function', () => {
  test('returns an instance of TuftRouteMap', () => {
    expect(tuft()).toBeInstanceOf(TuftRouteMap);
  });
});
