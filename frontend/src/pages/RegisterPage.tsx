import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/api';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await register(nickname, email, password);
      setAuth(data.token, data.userId, data.nickname);
      navigate('/chats');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Registration failed. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return (
    <div className="auth-container">
      <h1>WebMessenger</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Create Account</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Register</button>
        <p>Already have an account? <Link to="/login">Sign In</Link></p>
      </form>
    </div>
  );
}
