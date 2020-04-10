import { handleBodyResponse, handleBodyResponseWithPreHandlers } from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_CONTENT_LENGTH, HTTP2_HEADER_CONTENT_TYPE } from '../../src/constants';

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

describe('handleBodyResponse()', () => {
  beforeAll(() => {
    mockStream.respond.mockClear();
    mockStream.end.mockClear();
  });

  test('stream.respond() is called', () => {
    const body = 'Hello, world!';
    const responseObj = {
      status: 418,
      contentType: 'text/plain',
      body,
    };

    const result = handleBodyResponse(
      responseObj,
      //@ts-ignore
      mockStream,
    );

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: 418,
      [HTTP2_HEADER_CONTENT_LENGTH]: body.length,
      [HTTP2_HEADER_CONTENT_TYPE]: 'text/plain',
    };

    expect(result).toBeUndefined();
    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders);
    expect(mockStream.end).toHaveBeenCalled();
  });
});

describe('handleBodyResponseWithPreHandlers()', () => {
  beforeEach(() => {
    mockTuftContext.outgoingHeaders = {};
    mockTuftContext.setHeader.mockClear();
    mockStream.respond.mockClear();
    mockStream.end.mockClear();
  });

  test('stream.respond() is called', async () => {
    const body = 'Hello, world!';
    const responseObj = {
      status: 418,
      contentType: 'text/plain',
      body,
    };
    const preHandlers = [() => {}];

    const result = handleBodyResponseWithPreHandlers(
      responseObj,
      preHandlers,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, 418);
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_LENGTH, body.length);
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_CONTENT_TYPE, 'text/plain');
    expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders);
    expect(mockStream.end).toHaveBeenCalled();
  });

  test('returns an error when a pre-handler throws an error', async () => {
    const err = Error('pre-handler error');
    const body = 'Hello, world!';
    const responseObj = {
      status: 418,
      contentType: 'text/plain',
      body,
    };
    const preHandlers = [() => { throw err }];

    const result = handleBodyResponseWithPreHandlers(
      responseObj,
      preHandlers,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toEqual(err);
    expect(mockTuftContext.setHeader).not.toHaveBeenCalled();
    expect(mockStream.respond).not.toHaveBeenCalled();
    expect(mockStream.end).not.toHaveBeenCalled();
  });
});
