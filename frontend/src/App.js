import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Pages
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import ChatPage from "@/pages/ChatPage";
import BalancePage from "@/pages/BalancePage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        setUser(response.data);
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      await refreshUser();
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateBalance = (newBalance) => {
    setUser(prev => ({ ...prev, balance: newBalance }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route 
              path="/auth" 
              element={<AuthPageWrapper />} 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat/:chatId" 
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/balance" 
              element={
                <ProtectedRoute>
                  <BalancePage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </div>
    </AuthProvider>
  );
}

const AuthPageWrapper = () => {
  const { token, login } = useAuth();
  
  if (token) {
    return <Navigate to="/" replace />;
  }
  
  return <AuthPage onLogin={login} />;
};

export default App;
