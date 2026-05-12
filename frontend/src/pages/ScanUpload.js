import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon, CheckCircle, AlertTriangle, XCircle, Loader } from '../icons';
import api from '../services/api';
import { toast } from '../components/Toast';

const RISK_CONFIG = {
  Normal:     { icon: CheckCircle,    color: 'var(--mint)', bg: '#E6FFF9', label: 'Normal — No abnormality detected' },
  Suspicious: { icon: AlertTriangle,  color: 'var(--gold)', bg: '#FFF8E6', label: 'Suspicious — Follow-up recommended' },
  Malignant:  { icon: XCircle,        color: 'var(--pink)', bg: '#FFF0F3', label: 'Malignant — Urgent consultation required' },
};

export default function ScanUpload() {
  const navigate = useNavigate();
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [scanId,   setScanId]   = useState(null);
  const [gradcam,  setGradcam]  = useState(null);
  const [step,     setStep]     = useState('upload'); // upload | analysing | result

  const onDrop = useCallback(accepted => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setStep('upload');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/png, image/jpeg, image/jpg',
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: () => toast.error('Invalid file. Please upload PNG or JPG under 10MB.'),
  });

  const handleAnalyse = async () => {
    if (!file) return;
    setLoading(true);
    setStep('analysing');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/scan/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setScanId(res.data.scan_id);
      // Load Grad-CAM
      if (res.data.gradcam_url) {
        const imgRes = await api.get(res.data.gradcam_url, { responseType: 'blob' });
        setGradcam(URL.createObjectURL(imgRes.data));
      }
      setStep('result');
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null);
    setGradcam(null); setScanId(null); setStep('upload');
  };

  const riskConfig = result ? RISK_CONFIG[result.risk_level] : null;
  const RiskIcon = riskConfig?.icon;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Upload Thermal Scan</h1>
        <p>Upload a thermal breast image for AI analysis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Upload panel */}
        <div className="card">
          <h3 style={{ fontSize: 17, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: 'var(--deep-teal)', marginBottom: 20 }}>
            Thermal Image
          </h3>

          {!preview ? (
            <div {...getRootProps()} style={{
              border: `2px dashed ${isDragActive ? 'var(--teal)' : 'var(--border)'}`,
              borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
              background: isDragActive ? 'rgba(2,128,144,0.04)' : 'var(--light-bg)',
              transition: 'all 0.2s ease',
            }}>
              <input {...getInputProps()} />
              <div style={{
                width: 56, height: 56, background: 'rgba(2,62,88,0.08)',
                borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Upload size={24} color="var(--deep-teal)" />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--dark-text)', marginBottom: 6 }}>
                {isDragActive ? 'Drop your image here' : 'Drag & drop thermal image'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                or click to browse files
              </p>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>PNG, JPG up to 10MB</span>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <img src={preview} alt="Preview" style={{
                  width: '100%', height: 260, objectFit: 'cover',
                  borderRadius: 10, border: '1px solid var(--border)',
                }} />
                <button onClick={reset} style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                  width: 28, height: 28, cursor: 'pointer', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>
              <div style={{
                background: 'var(--light-bg)', borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              }}>
                <ImageIcon size={16} color="var(--teal)" />
                <span style={{ fontSize: 13, color: 'var(--dark-text)', fontWeight: 500 }}>{file.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          )}

          {preview && step !== 'result' && (
            <button className="btn btn-primary btn-lg" onClick={handleAnalyse} disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading
                ? <><Loader size={16} className="spin" /> Analysing...</>
                : <><Upload size={16} /> Analyse Scan</>
              }
            </button>
          )}

          {step === 'analysing' && (
            <div style={{
              marginTop: 20, padding: 16, background: 'rgba(2,128,144,0.06)',
              borderRadius: 10, textAlign: 'center',
            }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>
                Running EfficientNetB3 + SVM analysis...
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Extracting 1,280-dimensional feature vector
              </p>
            </div>
          )}
        </div>

        {/* Result panel */}
        <div className="card">
          <h3 style={{ fontSize: 17, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: 'var(--deep-teal)', marginBottom: 20 }}>
            Analysis Result
          </h3>

          {!result ? (
            <div className="empty-state">
              <ImageIcon size={48} />
              <h3>No Result Yet</h3>
              <p>Upload and analyse a thermal scan to see the AI diagnosis here</p>
            </div>
          ) : (
            <div>
              {/* Risk result box */}
              <div style={{
                background: riskConfig.bg, borderRadius: 12, padding: '20px 24px',
                textAlign: 'center', marginBottom: 20, border: `1px solid ${riskConfig.color}30`,
              }}>
                <RiskIcon size={40} color={riskConfig.color} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 28, fontWeight: 800, color: riskConfig.color, marginBottom: 4 }}>
                  {result.risk_level}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{riskConfig.label}</div>
              </div>

              {/* Confidence */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--dark-text)' }}>Confidence Score</span>
                  <span style={{ fontWeight: 700, color: riskConfig.color }}>{result.confidence?.toFixed(1)}%</span>
                </div>
                <div className="confidence-bar" style={{ height: 10 }}>
                  <div className="confidence-fill" style={{
                    width: `${result.confidence}%`, background: riskConfig.color,
                  }} />
                </div>
              </div>

              {/* Probabilities */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-text)', marginBottom: 10 }}>
                  Class Probabilities
                </p>
                {Object.entries(result.probabilities || {}).map(([label, prob]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--muted)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{prob?.toFixed(1)}%</span>
                    </div>
                    <div className="confidence-bar" style={{ height: 6 }}>
                      <div className="confidence-fill" style={{
                        width: `${prob}%`,
                        background: label === 'Normal' ? 'var(--mint)' : label === 'Suspicious' ? 'var(--gold)' : 'var(--pink)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Grad-CAM */}
              {gradcam && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-text)', marginBottom: 8 }}>
                    Grad-CAM Heatmap
                  </p>
                  <img src={gradcam} alt="Grad-CAM" style={{
                    width: '100%', borderRadius: 8, border: '1px solid var(--border)',
                  }} />
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Highlighted regions show areas that influenced the AI decision
                  </p>
                </div>
              )}

              {/* Recommendation */}
              <div style={{
                background: 'var(--light-bg)', borderRadius: 10, padding: '12px 14px',
                borderLeft: `3px solid ${riskConfig.color}`, marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                  {result.recommendation}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => navigate(`/scan/result/${scanId}`)}
                  className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Full Report
                </button>
                <button onClick={reset} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                  New Scan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}