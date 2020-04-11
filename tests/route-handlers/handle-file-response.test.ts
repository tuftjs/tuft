import fs = require('fs');
import { handleFileResponse, handleFileResponseWithPreHandlers } from '../../src/route-handlers';

const mockStream = {
  respond: jest.fn(),
  respondWithFD: jest.fn(),
  write: jest.fn((_, __, callback) => callback()),
  end: jest.fn(),
  close: jest.fn(),
};

const mockTuftContext: any = {
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockTuftContext.outgoingHeaders[key] = value;
  }),
};

//@ts-ignore
const mockFsOpen = jest.spyOn(fs.promises, 'open').mockImplementation(async () => {
  return {
    stat: async () => {
      return { size: 42 };
    },
  };
});

afterAll(() => {
  mockFsOpen.mockRestore();
});

describe('handleFileResponse()', () => {
  beforeEach(() => {
    mockStream.respondWithFD.mockClear();
  });

  test('stream.respondWithFD() is called', async () => {
    const responseObj = { file: __filename };

    const result = handleFileResponse(
      responseObj,
      //@ts-ignore
      mockStream
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockStream.respondWithFD).toHaveBeenCalled();
  });
});

describe('handleFileResponseWithPreHandlers()', () => {
  beforeEach(() => {
    mockTuftContext.setHeader.mockClear();
    mockStream.respondWithFD.mockClear();
  });

  test('stream.respondWithFD() is called', async () => {
    const responseObj = { file: __filename };
    const preHandlers = [() => {}];

    const result = handleFileResponseWithPreHandlers(
      responseObj,
      preHandlers,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockTuftContext.setHeader).toHaveBeenCalled();
    expect(mockStream.respondWithFD).toHaveBeenCalled();
  });

  test('returns an error when a pre-handler throws an error', async () => {
    const err = Error('pre-handler error');
    const responseObj = { file: __filename };
    const preHandlers = [() => { throw err }];

    const result = handleFileResponseWithPreHandlers(
      responseObj,
      preHandlers,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toEqual(err);
    expect(mockTuftContext.setHeader).not.toHaveBeenCalled();
    expect(mockStream.respondWithFD).not.toHaveBeenCalled();
  });
});
