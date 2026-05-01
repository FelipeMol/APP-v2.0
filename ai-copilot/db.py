"""
Conexão com o Supabase via supabase-py (PostgREST + service_role).
Requer no .env:
  SUPABASE_URL=https://xyz.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
"""

from supabase import create_client, Client
from config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Retorna o cliente Supabase (singleton)."""
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError(
                "Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env\n"
                "(Settings → API no Supabase Dashboard)"
            )
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


async def init_pool():
    """Inicializa conexão (valida credenciais na startup)."""
    get_supabase()


async def close_pool():
    """Sem pool para fechar no supabase-py."""
    pass
