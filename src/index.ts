import colors from "yoctocolors";

import { serve } from "bun";
import { Database } from "bun:sqlite";

const db = new Database("data.sqlite", { create: true, strict: true });
db.query(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT UNIQUE NOT NULL,
	passwordHash TEXT NOT NULL
)`).run();

import type { Route } from "./Route";
import { PostSignUp, PostSignIn, DeleteSignOut } from "./routes/users";
import { GetHome } from "./routes/home";

const routes: Route[] = [GetHome, PostSignUp, PostSignIn, DeleteSignOut].map(
	(R) => new R(db),
);

async function handleRequest(req: Request): Promise<Response> {
	const matched = [];
	for (const route of routes) {
		if (route.shouldHandle(req)) {
			matched.push(route);
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
