import { match } from "path-to-regexp";
import type { Route } from "../Route";

export class GetHome implements Route {
	static does_match = match("/");

	shouldHandle(req: Request): boolean {
		const path = new URL(req.url).pathname;
		return !!GetHome.does_match(path) && req.method === "GET";
	}

	handle(): Response {
		return new Response("Hello, world!");
	}
}
