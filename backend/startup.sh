#!/bin/bash
cd /home/site/wwwroot
if [ -d "antenv" ]; then
    source antenv/bin/activate
fi
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
