import type { Messages } from "./messages/pt-BR";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };
export type DeepPartialMessages = DeepPartial<Messages>;
export type { Messages };
