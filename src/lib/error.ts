export class DockerRegistryUIError extends Error {
  isError = true;
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export class RegistryError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
