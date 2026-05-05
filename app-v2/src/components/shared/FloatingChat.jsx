import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, RotateCcw, ChevronDown, Sparkles } from 'lucide-react';
import { useAIChat } from '../../hooks/useAIChat';
import useTenantBranding from '../../hooks/useTenantBranding';
import useAuthStore from '../../store/authStore';

// ── Renderizador de markdown simples (negrito com **texto**) ──
function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Bolhas de mensagem ────────────────────────────────────────
function Bubble({ msg, mascoteUrl, corPrimaria }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 10,
    }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden', background: '#f0f0f0',
          border: '1.5px solid rgba(0,0,0,0.08)',
        }}>
          {mascoteUrl
            ? <img src={mascoteUrl} alt="mascote" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={13} color="#fff" />
              </div>
          }
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        background: isUser ? corPrimaria : '#fff',
        color: isUser ? '#fff' : '#1C2330',
        border: `1px solid ${isUser ? 'transparent' : '#E8E2D5'}`,
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        padding: '8px 12px',
        fontSize: 13,
        lineHeight: 1.55,
        wordBreak: 'break-word',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        whiteSpace: 'pre-wrap',
      }}>
        {renderMarkdown(msg.content)}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────
function TypingDots({ corPrimaria }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={13} color="#fff" />
      </div>
      <div style={{
        background: '#fff', border: '1px solid #E8E2D5',
        borderRadius: '4px 16px 16px 16px', padding: '10px 14px',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: corPrimaria,
            animation: `floatBubbleDot 1.2s ${i*0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function FloatingChat() {
  const [isOpen, setIsOpen]   = useState(false);
  const [animate, setAnimate] = useState(false);
  const branding  = useTenantBranding();
  const { user }  = useAuthStore();
  const endRef    = useRef(null);
  const inputRef  = useRef(null);

  const firstName = user?.nome?.split(' ')[0] || '';
  const welcomeMessage = `Olá${firstName ? `, ${firstName}` : ''}! Sou ${branding.nomeAssistente}. 😊\n\nEstou aqui para te ajudar com:\n• **Financeiro** – lançamentos, receitas, despesas\n• **Obras** – status, progresso, orçamentos\n• **Equipe** – funcionários e funções\n\nComo posso ajudar?`;

  const { messages, input, setInput, isLoading, sendMessage, reset } = useAIChat({ welcomeMessage });

  // Ao abrir, foca input
  const open = useCallback(() => {
    setAnimate(false);
    setIsOpen(true);
    setTimeout(() => {
      setAnimate(true);
      inputRef.current?.focus();
    }, 10);
  }, []);

  const close = useCallback(() => {
    setAnimate(false);
    setTimeout(() => setIsOpen(false), 250);
  }, []);

  // Scroll automático
  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const cor = branding.corPrimaria;

  return (
    <>
      <style>{`
        @keyframes floatBubbleDot {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-5px); }
        }
        @keyframes floatChatOpen {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes floatChatClose {
          from { opacity: 1; transform: translateY(0)    scale(1);    }
          to   { opacity: 0; transform: translateY(20px) scale(0.95); }
        }
        @keyframes floatBtnPulse {
          0%, 100% { box-shadow: 0 4px 20px ${cor}55, 0 0 0 0 ${cor}44; }
          50%       { box-shadow: 0 4px 20px ${cor}55, 0 0 0 8px ${cor}00; }
        }
        .ai-bubble-btn:hover { transform: scale(1.07); }
        .ai-suggestion-btn:hover { background: ${cor}18 !important; border-color: ${cor}80 !important; color: ${cor} !important; }
        .ai-send-btn:hover:not(:disabled) { opacity: 0.9; transform: scale(1.05); }
      `}</style>

      {/* Chat window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 88, right: 28, zIndex: 9999,
          width: 360, height: 'min(520px, calc(100vh - 110px))',
          background: '#FAFAF8',
          border: '1px solid #E0D9CF',
          borderRadius: 18,
          boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: `${animate ? 'floatChatOpen' : 'floatChatClose'} 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards`,
        }}>

          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {branding.mascoteUrl ? (
              <img src={branding.mascoteUrl} alt="mascote"
                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
                  border: '2px solid rgba(255,255,255,0.5)' }}
                onError={e => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={18} color="#fff" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
                {branding.nomeAssistente}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Online
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={reset} title="Nova conversa"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6,
                  width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={13} color="#fff" />
              </button>
              <button onClick={close}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6,
                  width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronDown size={15} color="#fff" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px', scrollbarWidth: 'thin' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#B0A99A', fontSize: 12, marginTop: 20 }}>
                Faça uma pergunta para começar
              </div>
            )}
            {messages.map(m => (
              <Bubble key={m.id} msg={m} mascoteUrl={branding.mascoteUrl} corPrimaria={cor} />
            ))}
            {isLoading && <TypingDots corPrimaria={cor} />}
            <div ref={endRef} />
          </div>

          {/* Suggestions (when only welcome) */}
          {messages.length === 1 && !isLoading && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {['Resumo financeiro do mês', 'Obras em andamento', 'Quantos funcionários?'].map(s => (
                <button key={s} className="ai-suggestion-btn"
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
                    border: '1px solid #DDD6C7', background: '#fff',
                    color: '#7F8A99', fontSize: 11, transition: 'all 0.15s',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 8,
            padding: '10px 12px',
            borderTop: '1px solid #E8E2D5',
            background: '#fff',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem..."
              rows={1}
              disabled={isLoading}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                fontSize: 13, lineHeight: 1.5, color: '#1C2330',
                background: 'transparent', maxHeight: 90, overflowY: 'auto',
                fontFamily: 'inherit',
              }}
            />
            <button
              className="ai-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 34, height: 34, borderRadius: 10, border: 'none',
                background: input.trim() && !isLoading ? cor : '#E8E4DC',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              <Send size={15} color={input.trim() && !isLoading ? '#fff' : '#B0A99A'} />
            </button>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        className="ai-bubble-btn"
        onClick={isOpen ? close : open}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
          cursor: 'pointer', transition: 'transform 0.2s',
          animation: 'floatBtnPulse 3s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {branding.mascoteUrl && !isOpen ? (
          <img src={branding.mascoteUrl} alt="chat"
            style={{ width: '115%', height: '115%', objectFit: 'cover', objectPosition: 'top center', borderRadius: '50%' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <Sparkles size={22} color="#fff" style={{ transition: 'transform 0.2s' }} />
        )}
      </button>
    </>
  );
}
