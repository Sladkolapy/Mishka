import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  FileText,
  TrendingUp,
  Ban,
  Check,
  Plus,
  Minus,
  Search,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenAmount, setTokenAmount] = useState(100);

  useEffect(() => {
    if (!user?.is_admin) {
      navigate("/");
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      toast.error("Ошибка загрузки данных");
      if (error.response?.status === 403) {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockUser = async (userId, isBlocked) => {
    try {
      await axios.patch(
        `${API}/admin/users/${userId}`,
        { is_blocked: !isBlocked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_blocked: !isBlocked } : u
      ));
      toast.success(isBlocked ? "Пользователь разблокирован" : "Пользователь заблокирован");
    } catch (error) {
      toast.error("Ошибка");
    }
  };

  const addTokens = async (userId) => {
    try {
      await axios.post(
        `${API}/admin/users/${userId}/add-tokens?amount=${tokenAmount}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => 
        u.id === userId ? { ...u, balance: (u.balance || 0) + tokenAmount } : u
      ));
      toast.success(`Начислено ${tokenAmount} токенов`);
    } catch (error) {
      toast.error("Ошибка начисления");
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      {/* Header */}
      <header className="header sticky top-0 z-50 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet-400" />
            <h1 className="text-xl font-bold text-white">Админ-панель</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
                <p className="text-xs text-slate-400">Пользователей</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total_chats || 0}</p>
                <p className="text-xs text-slate-400">Чатов</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total_files || 0}</p>
                <p className="text-xs text-slate-400">Файлов</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.generated_files || 0}</p>
                <p className="text-xs text-slate-400">Сгенерировано</p>
              </div>
            </div>
          </div>
        </div>

        {/* Token amount selector */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Начисление токенов</h2>
          <div className="flex flex-wrap gap-2">
            {[50, 100, 200, 500, 1000].map(amt => (
              <button
                key={amt}
                onClick={() => setTokenAmount(amt)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  tokenAmount === amt
                    ? "bg-violet-500 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        {/* Users */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Пользователи</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по email..."
                className="input-field pl-10 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  u.is_blocked ? "bg-red-500/10" : "bg-white/5"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{u.email}</p>
                    {u.is_admin && (
                      <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">
                        Админ
                      </span>
                    )}
                    {u.is_blocked && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                        Заблокирован
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Баланс: {u.balance || 0} токенов | Рег: {u.created_at ? format(new Date(u.created_at), "dd.MM.yyyy") : "-"}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addTokens(u.id)}
                    className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                    title={`Начислить ${tokenAmount} токенов`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  
                  {!u.is_admin && (
                    <button
                      onClick={() => toggleBlockUser(u.id, u.is_blocked)}
                      className={`p-2 rounded-lg transition-all ${
                        u.is_blocked
                          ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      }`}
                      title={u.is_blocked ? "Разблокировать" : "Заблокировать"}
                    >
                      {u.is_blocked ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
