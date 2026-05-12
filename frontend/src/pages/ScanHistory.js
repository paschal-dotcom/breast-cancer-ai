// ── ScanHistory.js ──────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Download, Trash2, Search } from '../icons';
import api from '../services/api';
import { toast } from '../components/Toast';

function RiskBadge({ level }) {
  const cls = level === 'Normal' ? 'badge-normal' : level === 'Suspicious' ? 'badge-suspicious' : 'badge-malignant';
  return <span className={`badge ${cls}`}>{level}</span>;
}

export function ScanHistory() {
  const [scans, setScans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = () => {
    api.get('/scan/history')
      .then(res => setScans(res.data.scans || []))
      .catch(() => toast.error('Failed to load scans'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async id => {
    if (!window.confirm('Delete this scan?')) return;
    try {
      await api.delete(`/scan/${id}`);
      setScans(s => s.filter(x => x.id !== id));
      toast.success('Scan deleted');
    } catch { toast.error('Delete failed'); }
  };

  const downloadReport = async id => {
    try {
      const res = await api.get(`/report/${id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `report_${id}.pdf`; a.click();
      toast.success('Report downloaded');
    } catch { toast.error('Download failed'); }
  };

  const filtered = scans.filter(s =>
    s.filename.toLowerCase().includes(search.toLowerCase()) ||
    s.risk_level.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading scans...</p></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Scan History</h1>
        <p>All your previous thermal scan analyses</p>
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: 'var(--deep-teal)', fontSize: 16 }}>
            {scans.length} Total Scans
          </h3>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="form-input" placeholder="Search scans..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 220, fontSize: 13 }} />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} />
            <h3>No scans found</h3>
            <p>Upload your first scan to see history here</p>
            <Link to="/scan/upload" className="btn btn-primary" style={{ marginTop: 16 }}>Upload Scan</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>File</th><th>Risk</th><th>Confidence</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(scan => (
                  <tr key={scan.id}>
                    <td style={{ fontWeight: 500 }}>{scan.filename}</td>
                    <td><RiskBadge level={scan.risk_level} /></td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{scan.confidence?.toFixed(1)}%</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{new Date(scan.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/scan/result/${scan.id}`} className="btn btn-outline btn-sm">View</Link>
                        <button onClick={() => downloadReport(scan.id)} className="btn btn-outline btn-sm">
                          <Download size={13} />
                        </button>
                        <button onClick={() => handleDelete(scan.id)} className="btn btn-sm"
                          style={{ background: '#FFF0F3', color: 'var(--pink)', border: 'none' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
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

export default ScanHistory;