import { TuftRouteMap } from '../src/route-map';
import {
  createSearchParams,
  createCookieParser,
  createBodyParser,
  createSession,
  createWriteStreamResponder,
  createPromise,
  tuft,
} from '../src';

describe('Named exported functions', () => {
  test('are defined', () => {
    expect(createSearchParams).toBeDefined();
    expect(createCookieParser).toBeDefined();
    expect(createBodyParser).toBeDefined();
    expect(createSession).toBeDefined();
    expect(createWriteStreamResponder).toBeDefined();
    expect(createPromise).toBeDefined();
  });
});

describe('Invoking the default exported function', () => {
  test('returns an instance of TuftRouteMap', () => {
    expect(tuft()).toBeInstanceOf(TuftRouteMap);
  });
});
