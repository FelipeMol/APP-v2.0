import supabase from '../lib/supabase.js';

const check = (error) => { if (error) throw new Error(error.message); };

const orcamentoConstrucaoService = {
  // ── Leitura ──────────────────────────────────────────────────────────────

  /** Retorna todos os grupos + itens de uma obra */
  async getByObra(obraId) {
    const { data: grupos, error } = await supabase
      .from('orcamento_grupos')
      .select(`*, orcamento_itens(*)`)
      .eq('obra_id', obraId)
      .order('ordem');
    check(error);
    return (grupos || []).map(g => ({
      ...g,
      itens: (g.orcamento_itens || []).sort((a, b) => a.ordem - b.ordem),
    }));
  },

  /** Lista todos os modelos (templates) */
  async listModelos() {
    const { data, error } = await supabase
      .from('orcamento_modelos')
      .select('id, nome, descricao, criado_em')
      .order('criado_em', { ascending: false });
    check(error);
    return data || [];
  },

  /** Retorna grupos + itens de um modelo */
  async getModelo(modeloId) {
    const { data: grupos, error } = await supabase
      .from('orcamento_grupos')
      .select(`*, orcamento_itens(*)`)
      .eq('modelo_id', modeloId)
      .order('ordem');
    check(error);
    return (grupos || []).map(g => ({
      ...g,
      itens: (g.orcamento_itens || []).sort((a, b) => a.ordem - b.ordem),
    }));
  },

  // ── Persistência ──────────────────────────────────────────────────────────

  /**
   * Salva o orçamento completo de uma obra.
   * Faz um replace total: deleta o existente e insere o novo.
   */
  async saveByObra(obraId, grupos) {
    // 1. Apaga todos os grupos da obra (itens em cascade)
    const { error: delErr } = await supabase
      .from('orcamento_grupos')
      .delete()
      .eq('obra_id', obraId);
    check(delErr);

    // 2. Insere grupos e itens sequencialmente
    for (let gi = 0; gi < grupos.length; gi++) {
      const g = grupos[gi];

      const { data: grupoSalvo, error: gErr } = await supabase
        .from('orcamento_grupos')
        .insert({
          obra_id: obraId,
          nome: g.nome || 'Grupo',
          cor: g.cor || '#4F46E5',
          ordem: gi,
        })
        .select()
        .single();
      check(gErr);

      const itens = g.itens || [];
      if (itens.length > 0) {
        const rows = itens.map((item, ii) => ({
          grupo_id: grupoSalvo.id,
          descricao: item.descricao || '',
          unidade: item.unidade || 'un',
          quantidade: parseFloat(item.quantidade) || 0,
          valor_unitario: parseFloat(item.valor_unitario) || 0,
          ordem: ii,
          observacoes: item.observacoes || null,
        }));
        const { error: iErr } = await supabase.from('orcamento_itens').insert(rows);
        check(iErr);
      }
    }
  },

  // ── Modelos ───────────────────────────────────────────────────────────────

  /**
   * Salva os grupos atuais como um novo modelo reutilizável.
   * Valores (quantidade/valor_unitario) são preservados no modelo.
   */
  async salvarComoModelo(nome, descricao, grupos) {
    const { data: modelo, error: mErr } = await supabase
      .from('orcamento_modelos')
      .insert({ nome, descricao })
      .select()
      .single();
    check(mErr);

    for (let gi = 0; gi < grupos.length; gi++) {
      const g = grupos[gi];

      const { data: grupoSalvo, error: gErr } = await supabase
        .from('orcamento_grupos')
        .insert({
          modelo_id: modelo.id,
          nome: g.nome || 'Grupo',
          cor: g.cor || '#4F46E5',
          ordem: gi,
        })
        .select()
        .single();
      check(gErr);

      const itens = g.itens || [];
      if (itens.length > 0) {
        const rows = itens.map((item, ii) => ({
          grupo_id: grupoSalvo.id,
          descricao: item.descricao || '',
          unidade: item.unidade || 'un',
          quantidade: parseFloat(item.quantidade) || 0,
          valor_unitario: parseFloat(item.valor_unitario) || 0,
          ordem: ii,
        }));
        const { error: iErr } = await supabase.from('orcamento_itens').insert(rows);
        check(iErr);
      }
    }

    return modelo;
  },

  /**
   * Aplica um modelo a uma obra: ADICIONA os grupos do modelo à obra,
   * sem apagar o que já existe.
   */
  async aplicarModelo(obraId, modeloId) {
    const gruposModelo = await this.getModelo(modeloId);

    // Descobre a maior ordem atual da obra
    const { data: existentes } = await supabase
      .from('orcamento_grupos')
      .select('ordem')
      .eq('obra_id', obraId)
      .order('ordem', { ascending: false })
      .limit(1);
    let baseOrdem = existentes?.[0]?.ordem ?? -1;

    for (const g of gruposModelo) {
      baseOrdem++;
      const { data: grupoSalvo, error: gErr } = await supabase
        .from('orcamento_grupos')
        .insert({ obra_id: obraId, nome: g.nome, cor: g.cor, ordem: baseOrdem })
        .select()
        .single();
      check(gErr);

      const itens = g.itens || [];
      if (itens.length > 0) {
        const rows = itens.map((item, ii) => ({
          grupo_id: grupoSalvo.id,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          ordem: ii,
        }));
        const { error: iErr } = await supabase.from('orcamento_itens').insert(rows);
        check(iErr);
      }
    }
  },

  /**
   * Copia o orçamento de uma obra para outra (replace total no destino).
   */
  async copiarParaObra(sourceObraId, targetObraId) {
    const grupos = await this.getByObra(sourceObraId);
    await this.saveByObra(targetObraId, grupos);
  },

  /** Deleta um modelo */
  async deleteModelo(id) {
    const { error } = await supabase.from('orcamento_modelos').delete().eq('id', id);
    check(error);
  },
};

export default orcamentoConstrucaoService;
