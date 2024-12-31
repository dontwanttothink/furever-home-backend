import { match } from "path-to-regexp";
import type { Database } from "bun:sqlite";
import type { Route } from "../Route";

interface SignUpReq {
	email: string;
	username: string;
	password: string;
}

function isSignUpReq(value: unknown): value is SignUpReq {
	return (
		value !== null &&
		typeof value === "object" &&
		"email" in value &&
		"username" in value &&
		"password" in value &&
		typeof value.email === "string" &&
		typeof value.username === "string"
	);
}

class PostUser implements Route {
	static does_match = match("/users");
	shouldHandle(req: Request): boolean {
		const asURL = new URL(req.url);
		return !!PostUser.does_match(asURL.pathname) && req.method === "POST";
	}
	async handle(req: Request, db: Database): Promise<Response> {
		let new_user: unknown;
		try {
			new_user = await req.json();
		} catch (e) {
			return new Response(
				JSON.stringify({
					error: true,
					message: "Invalid JSON!",
				}),
				{ status: 400 },
			);
		}
		if (!isSignUpReq(new_user)) {
			return new Response(
				JSON.stringify({
					error: true,
					message: "Invalid object!",
				}),
				{ status: 400 },
			);
		}

		return new Response("not implemented lol", { status: 501 });
	}
}
export const postUser = new PostUser();
