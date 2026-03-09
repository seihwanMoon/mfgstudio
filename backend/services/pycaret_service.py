from pathlib import Path
import random

import pandas as pd


MODULE_LIBRARY = {
    "classification": {
        "algorithms": ["LightGBM", "CatBoost", "XGBoost", "Random Forest", "Extra Trees", "GBM"],
        "sort": "Accuracy",
    },
    "regression": {
        "algorithms": ["LightGBM", "CatBoost", "XGBoost", "Random Forest", "ElasticNet", "Ridge"],
        "sort": "R2",
    },
    "clustering": {
        "algorithms": ["KMeans", "Birch", "Agglomerative", "DBSCAN"],
        "sort": "Score",
    },
    "anomaly": {
        "algorithms": ["IsolationForest", "IForest", "LOF", "OCSVM"],
        "sort": "Score",
    },
    "timeseries": {
        "algorithms": ["ARIMA", "ETS", "Prophet", "AutoARIMA"],
        "sort": "MAE",
    },
}


def run_setup(dataset_path: str, module_type: str, params: dict, mlflow_experiment_name: str) -> dict:
    df = pd.read_parquet(Path(dataset_path))
    target_col = params.get("target_col")
    pipeline_steps = ["load_dataset"]
    if params.get("normalize"):
        pipeline_steps.append(f"normalize:{params.get('normalize_method', 'zscore')}")
    if params.get("fix_imbalance"):
        pipeline_steps.append("fix_imbalance")
    if params.get("remove_outliers"):
        pipeline_steps.append("remove_outliers")
    if params.get("imputation_type"):
        pipeline_steps.append(f"imputation:{params['imputation_type']}")

    transformed_cols = len(df.columns) - (1 if target_col and target_col in df.columns else 0)
    return {
        "pipeline_steps": pipeline_steps or ["raw"],
        "transformed_shape": [len(df), transformed_cols],
        "mlflow_experiment_id": None,
        "mlflow_experiment_name": mlflow_experiment_name,
        "module_type": module_type,
    }


def list_available_models(module_type: str) -> list[str]:
    return MODULE_LIBRARY.get(module_type, MODULE_LIBRARY["classification"])["algorithms"]


def generate_compare_results(experiment_id: int, module_type: str, options: dict | None = None) -> list[dict]:
    options = options or {}
    library = MODULE_LIBRARY.get(module_type, MODULE_LIBRARY["classification"])
    algorithms = [name for name in library["algorithms"] if name not in set(options.get("exclude", []))]
    if options.get("include"):
        allowed = set(options["include"])
        algorithms = [name for name in algorithms if name in allowed]

    rng = random.Random(experiment_id)
    rows = []
    for rank, algorithm in enumerate(algorithms, start=1):
        base = 0.93 - (rank - 1) * 0.011
        jitter = rng.uniform(-0.003, 0.003)
        if module_type == "classification":
            metrics = {
                "Accuracy": round(base + jitter, 4),
                "AUC": round(min(0.99, base + 0.055 + jitter), 4),
                "F1": round(base - 0.03 + jitter, 4),
                "Recall": round(base - 0.04 + jitter, 4),
                "Precision": round(base - 0.018 + jitter, 4),
            }
        elif module_type == "regression":
            metrics = {
                "R2": round(base + jitter, 4),
                "MAE": round(0.25 + rank * 0.04 + abs(jitter), 4),
                "RMSE": round(0.31 + rank * 0.05 + abs(jitter), 4),
                "MAPE": round(0.08 + rank * 0.01 + abs(jitter), 4),
            }
        else:
            metrics = {"Score": round(base + jitter, 4)}

        rows.append(
            {
                "rank": rank,
                "algorithm": algorithm,
                "metrics": metrics,
                "tt_sec": round(1.5 + rank * 0.9 + rng.uniform(0.05, 0.5), 2),
                "mlflow_run_id": f"run_{experiment_id}_{rank:02d}",
            }
        )

    sort_key = options.get("sort") or library["sort"]
    reverse = sort_key not in {"MAE", "RMSE", "MAPE"}
    rows.sort(key=lambda row: row["metrics"].get(sort_key, 0), reverse=reverse)
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
        row["total_models"] = len(rows)
        row["total_done"] = index
    return rows[: options.get("n_select", len(rows))] if options.get("truncate_to_select") else rows


def generate_tune_trials(experiment_id: int, algorithm: str, n_iter: int = 25) -> list[dict]:
    rng = random.Random(f"{experiment_id}:{algorithm}")
    trials = []
    best_value = 0.0
    for index in range(1, n_iter + 1):
        value = round(0.88 + min(0.07, index * 0.0014) + rng.uniform(-0.004, 0.004), 4)
        is_best = value > best_value
        if is_best:
            best_value = value
        trials.append(
            {
                "trial_number": index,
                "value": value,
                "params": {
                    "learning_rate": round(max(0.01, 0.08 - index * 0.001), 3),
                    "num_leaves": 31 + index * 2,
                },
                "is_best": is_best,
            }
        )
    return trials


def summarize_tune_result(algorithm: str, trials: list[dict]) -> dict:
    best = max(trials, key=lambda trial: trial["value"])
    before = round(best["value"] - 0.018, 4)
    after = best["value"]
    return {
        "algorithm": algorithm,
        "before_metrics": {
            "Accuracy": before,
            "AUC": round(before + 0.042, 4),
            "F1": round(before - 0.021, 4),
            "Recall": round(before - 0.03, 4),
        },
        "after_metrics": {
            "Accuracy": after,
            "AUC": round(after + 0.042, 4),
            "F1": round(after - 0.021, 4),
            "Recall": round(after - 0.03, 4),
        },
        "changed_params": {
            "learning_rate": {"before": 0.1, "after": best["params"]["learning_rate"]},
            "num_leaves": {"before": 31, "after": best["params"]["num_leaves"]},
        },
    }
