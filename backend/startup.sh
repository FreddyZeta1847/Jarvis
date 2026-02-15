#!/bin/bash
cd /home/site/wwwroot
python3 -m pip install -r requirements.txt --quiet
python3 -m gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080 --timeout 120
