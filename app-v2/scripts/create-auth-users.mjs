import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zkjrghjwnalfhzprsrpc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpranJnaGp3bmFsZmh6cHJzcnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg3NTkzOSwiZXhwIjoyMDkyNDUxOTM5fQ.yVIpMg_MsIXW9QqptvVMQ_xw4j-n89_bRldDJ15LceU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENHA_TEMPORARIA = 'MudarSenha@2026';

const usuarios = [
  { email: 'felipe@app.internal',   tenant_id: 'construtora' },
  { email: 'teste@app.internal',    tenant_id: 'construtora' },
  { email: 'viviane@app.internal',  tenant_id: 'construtora' },
  { email: '001@app.internal',      tenant_id: 'construtora' },
  { email: 'geison@app.internal',   tenant_id: null },
  { email: 'franklin@app.internal', tenant_id: null },
];

async function run() {
  for (const u of usuarios) {
    // Verifica se já existe
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find(x => x.email === u.email);

    if (found) {
      // Atualiza a senha e o app_metadata
      const { error } = await supabase.auth.admin.updateUserById(found.id, {
        password: SENHA_TEMPORARIA,
        app_metadata: u.tenant_id ? { tenant_id: u.tenant_id } : {},
        email_confirm: true,
      });
      if (error) {
        console.error(`❌ Erro ao atualizar ${u.email}:`, error.message);
      } else {
        console.log(`✅ Atualizado: ${u.email} (tenant: ${u.tenant_id ?? 'nenhum'})`);
      }
    } else {
      // Cria novo
      const { error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: SENHA_TEMPORARIA,
        email_confirm: true,
        app_metadata: u.tenant_id ? { tenant_id: u.tenant_id } : {},
      });
      if (error) {
        console.error(`❌ Erro ao criar ${u.email}:`, error.message);
      } else {
        console.log(`✅ Criado: ${u.email} (tenant: ${u.tenant_id ?? 'nenhum'})`);
      }
    }
  }

  // Revincula supabase_auth_id na tabela usuarios
  console.log('\n🔗 Relinkando supabase_auth_id...');
  const { data: allUsers } = await supabase.auth.admin.listUsers();
  for (const authUser of allUsers?.users ?? []) {
    if (!authUser.email.endsWith('@app.internal')) continue;
    const { error } = await supabase
      .from('usuarios')
      .update({ supabase_auth_id: authUser.id })
      .eq('usuario', authUser.email.replace('@app.internal', '').replace(/^\w/, c => c.toUpperCase()));
    if (error) console.error(`❌ Relink falhou para ${authUser.email}:`, error.message);
    else console.log(`🔗 Relinkado: ${authUser.email} → ${authUser.id}`);
  }

  console.log('\n✅ Pronto! Tente logar com: Felipe / MudarSenha@2026');
}

run().catch(console.error);
