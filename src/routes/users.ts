import { match } from "path-to-regexp";
import type { Database } from "bun:sqlite";
import type Route from "../routes";

class UsersRoute implements Route {
	static does_match = match("/users");
	shouldHandle(req: Request): boolean {
		const asURL = new URL(req.url);
		return !!UsersRoute.does_match(asURL.pathname);
	}
	handle(req: Request, db: Database): Promise<Response> {
		throw new Error("Method not implemented.");
	}
}
export const usersRoute = new UsersRoute();
