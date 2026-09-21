export function createFakePool(handlers = []) {
  const calls = [];

  const run = async (sql, params = []) => {
    calls.push({ sql, params });

    for (const handler of handlers) {
      if (handler.match(sql, params)) {
        return handler.respond(sql, params);
      }
    }

    throw new Error(`Unhandled query in fake pool: ${sql}`);
  };

  const connection = {
    query: run,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {}
  };

  return {
    calls,
    query: run,
    getConnection: async () => connection,
    end: async () => {}
  };
}
