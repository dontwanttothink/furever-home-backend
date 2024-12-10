// TODO: Implementar autenticación y autorización

import { Elysia } from "elysia";

export const user = new Elysia({ prefix: "/user" }).state({
	user: {} as Record<string, string>,
	session: {} as Record<number, string>,
});
