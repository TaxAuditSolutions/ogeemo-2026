/** A tiny in-memory stand-in for the Firestore Admin calls the AI tools make. Test helper only. */
export function fakeDb(seed: Record<string, Record<string, Record<string, any>>>) {
  const store: Record<string, Record<string, Record<string, any>>> = JSON.parse(JSON.stringify(seed));
  let counter = 0;
  const failWrites = { value: false };

  const docRef = (name: string, id: string) => ({
    id,
    async get() {
      const data = store[name]?.[id];
      return { exists: data !== undefined, id, data: () => (data === undefined ? undefined : data) };
    },
    async update(patch: Record<string, any>) {
      if (failWrites.value) throw new Error('write refused');
      store[name][id] = { ...store[name][id], ...patch };
    },
  });

  return {
    store,
    failWrites,
    collection(name: string) {
      return {
        doc: (id: string) => docRef(name, id),
        where(field: string, _op: string, value: unknown) {
          const filters: Array<[string, unknown]> = [[field, value]];
          const query = {
            where(nextField: string, _nextOp: string, nextValue: unknown) {
              filters.push([nextField, nextValue]);
              return query;
            },
            async get() {
              const rows = Object.entries(store[name] ?? {}).filter(([, data]) => filters.every(([f, v]) => data[f] === v));
              return { docs: rows.map(([id, data]) => ({ id, data: () => data })) };
            },
          };
          return query;
        },
        async add(data: Record<string, any>) {
          if (failWrites.value) throw new Error('write refused');
          counter += 1;
          const id = `new${counter}`;
          store[name] = store[name] ?? {};
          store[name][id] = data;
          return docRef(name, id);
        },
      };
    },
  };
}
