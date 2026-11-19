export class GoogleIntegrationsError extends Error { constructor(public code: string) { super(code); } }
export const getGoogleAccessToken = async (_db: unknown, _email: string) => ({ access_token: "tok", scopes: [], email: _email });
