import { RequestContextMiddleware } from '@api/shared/middleware/request-context.middleware';
import { Request, Response } from 'express';
import { als } from '@api/shared/als';
import { randomUUID } from 'crypto';

// Mock dependencies
jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

jest.mock('../../../src/shared/als', () => ({
  als: {
    run: jest.fn(),
  },
}));

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new RequestContextMiddleware();
    mockRequest = {
      header: jest.fn(),
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('when X-Request-ID header is provided', () => {
    it('should use the provided request ID', () => {
      // Arrange
      const providedRequestId = 'test-request-123';
      (mockRequest.header as jest.Mock).mockReturnValue(providedRequestId);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.header).toHaveBeenCalledWith('X-Request-ID');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', providedRequestId);
      expect((mockRequest as any).requestId).toBe(providedRequestId);

      // Check ALS run was called with correct store
      expect(als.run).toHaveBeenCalledWith(
        {
          requestId: providedRequestId,
          tenantId: undefined,
          userId: undefined,
          userEmail: undefined,
          roles: undefined,
          permissions: undefined,
        },
        expect.any(Function),
      );

      // The callback should call next()
      const callback = (als.run as jest.Mock).mock.calls[0][1];
      callback();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('when no X-Request-ID header is provided', () => {
    it('should generate a new request ID', () => {
      // Arrange
      const generatedRequestId = 'new-request-456';
      (mockRequest.header as jest.Mock).mockReturnValue(undefined);
      (randomUUID as jest.Mock).mockReturnValue(generatedRequestId);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest.header).toHaveBeenCalledWith('X-Request-ID');
      expect(randomUUID).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', generatedRequestId);
      expect((mockRequest as any).requestId).toBe(generatedRequestId);

      // Check ALS run was called with correct store
      expect(als.run).toHaveBeenCalledWith(
        {
          requestId: generatedRequestId,
          tenantId: undefined,
          userId: undefined,
          userEmail: undefined,
          roles: undefined,
          permissions: undefined,
        },
        expect.any(Function),
      );

      const callback = (als.run as jest.Mock).mock.calls[0][1];
      callback();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle when header method returns null', () => {
      // Arrange
      const generatedRequestId = 'new-request-456';
      (mockRequest.header as jest.Mock).mockReturnValue(null);
      (randomUUID as jest.Mock).mockReturnValue(generatedRequestId);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(randomUUID).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', generatedRequestId);
    });

    it('should set the requestId on the request object', () => {
      // Arrange
      const providedRequestId = 'test-request-123';
      (mockRequest.header as jest.Mock).mockReturnValue(providedRequestId);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect((mockRequest as any).requestId).toBe(providedRequestId);
    });

    it('should call next() exactly once', () => {
      // Arrange
      const providedRequestId = 'test-request-123';
      (mockRequest.header as jest.Mock).mockReturnValue(providedRequestId);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Call the callback
      const callback = (als.run as jest.Mock).mock.calls[0][1];
      callback();

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should create store with correct structure', () => {
      // Arrange
      const providedRequestId = 'test-request-123';
      (mockRequest.header as jest.Mock).mockReturnValue(providedRequestId);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(als.run).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: providedRequestId,
          tenantId: undefined,
          userId: undefined,
          userEmail: undefined,
          roles: undefined,
          permissions: undefined,
        }),
        expect.any(Function),
      );
    });
  });
});
