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

/**
 * Represents a session.
 */
class Session {
	private static MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;
	public static defaultExpirationTime = Session.MILLISECONDS_IN_A_DAY;

	constructor(
		public token: Uint8Array,
		public user_id: number,
		public expiration: number = Date.now() + Session.defaultExpirationTime,
	) {}

	/**
	 * Yields a representation of the session token appropriate for use in a
	 * header.
	 * @returns A hex string representation of the token.
	 */
	get_token_string(): string {
		return Array.prototype.map
			.call(this.token, (byte) => `0${byte.toString(16)}`.slice(-2))
			.join("");
	}

	is_expired(): boolean {
		return this.expiration < Date.now();
	}

	refreshed(expiration: number | undefined): Session {
		return new Session(this.token, this.user_id, expiration);
	}
}

class SessionStore {
	private by_token_string = new Map<string, Session>();
	private expiration_queue: [number, string][] = [];

	/**
	 * Adds a session to the store.
	 * @param session The session to add.
	 */
	add(session: Session): void {
		const token_string = session.get_token_string();
		this.by_token_string.set(token_string, session);
		this.expiration_queue.push([session.expiration, token_string]);
	}

	/**
	 * Retrieves a session by its token string.
	 * @param token_string The token string of the session to retrieve.
	 * @returns The session, if it exists.
	 */
	get(token_string: string): Session | undefined {
		return this.by_token_string.get(token_string);
	}

	/**
	 * Removes all expired sessions.
	 */
	async remove_expired(): Promise<void> {
		const now = Date.now();
		while (this.expiration_queue.length > 0) {
			const [expiration, token_string] = this.expiration_queue[0];
			if (expiration > now) {
				break;
			}

			// ECMAScript makes it hard to get a good time complexity for this
			this.expiration_queue.shift();
			this.by_token_string.delete(token_string);

			await Promise.resolve(); // Don't block
		}
	}

	/**
	 * Removes a session by its token string.
	 * @param token_string The token string of the session to remove.
	 */
	remove(token_string: string): void {
		this.by_token_string.delete(token_string);
	}
}

const session_store = new SessionStore();

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

		const token = new Uint8Array(64);
		crypto.getRandomValues(token);

		const session = new Session(token, id);
		session_store.add(session);
		session_store.remove_expired();

		return Response.json(
			{ token: session.get_token_string() },
			{ status: 200 },
		);
	}
}
