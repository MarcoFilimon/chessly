# Chess bracket maker

Technologies:
- FastAPI
- PostgreSQL
- Redis (to revoke access tokens when logged out (add them to a blocklist) + check if token in blocklist when accessing protected endpoints) + for Celery tasks
- SQLModel
- JWT
- Middleware
- Background tasks with Celery & Redis


To run:
- fastapi dev src/main.py OR uvicorn src.main:app --reload
- runworker.bat

Docker:


Docs:
- http://localhost:8000/api/v1/docs
- http://localhost:8000/api/v1/redoc