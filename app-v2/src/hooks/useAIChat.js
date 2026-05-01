import { useState, useEffect } from 'react';
import supabase from '../lib/supabase.js';

const AI_API_URL =
  import.meta.env.VITE_AI_API_URL ||
  (import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`
    : 'http://localhost:8000/chat');

function getSelectedTenantId() {
  try {
    const raw = localStorage.getItem('selected_tenant');
    return raw ? JSON.parse(raw)?.id : null;
  } catch { return null; }
}

async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/**
 * Hook compartilhado de chat IA.
 * @param {string|null} welcomeMessage - Mensagem inicial enviada pelo assistente ao abrir.
 */
export function useAIChat({ welcomeMessage = null } = {}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Injeta mensagem de boas-vindas na primeira abertura
  useEffect(() => {
    if (!initialized && welcomeMessage) {
      setMessages([{ role: 'assistant', content: welcomeMessage, id: 'welcome' }]);
      setInitialized(true);
    }
  }, [welcomeMessage, initialized]);

  async function sendMessage(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isLoading) return;

    const tenantId = getSelectedTenantId();
    const token    = await getAuthToken();

    const userMsg = { role: 'user', content: trimmed, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token    ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'X-Tenant-ID': String(tenantId) } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          history: messages
            .filter(m => m.id !== 'welcome')
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content })),
          tenant_id: tenantId,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Erro ${res.status}: ${body}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.message || '(sem resposta)',
        id: Date.now() + 1,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Não consegui me conectar. Tente novamente.',
        id: Date.now() + 1,
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setMessages(
      welcomeMessage
        ? [{ role: 'assistant', content: welcomeMessage, id: 'welcome' }]
        : [],
    );
    setInput('');
  }

  return { messages, input, setInput, isLoading, sendMessage, reset };
}
