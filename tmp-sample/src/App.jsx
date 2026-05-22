import { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { TodoList } from './components/TodoList';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userId, setUserId] = useState(localStorage.getItem('userId'));

  const handleLogin = (t, uid) => {
    localStorage.setItem('token', t);
    localStorage.setItem('userId', uid);
    setToken(t);
    setUserId(uid);
  };

  if (!token) return <LoginForm onLogin={handleLogin} />;
  return <TodoList userId={userId} token={token} />;
}
