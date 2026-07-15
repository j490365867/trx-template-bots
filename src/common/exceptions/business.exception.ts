export class BusinessException extends Error {
  constructor(
    public readonly code: number = 404,
    message: string,
  ) {
    super(message);
    this.name = "BusinessException";
  }
}
