import { useState } from "react";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, FileText, Sparkles, CheckCircle } from "lucide-react";

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(null); // 'privacy' or 'terms'
  const [legalContent, setLegalContent] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLogin && !agreeTerms) {
      toast.error("Необходимо согласиться с условиями");
      return;
    }
    
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const response = await axios.post(`${API}${endpoint}`, {
        email,
        password,
        agree_terms: agreeTerms,
      });

      onLogin(response.data.access_token, response.data.user);
      toast.success(isLogin ? "С возвращением!" : "Аккаунт создан! Вам начислено 300 бесплатных токенов.");
    } catch (error) {
      const message = error.response?.data?.detail || "Произошла ошибка";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openLegal = async (type) => {
    try {
      const response = await axios.get(`${API}/legal/${type}`);
      setLegalContent(response.data);
      setShowTerms(type);
    } catch (error) {
      toast.error("Ошибка загрузки документа");
    }
  };

  if (showTerms && legalContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full card max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">{legalContent.title}</h2>
            <button
              onClick={() => setShowTerms(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto flex-1 pr-2">
            <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">
              {legalContent.content}
            </pre>
          </div>
          <button
            onClick={() => setShowTerms(null)}
            className="btn-primary mt-4"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">DocAI Chat</h1>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Работайте с документами
            <span className="block text-violet-400">с помощью ИИ</span>
          </h2>
          
          <p className="text-slate-400 text-lg mb-8">
            Загружайте шаблоны презентаций, Excel таблицы, Word документы.
            ИИ поможет создать новые документы на их основе.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <span>Используйте ваши шаблоны презентаций</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-violet-400" />
              </div>
              <span>Поддержка Excel, Word, PowerPoint, PDF</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <span>300 бесплатных токенов при регистрации</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">DocAI Chat</h1>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? "С возвращением!" : "Создать аккаунт"}
            </h2>
            <p className="text-slate-400 mb-6">
              {isLogin
                ? "Войдите чтобы продолжить работу"
                : "Зарегистрируйтесь и получите 300 бесплатных токенов"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11"
                    placeholder="your@email.com"
                    required
                    data-testid="auth-email-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-11"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    data-testid="auth-password-input"
                  />
                </div>
              </div>

              {/* Terms checkbox for registration */}
              {!isLogin && (
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agree-terms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                    data-testid="agree-terms-checkbox"
                  />
                  <label htmlFor="agree-terms" className="text-sm text-slate-400">
                    Я соглашаюсь с{" "}
                    <button
                      type="button"
                      onClick={() => openLegal('terms')}
                      className="text-violet-400 hover:underline"
                    >
                      Пользовательским соглашением
                    </button>
                    {" "}и{" "}
                    <button
                      type="button"
                      onClick={() => openLegal('privacy')}
                      className="text-violet-400 hover:underline"
                    >
                      Политикой конфиденциальности
                    </button>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!isLogin && !agreeTerms)}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="auth-submit-btn"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                ) : (
                  <>
                    {isLogin ? "Войти" : "Создать аккаунт"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-violet-400 hover:text-violet-300 text-sm"
                data-testid="auth-toggle-btn"
              >
                {isLogin
                  ? "Нет аккаунта? Зарегистрируйтесь"
                  : "Уже есть аккаунт? Войдите"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
