import { match } from "path-to-regexp";
import type { Route } from "../Route";

export class GetHome implements Route {
	static doesMatch = match("/");

	shouldHandle(req: Request): boolean {
		const path = new URL(req.url).pathname;
		return !!GetHome.doesMatch(path) && req.method === "GET";
	}

	handle(): Response {
		return new Response("Hello, world!");
	}
}
