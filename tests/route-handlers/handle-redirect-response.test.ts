import {
  handleRedirectResponse,
  handleRedirectResponseWithPreHandlers,
} from '../../src/route-handlers';
import { HTTP2_HEADER_STATUS, HTTP2_HEADER_LOCATION, HTTP_STATUS_FOUND } from '../../src/constants';

const mockErrorHandler = jest.fn();

const mockStream = {
  respond: jest.fn(),
};

const mockTuftContext: any = {
  request: {},
  outgoingHeaders: {},
  setHeader: jest.fn((key, value) => {
    mockTuftContext.outgoingHeaders[key] = value;
  }),
};

describe('handleRedirectResponse()', () => {
  beforeAll(() => {
    mockStream.respond.mockClear();
  });

  test('stream.respond() is called', () => {
    const responseObj = {
      status: HTTP_STATUS_FOUND,
      redirect: '/foo',
    };

    const result = handleRedirectResponse(
      responseObj,
      //@ts-ignore
      mockStream,
    );

    const expectedHeaders = {
      [HTTP2_HEADER_STATUS]: HTTP_STATUS_FOUND,
      [HTTP2_HEADER_LOCATION]: '/foo',
    };

    expect(result).toBeUndefined();
    expect(mockStream.respond).toHaveBeenCalledWith(expectedHeaders, { endStream: true });
  });
});

describe('handleRedirectResponseWithPreHandlers()', () => {
  beforeEach(() => {
    mockErrorHandler.mockClear();
    mockTuftContext.outgoingHeaders = {};
    mockTuftContext.setHeader.mockClear();
    mockStream.respond.mockClear();
  });

  test('stream.respond() is called', async () => {
    const responseObj = {
      status: HTTP_STATUS_FOUND,
      redirect: '/foo',
    };
    const preHandlers = [() => {}];

    const result = handleRedirectResponseWithPreHandlers(
      mockErrorHandler,
      preHandlers,
      responseObj,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockErrorHandler).not.toHaveBeenCalled();
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_FOUND);
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_LOCATION, '/foo');
    expect(mockStream.respond)
      .toHaveBeenCalledWith(mockTuftContext.outgoingHeaders, { endStream: true });
  });

  test('stream.respond() is called when the pre-handler returns a result', async () => {
    const responseObj = {
      status: HTTP_STATUS_FOUND,
      redirect: '/foo',
    };
    const preHandler = () => 42;
    preHandler.extName = 'mock pre-handler';
    const preHandlers = [preHandler];

    const result = handleRedirectResponseWithPreHandlers(
      mockErrorHandler,
      preHandlers,
      responseObj,
      //@ts-ignore
      mockStream,
      mockTuftContext,
    );

    await expect(result).resolves.toBeUndefined();
    expect(mockErrorHandler).not.toHaveBeenCalled();
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_STATUS, HTTP_STATUS_FOUND);
    expect(mockTuftContext.setHeader).toHaveBeenCalledWith(HTTP2_HEADER_LOCATION, '/foo');
    expect(mockStream.respond)
      .toHaveBeenCalledWith(mockTuftContext.outgoingHeaders, { endStream: true });
  });

  test('returns an error when a pre-handler throws an error', async () => {
    const err = Error('pre-handler error');
    const responseObj = {
      status: HTTP_STATUS_FOUND,
      redirect: '/foo',
    };
    const preHandlers = [() => { throw err; }];

    const result = handleRedirectResponseWithPreHandlers(
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
    expect(mockStream.respond).not.toHaveBeenCalled();
  });
});
