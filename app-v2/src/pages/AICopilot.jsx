import { useRef, useEffect } from 'react';
import { Send, RotateCcw, Sparkles } from 'lucide-react';
import { useAIChat } from '../hooks/useAIChat';
import useTenantBranding from '../hooks/useTenantBranding';
import useAuthStore from '../store/authStore';

// ── Markdown simples: **texto** → <strong> ───────────────────
function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  );
}

// ── Bolha de mensagem ─────────────────────────────────────────
function MessageBubble({ msg, branding }) {
  const isUser = msg.role === 'user';
  const cor = branding.corPrimaria;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 10,
      marginBottom: 14,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        overflow: 'hidden',
        background: isUser ? cor : '#F0EDE8',
        border: `1.5px solid ${isUser ? 'transparent' : '#E0D9CF'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? (
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>U</span>
        ) : branding.mascoteUrl ? (
          <img src={branding.mascoteUrl} alt="mascote"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Sparkles size={15} color={cor} />
        )}
      </div>
      <div style={{
        maxWidth: '72%',
        background: isUser ? cor : '#fff',
        color: isUser ? '#fff' : '#1C2330',
        border: `1px solid ${isUser ? 'transparent' : '#E8E2D5'}`,
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        padding: '10px 15px',
        fontSize: 13.5,
        lineHeight: 1.6,
        wordBreak: 'break-word',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        whiteSpace: 'pre-wrap',
      }}>
        {renderMarkdown(msg.content)}
      </div>
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────
function TypingIndicator({ branding }) {
  const cor = branding.corPrimaria;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        overflow: 'hidden',
        background: '#F0EDE8', border: '1.5px solid #E0D9CF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {branding.mascoteUrl
          ? <img src={branding.mascoteUrl} alt="mascote"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Sparkles size={15} color={cor} />}
      </div>
      <div style={{
        background: '#fff', border: '1px solid #E8E2D5',
        borderRadius: '4px 18px 18px 18px',
        padding: '12px 18px',
        display: 'flex', gap: 5, alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: cor,
            animation: `aiBounce 1.2s ${i*0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

const SUGESTOES = [
  'Saldo do mes',
  'Obras em andamento',
  'Quantos funcionarios?',
  'Despesas por categoria',
];

export default function AICopilot() {
  const { user }   = useAuthStore();
  const branding   = useTenantBranding();
  const endRef     = useRef(null);
  const inputRef   = useRef(null);

  const firstName = user?.nome?.split(' ')[0] || '';
  const cor = branding.corPrimaria;

  const welcomeMessage = `Ola${firstName ? `, ${firstName}` : ''}! Sou o **${branding.nomeAssistente}**.\n\nEstou conectado aos dados da sua empresa em tempo real. Voce pode me perguntar sobre:\n\n**Financeiro** - lancamentos, receitas, despesas, saldo\n**Obras** - status, progresso, orcamentos e prazos\n**Equipe** - funcionarios, funcoes e status\n**Analises** - despesas por categoria, tendencias\n\nComo posso te ajudar hoje?`;

  const { messages, input, setInput, isLoading, sendMessage, reset } = useAIChat({ welcomeMessage });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const hasOnlyWelcome = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', maxWidth: 880, margin: '0 auto' }}>
      <style>{`
        @keyframes aiBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes aiSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes aiFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ai-suggestion:hover { border-color: ${cor} !important; color: ${cor} !important; background: ${cor}10 !important; }
        .ai-send:hover:not(:disabled) { opacity: 0.88; }
        .ai-reset:hover { background: #F0EDE8 !important; }
      `}</style>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, animation: 'aiFadeIn 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, overflow: 'hidden',
            background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${cor}40`,
          }}>
            {branding.mascoteUrl
              ? <img src={branding.mascoteUrl} alt="mascote"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Sparkles size={24} color="#fff" />}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2330', margin: 0, letterSpacing: '-0.02em' }}>
              {branding.nomeAssistente}
            </h1>
            <p style={{ fontSize: 12, color: '#7F8A99', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Online - Dados em tempo real
            </p>
          </div>
        </div>
        {messages.length > 1 && (
          <button className="ai-reset" onClick={reset}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', borderRadius: 10,
              border: '1px solid #DDD6C7', background: '#fff',
              color: '#7F8A99', fontSize: 12, cursor: 'pointer', transition: 'background 0.15s',
            }}>
            <RotateCcw size={13} /> Nova conversa
          </button>
        )}
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 22px 10px',
        background: '#FAFAF7',
        border: '1px solid #E8E2D5',
        borderRadius: 18,
        marginBottom: 12,
        scrollbarWidth: 'thin',
      }}>
        {messages.map(m => <MessageBubble key={m.id} msg={m} branding={branding} />)}
        {isLoading && <TypingIndicator branding={branding} />}
        {hasOnlyWelcome && !isLoading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, animation: 'aiFadeIn 0.4s ease' }}>
            {SUGESTOES.map(s => (
              <button key={s} className="ai-suggestion"
                onClick={() => sendMessage(s)}
                style={{
                  padding: '8px 14px', borderRadius: 22,
                  border: '1px solid #DDD6C7', background: '#fff',
                  color: '#45505F', fontSize: 12.5, cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        background: '#fff',
        border: '1.5px solid #DDD6C7',
        borderRadius: 16,
        padding: '11px 14px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua pergunta... (Enter para enviar)"
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1, border: 'none', outline: 'none',
            resize: 'none', fontSize: 13.5, lineHeight: 1.5,
            color: '#1C2330', background: 'transparent',
            maxHeight: 120, overflowY: 'auto',
            fontFamily: 'inherit',
          }}
        />
        <button
          className="ai-send"
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={{
            width: 40, height: 40, borderRadius: 12, border: 'none',
            background: input.trim() && !isLoading ? cor : '#E8E4DC',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          {isLoading
            ? <span style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid #7F8A99', borderTopColor: 'transparent', animation: 'aiSpin 0.7s linear infinite', display: 'inline-block' }} />
            : <Send size={16} color={input.trim() ? '#fff' : '#B0A99A'} />}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#B0A99A', marginTop: 8 }}>
        {branding.nomeAssistente} so acessa dados da sua empresa. Confirme informacoes importantes.
      </p>
    </div>
  );
}
