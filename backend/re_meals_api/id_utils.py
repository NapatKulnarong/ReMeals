from __future__ import annotations

from typing import Type

from django.db import models


def generate_prefixed_id(
    model_class: Type[models.Model],
    field_name: str,
    prefix: str,
    padding: int = 3,
) -> str:
    """
    Build the next available primary key for model_class.

    The new id always starts with `prefix` followed by a zero-padded integer.
    Padding defaults to 3 digits (e.g. FOO001). The function inspects existing
    rows that already use the prefix and increments the largest numeric suffix.
    """

    if not prefix:
        raise ValueError("Prefix must be a non-empty string.")

    prefix = prefix.upper()
    field = model_class._meta.get_field(field_name)
    if field.max_length is not None and field.max_length < len(prefix) + padding:
        raise ValueError(
            f"Field '{field_name}' cannot store prefix '{prefix}' with {padding} digits."
        )

    lookup = {f"{field_name}__startswith": prefix}
    max_number = 0
    existing_ids = model_class.objects.filter(**lookup).values_list(field_name, flat=True)
    for value in existing_ids:
        if not value:
            continue
        suffix = value[len(prefix) :]
        if suffix.isdigit():
            max_number = max(max_number, int(suffix))

    next_number = max_number + 1
    return f"{prefix}{str(next_number).zfill(padding)}"
