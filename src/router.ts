export type RouteHandler = (request: Request) => Promise<Response> | Response;

export interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  get(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'GET', path, handler });
  }

  post(path: string, handler: RouteHandler): void {
    this.routes.push({ method: 'POST', path, handler });
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    for (const route of this.routes) {
      if (route.method === method && route.path === path) {
        return route.handler(request);
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}