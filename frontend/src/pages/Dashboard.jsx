import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus,
  MessageSquare,
  Trash2,
  LogOut,
  FileText,
  Clock,
  ChevronRight,
  Search,
} from "lucide-react";
import { format } from "date-fns";

const Dashboard = ({ user, token, onLogout }) => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API}/chat/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(response.data);
    } catch (error) {
      toast.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    setCreating(true);
    try {
      const response = await axios.post(
        `${API}/chat/create`,
        { title: "New Chat" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/chat/${response.data.id}`);
    } catch (error) {
      toast.error("Failed to create chat");
    } finally {
      setCreating(false);
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat?")) return;

    try {
      await axios.delete(`${API}/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(chats.filter((c) => c.id !== chatId));
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950">
      {/* Header */}
      <header className="header sticky top-0 z-50 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">DocAI Chat</h1>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={createNewChat}
            disabled={creating}
            className="btn-primary flex items-center justify-center gap-2"
            data-testid="new-chat-btn"
          >
            {creating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                New Chat
              </>
            )}
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="input-field pl-11"
              data-testid="search-chats-input"
            />
          </div>
        </div>

        {/* Chats grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-32">
                <div className="skeleton h-6 w-3/4 mb-4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? "No chats found" : "No chats yet"}
            </h2>
            <p className="text-slate-400 mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Create a new chat to start working with your documents"}
            </p>
            {!searchQuery && (
              <button
                onClick={createNewChat}
                className="btn-primary inline-flex items-center gap-2"
                data-testid="empty-new-chat-btn"
              >
                <Plus className="w-5 h-5" />
                Create your first chat
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChats.map((chat, index) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="card card-hover cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`chat-card-${chat.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-violet-400" />
                  </div>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                    data-testid={`delete-chat-${chat.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-white font-semibold mb-2 line-clamp-2">
                  {chat.title}
                </h3>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(new Date(chat.updated_at), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-violet-400 text-sm mt-4 group-hover:gap-2 transition-all">
                  <span>Open chat</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
