from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from database import Base


class TrainedModel(Base):
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    algorithm = Column(String, nullable=False)
    is_tuned = Column(Boolean, default=False)
    metrics = Column(Text)
    hyperparams = Column(Text)
    model_path = Column(String)
    mlflow_run_id = Column(String)
    mlflow_model_name = Column(String)
    mlflow_version = Column(Integer)
    stage = Column(String, default="None")
    drift_score = Column(Float, default=0.0)
    pred_count_total = Column(Integer, default=0)
    pred_count_today = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
