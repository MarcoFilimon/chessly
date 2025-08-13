from sqlmodel import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel.ext.asyncio.session import AsyncSession
from src.utils.config import Config

async_engine = AsyncEngine(
    create_engine(
    url = Config.DATABASE_URL,
    # echo = True
))

async def get_session():
    '''
    Returns database session.
    '''
    Session = sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with Session() as session:
        yield session
