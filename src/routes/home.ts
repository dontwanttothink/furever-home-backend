import type { RouteConstructor } from "../routing.js";

export const GetHome: RouteConstructor = class {
	public pattern = "/";
	public method = "GET";

	handle(): Response {
		return Response.json({ message: "Hello, World!" }, { status: 200 });
	}
};
