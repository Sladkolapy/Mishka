import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API, useAuth } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Paperclip,
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Loader2,
  Sparkles,
  Coins,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchChat();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  const fetchChat = async () => {
    try {
      const response = await axios.get(`${API}/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChat(response.data);
    } catch (error) {
      toast.error("Ошибка загрузки чата");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    if (user?.balance < 5) {
      toast.error("Недостаточно токенов. Пополните баланс.");
      navigate("/balance");
      return;
    }

    const userMessage = message.trim();
    setMessage("");
    setSending(true);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setChat((prev) => ({
      ...prev,
      messages: [...prev.messages, tempUserMsg],
    }));

    try {
      const response = await axios.post(
        `${API}/chat/${chatId}/message`,
        { content: userMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setChat((prev) => ({
        ...prev,
        messages: [
          ...prev.messages.filter((m) => !m.id.startsWith("temp-")),
          { ...tempUserMsg, id: `user-${Date.now()}` },
          response.data,
        ],
      }));

      // Refresh user to update balance
      await refreshUser();

      // If file was generated, add to files list
      if (response.data.file_id) {
        setChat((prev) => ({
          ...prev,
          files: [
            {
              id: response.data.file_id,
              filename: response.data.file_name,
              file_type: response.data.file_name?.split(".").pop() || "xlsx",
              is_generated: true,
              created_at: new Date().toISOString(),
            },
            ...prev.files,
          ],
        }));
      }
    } catch (error) {
      const errMsg = error.response?.data?.detail || "Ошибка отправки";
      toast.error(errMsg);
      if (error.response?.status === 402) {
        navigate("/balance");
      }
      setChat((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => !m.id.startsWith("temp-")),
      }));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ["xlsx", "xls", "docx", "pptx", "pdf", "txt", "rtf"];
    const fileExt = file.name.split(".").pop().toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      toast.error(`Формат не поддерживается. Разрешены: ${allowedTypes.join(", ")}`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${API}/chat/${chatId}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploadMsg = {
        id: response.data.message_id,
        role: "user",
        content: `Загружен файл: ${file.name}`,
        file_id: response.data.file_id,
        file_name: file.name,
        created_at: new Date().toISOString(),
      };

      setChat((prev) => ({
        ...prev,
        messages: [...prev.messages, uploadMsg],
        files: [
          {
            id: response.data.file_id,
            filename: file.name,
            file_type: fileExt,
            is_generated: false,
            created_at: new Date().toISOString(),
          },
          ...prev.files,
        ],
      }));

      toast.success("Файл загружен!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const downloadFile = async (fileId, filename) => {
    try {
      const response = await axios.get(`${API}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Файл скачивается...");
    } catch (error) {
      toast.error("Ошибка скачивания");
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="w-4 h-4" />;
      case "pptx":
      case "ppt":
        return <Presentation className="w-4 h-4" />;
      case "docx":
      case "doc":
      case "pdf":
      case "txt":
      case "rtf":
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <header className="header sticky top-0 z-50 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {chat?.title}
            </h1>
            <p className="text-xs text-slate-400">
              {chat?.files?.length || 0} файлов
            </p>
          </div>

          {/* Balance indicator */}
          <button
            onClick={() => navigate("/balance")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all"
            data-testid="chat-balance-btn"
          >
            <Coins className="w-4 h-4" />
            <span className="text-sm font-medium">{user?.balance || 0}</span>
          </button>
        </div>
      </header>

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-40 bg-violet-500/20 backdrop-blur-sm flex items-center justify-center">
          <div className="upload-zone dragging p-12">
            <Paperclip className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <p className="text-xl text-white font-medium">Перетащите файл сюда</p>
            <p className="text-slate-400">Excel, Word, PowerPoint, PDF, TXT</p>
          </div>
        </div>
      )}

      {/* Low balance warning */}
      {user?.balance < 10 && (
        <div className="mx-4 sm:mx-6 mt-2">
          <div className="max-w-4xl mx-auto p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-sm">
              Мало токенов ({user?.balance}). <button onClick={() => navigate("/balance")} className="underline hover:no-underline">Пополнить баланс</button>
            </p>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {chat?.messages?.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Загрузите файл для начала
              </h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Загрузите шаблон презентации, Excel или другой документ. 
                Можете также загрузить PDF с данными для заполнения.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary inline-flex items-center gap-2"
                data-testid="upload-first-file-btn"
              >
                <Paperclip className="w-5 h-5" />
                Загрузить файл
              </button>
            </div>
          ) : (
            chat?.messages?.map((msg, index) => (
              <div
                key={msg.id}
                className={`animate-fade-in ${msg.role === "user" ? "flex justify-end" : ""}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className={msg.role === "user" ? "message-user" : "message-assistant"}
                >
                  {msg.file_id && (
                    <button
                      onClick={() => downloadFile(msg.file_id, msg.file_name)}
                      className="file-badge mb-3 hover:bg-violet-500/25 transition-colors"
                      data-testid={`download-file-${msg.file_id}`}
                    >
                      {getFileIcon(msg.file_name?.split(".").pop())}
                      <span className="truncate max-w-[200px]">{msg.file_name}</span>
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  <p className="text-white whitespace-pre-wrap">{msg.content}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">
                      {format(new Date(msg.created_at), "HH:mm")}
                    </span>
                    {msg.tokens_used && (
                      <span className="text-xs text-violet-400 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        -{msg.tokens_used}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="message-assistant animate-pulse-slow">
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ИИ думает...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 px-4 sm:px-6 py-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        <div className="max-w-4xl mx-auto">
          {chat?.files?.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {chat.files.slice(0, 5).map((file) => (
                <button
                  key={file.id}
                  onClick={() => downloadFile(file.id, file.filename)}
                  className="file-badge flex-shrink-0 hover:bg-violet-500/25 transition-colors"
                  data-testid={`file-badge-${file.id}`}
                >
                  {getFileIcon(file.file_type)}
                  <span className="truncate max-w-[120px]">{file.filename}</span>
                  {file.is_generated && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      NEW
                    </span>
                  )}
                </button>
              ))}
              {chat.files.length > 5 && (
                <span className="file-badge">
                  +{chat.files.length - 5} ещё
                </span>
              )}
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              accept=".xlsx,.xls,.docx,.pptx,.pdf,.txt,.rtf"
              data-testid="file-input"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-3 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-all disabled:opacity-50"
              data-testid="upload-btn"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите что нужно сделать с документами..."
              className="input-field flex-1"
              disabled={sending}
              data-testid="message-input"
            />

            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="send-btn"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-3">
            Поддерживаются: Excel, Word, PowerPoint, PDF, TXT | 
            <span className="text-violet-400"> Ваш баланс: {user?.balance || 0} токенов</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
