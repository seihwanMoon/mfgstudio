import json
from pathlib import Path

import chardet
import pandas as pd

from config import settings


def normalize_column_names(columns) -> tuple[list[str], dict[str, str]]:
    mapping = {}
    used = set()
    normalized = []

    for original in columns:
        base = " ".join(str(original).replace("\t", " ").replace("\n", " ").split()) or "column"
        candidate = base
        suffix = 1
        while candidate in used:
            suffix += 1
            candidate = f"{base}_{suffix}"
        used.add(candidate)
        mapping[str(original)] = candidate
        normalized.append(candidate)

    return normalized, mapping


def process_upload(file_path: str, original_filename: str) -> dict:
    with open(file_path, "rb") as source:
        raw = source.read(100_000)
    encoding = chardet.detect(raw)["encoding"] or "utf-8"

    suffix = Path(original_filename).suffix.lower()
    if suffix == ".csv":
        df = pd.read_csv(file_path, encoding=encoding)
    elif suffix in {".xlsx", ".xls"}:
        df = pd.read_excel(file_path)
        encoding = "utf-8"
    else:
        raise ValueError(f"지원하지 않는 파일 형식입니다: {suffix}")

    normalized_columns, _ = normalize_column_names(df.columns)
    df.columns = normalized_columns

    parquet_path = str(Path(settings.upload_dir) / f"{Path(original_filename).stem}.parquet")
    df.to_parquet(parquet_path, index=False)

    col_meta = []
    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        dtype = df[col].dtype
        if pd.api.types.is_numeric_dtype(dtype):
            col_type = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            col_type = "date"
        else:
            col_type = "categorical"
        col_meta.append(
            {
                "name": col,
                "type": col_type,
                "missing_count": missing_count,
                "missing_pct": round((missing_count / max(len(df), 1)) * 100, 1),
                "unique_count": int(df[col].nunique()),
            }
        )

    return {
        "stored_path": parquet_path,
        "encoding": encoding,
        "row_count": len(df),
        "col_count": len(df.columns),
        "col_meta": json.dumps(col_meta, ensure_ascii=False),
        "col_meta_list": col_meta,
    }


def get_preview(parquet_path: str, n: int = 50) -> dict:
    df = pd.read_parquet(parquet_path)
    return {
        "rows": df.head(n).fillna("").to_dict("records"),
        "total_rows": len(df),
        "columns": [{"name": col} for col in df.columns],
    }
