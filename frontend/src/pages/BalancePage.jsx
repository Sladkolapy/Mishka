import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Wallet, Phone, Copy, Clock, CheckCircle, XCircle, FileSpreadsheet, FileText, Presentation, HelpCircle } from "lucide-react";
import { format } from "date-fns";

const BalancePage = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [amount, setAmount] = useState(400);
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [myPayments, setMyPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [infoRes, paymentsRes, historyRes] = await Promise.all([
        axios.get(`${API}/payment/info`),
        axios.get(`${API}/payment/my-requests`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/balance/history`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPaymentInfo(infoRes.data);
      setMyPayments(paymentsRes.data.payments || []);
      setTransactions(historyRes.data.transactions || []);
    } catch (error) { console.error(error); }
  };

  const createPaymentRequest = async () => {
    if (amount < 10) { toast.error("Минимум 10 рублей"); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/payment/request`, { amount }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Заявка создана! Переведите деньги по СБП.");
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || "Ошибка"); }
    finally { setLoading(false); }
  };

  const copyPhone = () => {
    navigator.clipboard.writeText(paymentInfo?.phone || '');
    toast.success("Номер скопирован!");
  };

  const quickAmounts = [100, 200, 400, 1000];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      <header className="header sticky top-0 z-50 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold text-white">Баланс и оплата</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Balance */}
        <div className="card bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center"><Wallet className="w-7 h-7 text-white" /></div>
            <div>
              <p className="text-slate-400 text-sm">Ваш баланс</p>
              <p className="text-4xl font-bold text-white">{user?.is_admin ? '∞' : user?.balance || 0} <span className="text-lg text-violet-400">токенов</span></p>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Пополнить через СБП</h2>
          
          {/* Phone */}
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 mb-4">
            <p className="text-green-400 text-sm mb-2">Переведите по номеру телефона ({paymentInfo?.bank}):</p>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">{paymentInfo?.phone}</span>
              <button onClick={copyPhone} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"><Copy className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Amount */}
          <p className="text-slate-300 mb-2">Сумма пополнения:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {quickAmounts.map(amt => (
              <button key={amt} onClick={() => setAmount(amt)} className={`px-4 py-2 rounded-xl font-medium ${amount === amt ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{amt} ₽</button>
            ))}
          </div>
          <input type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} className="input-field mb-4" placeholder="Сумма" min={10} />
          
          <button onClick={createPaymentRequest} disabled={loading} className="btn-primary w-full">
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto" /> : `Я перевёл ${amount} руб.`}
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">После перевода нажмите кнопку. Токены будут начислены после проверки.</p>
        </div>

        {/* My requests */}
        {myPayments.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Мои заявки</h2>
            <div className="space-y-2">
              {myPayments.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    {p.status === 'pending' ? <Clock className="w-5 h-5 text-orange-400" /> : p.status === 'approved' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                    <div>
                      <p className="text-white">{p.amount} руб.</p>
                      <p className="text-xs text-slate-500">{p.created_at ? format(new Date(p.created_at), "dd.MM.yyyy HH:mm") : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${p.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : p.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.status === 'pending' ? 'Ожидает' : p.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Тарифы</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-white/5"><Presentation className="w-6 h-6 text-orange-400 mb-2" /><p className="text-white font-medium">PowerPoint</p><p className="text-xs text-slate-400">Создание: 65 | Доработка: 10</p></div>
            <div className="p-3 rounded-xl bg-white/5"><FileSpreadsheet className="w-6 h-6 text-green-400 mb-2" /><p className="text-white font-medium">Excel</p><p className="text-xs text-slate-400">Создание: 40 | Доработка: 7</p></div>
            <div className="p-3 rounded-xl bg-white/5"><FileText className="w-6 h-6 text-blue-400 mb-2" /><p className="text-white font-medium">Word</p><p className="text-xs text-slate-400">Создание: 35 | Доработка: 6</p></div>
            <div className="p-3 rounded-xl bg-white/5"><HelpCircle className="w-6 h-6 text-violet-400 mb-2" /><p className="text-white font-medium">Вопрос</p><p className="text-xs text-slate-400">5 токенов</p></div>
          </div>
          <p className="text-sm text-violet-400 mt-4 text-center">400 руб. ≈ 6 презентаций или 10 таблиц или 11 документов</p>
        </div>
      </main>
    </div>
  );
};

export default BalancePage;
