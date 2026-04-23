import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { HardHat, Loader2, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useAuthStore();

  const [formData, setFormData] = useState({ usuario: '', senha: '' });

  useEffect(() => {
    if (isAuthenticated) navigate('/selecionar-empresa', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.usuario || !formData.senha) return;
    try {
      await login(formData.usuario, formData.senha);
      navigate('/selecionar-empresa', { replace: true });
    } catch (err) {
      console.error('Erro no login:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}>

      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'hsl(215 75% 50% / 0.06)' }} />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'hsl(148 55% 40% / 0.05)' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4 animate-scale-in">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary shadow-glow-primary flex items-center justify-center mb-4">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Ramdy Raydan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Sistema de gestão</p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-xl shadow-md p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Entrar na conta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Use suas credenciais para acessar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="usuario" className="text-xs font-medium text-foreground">
                Usuário
              </Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  id="usuario"
                  name="usuario"
                  type="text"
                  placeholder="Seu usuário"
                  value={formData.usuario}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                  autoFocus
                  autoComplete="username"
                  className="pl-9 h-10 text-sm bg-muted/30 border-border/60 focus:border-primary focus:bg-background transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-xs font-medium text-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  placeholder="Sua senha"
                  value={formData.senha}
                  onChange={handleChange}
                  disabled={isLoading}
                  required
                  autoComplete="current-password"
                  className="pl-9 h-10 text-sm bg-muted/30 border-border/60 focus:border-primary focus:bg-background transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-sm font-medium gap-2 mt-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
              ) : (
                <><span>Entrar</span><ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Dev — credenciais:</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Admin:</span>{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono">admin / admin123</code></p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">© 2026 Construtora RR</p>
      </div>
    </div>
  );
}
