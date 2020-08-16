import type { TuftContext } from '../context';
import { unescape } from 'querystring';
import { HTTP_HEADER_COOKIE } from '../constants';

/**
 * Returns the 'cookieParser' pre-handler function, which attaches any cookies present on the
 * incoming request to the request object under the 'cookies' property.
 */

export function createCookieParser() {
  return function cookieParser(t: TuftContext) {
    const cookiesStr = t.request.headers[HTTP_HEADER_COOKIE];
    const result: { [name: string]: string } = {};

    if (cookiesStr) {
      // There is a 'cookies' header.
      const unescapedStr = unescape(cookiesStr);

      let begin, end, str, i, key, value;

      for (begin = 0; end !== -1; begin = end + 1) {
        // Determine the end index of the current key/value pair.
        end = unescapedStr.indexOf(';', begin);

        // Extract the current key/value pair from the passed string.
        str = unescapedStr.slice(begin, end < 0 ? undefined : end);

        i = str.indexOf('=');
        key = str.slice(0, i);
        value = str.slice(i + 1);

        result[key] = value;
      }
    }

    t.request.cookies = result;
  };
}
