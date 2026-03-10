import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from database import SessionLocal
from models.dataset import Dataset
from models.experiment import Experiment
from models.trained_model import TrainedModel
from services.mlflow_service import get_all_registered_models, log_sklearn_model_run, register_run_model, transition_model_stage
from services.model_catalog_service import get_catalog_entries
from services.pycaret_service import _get_pycaret_module


def main() -> None:
    db = SessionLocal()
    try:
        visible_names = {entry["model"].mlflow_model_name for entry in get_catalog_entries(db)}
        existing = {
            item["name"]: max(item.get("latest_versions") or [0])
            for item in get_all_registered_models()
        }
        rows = (
            db.query(TrainedModel, Experiment, Dataset)
            .join(Experiment, Experiment.id == TrainedModel.experiment_id)
            .join(Dataset, Dataset.id == Experiment.dataset_id, isouter=True)
            .filter(
                TrainedModel.mlflow_model_name.in_(visible_names),
                TrainedModel.mlflow_version.isnot(None),
                TrainedModel.model_path.isnot(None),
            )
            .order_by(TrainedModel.mlflow_model_name.asc(), TrainedModel.mlflow_version.asc(), TrainedModel.id.asc())
            .all()
        )

        synced = 0
        for model_row, experiment, dataset in rows:
            current_max = existing.get(model_row.mlflow_model_name, 0)
            if current_max >= int(model_row.mlflow_version or 0):
                continue

            module = _get_pycaret_module(experiment.module_type)
            loaded_model = module.load_model(str(Path(model_row.model_path).with_suffix("")))
            run_info = log_sklearn_model_run(
                experiment_name=experiment.mlflow_exp_name or experiment.name,
                run_name=f"backfill::{model_row.mlflow_model_name}::v{model_row.mlflow_version}",
                model=loaded_model,
                metrics=json.loads(model_row.metrics or "{}"),
                params=json.loads(experiment.setup_params or "{}"),
                tags={
                    "module_type": experiment.module_type,
                    "algorithm": model_row.algorithm,
                    "artifact_source": "backfill",
                    "catalog_model_name": model_row.mlflow_model_name,
                    "dataset_filename": dataset.filename if dataset else "",
                },
            )
            registered = register_run_model(model_row.mlflow_model_name, run_info["run_id"], description="Backfilled from local registry")
            model_row.mlflow_run_id = run_info["run_id"]
            model_row.mlflow_version = int(registered["version"])
            if model_row.stage and model_row.stage != "None":
                transition_model_stage(model_row.mlflow_model_name, model_row.mlflow_version, model_row.stage)
            existing[model_row.mlflow_model_name] = model_row.mlflow_version
            synced += 1

        db.commit()
        print(f"Backfilled model versions: {synced}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
