import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { animales } from "./animales";

const app = new Elysia()
	.use(swagger())
	.use(animales)
	.get("/", () => "¡Esta es la API de Furever Home!")
	.listen(3000);

console.log(
	`🐮 ¡La API de Furever Home está disponible en ${app.server?.hostname}:${app.server?.port}!`,
);
console.log(
	`(Para depuración, visite http://${app.server?.hostname}:${app.server?.port}/swagger)`,
);
