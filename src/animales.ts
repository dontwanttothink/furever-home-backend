import { Elysia, t } from "elysia";

enum Especie {
  Perro,
  Gato,
}

class Animal {
  constructor(
    public especie: Especie,
    public descripción: String,
  ) {}
}

class Animales {
  constructor(private datos: Map<String, Animal> = new Map()) {}

  crear(animal: Animal) {
    const id = crypto.randomUUID();
    this.datos.set(id, animal);
    return id;
  }

  tiene(id: String): boolean {
    return this.datos.has(id);
  }

  actualizar(id: String, animal: Animal) {
    if (this.datos.has(id)) {
      this.datos.set(id, animal);
    } else {
      throw new ReferenceError(
        "Se intentó actualizar un animal que no existe.",
      );
    }
  }

  lista() {
    return Array.from(this.datos.keys());
  }

  obtener(id: String) {
    return this.datos.get(id);
  }

  eliminar(id: String) {
    return this.datos.delete(id);
  }
}

export const animales = new Elysia({ prefix: "animales" })
  .decorate("animales", new Animales())
  .get("/", ({ animales }) => {
    return animales.lista();
  })
  .get(
    "/:id",
    ({ animales, params: { id }, error }) => {
      return animales.obtener(id) ?? error(404);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .delete(
    "/:id",
    ({ animales, params: { id }, error }) => {
      if (!animales.tiene(id)) {
        return error(404);
      }
      return animales.eliminar(id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .guard({
    body: t.Object({
      especie: t.Enum(Especie),
      descripción: t.String(),
    }),
  })
  .post("/", ({ animales, body, set }) => {
    const id = animales.crear(new Animal(body.especie, body.descripción));
    set.status = 201;
    return { id };
  })
  .put(
    "/:id",
    ({ animales, params: { id }, error, body }) => {
      if (!animales.tiene(id)) {
        return error(404);
      }
      animales.actualizar(id, new Animal(body.especie, body.descripción));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
