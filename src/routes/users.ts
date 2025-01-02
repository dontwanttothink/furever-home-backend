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

const session_store = new Map<string, number>();

export class PostSignUp implements Route {
	private static does_match = match("/users/sign-up");
	private insert_user;

	constructor(db: Database) {
		this.insert_user = db.prepare(
			"INSERT INTO users (email, password_hash) VALUES ($email, $password_hash)",
		);
	}

	shouldHandle(req: Request): boolean {
		const asURL = new URL(req.url);
		return !!PostSignUp.does_match(asURL.pathname) && req.method === "POST";
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
					{
						message: "The operation could not be completed for secret reasons.",
					},
					{ status: 400 },
				);
			}
			throw e;
		}
		return Response.json({ message: "User created" }, { status: 201 });
	}
}

interface UserRow {
	id: number;
	email: string;
	password_hash: string;
}

export class PostSignIn implements Route {
	private static does_match = match("/users/sign-in");
	private static invalid_credentials_response = Response.json(
		{
			message: "The username or password are incorrect.",
			code: "invalid_credentials",
		},
		{ status: 401 },
	);

	private get_user;

	constructor(db: Database) {
		this.get_user = db.prepare(
			"SELECT id, email, password_hash FROM users WHERE email = $email",
		);
	}

	shouldHandle(req: Request): boolean {
		const asURL = new URL(req.url);
		return !!PostSignIn.does_match(asURL.pathname) && req.method === "POST";
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

		const user_row = this.get_user.get({ email }) as UserRow | undefined;

		if (!user_row) {
			return PostSignIn.invalid_credentials_response;
		}

		const { id, password_hash } = user_row;

		const is_valid = await verify(password, password_hash);

		if (!is_valid) {
			return PostSignIn.invalid_credentials_response;
		}

		// so everything is missing here
		// TODO: generate a session token and put it in the store

		return Response.json({ message: "User signed in", id }, { status: 200 });
	}
}
