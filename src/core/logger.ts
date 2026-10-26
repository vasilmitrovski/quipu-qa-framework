export interface Logger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
}

/** Minimal logger that prefixes the region and test, so parallel CI logs stay readable. */
export function createLogger(region: string, testTitle: string): Logger {
  const prefix = `[${region}] [${testTitle}]`;
  const verbose = !!process.env.DEBUG_LOGS;
  return {
    info(message, data) {
      if (verbose) console.log(prefix, message, data ?? '');
    },
    warn(message, data) {
      console.warn(prefix, message, data ?? '');
    },
  };
}
