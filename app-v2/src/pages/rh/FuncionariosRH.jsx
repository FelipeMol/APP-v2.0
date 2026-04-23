import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Search, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import funcionariosService from '@/services/funcionariosService';
import FuncionarioDrawer from './components/FuncionarioDrawer';

export default function FuncionariosRH() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await funcionariosService.list();
      const list = Array.isArray(res?.dados) ? res.dados : [];
      list.sort((a, b) => (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR'));
      setItems(list);
    } catch (e) {
      toast.error('Não foi possível carregar os funcionários');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((f) => (f?.nome || '').toLowerCase().includes(term));
  }, [items, search]);

  function openFuncionario(funcionario) {
    setSelected(funcionario);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Funcionários (RH)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clique em um funcionário para abrir o painel com informações e abas editáveis.
            </p>
          </div>

          <div className="w-full md:w-[360px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-10">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">Nenhum funcionário encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => openFuncionario(f)}
                  className="group text-left rounded-xl border border-border/60 bg-background hover:bg-muted/30 transition-colors p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center border border-border">
                      <UserRound className="w-5 h-5 text-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{f.nome}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {f.funcao || '—'} • {f.empresa || '—'}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        Abrir detalhes
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FuncionarioDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        funcionario={selected}
      />
    </div>
  );
}
