import redis.asyncio as redis

from src.utils.config import Config

JTI_EXPIRY = 3600

redis_client = redis.from_url(Config.REDIS_URL)

async def add_jti_to_blocklist(jti: str) -> None:
    '''
    Adds token's JTI key in blocklist.
    Adds jti as key and empty as value + the expiry date of the JTI.
    '''
    await redis_client.set(name=jti, value="", ex=JTI_EXPIRY)


async def token_in_blocklist(jti: str) -> bool:
    '''
    Checks if token's JTI is in blocklist.
    '''
    jti = await redis_client.get(jti)
    return jti is not None # returns True or False


async def invalidate_user_tournaments_cache(user_id: int):
    pattern = f"user:{user_id}:tournaments*"
    keys = await redis_client.keys(pattern)
    if keys:
        await redis_client.delete(*keys)