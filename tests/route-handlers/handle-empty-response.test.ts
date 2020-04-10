import { handleEmptyResponse, handleEmptyResponseWithPreHandlers } from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS } from '../../src/constants';

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

describe('handleEmptyResponse()', () => {
  beforeAll(() => {
    mockStream.respond.mockClear();
  });

  test('stream.respond() is called', () => {
    const responseObj = { status: 418 };

    const result = handleEmptyResponse(
      responseObj,
      //@ts-ignore
      mockStream,
    );

    const expectedHeaders = { [HTTP2_HEADER_STATUS]: 418 };

    expect(result).toBeUndefined();
    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
  });
});

describe('handleEmptyResponseWithPreHandlers()', () => {
  beforeEach(() => {
    mockTuftContext.outgoingHeaders = {};
    mockTuftContext.setHeader.mockClear();
    mockStream.respond.mockClear();
  });

  test('stream.respond() is called', async () => {
    const responseObj = { status: 418 };
    const preHandlers = [() => {}];

    const result = handleEmptyResponseWithPreHandlers(
      responseObj,
      preHandlers,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, 418);
    expect(mockStream.respond).toHaveBeenCalledWith(mockTuftContext.outgoingHeaders, { endStream: true });
  });

  test('returns an error when a pre-handler throws an error', async () => {
    const err = Error('pre-handler error');
    const responseObj = { status: 418 };
    const preHandlers = [() => { throw err }];

    const result = handleEmptyResponseWithPreHandlers(
      responseObj,
      preHandlers,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toEqual(err);
    expect(mockTuftContext.setHeader).not.toHaveBeenCalled();
    expect(mockStream.respond).not.toHaveBeenCalled();
  });
});
