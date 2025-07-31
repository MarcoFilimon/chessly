from fastapi import FastAPI, status, HTTPException
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import time
import logging

logger = logging.getLogger("uvicorn.access")
logger.disabled = True
# logging.basicConfig(level=logging.INFO)


# https://fastapi.tiangolo.com/tutorial/middleware/?h=middle#create-a-middleware
# https://fastapi.tiangolo.com/tutorial/cors/

def register_middleware(app: FastAPI):

    @app.middleware("http")
    async def custom_logging(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        processing_time = time.time() - start_time
        current_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        message = f"{request.client.host}:{request.client.port} - {request.method} - {current_time} - {request.url.path} - {response.status_code} completed after {processing_time}s"
        print(message)
        # logging.info(message)
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # all origins can access our API
        allow_methods=["*"], # what methods (like GET POST etc) can access our middleware
        allow_headers=["*"],
        allow_credentials=True,
    )

    app.add_middleware(
        TrustedHostMiddleware,
        # list of domains that can access the API
        allowed_hosts=["localhost", "127.0.0.1" ,"0.0.0.0"],
    )#