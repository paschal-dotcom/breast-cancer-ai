import React, { useState, useEffect } from 'react';
import { Users, Activity, Shield, FileText, Trash2, RefreshCw } from '../icons';
import api from '../services/api';
import { toast } from '../components/Toast';

function RiskBadge({ level }) {
  const cls = level === 'Normal' ? 'badge-normal' : level === 'Suspicious' ? 'badge-suspicious' : 'badge-malignant';
  return <span className={`badge ${cls}`}>{level}</span>;
}

function CSSBarChart({ data, dataKey, labelKey, color }) {
  if (!data || data.length === 0) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</p>;
  const maxVal = Math.max(...data.map(d => d[dataKey] || 0)) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '0 8px' }}>
      {data.map((item, i) => {
        const height = ((item[dataKey] || 0) / maxVal) * 140;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{item[dataKey]}</span>
            <div style={{
              width: '100%', height: Math.max(height, 4),
              background: color || 'var(--teal)',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.4s ease',
            }} />
            <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>
              {item[labelKey]?.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPanel() {
  const [tab,     setTab]     = useState('dashboard');
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [scans,   setScans]   = useState([]);
  const [logs,    setLogs]    = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, scansRes, logsRes, metricsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/scans'),
        api.get('/admin/logs'),
        api.get('/admin/model-metrics'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
      setScans(scansRes.data.scans || []);
      setLogs(logsRes.data.logs || []);
      setMetrics(metricsRes.data);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const deactivateUser = async id => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(u => u.filter(x => x.id !== id));
      toast.success('User deactivated');
    } catch { toast.error('Failed'); }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard',    icon: Activity  },
    { id: 'users',     label: 'Users',         icon: Users     },
    { id: 'scans',     label: 'All Scans',     icon: FileText  },
    { id: 'logs',      label: 'System Logs',   icon: Shield    },
    { id: 'metrics',   label: 'Model Metrics', icon: Activity  },
  ];

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading admin data...</p></div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Admin Panel</h1>
          <p>System management and monitoring</p>
        </div>
        <button onClick={loadData} className="btn btn-outline btn-sm">
          <RefreshCw /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white', padding: 6, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            background: tab === id ? 'var(--deep-teal)' : 'transparent',
            color: tab === id ? 'white' : 'var(--muted)',
            transition: 'all 0.15s ease',
          }}>
            <Icon />{label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Scans',  value: stats.total_scans,     color: 'var(--deep-teal)', icon: <Activity /> },
              { label: 'Total Users',  value: stats.total_users,     color: 'var(--teal)',      icon: <Users /> },
              { label: 'Normal',       value: stats.normal_count,    color: 'var(--mint)',      icon: <Shield /> },
              { label: 'Malignant',    value: stats.malignant_count, color: 'var(--pink)',      icon: <FileText /> },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
                <div className="stat-info"><p>{s.label}</p><h3>{s.value}</h3></div>
              </div>
            ))}
          </div>
          {stats.daily_scans?.length > 0 && (
            <div className="card">
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
                Daily Scans (Last 7 Days)
              </h3>
              <CSSBarChart data={stats.daily_scans} dataKey="count" labelKey="date" color="var(--teal)" />
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
            {users.length} Registered Users
          </h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>{u.role}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td><span style={{ fontSize: 12, color: u.is_active ? 'var(--mint)' : 'var(--pink)', fontWeight: 600 }}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      {u.role !== 'admin' && u.is_active && (
                        <button onClick={() => deactivateUser(u.id)} className="btn btn-sm" style={{ background: '#FFF0F3', color: 'var(--pink)', border: 'none' }}>
                          <Trash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'scans' && (
        <div className="card">
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
            {scans.length} Total Scans
          </h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>File</th><th>User</th><th>Risk</th><th>Confidence</th><th>Date</th></tr></thead>
              <tbody>
                {scans.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{s.filename}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{s.full_name}</td>
                    <td><RiskBadge level={s.risk_level} /></td>
                    <td style={{ fontSize: 13 }}>{s.confidence?.toFixed(1)}%</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card">
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
            System Audit Logs
          </h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Action</th><th>Details</th><th>Timestamp</th></tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', background: 'var(--light-bg)', padding: '2px 8px', borderRadius: 4 }}>{log.action}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{log.details}</td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'metrics' && (
        <div>
          {metrics?.message ? (
            <div className="card">
              <div className="empty-state">
                <Activity />
                <h3>No Metrics Available</h3>
                <p>{metrics.message}</p>
              </div>
            </div>
          ) : metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card">
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>Model Performance</h3>
                {[
                  { label: 'Accuracy',    value: metrics.accuracy,       color: 'var(--deep-teal)' },
                  { label: 'Sensitivity', value: metrics.sensitivity,    color: 'var(--mint)'      },
                  { label: 'Specificity', value: metrics.specificity,    color: 'var(--teal)'      },
                  { label: 'Precision',   value: metrics.precision,      color: 'var(--gold)'      },
                  { label: 'F1-Score',    value: metrics.f1_score * 100, color: 'var(--pink)'      },
                  { label: 'AUC-ROC',     value: metrics.auc_roc * 100,  color: 'var(--teal)'      },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{value?.toFixed(2)}%</span>
                    </div>
                    <div className="confidence-bar" style={{ height: 8 }}>
                      <div className="confidence-fill" style={{ width: `${value}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>Training Summary</h3>
                {[
                  ['Total Images',     metrics.total_images],
                  ['DMR-IR Images',    metrics.dmr_ir_count],
                  ['Mendeley Images',  metrics.mendeley_count],
                  ['CV Mean Accuracy', `${metrics.cv_mean}%`],
                  ['CV Std Dev',       `±${metrics.cv_std}%`],
                  ['Best SVM C',       metrics.best_svm_params?.C],
                  ['Best Gamma',       metrics.best_svm_params?.gamma],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}