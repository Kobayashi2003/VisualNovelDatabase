import os
from typing import Union
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, event
from sqlalchemy.orm import declared_attr
from imgserve import db
from imgserve.utils import get_image_path

class Image(db.Model):
    __abstract__ = True

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    # Stamped from the Redis access ZSET by the periodic flush job, not from
    # the request thread — see imgserve.utils.access. Nullable for rows
    # created before the column existed.
    last_accessed_at = Column(DateTime, nullable=True)

    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower()

    @property
    def type(self):
        raise NotImplementedError("Subclasses must implement this property")

    @declared_attr
    def __mapper_args__(cls):
        return {
            'polymorphic_identity': cls.type.fget(None),
        }

    def __iter__(self):
        yield 'id', self.id
        yield 'type', self.type
        yield 'created_at', self.created_at.isoformat()
        yield 'updated_at', self.updated_at.isoformat()
        yield 'last_accessed_at', self.last_accessed_at.isoformat() if self.last_accessed_at else None

    def __str__(self):
        return f"<{self.__class__.__name__}(id={self.id}, type={self.type}, created_at={self.created_at.isoformat()}, updated_at={self.updated_at.isoformat()})>"

    def __repr__(self):
        return f"{self.__class__.__name__}(id={self.id!r}, type={self.type!r}, created_at={self.created_at!r}, updated_at={self.updated_at!r})"

class CV(Image):
    @property
    def type(self):
        return 'cv'

class SF(Image):
    @property
    def type(self):
        return 'sf'

class CVT(Image):
    @property
    def type(self):
        return 'cv.t'

class SFT(Image):
    @property
    def type(self):
        return 'sf.t'

class CH(Image):
    @property
    def type(self):
        return 'ch'

def receive_after_delete(mapper, connection, target):
    """Remove the cached file when its row is deleted."""
    image_path = get_image_path(target.type, target.id)
    if os.path.exists(image_path):
        os.remove(image_path)
    print(f"Image deleted: {target}")

for cls in [CV, SF, CVT, SFT, CH]:
    event.listen(cls, 'after_delete', receive_after_delete)

ImageType = Union[CV, SF, CVT, SFT, CH]

IMAGE_MODEL = {'cv': CV, 'sf': SF, 'cv.t': CVT, 'sf.t': SFT, 'ch': CH}
