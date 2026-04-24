import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Save } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import useAuthStore from '@/store/authStore';
import usuariosService from '@/services/usuariosService';

export default function Perfil() {
  const { user } = useAuthStore();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaNova2, setSenhaNova2] = useState('');
  const [loading, setLoading] = useState(false);

  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showNova2, setShowNova2] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!senhaAtual || !senhaNova || !senhaNova2) {
      toast.error('Preencha senha atual e a nova senha');
      return;
    }

    if (senhaNova.length < 4) {
      toast.error('Nova senha muito curta');
      return;
    }

    if (senhaNova !== senhaNova2) {
      toast.error('A confirmação da nova senha não confere');
      return;
    }

    try {
      setLoading(true);

      const res = await usuariosService.alterarSenha(user?.id, senhaAtual, senhaNova);

      if (!res?.sucesso) {
        throw new Error(res?.mensagem || 'Erro ao alterar senha');
      }

      toast.success(res?.mensagem || 'Senha alterada com sucesso');
      setSenhaAtual('');
      setSenhaNova('');
      setSenhaNova2('');
    } catch (error) {
      const message = error?.response?.data?.mensagem || error?.message || 'Erro ao alterar senha';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-600">Altere sua senha de acesso.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do usuário</CardTitle>
          <CardDescription>Informações básicas da sua conta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={user?.nome || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>Informe sua senha atual e defina a nova senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden username for password manager accessibility */}
            <input type="text" name="username" value={user?.email || ''} readOnly autoComplete="username" className="hidden" aria-hidden="true" />
            <div className="space-y-2">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <div className="relative">
                <Input
                  id="senha-atual"
                  type={showAtual ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowAtual((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                  aria-label={showAtual ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                >
                  {showAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="senha-nova">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="senha-nova"
                    type={showNova ? 'text' : 'password'}
                    value={senhaNova}
                    onChange={(e) => setSenhaNova(e.target.value)}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNova((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                    aria-label={showNova ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  >
                    {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha-nova-2">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="senha-nova-2"
                    type={showNova2 ? 'text' : 'password'}
                    value={senhaNova2}
                    onChange={(e) => setSenhaNova2(e.target.value)}
                    placeholder="Digite novamente"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNova2((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                    aria-label={showNova2 ? 'Ocultar confirmar senha' : 'Mostrar confirmar senha'}
                  >
                    {showNova2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
