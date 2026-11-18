
"""
Módulo principal de la API (main.py)
Implementa los endpoints RESTful asíncronos para gestionar préstamos de libros.
"""

from typing import List

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId

from models import (
    PrestamoLibro,
    PrestamoLibroCreate,
    PrestamoLibroUpdate
)

from database import coleccion_prestamos, verificar_conexion

app = FastAPI(
    title="API Biblioteca Municipal",
    description="API RESTful asíncrona para gestionar préstamos de libros",
    version="1.0.0"
)


# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
async def startup_db_client():
    await verificar_conexion()


@app.get("/")
async def inicio():
    return {
        "mensaje": "Bienvenido a la API de la Biblioteca Municipal",
        "documentacion": "/docs"
    }


@app.post(
    "/prestamos",
    response_model=PrestamoLibro,
    status_code=status.HTTP_201_CREATED
)
async def crear_prestamo(prestamo_in: PrestamoLibroCreate):

    prestamo_existente = await coleccion_prestamos.find_one({
        "titulo_libro": prestamo_in.titulo_libro,
        "usuario": prestamo_in.usuario,
        "devuelto": False
    })

    if prestamo_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario ya tiene un préstamo activo de este libro"
        )

    nuevo_prestamo = prestamo_in.model_dump()

    resultado = await coleccion_prestamos.insert_one(nuevo_prestamo)

    prestamo_creado = await coleccion_prestamos.find_one({
        "_id": resultado.inserted_id
    })

    return prestamo_creado


@app.get(
    "/prestamos",
    response_model=List[PrestamoLibro]
)
async def listar_prestamos():

    prestamos = []

    cursor = coleccion_prestamos.find()

    async for documento in cursor:
        prestamos.append(documento)

    return prestamos


@app.get(
    "/prestamos/{id}",
    response_model=PrestamoLibro
)
async def obtener_prestamo(id: str):

    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID inválido de MongoDB"
        )

    prestamo = await coleccion_prestamos.find_one({
        "_id": ObjectId(id)
    })

    if prestamo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Préstamo no encontrado"
        )

    return prestamo


@app.put(
    "/prestamos/{id}",
    response_model=PrestamoLibro
)
async def actualizar_prestamo(
    id: str,
    prestamo_update: PrestamoLibroUpdate
):

    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID inválido de MongoDB"
        )

    datos_actualizados = prestamo_update.model_dump(
        exclude_unset=True
    )

    if not datos_actualizados:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se enviaron campos para actualizar"
        )

    resultado = await coleccion_prestamos.update_one(
        {"_id": ObjectId(id)},
        {"$set": datos_actualizados}
    )

    if resultado.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Préstamo no encontrado"
        )

    prestamo_actualizado = await coleccion_prestamos.find_one({
        "_id": ObjectId(id)
    })

    return prestamo_actualizado


@app.delete("/prestamos/{id}")
async def eliminar_prestamo(id: str):

    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID inválido de MongoDB"
        )

    resultado = await coleccion_prestamos.delete_one({
        "_id": ObjectId(id)
    })

    if resultado.deleted_count == 1:
        return {
            "mensaje": "Préstamo eliminado correctamente"
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Préstamo no encontrado"
    )
