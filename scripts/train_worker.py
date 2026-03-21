#!/usr/bin/env python3
"""
ArclinkTune Training Worker

This script runs the training process in a subprocess,
separated from the main FastAPI server.
"""

import sys
import os
import json
import time
import yaml
from pathlib import Path
from subprocess import Popen, PIPE, TimeoutExpired
from typing import Optional

class TrainingWorker:
    def __init__(self, config: dict, output_dir: str):
        self.config = config
        self.output_dir = Path(output_dir)
        self.process: Optional[Popen] = None
        self.run_id = f"run_{int(time.time())}"
        
    def start(self):
        """Start the training process"""
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Save config
        config_file = self.output_dir / 'training_config.yaml'
        with open(config_file, 'w') as f:
            yaml.dump(self.config, f)
        
        # Build command
        cmd = [
            'llamafactory-cli', 'train', str(config_file)
        ]
        
        # Set environment
        env = os.environ.copy()
        env['LLAMABOARD_ENABLED'] = '1'
        env['LLAMABOARD_WORKDIR'] = str(self.output_dir)
        env['PYTHONPATH'] = str(Path(__file__).parent.parent / 'core' / 'LlamaFactory' / 'src')
        
        # Start process
        self.process = Popen(
            cmd,
            env=env,
            stdout=PIPE,
            stderr=PIPE,
            text=True
        )
        
        return self.run_id
    
    def stop(self):
        """Stop the training process"""
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except TimeoutExpired:
                self.process.kill()
            self.process = None
    
    def get_status(self) -> dict:
        """Get current training status"""
        if not self.process:
            return {'status': 'not_started', 'run_id': self.run_id}
        
        return_code = self.process.poll()
        
        if return_code is None:
            return {
                'status': 'running',
                'run_id': self.run_id,
                'pid': self.process.pid
            }
        elif return_code == 0:
            return {
                'status': 'completed',
                'run_id': self.run_id,
                'return_code': return_code
            }
        else:
            return {
                'status': 'failed',
                'run_id': self.run_id,
                'return_code': return_code
            }
    
    def get_logs(self, lines: int = 100) -> str:
        """Get training logs"""
        log_file = self.output_dir / 'running_log.txt'
        if log_file.exists():
            with open(log_file, 'r') as f:
                all_lines = f.readlines()
                return ''.join(all_lines[-lines:])
        return ""

if __name__ == '__main__':
    import argparse
    import yaml
    
    parser = argparse.ArgumentParser(description='ArclinkTune Training Worker')
    parser.add_argument('--config', required=True, help='Path to YAML config file')
    parser.add_argument('--output-dir', required=True, help='Output directory')
    args = parser.parse_args()
    
    with open(args.config, 'r') as f:
        config = yaml.safe_load(f)
    
    worker = TrainingWorker(config, args.output_dir)
    run_id = worker.start()
    
    print(f"Training started with run_id: {run_id}")
    print(f"Output directory: {args.output_dir}")
    
    # Monitor until completion
    while True:
        status = worker.get_status()
        print(f"Status: {status['status']}")
        
        if status['status'] in ['completed', 'failed']:
            break
        
        time.sleep(5)
