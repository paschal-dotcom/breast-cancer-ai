import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Eye, EyeOff } from '../icons';
import { toast } from '../components/Toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, var(--deep-teal) 0%, var(--teal) 50%, var(--mint) 100%)',
    }}>
      {/* Left branding panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 60, color: 'white',
      }} className="hide-mobile">
        <div style={{
          width: 72, height: 72, background: 'rgba(255,255,255,0.15)',
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, backdropFilter: 'blur(10px)',
        }}>
          <Heart size={36} fill="white" color="white" />
        </div>
        <h1 style={{ fontSize: 38, marginBottom: 16, textAlign: 'center', fontFamily: "'Playfair Display', serif" }}>
          BreastCare AI
        </h1>
        <p style={{ fontSize: 16, opacity: 0.8, textAlign: 'center', maxWidth: 340, lineHeight: 1.7 }}>
          AI-powered early breast cancer detection via thermal imaging. Near-perfect sensitivity. Radiation-free.
        </p>
        <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
          {[['97.8%', 'Accuracy'], ['0.989', 'AUC-ROC'], ['97.1%', 'Sensitivity']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{val}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div style={{
        width: 440, background: 'white', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', padding: '60px 48px',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, color: 'var(--deep-teal)', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="doctor@hospital.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
              style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{
              position: 'absolute', right: 12, top: 34, background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--muted)', display: 'flex',
            }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Sign In'}
          </button>
        </form>

        <div style={{
          margin: '28px 0', borderTop: '1px solid var(--border)',
          textAlign: 'center', position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            background: 'white', padding: '0 12px', color: 'var(--muted)', fontSize: 12,
          }}>Default Admin</span>
        </div>

        <div style={{
          background: 'var(--light-bg)', borderRadius: 10, padding: '12px 16px',
          fontSize: 13, color: 'var(--muted)', marginBottom: 24,
        }}>
          <strong style={{ color: 'var(--deep-teal)' }}>admin@breastcare.ai</strong>
          {' / '}
          <strong style={{ color: 'var(--deep-teal)' }}>Admin@1234</strong>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}