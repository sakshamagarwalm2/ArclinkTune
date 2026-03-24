#!/usr/bin/env python
"""Test script to verify loss graph functionality."""

import json
import os
from pathlib import Path

# Create a test trainer_log.jsonl with simulated loss data
test_output_dir = Path("core/LlamaFactory/output/test_loss_graph")
test_output_dir.mkdir(parents=True, exist_ok=True)

# Simulate loss data similar to what LlamaFactory writes
test_log_entries = [
    {
        "current_steps": 1,
        "total_steps": 20,
        "loss": 2.5,
        "lr": 5e-5,
        "epoch": 0.15,
        "percentage": 5.0,
        "elapsed_time": "0:00:10",
        "remaining_time": "0:03:10",
    },
    {
        "current_steps": 2,
        "total_steps": 20,
        "loss": 2.3,
        "lr": 4.5e-5,
        "epoch": 0.3,
        "percentage": 10.0,
        "elapsed_time": "0:00:20",
        "remaining_time": "0:03:00",
    },
    {
        "current_steps": 3,
        "total_steps": 20,
        "loss": 2.1,
        "lr": 4e-5,
        "epoch": 0.45,
        "percentage": 15.0,
        "elapsed_time": "0:00:30",
        "remaining_time": "0:02:50",
    },
    {
        "current_steps": 4,
        "total_steps": 20,
        "loss": 1.9,
        "lr": 3.5e-5,
        "epoch": 0.6,
        "percentage": 20.0,
        "elapsed_time": "0:00:40",
        "remaining_time": "0:02:40",
    },
    {
        "current_steps": 5,
        "total_steps": 20,
        "loss": 1.7,
        "lr": 3e-5,
        "epoch": 0.75,
        "percentage": 25.0,
        "elapsed_time": "0:00:50",
        "remaining_time": "0:02:30",
    },
    {
        "current_steps": 6,
        "total_steps": 20,
        "loss": 1.6,
        "lr": 2.5e-5,
        "epoch": 0.9,
        "percentage": 30.0,
        "elapsed_time": "0:01:00",
        "remaining_time": "0:02:20",
    },
    {
        "current_steps": 7,
        "total_steps": 20,
        "loss": 1.5,
        "lr": 2e-5,
        "epoch": 1.05,
        "percentage": 35.0,
        "elapsed_time": "0:01:10",
        "remaining_time": "0:02:10",
    },
    {
        "current_steps": 8,
        "total_steps": 20,
        "loss": 1.4,
        "lr": 1.5e-5,
        "epoch": 1.2,
        "percentage": 40.0,
        "elapsed_time": "0:01:20",
        "remaining_time": "0:02:00",
    },
    {
        "current_steps": 9,
        "total_steps": 20,
        "loss": 1.3,
        "lr": 1e-5,
        "epoch": 1.35,
        "percentage": 45.0,
        "elapsed_time": "0:01:30",
        "remaining_time": "0:01:50",
    },
    {
        "current_steps": 10,
        "total_steps": 20,
        "loss": 1.2,
        "lr": 5e-6,
        "epoch": 1.5,
        "percentage": 50.0,
        "elapsed_time": "0:01:40",
        "remaining_time": "0:01:40",
    },
    {
        "current_steps": 11,
        "total_steps": 20,
        "loss": 1.15,
        "lr": 4.5e-6,
        "epoch": 1.65,
        "percentage": 55.0,
        "elapsed_time": "0:01:50",
        "remaining_time": "0:01:30",
    },
    {
        "current_steps": 12,
        "total_steps": 20,
        "loss": 1.1,
        "lr": 4e-6,
        "epoch": 1.8,
        "percentage": 60.0,
        "elapsed_time": "0:02:00",
        "remaining_time": "0:01:20",
    },
    {
        "current_steps": 13,
        "total_steps": 20,
        "loss": 1.05,
        "lr": 3.5e-6,
        "epoch": 1.95,
        "percentage": 65.0,
        "elapsed_time": "0:02:10",
        "remaining_time": "0:01:10",
    },
    {
        "current_steps": 14,
        "total_steps": 20,
        "loss": 1.0,
        "lr": 3e-6,
        "epoch": 2.1,
        "percentage": 70.0,
        "elapsed_time": "0:02:20",
        "remaining_time": "0:01:00",
    },
    {
        "current_steps": 15,
        "total_steps": 20,
        "loss": 0.95,
        "lr": 2.5e-6,
        "epoch": 2.25,
        "percentage": 75.0,
        "elapsed_time": "0:02:30",
        "remaining_time": "0:00:50",
    },
    {
        "current_steps": 16,
        "total_steps": 20,
        "loss": 0.92,
        "lr": 2e-6,
        "epoch": 2.4,
        "percentage": 80.0,
        "elapsed_time": "0:02:40",
        "remaining_time": "0:00:40",
    },
    {
        "current_steps": 17,
        "total_steps": 20,
        "loss": 0.89,
        "lr": 1.5e-6,
        "epoch": 2.55,
        "percentage": 85.0,
        "elapsed_time": "0:02:50",
        "remaining_time": "0:00:30",
    },
    {
        "current_steps": 18,
        "total_steps": 20,
        "loss": 0.86,
        "lr": 1e-6,
        "epoch": 2.7,
        "percentage": 90.0,
        "elapsed_time": "0:03:00",
        "remaining_time": "0:00:20",
    },
    {
        "current_steps": 19,
        "total_steps": 20,
        "loss": 0.84,
        "lr": 5e-7,
        "epoch": 2.85,
        "percentage": 95.0,
        "elapsed_time": "0:03:10",
        "remaining_time": "0:00:10",
    },
    {
        "current_steps": 20,
        "total_steps": 20,
        "loss": 0.82,
        "lr": 0,
        "epoch": 3.0,
        "percentage": 100.0,
        "elapsed_time": "0:03:20",
        "remaining_time": "0:00:00",
    },
]

