// Banco falso para os helpers do Floot: registra cada consulta (tabela + cadeia de métodos)
// e responde pelos handlers informados no teste.
export type Op = { kind: string; table: string; calls: [string, unknown[]][] };
type Handler = (op: Op) => unknown;

export function fakeDb(handler: Handler) {
  const ops: Op[] = [];
  const start = (kind: string) => (table: string) => {
    const op: Op = { kind, table, calls: [] };
    ops.push(op);
    const proxy: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'execute' || prop === 'executeTakeFirst' || prop === 'executeTakeFirstOrThrow') {
          return async () => {
            const r = handler(op);
            if (prop === 'execute') return r ?? [];
            return r;
          };
        }
        return (...args: unknown[]) => { op.calls.push([prop, args]); return proxy; };
      },
    });
    return proxy;
  };
  return {
    ops,
    db: { selectFrom: start('select'), insertInto: start('insert'), updateTable: start('update'), deleteFrom: start('delete') },
  };
}

export const has = (op: Op, method: string, ...args: unknown[]) =>
  op.calls.some(([m, a]) => m === method && args.every((x, i) => JSON.stringify(a[i]) === JSON.stringify(x)));
