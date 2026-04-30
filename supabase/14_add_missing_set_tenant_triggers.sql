-- Migration: add_missing_set_tenant_triggers
-- Corrige 409 Conflict no POST de obras (e outras tabelas) para tenants MFK
-- Tabelas antigas não tinham trigger para auto-fill de tenant_id no INSERT

CREATE TRIGGER trg_set_tenant_obras
  BEFORE INSERT ON public.obras
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_funcoes
  BEFORE INSERT ON public.funcoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_empresas
  BEFORE INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_funcionarios
  BEFORE INSERT ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_lancamentos
  BEFORE INSERT ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_obras_cronograma
  BEFORE INSERT ON public.obras_cronograma
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_obras_alertas
  BEFORE INSERT ON public.obras_alertas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_obras_metas
  BEFORE INSERT ON public.obras_metas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_tarefas
  BEFORE INSERT ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_relatorios
  BEFORE INSERT ON public.relatorios
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_relatorios_fotos
  BEFORE INSERT ON public.relatorios_fotos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_etiquetas
  BEFORE INSERT ON public.etiquetas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_avaliacoes
  BEFORE INSERT ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_candidatos
  BEFORE INSERT ON public.candidatos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_entrevistas
  BEFORE INSERT ON public.entrevistas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_admissoes
  BEFORE INSERT ON public.admissoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_requisicoes_vagas
  BEFORE INSERT ON public.requisicoes_vagas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();

CREATE TRIGGER trg_set_tenant_responsaveis
  BEFORE INSERT ON public.responsaveis
  FOR EACH ROW EXECUTE FUNCTION trigger_set_tenant_id();
