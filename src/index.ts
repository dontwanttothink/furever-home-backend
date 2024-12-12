import { serve } from "bun";
import { Database } from "bun:sqlite";
const db = new Database("data.sqlite", { create: true });

import type { Route } from "./routes";
import { getAnimal } from "./routes/animals";
const routes: Route[] = [getAnimal];

async function handleRequest(req: Request): Promise<Response> {
	const matched = [];
	for (const route of routes) {
		if (route.shouldHandle(req)) {
			matched.push(route);
		}
	}

	if (matched.length === 0) {
		return new Response("Not Found", {
			status: 404,
		});
	}
	if (matched.length === 1) {
		return matched[0].handle(req, db);
	}

	console.error(
		`Multiple routes matched the same request: ${req.method}: ${new URL(req.url).pathname}: [${routes
			.map((r) => r.constructor.name)
			.join(", ")}]`,
	);
	return new Response("Server Error", { status: 500 });
}

serve({
	fetch: handleRequest,
});
