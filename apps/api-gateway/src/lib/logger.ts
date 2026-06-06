import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

/**
 * Structured logger with Pino
 * - Development: Pretty-printed with colors
 * - Production: JSON format for log aggregation
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
            singleLine: false,
          },
        }
      : undefined,
  },
  isDevelopment ? process.stdout : process.stdout
);

export const createChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};
