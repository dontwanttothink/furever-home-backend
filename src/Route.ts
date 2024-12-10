import type { Database } from "bun:sqlite";

export default interface Route {
	shouldHandle(req: Request): boolean;
	handle(req: Request, db?: Database): Promise<Response> | Response;
}
