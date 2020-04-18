import type { TuftContext } from '../context';
import { HTTP2_HEADER_COOKIE } from '../constants';

export function cookieParserPlugin() {
  return function cookieParser(t: TuftContext) {
    const cookiesStr = t.request.headers[HTTP2_HEADER_COOKIE];
    const result: { [name: string]: string } = {};

    if (cookiesStr) {
      let begin, end, str, i, name, value;

      for (begin = 0; end !== -1; begin = end + 1) {
        end = cookiesStr.indexOf(';', begin);
        str = cookiesStr.slice(begin, end < 0 ? undefined : end);

        i = str.indexOf('=');
        name = str.slice(0, i);
        value = str.slice(i + 1);

        result[name] = value;
      }
    }

    t.request.cookies = result;
  };
}
