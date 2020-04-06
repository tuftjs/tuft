import type { TuftRouteSchema } from './route-map';

import { getValidRequestMethods } from './utils';

const validPathRegexp = /^\/([0-9A-Za-z-_.~%:[\]@!$&'()*+,;=/{}]+)?$/;

export function findInvalidSchemaEntry(schema: TuftRouteSchema): TypeError | null {
  if (typeof schema !== 'object' || schema === null) {
    return TypeError(`${formatValue(schema)} is not an object.`);
  }

  for (const [prop, value] of Object.entries(schema)) {
    switch (prop) {
      case 'method': {
        for (const method of [value].flat()) {
          const methods = getValidRequestMethods();
          const isValidMethod = typeof method === 'string' && methods.includes(method.toUpperCase());

          if (!isValidMethod) {
            return TypeError(`${formatValue(method)} is not a valid request method.`);
          }
        }

        continue;
      }
      case 'path': {
        const isValidPath = typeof value === 'string' && validPathRegexp.test(value);

        if (!isValidPath) {
          return TypeError(`${formatValue(value)} is not a valid path.`);
        }

        continue;
      }
      case 'preHandlers': {
        for (const preHandler of [value].flat()) {
          if (typeof preHandler !== 'function') {
            return TypeError(`${formatValue(preHandler)} is not a function.`);
          }
        }

        continue;
      }
      case 'response': {
        if (typeof value !== 'object' && typeof value !== 'function') {
          return TypeError(`${formatValue(value)} is not an object or function.`);
        }

        continue;
      }
      case 'errorHandler': {
        if (typeof value !== 'function') {
          return TypeError(`${formatValue(value)} is not a function.`);
        }

        continue;
      }
      default:
        return TypeError(`'${prop}' is not a valid route schema property.`);
    }
  }

  return null;
}

function formatValue(value: any): string {
  let result: string;

  switch (typeof value) {
    case 'boolean':
      result = `\x1b[1m\x1b[33m${value}`;
      break;
    case 'number':
      result = `\x1b[1m\x1b[33m${value}`;
      break;
    case 'bigint':
      result = `\x1b[1m\x1b[33m${value}`;
      break;
    case 'string':
      result = `\x1b[1m\x1b[32m'${value}'`;
      break;
    case 'symbol':
      result = `\x1b[1m\x1b[32m${value.toString()}`;
      break;
    case 'function':
      result = `\x1b[1m\x1b[36m[${value.constructor.name}: ${value.name}]`;
      break;
    case 'object': {
      if (value === null) {
        result = value;
      }

      else if (Buffer.isBuffer(value)) {
        result = bufferToString(value);
      }

      else {
        const name = Array.isArray(value) ? 'Array' : 'Object';
        result = `\x1b[1m\x1b[36m[${name}]`;
      }

      break;
    }
    default:
      result = value;
  }

  return result + '\x1b[0m';
}

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

  if (bytes.length > 15) {
    const moreBytes = bytes.length - 15;

    str += ` ... ${moreBytes} more byte`;

    if (moreBytes !== 1) {
      str += 's';
    }
  }

  str += '>';

  return str;
}