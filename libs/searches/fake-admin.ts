/** Minimal in-memory stand-in for the Supabase admin client.
 *
 *  Test-only, but it lives beside the code it fakes rather than being redefined
 *  in each spec: `createSearch` and `runSearchProbes` exercise different parts
 *  of the same query surface, and two divergent fakes would be worse than one
 *  shared approximation. Supports only the chains those two functions use. */
export type Row = Record<string, unknown>;

export type FakeDb = {
  searches: Row[];
  candidates: Row[];
  checks: Row[];
  rpcCalls: Array<{ name: string; args: Row }>;
};

let counter = 0;
function nextId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function resetIds() {
  counter = 0;
}

function matches(row: Row, filters: Array<[string, unknown]>) {
  return filters.every(([column, value]) => row[column] === value);
}

export function createFakeAdmin(db: FakeDb) {
  return {
    rpc(name: string, args: Row) {
      db.rpcCalls.push({ name, args });
      return Promise.resolve({ data: 1, error: null });
    },

    from(table: keyof Omit<FakeDb, "rpcCalls">) {
      const rows = db[table];

      return {
        insert(payload: Row | Row[]) {
          const items = (Array.isArray(payload) ? payload : [payload]).map((item) => ({
            id: nextId(String(table).slice(0, 4)),
            ...item,
          }));
          rows.push(...items);

          const result = { data: items, error: null };
          return {
            select: () => ({
              single: () => Promise.resolve({ data: items[0], error: null }),
              then: (resolve: (v: unknown) => void) => resolve(result),
            }),
            then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
          };
        },

        select(_columns?: string) {
          const filters: Array<[string, unknown]> = [];
          const chain = {
            eq(column: string, value: unknown) {
              filters.push([column, value]);
              return chain;
            },
            order() {
              return chain;
            },
            maybeSingle: () =>
              Promise.resolve({
                data: rows.find((r) => matches(r, filters)) ?? null,
                error: null,
              }),
            single: () =>
              Promise.resolve({
                data: rows.find((r) => matches(r, filters)) ?? null,
                error: null,
              }),
            then: (resolve: (v: unknown) => void) =>
              resolve({ data: rows.filter((r) => matches(r, filters)), error: null }),
          };
          return chain;
        },

        update(payload: Row) {
          const filters: Array<[string, unknown]> = [];
          const chain = {
            eq(column: string, value: unknown) {
              filters.push([column, value]);
              // Applied on every eq so a single-filter update still lands.
              for (const row of rows) {
                if (matches(row, filters)) Object.assign(row, payload);
              }
              return chain;
            },
            then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
          };
          return chain;
        },
      };
    },
  };
}

export function emptyDb(): FakeDb {
  return { searches: [], candidates: [], checks: [], rpcCalls: [] };
}
