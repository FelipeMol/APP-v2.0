"""
Autenticação: valida o JWT enviado pelo frontend e extrai tenant_id.
Garante que cada empresa só acessa os próprios dados.
"""

from fastapi import HTTPException, Header
from typing import Optional
import json
from jose import jwt, JWTError
from config import settings


def verify_token_and_tenant(
    authorization: Optional[str] = Header(default=None),
    x_tenant_id: Optional[str] = Header(default=None, alias="X-Tenant-ID"),
) -> dict:
    """
    Dependency do FastAPI:
    - Valida o Bearer JWT
    - Extrai user_id e tenant_id do token ou do header X-Tenant-ID
    - Retorna dict com user_id e tenant_id

    Levanta 401 se token inválido, 400 se tenant não identificado.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido.")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sem user_id.")

    # Tenta pegar tenant_id: primeiro do header, depois do payload
    raw_tenant = x_tenant_id or payload.get("tenant_id")
    if not raw_tenant:
        raise HTTPException(status_code=400, detail="tenant_id não fornecido.")

    try:
        tenant_id = int(raw_tenant)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="tenant_id inválido.")

    return {"user_id": user_id, "tenant_id": tenant_id}
