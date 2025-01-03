import { z, ZodError } from "zod";
import type { Database } from "bun:sqlite";

import { password } from "bun";
const { hash, verify } = password;

import type { Route, RouteConstructor } from "../Route";

// Bun handles password salting transparently for us.

const UserRequest = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(72),
});

type UserRequest = z.infer<typeof UserRequest>;

export const PostSignUp: RouteConstructor = class {
	public pattern = "/users/sign-up";
	public method = "POST";
	private insertUser;

	constructor(db: Database) {
		this.insertUser = db.prepare(
			"INSERT INTO users (email, passwordHash) VALUES ($email, $passwordHash)",
		);
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

		const passwordHash = await hash(password);

		try {
			this.insertUser.run({ email, passwordHash });
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
};

/**
 * Represents a session.
 */
class Session {
	private static MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;
	public static defaultExpirationTime = Session.MILLISECONDS_IN_A_DAY;

	/**
	 * Creates a new session.
	 * @param token - The session token.
	 * @param userID - The ID of the user.
	 * @param expiration - The expiration time of the session in milliseconds.
	 */
	constructor(
		public token: Uint8Array,
		public userID: number,
		public expiration: number = Date.now() + Session.defaultExpirationTime,
	) {}

	/**
	 * Yields a representation of the session token appropriate for use in a
	 * header.
	 * @returns A hex string representation of the token.
	 */
	getTokenString(): string {
		return Array.prototype.map
			.call(this.token, (byte) => `0${byte.toString(16)}`.slice(-2))
			.join("");
	}

	isExpired(): boolean {
		return this.expiration < Date.now();
	}

	refreshed(expiration: number | undefined): Session {
		return new Session(this.token, this.userID, expiration);
	}
}

class SessionStore {
	private byTokenString = new Map<string, Session>();
	private expirationQueue: [number, string][] = [];

	/**
	 * Adds a session to the store.
	 * @param session The session to add.
	 */
	add(session: Session): void {
		const tokenString = session.getTokenString();
		this.byTokenString.set(tokenString, session);
		this.expirationQueue.push([session.expiration, tokenString]);
	}

	/**
	 * Retrieves a session by its token string.
	 * @param token_string The token string of the session to retrieve.
	 * @returns The session, if it exists.
	 */
	get(tokenString: string): Session | undefined {
		return this.byTokenString.get(tokenString);
	}

	/**
	 * Checks if a session with the given token string exists.
	 */
	has(tokenString: string): boolean {
		return this.byTokenString.has(tokenString);
	}

	/**
	 * Removes all expired sessions.
	 */
	async removeExpired(): Promise<void> {
		const now = Date.now();
		while (this.expirationQueue.length > 0) {
			const [expiration, tokenString] = this.expirationQueue[0];
			if (expiration > now) {
				break;
			}

			// ECMAScript makes it hard to get a good time complexity for this
			this.expirationQueue.shift();
			this.byTokenString.delete(tokenString);

			await Promise.resolve(); // Don't block
		}
	}

	/**
	 * Removes a session by its token string.
	 * @param token_string The token string of the session to remove.
	 */
	remove(tokenString: string): void {
		this.byTokenString.delete(tokenString);
	}
}

const sessionStore = new SessionStore();

interface UserRow {
	id: number;
	email: string;
	passwordHash: string;
}

export const PostSignIn: RouteConstructor = class {
	public pattern = "/users/sign-in";
	public method = "POST";

	// We can't use static fields because our class is anonymous. Urgh?!
	private invalidCredentialsResponse = Response.json(
		{
			message: "The username or password are incorrect.",
			code: "invalid_credentials",
		},
		{ status: 401 },
	);

	private getUser;

	constructor(db: Database) {
		this.getUser = db.prepare(
			"SELECT id, email, passwordHash FROM users WHERE email = $email",
		);
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

		const userRow = this.getUser.get({ email }) as UserRow | undefined;

		if (!userRow) {
			return this.invalidCredentialsResponse;
		}

		const { id, passwordHash } = userRow;

		const isValid = await verify(password, passwordHash);

		if (!isValid) {
			return this.invalidCredentialsResponse;
		}

		const token = new Uint8Array(64);
		crypto.getRandomValues(token);

		const session = new Session(token, id);
		sessionStore.add(session);
		sessionStore.removeExpired();

		return Response.json({ token: session.getTokenString() }, { status: 200 });
	}
};

export const DeleteSignOut: RouteConstructor = class {
	public pattern = "/users/sign-out";
	public method = "DELETE";

	async handle(req: Request): Promise<Response> {
		const authorizationHeader = req.headers.get("Authorization")?.split(" ");
		if (!authorizationHeader) {
			return Response.json({ message: "No token provided" }, { status: 400 });
		}

		const scheme: string | undefined = authorizationHeader[0];
		if (!scheme || scheme.toLowerCase() !== "bearer") {
			return Response.json(
				{ message: "Authorization scheme must be 'bearer'" },
				{ status: 400 },
			);
		}

		const token: string | undefined = authorizationHeader[1];
		if (!token) {
			return Response.json({ message: "No token provided" }, { status: 400 });
		}

		if (!sessionStore.has(token)) {
			return Response.json(
				{ message: "Session does not exist" },
				{ status: 404 },
			);
		}

		if (Math.random() < 0.1) {
			return Response.json(
				{ message: "You have to pay to sign out." },
				{ status: 402 },
			);
		}

		sessionStore.remove(token);

		return Response.json({ message: "Signed out" }, { status: 200 });
	}
};
