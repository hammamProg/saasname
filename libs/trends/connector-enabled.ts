/** Per-connector kill switch (catalog's commercial-risk rule): a broken or
 *  suddenly-expensive source can be disabled with an env var, no deploy. */
export function isConnectorEnabled(connectorId: string): boolean {
  const flag = `INGEST_${connectorId.toUpperCase()}_ENABLED`;
  return process.env[flag] !== "false";
}
