import colors from "yoctocolors";
import { match } from "path-to-regexp";

import { serve, argv } from "bun";
import { Database } from "bun:sqlite";

const REFERENCE_CLIENT_ENABLED = argv.includes("--reference-client");

const db = new Database("data.sqlite", { create: true, strict: true });
db.query(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT UNIQUE NOT NULL,
	passwordHash TEXT NOT NULL
)`).run();

import type { Route, RouteConstructor } from "./Route";
import { PostSignUp, PostSignIn, DeleteSignOut } from "./routes/users";
import { GetHome } from "./routes/home";
import { GetReferenceClient } from "./routes/referenceClient";

const routeConstructors: RouteConstructor[] = [
	PostSignUp,
	PostSignIn,
	DeleteSignOut,
	GetHome,
];
if (REFERENCE_CLIENT_ENABLED) {
	routeConstructors.push(GetReferenceClient);
}
const routes: Route[] = routeConstructors.map((R) => new R(db));

class Handler {
	private route;
	private doesMatch;

	constructor(route: Route) {
		this.route = route;
		this.doesMatch = match(this.route.pattern);
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

const handlers = routes.map((r) => new Handler(r));

async function handleRequest(req: Request): Promise<Response> {
	const matched = [];
	for (const handler of handlers) {
		if (handler.shouldHandle(req)) {
			matched.push(handler);
		}
	}

	if (matched.length === 0) {
		return Response.json(
			{ message: "Not Found" },
			{
				status: 404,
			},
		);
	}
	if (matched.length === 1) {
		return matched[0].handle(req);
	}

	console.error(
		`Multiple routes matched the same request: ${req.method}: ${new URL(req.url).pathname}: [${routes
			.map((r) => r.constructor.name)
			.join(", ")}]`,
	);
	return Response.json({ message: "Server Error" }, { status: 500 });
}

const server = serve({
	fetch: handleRequest,
	port: 8080,
});
console.log(
	`🌸🐕🐮 Furever Home\n${colors.dim("The backend service is listening at:")} ${server.url}`,
);
