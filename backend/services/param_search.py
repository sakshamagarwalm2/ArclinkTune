import random
import math
from typing import List, Optional, Dict, Any
from uuid import uuid4

from models.autotune_models import SearchSpace, TrialConfig, TrialResult, AutoTuneConfig


def _lhs_sample(n: int, dimensions: int) -> List[List[float]]:
    segments = n
    samples = []
    for _ in range(n):
        sample = []
        for d in range(dimensions):
            perm = list(range(segments))
            random.shuffle(perm)
            sample.append((perm[0] + random.random()) / segments)
        samples.append(sample)
    return samples


def _map_continuous(value: float, min_val: float, max_val: float) -> float:
    return min_val + value * (max_val - min_val)


def _pick_from_options(value: float, options: List) -> any:
    idx = int(value * len(options)) % len(options)
    return options[idx]


def generate_random_config(
    space: SearchSpace,
    trial_number: int,
    previous_configs: Optional[List[TrialConfig]] = None,
) -> TrialConfig:
    lr = 10 ** _map_continuous(
        random.random(),
        math.log10(space.learning_rate_min),
        math.log10(space.learning_rate_max),
    )
    lora_rank = random.choice(space.lora_rank_options)
    lora_alpha = random.choice(space.lora_alpha_options)
    lora_dropout = _map_continuous(
        random.random(), space.lora_dropout_min, space.lora_dropout_max
    )
    batch_size = random.choice(space.batch_size_options)
    grad_accum = random.choice(space.gradient_accumulation_options)
    scheduler = random.choice(space.lr_scheduler_options)
    warmup_ratio = _map_continuous(
        random.random(), space.warmup_ratio_min, space.warmup_ratio_max
    )
    cutoff_len = random.choice(space.cutoff_len_options)
    weight_decay = _map_continuous(
        random.random(), space.weight_decay_min, space.weight_decay_max
    )

    config = TrialConfig(
        trial_id=str(uuid4()),
        trial_number=trial_number,
        learning_rate=round(lr, 8),
        lora_rank=lora_rank,
        lora_alpha=lora_alpha,
        lora_dropout=round(lora_dropout, 4),
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=grad_accum,
        lr_scheduler_type=scheduler,
        warmup_ratio=round(warmup_ratio, 4),
        cutoff_len=cutoff_len,
        weight_decay=round(weight_decay, 5),
        ai_reasoning="Rule-based: random sampling from search space (no AI advisor configured)",
        ai_hypothesis="Exploring diverse configurations to map the parameter landscape",
    )
    return config


def generate_lhs_configs(
    space: SearchSpace,
    count: int,
) -> List[TrialConfig]:
    dimensions = 10
    raw_samples = _lhs_sample(count, dimensions)
    configs = []

    for i, sample in enumerate(raw_samples):
        lr = 10 ** _map_continuous(
            sample[0],
            math.log10(space.learning_rate_min),
            math.log10(space.learning_rate_max),
        )
        config = TrialConfig(
            trial_id=str(uuid4()),
            trial_number=i + 1,
            learning_rate=round(lr, 8),
            lora_rank=_pick_from_options(sample[1], space.lora_rank_options),
            lora_alpha=_pick_from_options(sample[2], space.lora_alpha_options),
            lora_dropout=round(
                _map_continuous(
                    sample[3], space.lora_dropout_min, space.lora_dropout_max
                ),
                4,
            ),
            per_device_train_batch_size=_pick_from_options(
                sample[4], space.batch_size_options
            ),
            gradient_accumulation_steps=_pick_from_options(
                sample[5], space.gradient_accumulation_options
            ),
            lr_scheduler_type=_pick_from_options(sample[6], space.lr_scheduler_options),
            warmup_ratio=round(
                _map_continuous(
                    sample[7], space.warmup_ratio_min, space.warmup_ratio_max
                ),
                4,
            ),
            cutoff_len=_pick_from_options(sample[8], space.cutoff_len_options),
            weight_decay=round(
                _map_continuous(
                    sample[9], space.weight_decay_min, space.weight_decay_max
                ),
                5,
            ),
            ai_reasoning=f"Rule-based: Latin Hypercube Sample #{i + 1} — systematic coverage of search space",
            ai_hypothesis="Systematic exploration to find promising regions",
        )
        configs.append(config)

    return configs


def configs_are_similar(
    a: TrialConfig, b: TrialConfig, tolerance: float = 0.05
) -> bool:
    if abs(math.log10(a.learning_rate) - math.log10(b.learning_rate)) > tolerance:
        return False
    if a.lora_rank != b.lora_rank:
        return False
    if a.lora_alpha != b.lora_alpha:
        return False
    if a.lr_scheduler_type != b.lr_scheduler_type:
        return False
    if a.cutoff_len != b.cutoff_len:
        return False
    if abs(a.lora_dropout - b.lora_dropout) > tolerance:
        return False
    return True


def find_unique_config(
    space: SearchSpace,
    trial_number: int,
    previous_configs: List[TrialConfig],
    max_attempts: int = 100,
) -> TrialConfig:
    for _ in range(max_attempts):
        config = generate_random_config(space, trial_number, previous_configs)
        is_unique = True
        for prev in previous_configs:
            if configs_are_similar(config, prev):
                is_unique = False
                break
        if is_unique:
            return config
    return generate_random_config(space, trial_number, previous_configs)
