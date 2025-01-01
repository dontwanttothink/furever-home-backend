import type { Database } from "bun:sqlite";

export interface Route {
	shouldHandle(req: Request): boolean;
	handle(req: Request): Promise<Response> | Response;
}
