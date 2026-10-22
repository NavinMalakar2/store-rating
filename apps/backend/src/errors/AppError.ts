export interface FieldError {
  field?: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: FieldError[] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(msg: string, errors: FieldError[] = []) { return new AppError(400, msg, errors); }
  static unauthorized(msg = 'Authentication required') { return new AppError(401, msg); }
  static forbidden(msg = 'You do not have permission to perform this action') { return new AppError(403, msg); }
  static notFound(msg = 'Resource not found') { return new AppError(404, msg); }
  static conflict(msg: string, errors: FieldError[] = []) { return new AppError(409, msg, errors); }
  static unprocessable(msg: string, errors: FieldError[] = []) { return new AppError(422, msg, errors); }
}
