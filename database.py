
"""
Módulo de Base de Datos (database.py)
Gestiona la conexión asíncrona a MongoDB utilizando Motor.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from decouple import config


MONGODB_URL = config("MONGODB_URL", default="mongodb://localhost:27017")
DATABASE_NAME = config("DATABASE_NAME", default="adso_db")


client = AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]
coleccion_prestamos = database["prestamos_libros"]


async def verificar_conexion():
    """Comprueba el estado de la conexión con MongoDB."""
    try:
        await client.admin.command("ping")
        print(f"Conexión exitosa a MongoDB - Base de Datos: '{DATABASE_NAME}'")
    except Exception as e:
        print(f"Error de conexión a MongoDB: {e}")
        raise
