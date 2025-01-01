import { match } from "path-to-regexp";
import { z, ZodError } from "zod";
import type { Database } from "bun:sqlite";

import { password } from "bun";
const { hash, verify } = password;

import type { Route } from "../Route";

// Bun handles password salting transparently for us.

const UserRequest = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(72),
});

type UserRequest = z.infer<typeof UserRequest>;

export class PostUser implements Route {
	private static does_match = match("/users");
	private insert_user;

	constructor(db: Database) {
		this.insert_user = db.prepare(
			"INSERT INTO users (email, password_hash) VALUES ($email, $password_hash)",
		);
	}

	shouldHandle(req: Request): boolean {
		const asURL = new URL(req.url);
		return !!PostUser.does_match(asURL.pathname) && req.method === "POST";
	}
	async handle(req: Request): Promise<Response> {
		let body: unknown;
		try {
			body = await req.json();
		} catch (e) {
			return Response.json({ message: "Invalid JSON" }, { status: 400 });
		}

		let user: UserRequest;
		try {
			user = UserRequest.parse(body);
		} catch (e) {
			if (e instanceof ZodError) {
				return Response.json(e.issues, { status: 400 });
			}
			throw e;
		}

		const { password, email } = user;

		const password_hash = await hash(password);

		try {
			this.insert_user.run({ email, password_hash });
		} catch (e) {
			if (
				e instanceof Error &&
				e.message.includes("UNIQUE constraint failed")
			) {
				return Response.json(
					{ message: "User already exists" },
					{ status: 400 },
				);
			}
			throw e;
		}
		return Response.json({ message: "User created" }, { status: 201 });
	}
}
