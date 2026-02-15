#!/bin/bash
cd /home/site/wwwroot
export PYTHONPATH="/home/site/wwwroot/antenv/lib/python3.11/site-packages:$PYTHONPATH"
python -m gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
