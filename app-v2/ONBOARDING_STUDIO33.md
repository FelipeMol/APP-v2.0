# Onboarding: Studio 33 — app em `studio33arquitetura.com/financeiro/`

Studio 33 é um **novo grupo independente** (ao lado do Grupo MFK e da Construtora Ramdy Raydan). Tem 1 tenant: `studio33`.

**Importante:** `studio33arquitetura.com/` é o site institucional. O app financeiro/gestao mora em **subpasta**:

```
https://studio33arquitetura.com/financeiro/
```

Por isso o deploy do Studio 33 é diferente dos outros: build com `base=/financeiro/` enviado para `public_html/financeiro/` (não substitui o site institucional).

## Checklist

### 1. Banco (Supabase)
Aplicar a migration:

```
supabase/21_tenant_studio33.sql
```

Ela cria o `grupo` Studio 33 (dominio `studio33arquitetura.com`), o `tenant` `studio33` e habilita todos os módulos. Pode ser aplicada via **Supabase Agent** ou no SQL Editor.

> O campo `grupos.dominio` é **só hostname** (a RPC `resolve_domain` casa por `window.location.hostname`). Por isso fica `studio33arquitetura.com` sem o `/financeiro`.

### 2. cPanel HostGator (conta `hg253b74`)
1. Criar pasta `public_html/financeiro/` (o script já faz `mkdir -p` via SSH, mas pode criar manualmente também).
2. Garantir que `studio33arquitetura.com` esteja apontando para essa conta cPanel (Alias / Addon Domain / DNS no registrar para os nameservers HostGator).
3. O site institucional continua sendo servido pelo `public_html/index.*` da raiz. O app fica isolado em `/financeiro/`.

### 3. Deploy
Rodar a partir de `app-v2/`:

```bash
./scripts/deploy-studio33.sh
```

O que ele faz:
- `vite build --base=/financeiro/` (assets ficam `/financeiro/assets/...`).
- Grava um `.htaccess` mínimo dentro de `dist/`.
- `rsync` para `hg253b74@sh00086.hostgator.com.br:/home2/hg253b74/public_html/financeiro/`.

> O app usa **HashRouter**, então rotas ficam `https://studio33arquitetura.com/financeiro/#/dashboard`. Não precisa de rewrite SPA no Apache.

### 4. Branding
- `app-v2/src/hooks/useTenantBranding.js`: já registrado `studio33: 'Assistente Studio 33'`.
- Logo: quando o arquivo estiver pronto, salvar em `app-v2/public/logos/studio33.jpg` e incluir `'studio33'` em `TENANTS_WITH_LOCAL_LOGOS`. Sem isso, cai no `tenant.logo_url` do banco.

### 5. Primeiro usuário
Criar pelo Super Admin ou pela RPC `criar_usuario` (ver `app-v2/scripts/20260501_criar_usuario_rpc.sql`) com `tenant_id = 'studio33'`.

