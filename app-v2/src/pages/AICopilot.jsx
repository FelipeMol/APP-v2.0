import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import useAuthStore from '../store/authStore';
import supabase from '../lib/supabase.js';

// ── Helpers ──────────────────────────────────────────────────
function getSelectedTenantId() {
  try {
    const raw = localStorage.getItem('selected_tenant');
    return raw ? JSON.parse(raw)?.id : null;
  } catch {
    return null;
  }
}

async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// ── Message bubble ────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 18,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: isUser ? '#2C5F3F' : '#F5F0E8',
          border: '1.5px solid ' + (isUser ? '#3D7A50' : '#DDD6C7'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isUser
          ? <User size={16} color="#fff" />
          : <Bot size={16} color="#3D7A50" />}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '72%',
          background: isUser ? '#2C5F3F' : '#fff',
          color: isUser ? '#fff' : '#1C2330',
          border: '1px solid ' + (isUser ? 'transparent' : '#DDD6C7'),
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
      <div
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: '#F5F0E8', border: '1.5px solid #DDD6C7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <Bot size={16} color="#3D7A50" />
      </div>
      <div
        style={{
          background: '#fff', border: '1px solid #DDD6C7',
          borderRadius: '4px 16px 16px 16px',
          padding: '12px 16px',
          display: 'flex', gap: 5, alignItems: 'center',
        }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#3D7A50',
              animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sugestões de perguntas ────────────────────────────────────
const SUGESTOES = [
  'Qual o saldo atual da empresa?',
  'Me mostra os lançamentos do mês',
  'Quais obras estão em andamento?',
  'Resumo de despesas por categoria',
];

// ── Main component ────────────────────────────────────────────
// URL da Edge Function: VITE_SUPABASE_URL já está disponível no build
const AI_API_URL = import.meta.env.VITE_AI_API_URL
  || (import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`
    : 'http://localhost:8000/chat');

export default function AICopilot() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automático ao fim
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Foca input ao montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    const tenantId = getSelectedTenantId();
    const token = await getAuthToken();

    const userMsg = { role: 'user', content: trimmed, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'X-Tenant-ID': String(tenantId) } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          tenant_id: tenantId,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Erro ${res.status}: ${body}`);
      }

      const data = await res.json();
      const aiMsg = { role: 'assistant', content: data.response || data.message || '(sem resposta)', id: Date.now() + 1 };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Não consegui me conectar ao servidor de IA. Verifique se o servidor Python está rodando.',
        id: Date.now() + 1,
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleReset() {
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 860, margin: '0 auto' }}>

      {/* Bounce keyframe */}
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #2C5F3F, #3D7A50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2330', margin: 0 }}>
              IA Copilot
            </h1>
            <p style={{ fontSize: 12, color: '#7F8A99', margin: 0 }}>
              Assistente inteligente da sua empresa
            </p>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={handleReset}
            title="Nova conversa"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid #DDD6C7', background: '#fff',
              color: '#7F8A99', fontSize: 13, cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} /> Nova conversa
          </button>
        )}
      </div>

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#FAFAF8',
          border: '1px solid #DDD6C7',
          borderRadius: 14,
          padding: '20px 20px 12px',
          marginBottom: 12,
        }}
      >
        {isEmpty ? (
          /* Estado vazio */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #2C5F3F, #3D7A50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={32} color="#fff" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1C2330', margin: '0 0 6px' }}>
                Olá{user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}! Como posso ajudar?
              </h2>
              <p style={{ fontSize: 13, color: '#7F8A99', margin: 0 }}>
                Tenho acesso aos dados da sua empresa. Pergunte o que quiser.
              </p>
            </div>
            {/* Sugestões */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520 }}>
              {SUGESTOES.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '8px 14px', borderRadius: 20,
                    border: '1px solid #DDD6C7', background: '#fff',
                    color: '#3D7A50', fontSize: 13, cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#3D7A50'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#DDD6C7'}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: '#fff',
          border: '1px solid #DDD6C7',
          borderRadius: 14,
          padding: '10px 12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua pergunta... (Enter para enviar, Shift+Enter nova linha)"
          rows={1}
          disabled={isLoading}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#1C2330',
            background: 'transparent',
            maxHeight: 120,
            overflowY: 'auto',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: input.trim() && !isLoading ? 'linear-gradient(135deg, #2C5F3F, #3D7A50)' : '#E8E4DC',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          {isLoading
            ? <Loader2 size={17} color="#7F8A99" style={{ animation: 'spin 1s linear infinite' }} />
            : <Send size={17} color={input.trim() ? '#fff' : '#7F8A99'} />}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Disclaimer */}
      <p style={{ textAlign: 'center', fontSize: 11, color: '#B0A99A', marginTop: 8 }}>
        A IA só acessa dados da sua empresa. As respostas podem conter imprecisões — sempre confirme informações importantes.
      </p>
    </div>
  );
}
