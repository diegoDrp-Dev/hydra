export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorBody = (
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) => ({ error: { code, message, details } });
