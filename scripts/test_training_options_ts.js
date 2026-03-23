/**
 * Training Options Test Suite
 * Tests all training configurations to verify they serialize correctly
 */

const TEST_CONFIGS = [
  {
    name: "Basic LoRA",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      lora_alpha: 16,
      lora_target: "all",
      compute_device: "auto",
      bf16: true,
    },
  },
  {
    name: "Full Parameter",
    config: {
      stage: "sft",
      finetuning_type: "full",
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "Freeze Training",
    config: {
      stage: "sft",
      finetuning_type: "freeze",
      freeze_trainable_layers: 2,
      freeze_trainable_modules: "all",
      compute_device: "auto",
      bf16: true,
    },
  },
  {
    name: "LoRA + 4-bit Quantization",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      lora_alpha: 16,
      quantization_bit: 4,
      quantization_method: "bnb",
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "LoRA + Flash Attention",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      booster: "flashattn2",
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "DeepSpeed ZeRO-2",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      ds_stage: "2",
      ds_offload: false,
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "DeepSpeed ZeRO-3 + Offload",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      ds_stage: "3",
      ds_offload: true,
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "GaLore Optimization",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      use_galore: true,
      galore_rank: 16,
      galore_target: "all",
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "Apollo Optimization",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      use_apollo: true,
      apollo_rank: 16,
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "BAdam Optimizer",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      use_badam: true,
      badam_mode: "layer",
      badam_switch_interval: 50,
      compute_device: "cuda",
      bf16: true,
    },
  },
  {
    name: "LoRA+ with R-SLoRA",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 16,
      lora_alpha: 32,
      use_rslora: true,
      loraplus_lr_ratio: 16,
      compute_device: "auto",
      bf16: true,
    },
  },
  {
    name: "DoRA",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      lora_alpha: 16,
      use_dora: true,
      compute_device: "auto",
      bf16: true,
    },
  },
  {
    name: "CPU Only Training",
    config: {
      stage: "sft",
      finetuning_type: "lora",
      lora_rank: 8,
      compute_device: "cpu",
      bf16: false,
      fp16: true,
    },
  },
];

const API_BASE = "http://localhost:8000/api";

async function testConfig(name, config) {
  try {
    const response = await fetch(`${API_BASE}/training/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, name, config, result };
    } else {
      const error = await response.text();
      return { success: false, name, config, error };
    }
  } catch (e) {
    return { success: false, name, config, error: e.message };
  }
}

async function testAllConfigs() {
  console.log("=" .repeat(60));
  console.log("ArclinkTune - Training Options Test Suite");
  console.log("=" .repeat(60));
  console.log();

  // Test 1: Check API Health
  console.log("[1/3] Checking API Health...");
  try {
    const devices = await fetch(`${API_BASE}/training/compute-devices`);
    if (devices.ok) {
      console.log("  ✓ API is running");
    } else {
      console.log("  ✗ API not responding");
      return;
    }
  } catch (e) {
    console.log("  ✗ API not accessible:", e.message);
    return;
  }

  // Test 2: Check Compute Devices
  console.log("\n[2/3] Checking Compute Devices...");
  try {
    const devices = await fetch(`${API_BASE}/training/compute-devices`);
    if (devices.ok) {
      const data = await devices.json();
      console.log(`  Available devices: ${data.available.length}`);
      data.available.forEach((d) => {
        console.log(`    - ${d.name} (${d.type})`);
      });
    }
  } catch (e) {
    console.log("  ✗ Failed to get compute devices:", e.message);
  }

  // Test 3: Test Each Config
  console.log("\n[3/3] Testing Training Configurations...");
  console.log("-".repeat(60));

  const results = [];
  for (const { name, config } of TEST_CONFIGS) {
    const result = await testConfig(name, config);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✓ ${name}`);
      const cfg = result.result.config || {};
      if (cfg.use_cpu !== undefined) {
        console.log(`    → use_cpu: ${cfg.use_cpu}, compute_device accepted`);
      }
    } else {
      console.log(`  ✗ ${name}`);
      console.log(`    Error: ${result.error || "Unknown"}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log("\nFailed configurations:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }
  
  console.log("\n" + "=".repeat(60));
}

// Auto-run
testAllConfigs();
