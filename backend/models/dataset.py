from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    encoding = Column(String, default="utf-8")
    row_count = Column(Integer)
    col_count = Column(Integer)
    col_meta = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
