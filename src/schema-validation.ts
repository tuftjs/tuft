import { getSupportedRequestMethods, getHttpErrorMap } from './utils';

const validPathRegexp = /^\/([0-9A-Za-z-_.~%:[\]@!$&'()*+,;=/{}]+)?$/;
const httpErrorMap: { [key: string]: number } = getHttpErrorMap();

/**
 * Iterates over each property of the provided route schema and determines if there are any
 * invalid entries. Returns an error message string if any are found, or null otherwise.
 */

export function findInvalidSchemaEntry(schema: any) {
  if (typeof schema !== 'object' || schema === null || Buffer.isBuffer(schema)) {
    return `${formatValue(schema)} is not a valid route schema object.`;
  }

  for (const [prop, value] of Object.entries(schema)) {
    switch (prop) {
      case 'response': {
        const response = value;

        if (typeof response === 'function') {
          continue;
        }

        else if (typeof response === 'object' && response !== null) {
          const invalidResponseEntry = findInvalidResponseEntry(response);

          if (invalidResponseEntry) {
            return invalidResponseEntry;
          }

          continue;
        }

        return `${formatValue(response)} is not a valid response object.`;
      }
      case 'method': {
        for (const method of [value].flat()) {
          const methods = getSupportedRequestMethods();
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
      default:
        return `'${prop}' is not a valid route schema property.`;
    }
  }

  return null;
}

export function findInvalidResponseEntry(response: object) {
  for (const [prop, value] of Object.entries(response)) {
    switch (prop) {
      case 'error': {
        if (typeof value === 'string') {
          const isValid = httpErrorMap[value] !== undefined;

          if (!isValid) {
            return `${formatValue(value)} is not a valid value for 'error'`;
          }

          continue;
        }

        return `${formatValue(value)} is not a valid value for 'error'`;
      }
      case 'status': {
        if (typeof value !== 'number') {
          return `${formatValue(value)} is not a valid value for 'status'`;
        }

        continue;
      }
      case 'redirect': {
        if (typeof value !== 'string') {
          return `${formatValue(value)} is not a valid value for 'redirect'`;
        }

        continue;
      }
      case 'contentType': {
        if (typeof value !== 'string') {
          return `${formatValue(value)} is not a valid value for 'contentType'`;
        }

        continue;
      }
      case 'body': {
        continue;
      }
      case 'stream': {
        if (typeof value !== 'function') {
          return `${formatValue(value)} is not a valid value for 'stream'`;
        }

        continue;
      }
      case 'file': {
        if (typeof value !== 'string') {
          return `${formatValue(value)} is not a valid value for 'file'`;
        }

        continue;
      }
      default:
        return `'${prop}' is not a valid response object property.`;
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
