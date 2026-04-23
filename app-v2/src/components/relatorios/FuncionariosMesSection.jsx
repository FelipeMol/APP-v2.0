import { useState, useMemo } from 'react';
import { Users, Search, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * Seção de funcionários que trabalharam no mês
 * @param {Object} props
 * @param {Array} props.funcionarios - Lista de funcionários com dados agregados
 * @param {string} props.mes - Mês no formato YYYY-MM
 */
export default function FuncionariosMesSection({ funcionarios = [], mes }) {
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState({ campo: 'horas_totais', direcao: 'desc' });
  const [expandido, setExpandido] = useState(true);

  // Filtrar e ordenar funcionários
  const funcionariosFiltrados = useMemo(() => {
    let lista = [...funcionarios];

    // Filtrar por busca
    if (busca.trim()) {
      const termoBusca = busca.toLowerCase();
      lista = lista.filter(f =>
        f.funcionario?.toLowerCase().includes(termoBusca) ||
        f.funcao?.toLowerCase().includes(termoBusca) ||
        f.empresa?.toLowerCase().includes(termoBusca)
      );
    }

    // Ordenar
    lista.sort((a, b) => {
      let valorA = a[ordenacao.campo];
      let valorB = b[ordenacao.campo];

      // Converter para número se necessário
      if (ordenacao.campo === 'horas_totais' || ordenacao.campo === 'dias_trabalhados') {
        valorA = parseFloat(valorA) || 0;
        valorB = parseFloat(valorB) || 0;
      } else {
        valorA = String(valorA || '').toLowerCase();
        valorB = String(valorB || '').toLowerCase();
      }

      if (ordenacao.direcao === 'asc') {
        return valorA > valorB ? 1 : -1;
      }
      return valorA < valorB ? 1 : -1;
    });

    return lista;
  }, [funcionarios, busca, ordenacao]);

  // Calcular totais
  const totais = useMemo(() => {
    return {
      funcionarios: funcionarios.length,
      horas: funcionarios.reduce((sum, f) => sum + (parseFloat(f.horas_totais) || 0), 0),
      diasHomem: funcionarios.reduce((sum, f) => sum + (parseInt(f.dias_trabalhados) || 0), 0)
    };
  }, [funcionarios]);

  const handleOrdenar = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ campo }) => {
    if (ordenacao.campo !== campo) return null;
    return ordenacao.direcao === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline-block ml-1" />
    );
  };

  const formatarHoras = (horas) => {
    const h = parseFloat(horas) || 0;
    return h.toFixed(1) + 'h';
  };

  if (funcionarios.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum funcionário trabalhou nesta obra no mês selecionado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpandido(!expandido)}
            >
              {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipe do Mês
              <span className="text-sm font-normal text-gray-500">
                ({totais.funcionarios} funcionários)
              </span>
            </CardTitle>
          </div>

          {expandido && (
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar funcionário..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          )}
        </div>

        {/* Resumo */}
        {expandido && (
          <div className="flex items-center gap-6 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{totais.funcionarios}</p>
              <p className="text-xs text-gray-500">Funcionários</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{formatarHoras(totais.horas)}</p>
              <p className="text-xs text-gray-500">Horas Totais</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{totais.diasHomem}</p>
              <p className="text-xs text-gray-500">Dias-Homem</p>
            </div>
          </div>
        )}
      </CardHeader>

      {expandido && (
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleOrdenar('funcionario')}
                  >
                    Funcionário
                    <SortIcon campo="funcionario" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleOrdenar('funcao')}
                  >
                    Função
                    <SortIcon campo="funcao" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleOrdenar('empresa')}
                  >
                    Empresa
                    <SortIcon campo="empresa" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 text-right"
                    onClick={() => handleOrdenar('dias_trabalhados')}
                  >
                    Dias
                    <SortIcon campo="dias_trabalhados" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100 text-right"
                    onClick={() => handleOrdenar('horas_totais')}
                  >
                    Horas
                    <SortIcon campo="horas_totais" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcionariosFiltrados.map((funcionario, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {funcionario.funcionario}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {funcionario.funcao || '-'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {funcionario.empresa || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {funcionario.dias_trabalhados || 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatarHoras(funcionario.horas_totais)}
                    </TableCell>
                  </TableRow>
                ))}

                {funcionariosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Nenhum funcionário encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
