from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("trained_models.id"))
    model_name = Column(String, nullable=False)
    source = Column(String, default="manual")
    input_data = Column(Text)
    label = Column(String)
    score = Column(Float)
    threshold = Column(Float, default=0.5)
    created_at = Column(DateTime, server_default=func.now())
