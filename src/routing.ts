import type { Database } from "bun:sqlite";
import type { MatchResult } from "path-to-regexp";
import { match } from "path-to-regexp";

export interface Route {
	pattern: string;
	method: string;

	handle(
		req: Request,
		matched: MatchResult<Partial<Record<string, string | string[]>>>,
	): Promise<Response> | Response;
}
export type RouteConstructor = new (db: Database) => Route;

/**
 * Convenience adaptor for routes
 */
export class Handler {
	private route;
	private doesMatch;

	constructor(route: Route) {
		this.route = route;
		this.doesMatch = match(this.route.pattern);
	}

	get name(): string {
		return this.route.constructor.name;
	}

	shouldHandle(req: Request): boolean {
		const asUrl = new URL(req.url);
		return !!this.doesMatch(asUrl.pathname) && req.method === this.route.method;
	}

	handle(req: Request): Promise<Response> | Response {
		const asUrl = new URL(req.url);

		const matchResult = this.doesMatch(asUrl.pathname);
		if (!matchResult) {
			throw new Error(
				"Inconsistent state: handle called for a route that doesn't match",
			);
		}

		return this.route.handle(req, matchResult);
	}
}
