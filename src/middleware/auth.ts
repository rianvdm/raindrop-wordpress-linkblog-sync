// ABOUTME: Authentication middleware that validates API tokens for protected endpoints.
// ABOUTME: Provides token-based security to prevent unauthorized access to sync and admin functions.
import { Env } from "../types/env";

export function requireAuth(env: Env) {
  return (handler: (request: Request) => Promise<Response> | Response) => {
    return async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const token = url.searchParams.get("token");

      if (!token || token !== env.TRIGGER_TOKEN) {
        return new Response("Forbidden", { status: 403 });
      }

      return handler(request);
    };
  };
}
