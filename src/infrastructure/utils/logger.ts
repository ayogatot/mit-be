export const logger = {
  info: (msg: string, data?: unknown) => {
    console.log(JSON.stringify({ level: 'info', msg, ...(data !== undefined ? { data } : {}), ts: new Date().toISOString() }));
  },
  warn: (msg: string, data?: unknown) => {
    console.warn(JSON.stringify({ level: 'warn', msg, ...(data !== undefined ? { data } : {}), ts: new Date().toISOString() }));
  },
  error: (msg: string, err?: unknown) => {
    const error = err instanceof Error ? { message: err.message, name: err.name } : err;
    console.error(JSON.stringify({ level: 'error', msg, ...(error !== undefined ? { error } : {}), ts: new Date().toISOString() }));
  },
};
