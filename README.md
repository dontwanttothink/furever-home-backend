# Furever Home (Backend)

Este repositorio contiene el código para el servicio web de Furever Home.

## Tabla de Contenido

- [Instalación](#instalación)
- [Uso](#uso)
- [Funciones](#funciones)

## Uso

```bash
git clone https://github.com/dontwanttothink/furever-home-backend.git
cd furever-home-backend
bun install # instalar dependencias
bun dev # iniciar el servidor en modo de desarrollo
```

El servidor estará disponible en `http://localhost:3000`.

## Funciones planeadas

Este servicio provee una API REST para la gestión de animales en adopción. Los endpoints disponibles son:

### GET /animales

Lista todos los IDs de animales disponibles.

### GET /animales/:id

Obtiene la información de un animal específico por su ID.

### POST /animales

Crea un nuevo registro de animal. Requiere un objeto JSON con:

- `especie`: tipo de animal (Perro o Gato)
- `descripción`: texto descriptivo del animal

### PUT /animales/:id

Actualiza la información de un animal existente. Requiere el mismo formato de objeto JSON que POST.
