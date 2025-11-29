import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Users, MessageSquare, FileText, CreditCard, Check, X, Plus, Ban, Shield, Search } from "lucide-react";
import { format } from "date-fns";

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('payments');
  const [tokenAmount, setTokenAmount] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user?.is_admin) { navigate("/"); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/payments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
      setPayments(paymentsRes.data.payments || []);
    } catch (error) {
      toast.error("Ошибка загрузки");
      if (error.response?.status === 403) navigate("/");
    } finally { setLoading(false); }
  };

  const approvePayment = async (paymentId) => {
    try {
      await axios.post(`${API}/admin/payments/${paymentId}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'approved' } : p));
      toast.success("Оплата подтверждена!");
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || "Ошибка"); }
  };

  const rejectPayment = async (paymentId) => {
    try {
      await axios.post(`${API}/admin/payments/${paymentId}/reject`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'rejected' } : p));
      toast.success("Заявка отклонена");
    } catch (error) { toast.error("Ошибка"); }
  };

  const toggleBlockUser = async (userId, isBlocked) => {
    try {
      await axios.patch(`${API}/admin/users/${userId}`, { is_blocked: !isBlocked }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.map(u => u.id === userId ? { ...u, is_blocked: !isBlocked } : u));
      toast.success(isBlocked ? "Разблокирован" : "Заблокирован");
    } catch (error) { toast.error("Ошибка"); }
  };

  const addTokens = async (userId) => {
    try {
      await axios.post(`${API}/admin/users/${userId}/add-tokens?amount=${tokenAmount}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.map(u => u.id === userId ? { ...u, balance: (u.balance || 0) + tokenAmount } : u));
      toast.success(`+${tokenAmount} токенов`);
    } catch (error) { toast.error("Ошибка"); }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      <header className="header sticky top-0 z-50 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"><ArrowLeft className="w-5 h-5" /></button>
          <Shield className="w-6 h-6 text-violet-400" />
          <h1 className="text-xl font-bold text-white">Админ-панель</h1>
          {pendingPayments.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingPayments.length} заявок</span>}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><Users className="w-8 h-8 text-blue-400 mb-2" /><p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p><p className="text-xs text-slate-400">Пользователей</p></div>
          <div className="card"><MessageSquare className="w-8 h-8 text-violet-400 mb-2" /><p className="text-2xl font-bold text-white">{stats?.total_chats || 0}</p><p className="text-xs text-slate-400">Чатов</p></div>
          <div className="card"><FileText className="w-8 h-8 text-green-400 mb-2" /><p className="text-2xl font-bold text-white">{stats?.total_files || 0}</p><p className="text-xs text-slate-400">Файлов</p></div>
          <div className="card"><CreditCard className="w-8 h-8 text-orange-400 mb-2" /><p className="text-2xl font-bold text-white">{stats?.pending_payments || 0}</p><p className="text-xs text-slate-400">Заявок на оплату</p></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab('payments')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'payments' ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}>Заявки на оплату {pendingPayments.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingPayments.length}</span>}</button>
          <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'users' ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}>Пользователи</button>
        </div>

        {/* Payments Tab */}
        {tab === 'payments' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Заявки на пополнение</h2>
            {payments.length === 0 ? <p className="text-slate-400 text-center py-8">Нет заявок</p> : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {payments.map(p => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${p.status === 'pending' ? 'bg-orange-500/10 border border-orange-500/30' : p.status === 'approved' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div>
                      <p className="text-white font-medium">{p.user_email}</p>
                      <p className="text-sm text-slate-400">{p.amount} руб. • {p.created_at ? format(new Date(p.created_at), "dd.MM.yyyy HH:mm") : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.status === 'pending' ? (
                        <>
                          <button onClick={() => approvePayment(p.id)} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"><Check className="w-5 h-5" /></button>
                          <button onClick={() => rejectPayment(p.id)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><X className="w-5 h-5" /></button>
                        </>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded ${p.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.status === 'approved' ? 'Одобрено' : 'Отклонено'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Пользователи</h2>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск..." className="input-field pl-10 py-2 text-sm w-48" /></div>
                <select value={tokenAmount} onChange={(e) => setTokenAmount(Number(e.target.value))} className="input-field py-2 text-sm w-24">
                  <option value={50}>+50</option><option value={100}>+100</option><option value={200}>+200</option><option value={500}>+500</option>
                </select>
              </div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredUsers.map(u => (
                <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg ${u.is_blocked ? 'bg-red-500/10' : 'bg-white/5'}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{u.email}</p>
                      {u.is_admin && <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">Админ</span>}
                      {u.is_blocked && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Заблок.</span>}
                    </div>
                    <p className="text-xs text-slate-400">Баланс: {u.balance || 0} | Рег: {u.created_at ? format(new Date(u.created_at), "dd.MM.yy") : '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => addTokens(u.id)} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30" title={`+${tokenAmount}`}><Plus className="w-4 h-4" /></button>
                    {!u.is_admin && <button onClick={() => toggleBlockUser(u.id, u.is_blocked)} className={`p-2 rounded-lg ${u.is_blocked ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_blocked ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
