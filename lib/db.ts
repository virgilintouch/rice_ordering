import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __riceOrderingPool: Pool | undefined;
}

function createPool(): Pool {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || "5432");
  const database = process.env.DB_NAME || "rice_ordering";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";

  return new Pool({
    host,
    port,
    database,
    user,
    password,
    max: 5,
  });
}

export function getPool(): Pool {
  if (!global.__riceOrderingPool) {
    global.__riceOrderingPool = createPool();
  }
  return global.__riceOrderingPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(
  fn: (queryTx: typeof query) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  const queryTx = async <R extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<R[]> => {
    const result = await client.query<R>(text, params);
    return result.rows;
  };

  try {
    await client.query("BEGIN");
    const value = await fn(queryTx);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
