import type { MatchResult } from "path-to-regexp";
import type { Route } from "../Route";

import { resolve, normalize } from "node:path";

const BASE_PATH = resolve(__dirname, "..", "..", "reference-client", "public");

export class GetReferenceClient implements Route {
	public pattern = "/client{/*path}";
	public method = "GET";

	private isEnabled = false;
	private notFound = Bun.file(resolve(BASE_PATH, "404.html"));
	private index = Bun.file(resolve(BASE_PATH, "index.html"));

	enable() {
		this.isEnabled = true;
	}

	async handle(
		_req: Request,
		matched: MatchResult<Partial<Record<string, string | string[]>>>,
	): Promise<Response> {
		if (!this.isEnabled) {
			return new Response(
				"The reference client hasn't been built yet. Please check your console output.",
				{
					status: 500,
				},
			);
		}

		const { path } = matched.params;

		if (!path) {
			if (!matched.path.endsWith("/")) {
				return new Response(null, {
					status: 301,
					headers: {
						location: `${matched.path}/`,
					},
				});
			}
			return new Response(this.index);
		}

		if (!Array.isArray(path)) {
			throw new TypeError("Expected path to be an array");
		}

		const resolvedPath = normalize(resolve(BASE_PATH, ...path));

		if (!resolvedPath.startsWith(BASE_PATH)) {
			return new Response("Forbidden", { status: 403 });
		}

		const file = Bun.file(resolvedPath);

		if (await file.exists()) {
			return new Response(file, {
				status: 200,
			});
		}
		return new Response(this.notFound, {
			status: 404,
		});
	}
}
