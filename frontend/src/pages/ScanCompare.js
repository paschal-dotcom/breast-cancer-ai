// ScanCompare.js
import React, { useState, useEffect } from 'react';
import { GitCompare, TrendingUp, TrendingDown, Minus } from '../icons';
import api from '../services/api';
import { toast } from '../components/Toast';

function RiskBadge({ level }) {
  const cls = level === 'Normal' ? 'badge-normal' : level === 'Suspicious' ? 'badge-suspicious' : 'badge-malignant';
  return <span className={`badge ${cls}`}>{level}</span>;
}

export function ScanCompare() {
  const [scans,  setScans]  = useState([]);
  const [scan1,  setScan1]  = useState('');
  const [scan2,  setScan2]  = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/scan/history').then(res => setScans(res.data.scans || []));
  }, []);

  const compare = async () => {
    if (!scan1 || !scan2) return toast.error('Select two scans to compare');
    if (scan1 === scan2) return toast.error('Select two different scans');
    setLoading(true);
    try {
      const res = await api.get(`/scan/compare/${scan1}/${scan2}`);
      setResult(res.data);
    } catch { toast.error('Comparison failed'); }
    finally { setLoading(false); }
  };

  const TrendIcon = result?.comparison?.trend === 'WORSENING' ? TrendingUp
    : result?.comparison?.trend === 'IMPROVING' ? TrendingDown : Minus;
  const trendColor = result?.comparison?.trend === 'WORSENING' ? 'var(--pink)'
    : result?.comparison?.trend === 'IMPROVING' ? 'var(--mint)' : 'var(--teal)';

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Compare Scans</h1>
        <p>Track changes between two scan results over time</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: 'var(--deep-teal)', marginBottom: 20, fontSize: 16 }}>
          Select Two Scans
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 16, alignItems: 'end' }}>
          <div>
            <label className="form-label">Earlier Scan</label>
            <select className="form-input" value={scan1} onChange={e => setScan1(e.target.value)}>
              <option value="">Select scan...</option>
              {scans.map(s => (
                <option key={s.id} value={s.id}>
                  {s.filename} — {s.risk_level} ({new Date(s.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          <div style={{ textAlign: 'center', paddingBottom: 4, color: 'var(--muted)' }}>
            <GitCompare size={20} />
          </div>
          <div>
            <label className="form-label">Later Scan</label>
            <select className="form-input" value={scan2} onChange={e => setScan2(e.target.value)}>
              <option value="">Select scan...</option>
              {scans.map(s => (
                <option key={s.id} value={s.id}>
                  {s.filename} — {s.risk_level} ({new Date(s.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={compare} disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Compare'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* Scan 1 */}
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: 'var(--deep-teal)', marginBottom: 16, fontSize: 15 }}>
              Earlier Scan
            </h3>
            <div style={{ marginBottom: 12 }}><RiskBadge level={result.scan1.risk_level} /></div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{result.scan1.filename}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--dark-text)', marginBottom: 4 }}>
              {result.scan1.confidence?.toFixed(1)}%
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {new Date(result.scan1.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Comparison */}
          <div className="card" style={{ textAlign: 'center', background: 'var(--light-bg)' }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: 'var(--deep-teal)', marginBottom: 16, fontSize: 15 }}>
              Change
            </h3>
            <TrendIcon size={40} color={trendColor} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: trendColor, marginBottom: 8 }}>
              {result.comparison.trend}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
              {result.comparison.days_between} days between scans
            </div>
            <div style={{
              background: 'white', borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: 'var(--dark-text)',
            }}>
              Confidence change: <strong style={{ color: trendColor }}>
                {result.comparison.confidence_change > 0 ? '+' : ''}{result.comparison.confidence_change?.toFixed(1)}%
              </strong>
            </div>
          </div>

          {/* Scan 2 */}
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: 'var(--deep-teal)', marginBottom: 16, fontSize: 15 }}>
              Later Scan
            </h3>
            <div style={{ marginBottom: 12 }}><RiskBadge level={result.scan2.risk_level} /></div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{result.scan2.filename}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--dark-text)', marginBottom: 4 }}>
              {result.scan2.confidence?.toFixed(1)}%
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {new Date(result.scan2.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScanCompare;