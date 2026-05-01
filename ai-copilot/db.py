"""
Conexão com o banco de dados (asyncpg).
Suporta Supabase (pooler) ou PostgreSQL direto via DATABASE_URL.
"""

from contextlib import asynccontextmanager
import asyncpg
from config import settings

_pool: asyncpg.Pool | None = None


async def init_pool():
    global _pool
    db_url = settings.database_url or _build_supabase_url()
    _pool = await asyncpg.create_pool(dsn=db_url, min_size=2, max_size=10)


def _build_supabase_url() -> str:
    """Monta URL de conexão a partir das variáveis do Supabase."""
    # Supabase pooler: postgresql://postgres.[ref]:[senha]@aws-0-xx.pooler.supabase.com:6543/postgres
    # Para isso o usuário deve preencher DATABASE_URL diretamente.
    raise ValueError(
        "Configure DATABASE_URL ou SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no .env"
    )


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_db_connection():
    """Context manager para obter uma conexão do pool."""
    if _pool is None:
        raise RuntimeError("Pool de banco de dados não inicializado. Chame init_pool() primeiro.")
    async with _pool.acquire() as conn:
        yield conn
