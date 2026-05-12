import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Clock, TrendingUp, Activity, ChevronRight, AlertCircle } from '../icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from '../components/Toast';

const RISK_COLORS = {
  Normal:     'var(--mint)',
  Suspicious: 'var(--gold)',
  Malignant:  'var(--pink)',
};

function RiskBadge({ level }) {
  const cls = level === 'Normal' ? 'badge-normal' : level === 'Suspicious' ? 'badge-suspicious' : 'badge-malignant';
  return <span className={`badge ${cls}`}>{level}</span>;
}

// CSS Pie Chart (donut style)
function CSSDonut({ data }) {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) {
    return <div className="empty-state" style={{ padding: 30 }}><p>No scan data yet</p></div>;
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Donut segments */}
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 160, height: 160 }}>
          {(() => {
            let offset = 0;
            return data.map((d, i) => {
              const pct = (d.value / total) * 100;
              const seg = (
                <circle key={i} cx="18" cy="18" r="15.9"
                  fill="transparent"
                  stroke={Object.values(RISK_COLORS)[i]}
                  strokeWidth="3.8"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += pct;
              return seg;
            });
          })()}
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark-text)' }}>{total}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total</div>
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: Object.values(RISK_COLORS)[i] }} />
            {d.name}: {d.value}
          </div>
        ))}
      </div>
    </div>
  );
}

// CSS Bar Chart
function CSSBarChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty-state" style={{ padding: 30 }}><p>No trend data yet</p></div>;
  }
  const maxVal = Math.max(...data.map(d => d.confidence || 0)) || 100;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 8px' }}>
      {data.slice(-8).map((item, i) => {
        const height = (item.confidence / maxVal) * 130;
        const color = item.risk_level === 'Normal' ? 'var(--mint)'
          : item.risk_level === 'Suspicious' ? 'var(--gold)' : 'var(--pink)';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
              {item.confidence?.toFixed(0)}%
            </span>
            <div style={{
              width: '100%', height: Math.max(height, 4),
              background: color,
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.4s ease',
              title: `${item.risk_level}: ${item.confidence?.toFixed(1)}%`,
            }} />
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>
              {item.created_at?.slice(5, 10)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [scans,   setScans]   = useState([]);
  const [trends,  setTrends]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/scan/history'), api.get('/trends')])
      .then(([scanRes, trendRes]) => {
        setScans(scanRes.data.scans || []);
        setTrends(trendRes.data.trends || []);
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-center"><div className="spinner" /><p>Loading dashboard...</p></div>
  );

  const total      = scans.length;
  const normal     = scans.filter(s => s.risk_level === 'Normal').length;
  const suspicious = scans.filter(s => s.risk_level === 'Suspicious').length;
  const malignant  = scans.filter(s => s.risk_level === 'Malignant').length;

  const pieData = [
    { name: 'Normal',     value: normal     },
    { name: 'Suspicious', value: suspicious },
    { name: 'Malignant',  value: malignant  },
  ];

  const recentScans = scans.slice(0, 6);

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <h1>Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p>Here is your breast cancer detection activity overview</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Scans', value: total,      color: 'var(--deep-teal)', icon: <Activity /> },
          { label: 'Normal',      value: normal,     color: 'var(--mint)',      icon: <Upload />   },
          { label: 'Suspicious',  value: suspicious, color: 'var(--gold)',      icon: <AlertCircle /> },
          { label: 'Malignant',   value: malignant,  color: 'var(--pink)',      icon: <TrendingUp /> },
        ].map(stat => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-icon" style={{ background: stat.color }}>{stat.icon}</div>
            <div className="stat-info">
              <p>{stat.label}</p>
              <h3>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 17, color: 'var(--deep-teal)', marginBottom: 20, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            Risk Distribution
          </h3>
          <CSSDonut data={pieData} />
        </div>

        <div className="card">
          <h3 style={{ fontSize: 17, color: 'var(--deep-teal)', marginBottom: 20, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            Confidence Trend
          </h3>
          <CSSBarChart data={trends} />
        </div>
      </div>

      {/* Recent scans */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, color: 'var(--deep-teal)', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            Recent Scans
          </h3>
          <Link to="/scan/history" className="btn btn-outline btn-sm">
            View All <ChevronRight />
          </Link>
        </div>

        {recentScans.length === 0 ? (
          <div className="empty-state">
            <Clock />
            <h3>No scans yet</h3>
            <p style={{ marginBottom: 16 }}>Upload your first thermal scan to get started</p>
            <Link to="/scan/upload" className="btn btn-primary">
              <Upload /> Upload Scan
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File Name</th><th>Risk Level</th><th>Confidence</th><th>Date</th><th></th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map(scan => (
                  <tr key={scan.id}>
                    <td style={{ fontWeight: 500 }}>{scan.filename}</td>
                    <td><RiskBadge level={scan.risk_level} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="confidence-bar" style={{ width: 80 }}>
                          <div className="confidence-fill" style={{
                            width: `${scan.confidence}%`,
                            background: RISK_COLORS[scan.risk_level] || 'var(--teal)',
                          }} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                          {scan.confidence?.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                      {new Date(scan.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/scan/result/${scan.id}`} className="btn btn-outline btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}