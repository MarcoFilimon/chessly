@echo off
start "" python -m celery -A src.celery_tasks.c_app worker --loglevel=info --pool=solo
start "" python -m celery -A src.celery_tasks.c_app flower --broker=redis://localhost:6379/0 --port=5555 --loglevel=info