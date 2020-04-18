import { getValidRequestMethods } from './utils';

const validPathRegexp = /^\/([0-9A-Za-z-_.~%:[\]@!$&'()*+,;=/{}]+)?$/;

/**
 * Iterates over each property of the provided route schema and determines if there are any
 * invalid entries. Returns an error message string if any are found, or null otherwise.
 */

export function findInvalidSchemaEntry(schema: any): string | null {
  if (typeof schema !== 'object' || schema === null || Buffer.isBuffer(schema)) {
    return `${formatValue(schema)} is not a valid route schema object.`;
  }

  for (const [prop, value] of Object.entries(schema)) {
    switch (prop) {
      case 'method': {
        for (const method of [value].flat()) {
          const methods = getValidRequestMethods();
          const isValidMethod = methods.includes(method.toUpperCase?.());

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
      case 'response': {
        if ((value === null || typeof value !== 'object') && typeof value !== 'function') {
          return `${formatValue(value)} is not a valid response object.`;
        }

        continue;
      }
      case 'errorHandler': {
        if (typeof value !== 'function') {
          return `${formatValue(value)} is not a valid error handler.`;
        }

        continue;
      }
      default:
        return `'${prop}' is not a valid route schema property.`;
    }
  }

  return null;
}

/**
 * Converts the provided value to a string that is suitable for including in an error message.
 */

function formatValue(value: any): string {
  let result: string;

  switch (typeof value) {
    case 'string':
      result = `'${value}'`;
      break;
    case 'symbol':
      result = value.toString();
      break;
    case 'function':
      result = `[${value.constructor.name}: ${value.name.length > 0 ? value.name : 'anonymous'}]`;
      break;
    case 'object': {
      if (value === null) {
        result = value;
        break;
      }

      else if (Buffer.isBuffer(value)) {
        result = '[Buffer]';
        break;
      }

      result = Array.isArray(value) ? '[Array]' : '[Object]';
      break;
    }
    default:
      result = value;
  }

  return result;
}
