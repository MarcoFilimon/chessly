import redis.asyncio as redis

from src.utils.config import Config

JTI_EXPIRY = 3600

token_blocklist = redis.from_url(Config.REDIS_URL)

async def add_jti_to_blocklist(jti: str) -> None:
    '''
    Adds token's JTI key in blocklist.
    Adds jti as key and empty as value + the expiry date of the JTI.
    '''
    await token_blocklist.set(name=jti, value="", ex=JTI_EXPIRY)


async def token_in_blocklist(jti: str) -> bool:
    '''
    Checks if token's JTI is in blocklist.
    '''
    jti = await token_blocklist.get(jti)
    return jti is not None # returns True or False