import type { Database } from "bun:sqlite";
import type { MatchResult } from "path-to-regexp";

export interface Route {
	pattern: string;
	method: string;

	handle(
		req: Request,
		matched: MatchResult<Partial<Record<string, string | string[]>>>,
	): Promise<Response> | Response;
}
export type RouteConstructor = new (db: Database) => Route;
