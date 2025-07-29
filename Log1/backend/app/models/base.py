"""
Base SQLAlchemy model with common fields and functionality.
"""
from datetime import datetime
import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import as_declarative, declared_attr

class CustomBase:
    """Custom base class for all models."""
    
    @declared_attr
    def __tablename__(cls) -> str:
        """Generate __tablename__ automatically."""
        return cls.__name__.lower()

    # Primary key
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def __repr__(self):
        """String representation of the model."""
        attrs = []
        for key in self.__mapper__.attrs.keys():
            if key not in ['created_at', 'updated_at']:
                value = getattr(self, key)
                if value is not None:
                    attrs.append(f"{key}={value}")
        return f"<{self.__class__.__name__}({', '.join(attrs)})>"

    def to_dict(self):
        """Convert model to dictionary."""
        result = {}
        for key in self.__mapper__.attrs.keys():
            value = getattr(self, key)
            if isinstance(value, datetime):
                value = value.isoformat()
            result[key] = value
        return result

    @classmethod
    def from_dict(cls, data: dict):
        """Create model instance from dictionary."""
        return cls(**{
            k: v for k, v in data.items()
            if k in cls.__mapper__.attrs.keys()
        })

Base = declarative_base(cls=CustomBase) 