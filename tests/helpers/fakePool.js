export function createFakePool(handlers = []) {
  const calls = [];
  const transaction = [];

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
    beginTransaction: async () => {
      transaction.push("begin");
    },
    commit: async () => {
      transaction.push("commit");
    },
    rollback: async () => {
      transaction.push("rollback");
    },
    release: () => {
      transaction.push("release");
    }
  };

  return {
    calls,
    transaction,
    query: run,
    getConnection: async () => connection,
    end: async () => {}
  };
}