# Write to trainer_log.jsonl
log_path = test_output_dir / "trainer_log.jsonl"
with open(log_path, "w", encoding="utf-8") as f:
    for entry in test_log_entries:
        f.write(json.dumps(entry) + "\n")

print(f"Created test trainer_log.jsonl at: {log_path}")
print(f"  Entries: {len(test_log_entries)}")
print(f"  Has loss: {all('loss' in entry for entry in test_log_entries)}")
print(
    f"  Loss range: {min(e['loss'] for e in test_log_entries):.2f} to {max(e['loss'] for e in test_log_entries):.2f}"
)

# Test the API endpoint format
print("\n=== Testing API Response Format ===")
with open(log_path, "r", encoding="utf-8") as f:
    entries = []
    for line in f:
        line = line.strip()
        if line:
            entries.append(json.loads(line))

response = {"entries": entries, "found": True}
print(f"  Response has {len(response['entries'])} entries")
print(f"  First entry keys: {list(response['entries'][0].keys())}")
print(f"  Sample entry: {response['entries'][0]}")

# Verify entries have loss
has_loss = all("loss" in entry for entry in entries)
print(f"\n  All entries have 'loss': {has_loss}")

if has_loss:
    print("\nSUCCESS: trainer_log.jsonl format is correct for loss graph!")
else:
    print("\nWARNING: Some entries are missing 'loss' field")

# Now test with actual frontend data format
print("\n=== Testing Frontend Data Format ===")
# Simulate what the LossChart component expects
chart_data = []
for entry in entries:
    if entry.get("loss") is not None:
        chart_data.append(
            {
                "step": entry.get("current_steps"),
                "loss": entry.get("loss"),
                "eval_loss": entry.get("eval_loss"),
            }
        )

print(f"  Chart data points: {len(chart_data)}")
print(f"  Sample chart data: {chart_data[0]}")

if len(chart_data) > 0:
    print("\nSUCCESS: Data format is compatible with LossChart component!")
else:
    print("\nERROR: No valid chart data points")

print("\n" + "=" * 60)
print("Test complete. Run a training with more than 5 steps to see loss graph.")
print("=" * 60)
