export class FlootAiOutOfCreditsError extends Error {}
export class FlootAiRateLimitError extends Error {}
export const flootAi = { chat: async (_: unknown): Promise<unknown> => { throw new Error("stub"); } };
