from sqlalchemy.orm import Session

from models.dataset import Dataset
from models.experiment import Experiment
from models.trained_model import TrainedModel

DEMO_DATASET_PREFIXES = ("sample_", "iris_")

STAGE_PRIORITY = {
    "Production": 0,
    "Staging": 1,
    "None": 2,
    "Archived": 3,
    None: 4,
}


def is_demo_dataset(filename: str | None) -> bool:
    name = (filename or "").strip().lower()
    return any(name.startswith(prefix) for prefix in DEMO_DATASET_PREFIXES)


def get_catalog_entries(db: Session, include_demo: bool = False) -> list[dict]:
    rows = (
        db.query(TrainedModel, Experiment, Dataset)
        .join(Experiment, Experiment.id == TrainedModel.experiment_id)
        .join(Dataset, Dataset.id == Experiment.dataset_id, isouter=True)
        .filter(
            TrainedModel.model_path.isnot(None),
            TrainedModel.mlflow_model_name.isnot(None),
            TrainedModel.mlflow_version.isnot(None),
        )
        .all()
    )

    grouped: dict[str, list[dict]] = {}
    for model, experiment, dataset in rows:
        entry = {
            "model": model,
            "experiment": experiment,
            "dataset": dataset,
            "is_demo": is_demo_dataset(dataset.filename if dataset else None),
        }
        if entry["is_demo"] and not include_demo:
            continue
        grouped.setdefault(model.mlflow_model_name, []).append(entry)

    catalog = []
    for entries in grouped.values():
        preferred = sorted(
            entries,
            key=lambda item: (
                STAGE_PRIORITY.get(item["model"].stage, 99),
                -(item["model"].mlflow_version or 0),
                -item["model"].id,
            ),
        )[0]
        catalog.append(preferred)

    return sorted(
        catalog,
        key=lambda item: (
            -item["model"].id,
            STAGE_PRIORITY.get(item["model"].stage, 99),
            -(item["model"].mlflow_version or 0),
            item["model"].mlflow_model_name,
        ),
    )
