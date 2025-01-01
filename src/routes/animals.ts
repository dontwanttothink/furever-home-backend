import { match, type MatchResult } from "path-to-regexp";
import type { Database } from "bun:sqlite";
import type { Route } from "../Route";

export class GetAnimal implements Route {
	static does_match = match("/user/:id");

	shouldHandle(req: Request): boolean {
		const path = new URL(req.url).pathname;
		return !!GetAnimal.does_match(path) && req.method === "GET";
	}

	handle(req: Request): Promise<Response> | Response {
		const path = new URL(req.url).pathname;

		const matchResult = GetAnimal.does_match(path);
		if (matchResult === false) throw new Error();

		const {
			params: { id },
		} = matchResult;

		// const q = db.query(`select "whatever idk" as omg`);
		// q.run();

		return new Response("");
	}
}
