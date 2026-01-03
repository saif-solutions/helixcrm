// Error types
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "BusinessError";
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends BusinessError {
  constructor(entity: string, id?: string) {
    const message = id 
      ? `${entity} with id ${id} not found`
      : `${entity} not found`;
    super(message, "NOT_FOUND_ERROR", 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends BusinessError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED_ERROR", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends BusinessError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN_ERROR", 403);
    this.name = "ForbiddenError";
  }
}
