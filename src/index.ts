import { serve, argv, spawn, type Server } from "bun";
import { Database } from "bun:sqlite";
import { resolve } from "node:path";

import colors from "yoctocolors";
import { watch } from "chokidar";
import { match } from "path-to-regexp";

const SHOULD_WATCH = argv.includes("--reference-client-watch");
const REFERENCE_CLIENT_ENABLED =
	argv.includes("--reference-client") || SHOULD_WATCH;

const REFERENCE_CLIENT_PATH = resolve(__dirname, "..", "reference-client");

import type { Route, RouteConstructor } from "./Route";
import { PostSignUp, PostSignIn, DeleteSignOut } from "./routes/users";
import { GetHome } from "./routes/home";
import { GetReferenceClient } from "./routes/referenceClient";

class ClientBuilder {
	private isBuilding = false;
	private changesSinceLastBuild = false;

	async installDependencies() {
		const installProcess = spawn(["bun", "install"], {
			cwd: REFERENCE_CLIENT_PATH,
		});
		await installProcess.exited;

		if (installProcess.exitCode) {
			throw new Error("Failed to install development client dependencies!");
		}
	}

	async build(silent = false) {
		this.isBuilding = true;

		// the current state will be built
		this.changesSinceLastBuild = false;

		const buildProcess = spawn(["bun", "tsc"], {
			cwd: resolve(__dirname, "..", "reference-client"),
			stdout: "inherit",
		});
		await buildProcess.exited;

		this.isBuilding = false;

		if (buildProcess.exitCode) {
			console.error("Failed to build development client!");
		} else if (!silent) {
			console.log(colors.dim("(built client)"));
		}

		if (this.changesSinceLastBuild) {
			this.changesSinceLastBuild = false;
			await this.build();
		}
	}

	async watch() {
		console.log(colors.dim("(watching for changes)"));

		// Manually watch to work around bugs

		const watcher = watch(resolve(REFERENCE_CLIENT_PATH, "ts"), {
			ignoreInitial: true,
			cwd: REFERENCE_CLIENT_PATH,
		});

		watcher.on("all", () => {
			console.log(colors.italic(colors.dim("change detected…")));
			this.notifyChange();
		});
	}

	notifyChange() {
		this.changesSinceLastBuild = true;
		if (!this.isBuilding) {
			this.build();
		}
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

class Router {
	private handlers: Handler[];

	constructor(routes: Route[]) {
		this.handlers = routes.map((r) => new Handler(r));
	}

	async handle(req: Request, _server: Server): Promise<Response> {
		const matched = [];
		for (const handler of this.handlers) {
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
				`${colors.dim("Matched route:")} ${req.method}${colors.dim(":")} ${new URL(req.url).pathname}${colors.dim(":")} ${colors.dim(matched[0].name)}`,
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
}

async function main() {
	const db = new Database("data.sqlite", { create: true, strict: true });
	db.query(`CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT UNIQUE NOT NULL,
		passwordHash TEXT NOT NULL
	)`).run();

	const routeConstructors: RouteConstructor[] = [
		PostSignUp,
		PostSignIn,
		DeleteSignOut,
		GetHome,
	];
	const routes: Route[] = routeConstructors.map((R) => new R(db));

	const referenceClientRoute = new GetReferenceClient();
	if (REFERENCE_CLIENT_ENABLED) {
		routes.push(referenceClientRoute);
	}

	const router = new Router(routes);

	const server = serve({
		fetch: router.handle.bind(router),
		port: 8080,
	});

	console.log(
		`${colors.bold("🌸🐕🐮 Furever Home")}\n${colors.dim("The backend service is listening at:")} ${server.url}`,
	);
	if (REFERENCE_CLIENT_ENABLED) {
		console.log(
			`${colors.dim("A development client will be available at:")} ${server.url}client`,
		);
		console.log();

		const clientBuilder = new ClientBuilder();
		try {
			await clientBuilder.installDependencies();
		} catch (e) {
			if (e instanceof Object && "message" in e) {
				console.error(e.message);
			} else {
				console.error("An unknown error occurred: ", e);
			}
			return;
		}

		await clientBuilder.build();
		referenceClientRoute.enable();

		if (SHOULD_WATCH) {
			clientBuilder.watch();
		}
	}
}

// TODO: open files

try {
	await main();
} finally {
	// clean up
}
