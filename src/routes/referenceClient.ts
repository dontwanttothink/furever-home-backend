import type { MatchResult } from "path-to-regexp";
import type { RouteConstructor } from "../Route";

export const GetReferenceClient: RouteConstructor = class {
	public pattern = "/client/{*path}";
	public method = "GET";

	async handle(
		req: Request,
		matched: MatchResult<Partial<Record<string, string | string[]>>>,
	): Promise<Response> {
		return Response.json({ message: "Hello, World!" }, { status: 200 });
	}
};
