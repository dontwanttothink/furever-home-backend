import type Route from "../Route";

class AnimalsRoute implements Route {
	shouldHandle(req: Request): boolean {
		throw new Error("Method not implemented.");
	}
	handle(req: Request): Promise<Response> {
		throw new Error("Method not implemented.");
	}
}
export const animalsRoute = new AnimalsRoute();
