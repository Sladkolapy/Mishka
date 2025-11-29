import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Presentation,
  HelpCircle,
  Coins,
} from "lucide-react";
import { format } from "date-fns";

const BalancePage = () => {
  const navigate = useNavigate();
  const { user, token, updateBalance } = useAuth();
  const [amount, setAmount] = useState(400);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [historyRes, pricingRes] = await Promise.all([
        axios.get(`${API}/balance/history`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/pricing`),
      ]);
      setTransactions(historyRes.data.transactions || []);
      setPricing(pricingRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleTopUp = async () => {
    if (amount < 1) {
      toast.error("Минимальная сумма: 1 рубль");
      return;
    }

    setLoading(true);
    try {
      // В реальном приложении здесь будет интеграция с платёжной системой
      const response = await axios.post(
        `${API}/balance/topup`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      updateBalance(response.data.new_balance);
      toast.success(`Баланс пополнен на ${amount} токенов!`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Ошибка пополнения");
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 200, 400, 1000];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      {/* Header */}
      <header className="header sticky top-0 z-50 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Баланс и токены</h1>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Balance Card */}
        <div className="card bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Ваш баланс</p>
              <p className="text-4xl font-bold text-white" data-testid="balance-amount">
                {user?.balance || 0} <span className="text-lg text-violet-400">токенов</span>
              </p>
            </div>
          </div>

          {/* Top Up Section */}
          <div className="space-y-4">
            <p className="text-slate-300 font-medium">Пополнить баланс</p>
            
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    amount === amt
                      ? "bg-violet-500 text-white"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                  data-testid={`amount-${amt}`}
                >
                  {amt} ₽
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="input-field pl-11"
                  placeholder="Сумма в рублях"
                  min={1}
                  data-testid="topup-amount-input"
                />
              </div>
              <button
                onClick={handleTopUp}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
                data-testid="topup-btn"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Пополнить
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-500">
              1 рубль = 1 токен. Деньги поступают на счёт самозанятого.
            </p>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-violet-400" />
            Стоимость операций
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PowerPoint */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Presentation className="w-5 h-5 text-orange-400" />
                </div>
                <span className="font-medium text-white">PowerPoint</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-400">Создание</span>
                  <span className="text-white font-medium">65 токенов</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Доработка</span>
                  <span className="text-white font-medium">10 токенов</span>
                </p>
              </div>
            </div>

            {/* Excel */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-400" />
                </div>
                <span className="font-medium text-white">Excel</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-400">Создание</span>
                  <span className="text-white font-medium">40 токенов</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Доработка</span>
                  <span className="text-white font-medium">7 токенов</span>
                </p>
              </div>
            </div>

            {/* Word */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <span className="font-medium text-white">Word</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-400">Создание</span>
                  <span className="text-white font-medium">35 токенов</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Доработка</span>
                  <span className="text-white font-medium">6 токенов</span>
                </p>
              </div>
            </div>

            {/* Analysis */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-violet-400" />
                </div>
                <span className="font-medium text-white">Анализ</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-400">Вопрос / анализ</span>
                  <span className="text-white font-medium">5 токенов</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <p className="text-sm text-violet-300">
              💡 <strong>400 рублей</strong> = примерно 6 новых презентаций, или 10 таблиц Excel, или 11 документов Word
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">История операций</h2>

          {transactions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">История пуста</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 20).map((tx, idx) => (
                <div
                  key={tx.id || idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.amount > 0
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {tx.amount > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm">{tx.description}</p>
                      <p className="text-slate-500 text-xs">
                        {tx.created_at ? format(new Date(tx.created_at), "dd.MM.yyyy HH:mm") : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-medium ${
                      tx.amount > 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BalancePage;
