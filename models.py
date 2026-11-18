
"""
Módulo de Modelos de Datos (models.py)
Define los esquemas Pydantic y el adaptador para ObjectId de MongoDB.
"""

from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from pydantic_core import core_schema


class _ObjectIdPydanticAnnotation:

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):

        def validate(value):
            if isinstance(value, ObjectId):
                return value

            if isinstance(value, str) and ObjectId.is_valid(value):
                return ObjectId(value)

            raise ValueError("ID inválido de MongoDB (ObjectId)")

        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(validate)
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                str
            )
        )


PyObjectId = Annotated[ObjectId, _ObjectIdPydanticAnnotation]

class PrestamoLibroBase(BaseModel):

    titulo_libro: str = Field(
        ...,
        min_length=3,
        max_length=150,
        description="Título del libro prestado"
    )

    usuario: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Nombre del usuario que solicita el préstamo"
    )

    dias_prestamo: int = Field(
        ...,
        gt=0,
        description="Cantidad de días del préstamo"
    )

    devuelto: bool = Field(
        default=False,
        description="Estado de devolución del libro"
    )



class PrestamoLibroCreate(PrestamoLibroBase):
    pass

class PrestamoLibroUpdate(BaseModel):

    titulo_libro: Optional[str] = Field(
        None,
        min_length=3,
        max_length=150
    )

    usuario: Optional[str] = Field(
        None,
        min_length=3,
        max_length=100
    )

    dias_prestamo: Optional[int] = Field(
        None,
        gt=0
    )

    devuelto: Optional[bool] = None



class PrestamoLibro(PrestamoLibroBase):

    id: PyObjectId = Field(
        alias="_id",
        description="Identificador único del préstamo"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "_id": "654321789abcdef012345678",
                "titulo_libro": "Cien años de soledad",
                "usuario": "Diana Rodriguez",
                "dias_prestamo": 15,
                "devuelto": False
            }
        }
    )
