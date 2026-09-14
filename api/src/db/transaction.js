/**
 * Runs `work` in a transaction on one pooled connection: committed if it
 * resolves, rolled back if it throws.
 * @template T
 * @param {import('pg').Pool} db
 * @param {(client: import('pg').PoolClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withTransaction(db, work) {
  const client = await db.connect()
  try {
    await client.query('begin')
    const result = await work(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
