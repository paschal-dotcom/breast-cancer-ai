import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import {
  LayoutDashboard, Upload, Clock, GitCompare,
  ShieldCheck, LogOut, Menu, Heart, ChevronRight, Activity
} from '../icons';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scan/upload',  icon: Upload,           label: 'New Scan' },
  { to: '/scan/history', icon: Clock,            label: 'Scan History' },
  { to: '/scan/compare', icon: GitCompare,       label: 'Compare Scans' },
  { to: '/evaluation',   icon: Activity,         label: 'Model Evaluation' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--light-bg)' }}>

      {/* ── Sidebar ─────────────────────────── */}
      <aside style={{
        width: collapsed ? 70 : 240,
        background: 'var(--deep-teal)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0,
        position: 'fixed',
        height: '100vh',
        zIndex: 100,
        boxShadow: '4px 0 24px rgba(2,62,88,0.18)',
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, background: 'var(--mint)',
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Heart size={18} color="white" fill="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>BreastCare</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>AI Detection</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 36, height: 36, background: 'var(--mint)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Heart size={18} color="white" fill="white" />
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', padding: 6, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}>
            {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: collapsed ? '12px 0' : '11px 20px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: isActive ? 'var(--mint)' : 'rgba(255,255,255,0.65)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              borderLeft: isActive ? '3px solid var(--mint)' : '3px solid transparent',
              background: isActive ? 'rgba(2,195,154,0.08)' : 'transparent',
              transition: 'all 0.15s ease',
            })}>
              <Icon size={18} />
              {!collapsed && label}
            </NavLink>
          ))}

          {/* Admin link */}
          {user?.role === 'admin' && (
            <NavLink to="/admin" style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: collapsed ? '12px 0' : '11px 20px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.65)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
              background: isActive ? 'rgba(244,166,42,0.08)' : 'transparent',
              transition: 'all 0.15s ease',
            })}>
              <ShieldCheck size={18} />
              {!collapsed && 'Admin Panel'}
            </NavLink>
          )}
        </nav>

        {/* User profile + logout */}
        <div style={{
          padding: collapsed ? '16px 0' : '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              padding: '8px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 10,
            }}>
              <div style={{
                width: 32, height: 32, background: 'var(--teal)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{user?.role}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, padding: collapsed ? '10px 0' : '9px 10px',
            background: 'rgba(214,79,110,0.12)', border: 'none', cursor: 'pointer',
            color: '#D64F6E', borderRadius: 8, fontSize: 13, fontWeight: 600,
            transition: 'background 0.15s ease',
          }}>
            <LogOut size={16} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────── */}
      <main style={{
        flex: 1,
        marginLeft: collapsed ? 70 : 240,
        transition: 'margin-left 0.25s ease',
        padding: '32px 36px',
        minHeight: '100vh',
        maxWidth: '100%',
      }}>
        <Outlet />
      </main>
    </div>
  );
}