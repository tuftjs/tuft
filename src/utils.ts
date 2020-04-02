import type { IncomingHttpHeaders } from 'http2';
import type { TuftRouteSchema } from './route-map';

export const requestMethods = [
  'CONNECT',
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
  'TRACE',
];

Object.freeze(requestMethods);

export const pathSegmentCache = new Map();

function bufferToString(buf: Buffer): string {
  const bytes = [];
  let i = 0;
  let byte = '';

  for (const char of buf.toString('hex')) {
    byte += char;

    if (i % 2 !== 0) {
      bytes.push(byte);
      byte = '';
    }

    i++;
  }

  let str = '<Buffer';

  for (const [i, byte] of bytes.entries()) {
    str += ' ' + byte;

    if (i >= 14) {
      break;
    }
  }

  if (bytes.length > 14) {
    const moreBytes = bytes.length - 15;

    str += ` ... ${moreBytes} more byte`;

    if (moreBytes !== 1) {
      str += 's';
    }
  }

  str += '>';

  return str;
}

function formatValue(value: any): string {
  let formattedValue = value;

  if (Buffer.isBuffer(value)) {
    formattedValue = bufferToString(value);
  }

  else if (typeof value === 'string') {
    formattedValue = `\x1b[1m\x1b[32m'${value}'`;
  }

  else if (typeof value === 'number' || typeof value === 'boolean') {
    formattedValue = `\x1b[1m\x1b[33m${value}`;
  }

  else if (typeof value === 'function') {
    formattedValue = `\x1b[1m\x1b[36m[${value.constructor.name}: ${value.name}]`;
  }

  else if (typeof value === 'object' && value !== null) {
    const objectName = Array.isArray(value) ? 'Array' : 'Object';
    formattedValue = `\x1b[1m\x1b[36m[${objectName}]`;
  }

  return formattedValue + '\x1b[0m';
}

const validPathRegexp = /^\/([0-9A-Za-z-_.~%:[\]@!$&'()*+,;=/{}]+)?$/;

export function findInvalidSchemaEntry(schema: TuftRouteSchema): string | null {
  if (typeof schema !== 'object') {
    return `'${schema}' is not an object.`;
  }

  for (const [prop, value] of Object.entries(schema)) {

    switch (prop) {

      case 'method': {
        for (const method of [value].flat()) {
          const isValidMethod = typeof method === 'string' && requestMethods.includes(method.toUpperCase());

          if (!isValidMethod) {
            return `${formatValue(method)} is not a valid request method.`;
          }
        }

        continue;
      }

      case 'path': {
        const isValidPath = typeof value === 'string' && validPathRegexp.test(value);

        if (!isValidPath) {
          return `${formatValue(value)} is not a valid path.`;
        }

        continue;
      }

      case 'preHandlers': {
        for (const preHandler of [value].flat()) {
          if (typeof preHandler !== 'function') {
            return `${formatValue(preHandler)} is not a function.`;
          }
        }

        continue;
      }

      case 'response': {
        if (typeof value !== 'object' && typeof value !== 'function') {
          return `${formatValue(value)} is not an object or function.`;
        }

        continue;
      }

      default: {
        return `"${prop}" is not a valid route schema property.`;
      }

    }

  }

  return null;
}

const HTTP2_HEADER_PATH = ':path';

const headerCache = new WeakMap();

export function extractPathnameAndQueryString(headers: IncomingHttpHeaders) {
  let pathObj: { pathname: string, queryString?: string } = headerCache.get(headers);

  if (!pathObj ) {
    const path = headers[HTTP2_HEADER_PATH];

    if (!path) {
      return { pathname: undefined, queryString: undefined };
    }

    const [pathname, queryString] = path.split('?');
    pathObj = { pathname, queryString };

    headerCache.set(headers, pathObj);
  }

  return pathObj;
}
