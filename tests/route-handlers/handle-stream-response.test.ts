import {
  handleStreamResponse,
  handleStreamResponseWithPreHandlers,
} from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS } from '../../src/constants';

const mockErrorHandler = jest.fn();

const mockStream = {
  respond: jest.fn(),
  respondWithFD: jest.fn(),
  write: jest.fn((_, __, callback) => callback()),
  end: jest.fn(),
  close: jest.fn(),
};

const mockStreamWithError = {
  respond: jest.fn(),
  write: jest.fn((_, __, callback) => {
    callback(Error('mock stream error'));
  }),
  end: jest.fn(),
};

const mockTuftContext: any = {
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockTuftContext.outgoingHeaders[key] = value;
  }),
};

const mockStreamHandler = jest.fn(async (write: any) => {
  await write('foo');
  await write('bar');
  await write('baz');
});

describe('handleStreamResponse()', () => {
  beforeEach(() => {
    mockStream.respond.mockClear();
    mockStream.write.mockClear();
    mockStream.end.mockClear();
    mockStreamWithError.respond.mockClear();
    mockStreamWithError.write.mockClear();
    mockStreamWithError.end.mockClear();
    mockStreamHandler.mockClear();
  });

  test('stream.write() and stream.end() are called', async () => {
    const responseObj = {
      status: 418,
      stream: mockStreamHandler,
    };

    const result = handleStreamResponse(
      responseObj,
      //@ts-ignore
      mockStream,
    );

    const expectedHeaders = { [HTTP2_HEADER_STATUS]: 418 };

    await expect(result).resolves.toBeUndefined();
    expect(mockStreamHandler).toHaveBeenCalled();
    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    expect(mockStream.write).toHaveBeenCalled();
    expect(mockStream.end).toHaveBeenCalled();
  });

  test('stream.write() is called and then rejects with an error', async () => {
    const responseObj = {
      status: 418,
      stream: mockStreamHandler,
    };

    const result = handleStreamResponse(
      responseObj,
      //@ts-ignore
      mockStreamWithError,
    );

    const expectedHeaders = { [HTTP2_HEADER_STATUS]: 418 };

    await expect(result).rejects.toThrow('mock stream error');
    expect(mockStreamHandler).toHaveBeenCalled();
    expect(mockStreamWithError.respond).toHaveBeenCalledWith(expectedHeaders);
    expect(mockStreamWithError.write).toHaveBeenCalled();
    expect(mockStreamWithError.end).not.toHaveBeenCalled();
  });
});

describe('handleStreamResponseWithPreHandlers()', () => {
  beforeEach(() => {
    mockErrorHandler.mockClear();
    mockStream.respond.mockClear();
    mockStream.write.mockClear();
    mockStream.end.mockClear();
    mockStreamWithError.respond.mockClear();
    mockStreamWithError.write.mockClear();
    mockStreamWithError.end.mockClear();
    mockTuftContext.outgoingHeaders = {};
    mockTuftContext.setHeader.mockClear();
    mockStreamHandler.mockClear();
  });

  test('stream.write() and stream.end() are called', async () => {
    const responseObj = {
      status: 418,
      stream: mockStreamHandler,
    };
    const preHandlers = [() => {}];

    const result = handleStreamResponseWithPreHandlers(
      mockErrorHandler,
      preHandlers,
      responseObj,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, 418);
    expect(mockStreamHandler).toHaveBeenCalled();
    expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
    expect(mockStream.write).toHaveBeenCalled();
    expect(mockStream.end).toHaveBeenCalled();
  });

  test('stream.write() is called and then rejects with an error', async () => {
    const responseObj = {
      status: 418,
      stream: mockStreamHandler,
    };
    const preHandlers = [() => {}];

    const result = handleStreamResponseWithPreHandlers(
      mockErrorHandler,
      preHandlers,
      responseObj,
      //@ts-ignore
      mockStreamWithError,
      mockTuftContext,
    );

    await expect(result).rejects.toThrow('mock stream error');
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, 418);
    expect(mockStreamHandler).toHaveBeenCalled();
    expect(mockStreamWithError.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
    expect(mockStreamWithError.write).toHaveBeenCalled();
    expect(mockStreamWithError.end).not.toHaveBeenCalled();
  });

  test('calls the error handler when a pre-handler throws an error', async () => {
    const err = Error('pre-handler error');
    const responseObj = { stream: mockStreamHandler };
    const preHandlers =[() => { throw err; }];

    const result = handleStreamResponseWithPreHandlers(
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
    expect(mockStreamHandler).not.toHaveBeenCalled();
    expect(mockStream.respond).not.toHaveBeenCalled();
    expect(mockStream.write).not.toHaveBeenCalled();
    expect(mockStream.end).not.toHaveBeenCalled();
  });
});
