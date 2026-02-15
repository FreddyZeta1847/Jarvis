#!/bin/bash
cd /home/site/wwwroot

# Oryx compresses the venv — extract it if needed
if [ -f "antenv.tar.gz" ] && [ ! -d "antenv" ]; then
    tar xzf antenv.tar.gz
fi

source antenv/bin/activate
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120
