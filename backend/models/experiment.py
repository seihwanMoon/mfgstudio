from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    module_type = Column(String, nullable=False)
    target_col = Column(String)
    setup_params = Column(Text)
    mlflow_exp_id = Column(String)
    mlflow_exp_name = Column(String)
    status = Column(String, default="setup")
    created_at = Column(DateTime, server_default=func.now())
