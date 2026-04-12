import time
from typing import Dict, Any, Optional

class SimpleCache:
    def __init__(self, ttl: int = 7 * 24 * 60 * 60):  # Default 7 days
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            item = self._cache[key]
            if time.time() < item["expires_at"]:
                return item["value"]
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any):
        self._cache[key] = {
            "value": value,
            "expires_at": time.time() + self.ttl
        }

    def clear(self):
        self._cache.clear()

# Global cache instance for club tournaments
club_cache = SimpleCache()
