import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AtividadesSection = ({ atividades }) => {
  const getAcaoTexto = (atividade) => {
    switch (atividade.acao) {
      case 'criou':
        return 'criou esta tarefa';
      case 'atualizou':
        if (atividade.campo_alterado && atividade.valor_anterior && atividade.valor_novo) {
          return (
            <>
              alterou <strong>{atividade.campo_alterado}</strong> de{' '}
              <span className="text-red-600">{atividade.valor_anterior}</span> para{' '}
              <span className="text-green-600">{atividade.valor_novo}</span>
            </>
          );
        }
        return 'atualizou a tarefa';
      case 'comentou':
        return 'adicionou um comentário';
      case 'adicionou_membro':
        return `adicionou ${atividade.valor_novo} como membro`;
      case 'removeu_membro':
        return `removeu ${atividade.valor_anterior} como membro`;
      case 'adicionou_etiqueta':
        return `adicionou a etiqueta ${atividade.valor_novo}`;
      case 'removeu_etiqueta':
        return `removeu a etiqueta ${atividade.valor_anterior}`;
      case 'adicionou_anexo':
        return `anexou ${atividade.valor_novo}`;
      case 'removeu_anexo':
        return `removeu o anexo ${atividade.valor_anterior}`;
      case 'concluiu_checklist':
        return `marcou como concluído: ${atividade.valor_novo}`;
      case 'reabriu_checklist':
        return `reabriu: ${atividade.valor_anterior}`;
      default:
        return atividade.descricao || 'realizou uma ação';
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        Atividade
      </h3>

      {atividades.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma atividade registrada</p>
      ) : (
        <div className="space-y-4">
          {atividades.map((atividade, index) => (
            <div key={atividade.id || index} className="flex gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-medium">
                  {atividade.usuario_nome?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-gray-900">
                    {atividade.usuario_nome}
                  </span>
                  <span className="text-sm text-gray-700">
                    {getAcaoTexto(atividade)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {atividade.criado_em && formatDistanceToNow(
                    new Date(atividade.criado_em),
                    { addSuffix: true, locale: ptBR }
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AtividadesSection;
