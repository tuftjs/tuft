import fs = require('fs');
import { handleFileResponse, handleFileResponseWithPreHandlers } from '../../src/route-handlers';

const mockErrorHandler = jest.fn();

const mockStream = {
  respondWithFD: jest.fn(),
};

const mockTuftContext: any = {
  request: {},
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
    mockErrorHandler.mockClear();
    mockTuftContext.setHeader.mockClear();
    mockStream.respondWithFD.mockClear();
  });

  test('stream.respondWithFD() is called', async () => {
    const responseObj = { file: __filename };
    const preHandlers = [() => {}];

    const result = handleFileResponseWithPreHandlers(
      mockErrorHandler,
      preHandlers,
      responseObj,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockErrorHandler).not.toHaveBeenCalled();
    expect(mockTuftContext.setHeader).toHaveBeenCalled();
    expect(mockStream.respondWithFD).toHaveBeenCalled();
  });

  test('stream.respondWithFD() is called when the pre-handler returns a result', async () => {
    const responseObj = { file: __filename };
    const plugins = [() => {}];

    const result = handleFileResponseWithPreHandlers(
      mockErrorHandler,
      plugins,
      responseObj,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockErrorHandler).not.toHaveBeenCalled();
    expect(mockTuftContext.setHeader).toHaveBeenCalled();
    expect(mockStream.respondWithFD).toHaveBeenCalled();
  });

  test('returns an error when a pre-handler throws an error', async () => {
    const err = Error('pre-handler error');
    const responseObj = { file: __filename };
    const preHandlers = [() => { throw err; }];

    const result = handleFileResponseWithPreHandlers(
      mockErrorHandler,
      preHandlers,
      responseObj,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockErrorHandler).toHaveBeenCalledWith(err, mockStream, mockTuftContext);
    expect(mockTuftContext.setHeader).not.toHaveBeenCalled();
    expect(mockStream.respondWithFD).not.toHaveBeenCalled();
  });
});
