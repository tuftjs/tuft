import type { TuftContext, SetCookieOptions } from '../context';

import { responseSymbol } from '../context';
import { randomBytes } from 'crypto';

interface TuftSessionOptions {
  name?: string,
  cookieName?: string,
  cookieOptions?: SetCookieOptions,
  encoding?: 'hex' | 'base64',
  store?: {
    get: (name: string) => object | undefined | Promise<object | undefined>,
    set: (name: string, value: object) => void | Promise<void>,
    delete: (name: string) => void | Promise<void>,
    [key: string]: any,
  },
}

const DEFAULT_SESSION_NAME = 'session';
const DEFAULT_COOKIE_NAME_SUFFIX = '_id';
const DEFAULT_SESSION_ID_ENCODING = 'base64';
const SESSION_ID_SIZE = 24; // bytes

export function createSession(options: TuftSessionOptions = {}) {
  const {
    name,
    cookieName,
    cookieOptions,
    store,
    encoding = DEFAULT_SESSION_ID_ENCODING,
  } = options;


  const sessionStore = store ?? new Map();
  const sessionName = name ?? DEFAULT_SESSION_NAME;
  const sessionCookieName = cookieName ?? sessionName + DEFAULT_COOKIE_NAME_SUFFIX;

  class TuftSession {
    readonly #id: string;
    readonly #context: TuftContext;
    [key: string]: any;

    constructor(id: string, t: TuftContext, data: { [key: string]: any } = {}) {
      this.#id = id;
      this.#context = t;

      // Add each entry of the data object to the session object.
      for (const prop in data) {
        this[prop] = data[prop];
      }

      t.setCookie(sessionCookieName, id, cookieOptions);
    }

    /**
     * Destroys the session by removing the indexed entry from the session store and setting the
     * maximum age of the cookie to zero.
     */

    async destroy() {
      await sessionStore.delete(this.#id);
      this.#context.setCookie(sessionCookieName, this.#id, { maxAge: 0 });
    }
  }

  return async function session(t: TuftContext) {
    const { cookies } = t.request;

    let sessionId = cookies?.[sessionCookieName];
    let sessionObj: TuftSession | undefined;

    if (sessionId) {
      // The client has provided a session ID.
      const data = await sessionStore.get(sessionId);

      if (data) {
        // Data for the provided session ID has been found.
        sessionObj = new TuftSession(sessionId, t, data);
      }
    }

    if (!sessionObj) {
      // There is no valid session object for the current client, so create a new one.
      sessionId = (await randomBytesAsync(SESSION_ID_SIZE)).toString(encoding);
      sessionObj = new TuftSession(sessionId, t);
    }

    // Add the session object to the request object.
    t.request[sessionName] = sessionObj;

    // Add data from the current session to the store only AFTER the response stream has
    // finished, to ensure any changes made to the session data are persisted.
    t[responseSymbol].on('finish', async () => {
      try {
        await sessionStore.set(sessionId as string, sessionObj as TuftSession);
      }

      catch (err) {
        console.error(err);
      }
    });
  };
}

/**
 * A wrapper function for the native asynchronous randomBytes function that returns a promise
 * instead of using a callback.
 */

export function randomBytesAsync(size: number) {
  return new Promise<Buffer>((resolve, reject) => {
    randomBytes(size, (err, buf) => {
      err ? reject(err) : resolve(buf);
    });
  });
}
