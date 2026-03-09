from pathlib import Path

import pandas as pd


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
