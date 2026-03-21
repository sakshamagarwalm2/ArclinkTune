#!/usr/bin/env python3
"""
ArclinkTune Backend Launcher

Starts the FastAPI backend server with proper environment setup.
"""

import sys
import os
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='ArclinkTune Backend')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8000, help='Port to bind to')
    parser.add_argument('--reload', action='store_true', help='Enable auto-reload')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent
    llamafactory_path = project_root / 'core' / 'LlamaFactory'
    
    sys.path.insert(0, str(llamafactory_path / 'src'))
    os.environ['PYTHONPATH'] = f"{llamafactory_path / 'src'}:{os.environ.get('PYTHONPATH', '')}"
    
    import uvicorn
    from backend.main import app
    
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level='debug' if args.debug else 'info'
    )

if __name__ == '__main__':
    main()
