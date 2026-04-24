import asyncio
import time


class RateLimiter:
    """Token bucket — max `rate` calls per second."""

    def __init__(self, rate: float = 1.0):
        self.rate = rate
        self._last = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            wait = (1.0 / self.rate) - (now - self._last)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last = time.monotonic()
