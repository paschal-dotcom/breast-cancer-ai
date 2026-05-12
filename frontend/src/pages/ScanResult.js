import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, CheckCircle, AlertTriangle, XCircle } from '../icons';
import api from '../services/api';
import { toast } from '../components/Toast';

const RISK_CONFIG = {
  Normal:     { icon: CheckCircle,   color: 'var(--mint)', bg: '#E6FFF9' },
  Suspicious: { icon: AlertTriangle, color: 'var(--gold)', bg: '#FFF8E6' },
  Malignant:  { icon: XCircle,       color: 'var(--pink)', bg: '#FFF0F3' },
};

export default function ScanResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradcam, setGradcam] = useState(null);

  useEffect(() => {
    api.get(`/scan/${id}`)
      .then(async res => {
        setScan(res.data);
        if (res.data.gradcam_path) {
          const fileId = res.data.gradcam_path.split('\\').pop().replace('_gradcam.png', '');
          try {
            const imgRes = await api.get(`/scan/gradcam/${fileId}`, { responseType: 'blob' });
            setGradcam(URL.createObjectURL(imgRes.data));
          } catch {}
        }
      })
      .catch(() => toast.error('Scan not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const downloadReport = async () => {
    try {
      const res = await api.get(`/report/${id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `report_${id}.pdf`; a.click();
      toast.success('Report downloaded');
    } catch { toast.error('Download failed'); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!scan)   return <div className="loading-center"><p>Scan not found</p></div>;

  const cfg = RISK_CONFIG[scan.risk_level] || RISK_CONFIG.Normal;
  const Icon = cfg.icon;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm">
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: 24, color: 'var(--deep-teal)' }}>Scan Result</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{scan.filename}</p>
        </div>
        <button onClick={downloadReport} className="btn btn-mint" style={{ marginLeft: 'auto' }}>
          <Download size={16} /> Download PDF Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Risk result */}
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ background: cfg.bg, borderRadius: 12, padding: '24px 20px' }}>
              <Icon size={48} color={cfg.color} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 32, fontWeight: 800, color: cfg.color, marginBottom: 6 }}>
                {scan.risk_level}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--dark-text)' }}>
                {scan.confidence?.toFixed(1)}% Confidence
              </div>
            </div>
          </div>

          {/* Probabilities */}
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
              Probability Breakdown
            </h3>
            {[
              { label: 'Normal',     val: scan.normal_prob,     color: 'var(--mint)' },
              { label: 'Suspicious', val: scan.suspicious_prob, color: 'var(--gold)' },
              { label: 'Malignant',  val: scan.malignant_prob,  color: 'var(--pink)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{val?.toFixed(1)}%</span>
                </div>
                <div className="confidence-bar" style={{ height: 8 }}>
                  <div className="confidence-fill" style={{ width: `${val}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Scan details */}
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
              Scan Details
            </h3>
            {[
              ['Scan ID',    `#${scan.id}`],
              ['File Name',  scan.filename],
              ['Analysed',   new Date(scan.created_at).toLocaleString()],
              ['AI Model',   'EfficientNetB3 + SVM Hybrid'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark-text)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Grad-CAM */}
          {gradcam && (
            <div className="card">
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 12 }}>
                Grad-CAM Heatmap
              </h3>
              <img src={gradcam} alt="Grad-CAM" style={{
                width: '100%', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 10,
              }} />
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                Red/yellow regions highlight areas that most influenced the AI model's classification decision.
              </p>
            </div>
          )}

          {/* Clinical recommendation */}
          <div className="card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 12 }}>
              Clinical Recommendation
            </h3>
            <p style={{ fontSize: 14, color: 'var(--dark-text)', lineHeight: 1.7 }}>
              {scan.risk_level === 'Normal' && 'No abnormalities detected. Continue regular annual screenings and maintain a healthy lifestyle. Consult your doctor if you notice any physical changes.'}
              {scan.risk_level === 'Suspicious' && 'Thermal patterns suggest a possible early-stage abnormality. A follow-up clinical examination within 2–4 weeks is strongly recommended. Additional imaging may be needed.'}
              {scan.risk_level === 'Malignant' && 'URGENT: Thermal patterns are strongly associated with malignant tissue. Please consult an oncologist or breast specialist immediately. Early treatment significantly improves outcomes.'}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="card" style={{ background: 'var(--light-bg)' }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--dark-text)' }}>Disclaimer:</strong> This result is generated by an AI system and is intended to assist medical professionals. It does not replace clinical diagnosis. All results must be reviewed and confirmed by a qualified healthcare professional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}