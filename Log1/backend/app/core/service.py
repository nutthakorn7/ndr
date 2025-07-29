"""
Base service layer implementation with common CRUD operations.
"""
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from .exceptions import DatabaseError, NotFoundError
from ..models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base class for services with common CRUD operations.
    """
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """Get a single record by ID."""
        try:
            obj = db.query(self.model).filter(self.model.id == id).first()
            if not obj:
                raise NotFoundError(f"{self.model.__name__} not found")
            return obj
        except Exception as e:
            raise DatabaseError(str(e))

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        **filters
    ) -> List[ModelType]:
        """Get multiple records with optional filtering."""
        try:
            query = db.query(self.model)
            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)
            return query.offset(skip).limit(limit).all()
        except Exception as e:
            raise DatabaseError(str(e))

    def create(
        self,
        db: Session,
        *,
        obj_in: Union[CreateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """Create a new record."""
        try:
            obj_in_data = jsonable_encoder(obj_in)
            db_obj = self.model(**obj_in_data)
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except Exception as e:
            db.rollback()
            raise DatabaseError(str(e))

    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """Update an existing record."""
        try:
            obj_data = jsonable_encoder(db_obj)
            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.dict(exclude_unset=True)
            
            for field in obj_data:
                if field in update_data:
                    setattr(db_obj, field, update_data[field])
                    
            if hasattr(db_obj, 'updated_at'):
                db_obj.updated_at = datetime.utcnow()
                
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except Exception as e:
            db.rollback()
            raise DatabaseError(str(e))

    def delete(self, db: Session, *, id: Any) -> ModelType:
        """Delete a record by ID."""
        try:
            obj = db.query(self.model).get(id)
            if not obj:
                raise NotFoundError(f"{self.model.__name__} not found")
            db.delete(obj)
            db.commit()
            return obj
        except NotFoundError:
            raise
        except Exception as e:
            db.rollback()
            raise DatabaseError(str(e))

    def exists(self, db: Session, id: Any) -> bool:
        """Check if a record exists by ID."""
        try:
            return db.query(
                db.query(self.model).filter(self.model.id == id).exists()
            ).scalar()
        except Exception as e:
            raise DatabaseError(str(e))

    def count(self, db: Session, **filters) -> int:
        """Count total records with optional filtering."""
        try:
            query = db.query(self.model)
            for field, value in filters.items():
                if value is not None:
                    query = query.filter(getattr(self.model, field) == value)
            return query.count()
        except Exception as e:
            raise DatabaseError(str(e)) 