import { watch } from "chokidar";
import colors from "yoctocolors";
import { match } from "path-to-regexp";

import { serve, argv, spawn } from "bun";
import { Database } from "bun:sqlite";
import { resolve } from "node:path";

const SHOULD_WATCH = argv.includes("--reference-client-watch");
const REFERENCE_CLIENT_ENABLED =
	argv.includes("--reference-client") || SHOULD_WATCH;

const REFERENCE_CLIENT_PATH = resolve(__dirname, "..", "reference-client");

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
const routes: Route[] = routeConstructors.map((R) => new R(db));

const referenceClient = new GetReferenceClient();
if (REFERENCE_CLIENT_ENABLED) {
	routes.push(referenceClient);
}

async function setUpReferenceClient() {
	const installProcess = spawn(["bun", "install"], {
		cwd: resolve(__dirname, "..", "reference-client"),
	});
	await installProcess.exited;

	const buildProcess = spawn(["bunx", "tsc"], {
		cwd: resolve(__dirname, "..", "reference-client"),
		stdout: "inherit",
	});
	await buildProcess.exited;

	if (buildProcess.exitCode) {
		console.error("Failed to build development client!");
		return;
	}

	referenceClient.enable();

	if (SHOULD_WATCH) {
		console.log(colors.dim("(built client, watching for changes)"));

		// Manually watch to work around bugs

		const watcher = watch(resolve(REFERENCE_CLIENT_PATH, "ts"), {
			ignoreInitial: true,
			cwd: REFERENCE_CLIENT_PATH,
		});
		watcher.on("all", async () => {
			console.write(colors.italic(colors.dim("change detected… ")));

			const buildProcess = spawn(["bunx", "tsc"], {
				cwd: resolve(__dirname, "..", "reference-client"),
				stdout: "inherit",
			});
			await buildProcess.exited;

			if (buildProcess.exitCode) {
				console.error("\nFailed to build development client!");
			} else {
				console.log(colors.dim("(rebuilt client)"));
			}
		});
	} else {
		console.log(colors.dim("(built client)"));
	}
}

class Handler {
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
		console.debug(
			`Matched route: ${req.method}: ${new URL(req.url).pathname}: ${matched[0].name}`,
		);
		return matched[0].handle(req);
	}

	console.error(
		`Multiple routes matched the same request: ${req.method}: ${new URL(req.url).pathname}: [${matched
			.map((m) => m.name)
			.join(", ")}]`,
	);
	return Response.json({ message: "Server Error" }, { status: 500 });
}

const server = serve({
	fetch: handleRequest,
	port: 8080,
});
console.log(
	`${colors.bold("🌸🐕🐮 Furever Home")}\n${colors.dim("The backend service is listening at:")} ${server.url}`,
);
if (REFERENCE_CLIENT_ENABLED) {
	console.log(
		`${colors.dim("A development client will be available at:")} ${server.url}client`,
	);
	setUpReferenceClient();
}
console.log();
