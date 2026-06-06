export function ok(data: any, message = "OK") {
  return {
    success: true,
    message,
    data,
  };
}

export function fail(message: string, statusCode = 400) {
  return {
    success: false,
    statusCode,
    message,
  };
}