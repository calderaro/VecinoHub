export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INVALID"
  ) {
    super(message);
  }
}
