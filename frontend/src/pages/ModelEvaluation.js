import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from '../components/Toast';

// ── Metric Card ───────────────────────────────────────────────
function MetricCard({ label, value, unit, color, description }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '18px 20px',
      border: `1px solid var(--border)`, boxShadow: 'var(--shadow)',
      borderTop: `4px solid ${color}`,
    }}>
      <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {label}
      </p>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>
        {value}{unit}
      </div>
      {description && (
        <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
    </div>
  );
}

// ── Confusion Matrix Visual ───────────────────────────────────
function ConfusionMatrixVisual({ tp, tn, fp, fn }) {
  const total = tp + tn + fp + fn;
  const cells = [
    { label: 'True Negative',  value: tn, color: '#E6FFF9', border: 'var(--mint)',  text: 'var(--mint)',  sub: 'Correctly Normal'      },
    { label: 'False Positive', value: fp, color: '#FFF8E6', border: 'var(--gold)',  text: 'var(--gold)',  sub: 'Normal → Predicted Abnormal' },
    { label: 'False Negative', value: fn, color: '#FFF0F3', border: 'var(--pink)',  text: 'var(--pink)',  sub: 'Missed Cancer'          },
    { label: 'True Positive',  value: tp, color: '#EAF4F7', border: 'var(--teal)',  text: 'var(--teal)',  sub: 'Correctly Detected'     },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {cells.map(cell => (
          <div key={cell.label} style={{
            background: cell.color, borderRadius: 10, padding: '14px 16px',
            border: `2px solid ${cell.border}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: cell.text }}>{cell.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: cell.text }}>{cell.label}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{cell.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--light-bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        Total test samples: <strong style={{ color: 'var(--dark-text)' }}>{total}</strong> &nbsp;|&nbsp;
        Correct: <strong style={{ color: 'var(--mint)' }}>{tp + tn}</strong> &nbsp;|&nbsp;
        Incorrect: <strong style={{ color: 'var(--pink)' }}>{fp + fn}</strong>
      </div>
    </div>
  );
}

// ── CSS ROC Curve ─────────────────────────────────────────────
function CSSRocCurve({ fpr, tpr, auc_roc }) {
  if (!fpr || !tpr || fpr.length === 0) {
    return <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>ROC data not available</p>;
  }
  const W = 260, H = 220, PAD = 30;
  const xs = fpr.map(v => PAD + v * (W - PAD * 2));
  const ys = tpr.map(v => H - PAD - v * (H - PAD * 2));
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const areaPoints = `${PAD},${H - PAD} ` + points + ` ${W - PAD},${H - PAD}`;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <line x1={PAD} y1={H - PAD - v*(H-PAD*2)} x2={W-PAD} y2={H - PAD - v*(H-PAD*2)}
              stroke="#E0E0E0" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={PAD - 4} y={H - PAD - v*(H-PAD*2) + 4} fontSize="9" textAnchor="end" fill="#999">{v}</text>
            <line x1={PAD + v*(W-PAD*2)} y1={PAD} x2={PAD + v*(W-PAD*2)} y2={H-PAD}
              stroke="#E0E0E0" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={PAD + v*(W-PAD*2)} y={H-PAD+14} fontSize="9" textAnchor="middle" fill="#999">{v}</text>
          </g>
        ))}
        {/* Diagonal baseline */}
        <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={PAD} stroke="#CCCCCC" strokeWidth="1" strokeDasharray="4,4" />
        {/* AUC fill */}
        <polygon points={areaPoints} fill="rgba(2,128,144,0.12)" />
        {/* ROC line */}
        <polyline points={points} fill="none" stroke="#028090" strokeWidth="2.5" strokeLinejoin="round" />
        {/* Axes */}
        <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke="#666" strokeWidth="1.5" />
        <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#666" strokeWidth="1.5" />
        {/* Labels */}
        <text x={W/2} y={H+8} fontSize="10" textAnchor="middle" fill="#666">False Positive Rate</text>
        <text x={-H/2} y={10} fontSize="10" textAnchor="middle" fill="#666" transform="rotate(-90)">True Positive Rate</text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>
        AUC = {auc_roc?.toFixed(4)}
      </div>
    </div>
  );
}

// ── CV Score Bar ──────────────────────────────────────────────
function CVScoreBar({ scores, mean, std }) {
  if (!scores || scores.length === 0) return null;
  return (
    <div>
      {scores.map((score, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--muted)' }}>Fold {i + 1}</span>
            <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{score?.toFixed(2)}%</span>
          </div>
          <div className="confidence-bar" style={{ height: 10 }}>
            <div className="confidence-fill" style={{
              width: `${score}%`, background: 'var(--teal)',
            }} />
          </div>
        </div>
      ))}
      <div style={{
        marginTop: 12, background: 'var(--light-bg)', borderRadius: 8,
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
        fontSize: 13,
      }}>
        <span style={{ color: 'var(--muted)' }}>Mean Accuracy</span>
        <span style={{ fontWeight: 800, color: 'var(--deep-teal)', fontSize: 15 }}>
          {mean?.toFixed(2)}% ± {std?.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ModelEvaluation() {
  const [metrics,  setMetrics]  = useState(null);
  const [charts,   setCharts]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/admin/model-metrics'),
      api.get('/admin/model-charts').catch(() => ({ data: null })),
    ]).then(([metricsRes, chartsRes]) => {
      setMetrics(metricsRes.data);
      setCharts(chartsRes.data);
    }).catch(() => toast.error('Failed to load evaluation data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /><p>Loading evaluation data...</p></div>;

  if (metrics?.message) return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Model Evaluation</h1>
        <p>Performance metrics and explainability charts</p>
      </div>
      <div className="card">
        <div className="empty-state">
          <span style={{ fontSize: 48 }}>📊</span>
          <h3>No Evaluation Data Yet</h3>
          <p style={{ maxWidth: 400, margin: '0 auto' }}>
            Train your model on Google Colab and copy the following files to your
            <strong> backend/models/</strong> folder:
          </p>
          <div style={{ background: 'var(--light-bg)', borderRadius: 8, padding: '12px 20px', margin: '16px auto', textAlign: 'left', maxWidth: 380, fontSize: 13 }}>
            <div style={{ color: 'var(--teal)', fontWeight: 600, marginBottom: 8 }}>Required files:</div>
            {['efficientnetb3_extractor.h5', 'svm_model.pkl', 'scaler.pkl', 'model_metrics.json', 'charts_base64.json'].map(f => (
              <div key={f} style={{ padding: '4px 0', color: 'var(--dark-text)', fontSize: 12 }}>📄 {f}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview',       label: '📊 Overview'         },
    { id: 'confusion',      label: '🎯 Confusion Matrix'  },
    { id: 'roc',            label: '📈 ROC Curve'         },
    { id: 'crossval',       label: '🔄 Cross Validation'  },
    { id: 'explainability', label: '🧠 Explainability'    },
    { id: 'charts',         label: '🖼️ Training Charts'  },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Model Evaluation & Explainability</h1>
        <p>EfficientNetB3 + SVM Hybrid — Performance Analysis</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white',
        padding: 6, borderRadius: 12, border: '1px solid var(--border)',
        flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            background: activeTab === t.id ? 'var(--deep-teal)' : 'transparent',
            color: activeTab === t.id ? 'white' : 'var(--muted)',
            transition: 'all 0.15s ease',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────── */}
      {activeTab === 'overview' && metrics && (
        <div>
          {/* Key metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <MetricCard label="Accuracy"           value={metrics.accuracy}    unit="%" color="var(--deep-teal)"
              description="Overall correct predictions on 20% held-out test set" />
            <MetricCard label="Sensitivity (Recall)" value={metrics.sensitivity} unit="%" color="var(--mint)"
              description="Cancer cases correctly detected — most critical metric" />
            <MetricCard label="Specificity"        value={metrics.specificity} unit="%" color="var(--teal)"
              description="Healthy cases correctly identified — reduces false alarms" />
            <MetricCard label="Precision"          value={metrics.precision}   unit="%" color="var(--gold)"
              description="Of predicted cancer cases, percentage actually malignant" />
            <MetricCard label="F1-Score"           value={(metrics.f1_score * 100)?.toFixed(2)} unit="%" color="var(--pink)"
              description="Harmonic mean of Precision and Recall" />
            <MetricCard label="AUC-ROC"            value={metrics.auc_roc}     unit="" color="var(--teal)"
              description="Area under ROC curve — 1.0 is perfect, 0.5 is random" />
          </div>

          {/* Additional metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
                Extended Metrics
              </h3>
              {[
                ['Negative Predictive Value', metrics.npv, '%',  'var(--teal)'],
                ['False Positive Rate',       metrics.false_positive_rate, '%', 'var(--gold)'],
                ['False Negative Rate',       metrics.false_negative_rate, '%', 'var(--pink)'],
                ['Avg Precision (PR-AUC)',    (metrics.avg_precision * 100)?.toFixed(2), '%', 'var(--mint)'],
                ['CV Mean Accuracy',          metrics.cv_mean, '%', 'var(--teal)'],
                ['CV Std Deviation',          metrics.cv_std,  '%', 'var(--muted)'],
              ].map(([label, value, unit, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}{unit}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
                Training Configuration
              </h3>
              {[
                ['Model',          metrics.model || 'EfficientNetB3 + SVM'],
                ['Feature Dims',   `${metrics.feature_dims || 1280}-dimensional vector`],
                ['Image Size',     `${metrics.img_size || 224} × ${metrics.img_size || 224} px`],
                ['Data Split',     metrics.train_split || '80/20'],
                ['Train Images',   metrics.train_images],
                ['Test Images',    metrics.test_images],
                ['Phase 1 Epochs', metrics.epochs_phase1],
                ['Phase 2 Epochs', metrics.epochs_phase2],
                ['Best SVM C',     metrics.best_svm_params?.C],
                ['Best Gamma',     metrics.best_svm_params?.gamma],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset summary */}
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
              Dataset Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { label: 'Total Images',      value: metrics.total_images,   color: 'var(--deep-teal)' },
                { label: 'DMR-IR (Brazil)',    value: metrics.dmr_ir_count,   color: 'var(--teal)'      },
                { label: 'Mendeley (Colombia)',value: metrics.mendeley_count, color: 'var(--mint)'      },
                { label: 'Normal/Benign',      value: metrics.normal_count,   color: 'var(--gold)'      },
              ].map(d => (
                <div key={d.label} style={{
                  textAlign: 'center', padding: '16px 12px',
                  background: 'var(--light-bg)', borderRadius: 10,
                  border: `2px solid ${d.color}20`,
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: d.color }}>{d.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Confusion Matrix tab ──────────────────────────────── */}
      {activeTab === 'confusion' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>
              Confusion Matrix
            </h3>
            <ConfusionMatrixVisual
              tp={metrics.tp} tn={metrics.tn}
              fp={metrics.fp} fn={metrics.fn}
            />
          </div>

          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>
              What These Numbers Mean
            </h3>
            {[
              { term: 'True Positive (TP)',  val: metrics.tp, color: 'var(--teal)',  desc: 'Cancer scans the AI correctly identified as cancerous. These patients were correctly referred for treatment.' },
              { term: 'True Negative (TN)',  val: metrics.tn, color: 'var(--mint)',  desc: 'Healthy scans the AI correctly identified as healthy. No unnecessary follow-up required.' },
              { term: 'False Positive (FP)', val: metrics.fp, color: 'var(--gold)',  desc: 'Healthy scans the AI incorrectly flagged as cancerous. Causes unnecessary patient anxiety and additional tests.' },
              { term: 'False Negative (FN)', val: metrics.fn, color: 'var(--pink)',  desc: 'Cancer scans the AI missed. The most dangerous error — these patients go undetected and untreated.' },
            ].map(item => (
              <div key={item.term} style={{ marginBottom: 16, padding: '12px 14px',
                background: 'var(--light-bg)', borderRadius: 8,
                borderLeft: `4px solid ${item.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: item.color, fontSize: 13 }}>{item.term}</span>
                  <span style={{ fontWeight: 800, color: item.color, fontSize: 16 }}>{item.val}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            ))}

            {charts?.confusion_matrix && (
              <div style={{ marginTop: 16 }}>
                <img src={`data:image/png;base64,${charts.confusion_matrix}`}
                  alt="Confusion Matrix" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ROC Curve tab ────────────────────────────────────── */}
      {activeTab === 'roc' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>
              ROC Curve
            </h3>
            {metrics.roc_fpr && metrics.roc_tpr ? (
              <CSSRocCurve fpr={metrics.roc_fpr} tpr={metrics.roc_tpr} auc_roc={metrics.auc_roc} />
            ) : charts?.roc_curve ? (
              <img src={`data:image/png;base64,${charts.roc_curve}`}
                alt="ROC Curve" style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>ROC data not available</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>
              What is AUC-ROC?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--dark-text)', lineHeight: 1.7, marginBottom: 16 }}>
              The ROC (Receiver Operating Characteristic) curve plots the True Positive Rate against the False Positive Rate at every possible classification threshold.
            </p>
            <p style={{ fontSize: 14, color: 'var(--dark-text)', lineHeight: 1.7, marginBottom: 16 }}>
              The AUC (Area Under the Curve) measures how well the model separates cancerous from healthy cases across all thresholds. A score of 1.0 is perfect; 0.5 is no better than random.
            </p>
            <div style={{ background: 'var(--light-bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--teal)', textAlign: 'center' }}>
                {metrics.auc_roc}
              </div>
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, margin: 0 }}>
                Our AUC-ROC Score
              </p>
            </div>
            {charts?.precision_recall && (
              <div>
                <p style={{ fontWeight: 700, color: 'var(--deep-teal)', fontSize: 13, marginBottom: 8 }}>
                  Precision-Recall Curve (AP = {metrics.avg_precision?.toFixed(4)})
                </p>
                <img src={`data:image/png;base64,${charts.precision_recall}`}
                  alt="PR Curve" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cross Validation tab ──────────────────────────────── */}
      {activeTab === 'crossval' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>
              5-Fold Cross Validation Scores
            </h3>
            <CVScoreBar
              scores={metrics.cv_scores}
              mean={metrics.cv_mean}
              std={metrics.cv_std}
            />
            {charts?.cross_validation && (
              <div style={{ marginTop: 20 }}>
                <img src={`data:image/png;base64,${charts.cross_validation}`}
                  alt="CV Plot" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 20 }}>
              What is 5-Fold Cross Validation?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--dark-text)', lineHeight: 1.7, marginBottom: 16 }}>
              Instead of testing the model once, we split the training data into 5 equal groups. The model trains on 4 groups and tests on the remaining 1. This is repeated 5 times, each time using a different group as the test.
            </p>
            <p style={{ fontSize: 14, color: 'var(--dark-text)', lineHeight: 1.7, marginBottom: 16 }}>
              The final reported metrics are the average across all 5 runs. This ensures our results are not the product of a lucky or unlucky data split — they represent the model's genuine performance.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div style={{ background: 'var(--light-bg)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--teal)' }}>{metrics.cv_mean}%</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Mean Accuracy</div>
              </div>
              <div style={{ background: 'var(--light-bg)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)' }}>±{metrics.cv_std}%</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Std Deviation</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginTop: 16 }}>
              A low standard deviation (small ±) means the model performs consistently across all data subsets — confirming it has genuinely learned breast cancer patterns rather than memorising specific training examples.
            </p>
          </div>
        </div>
      )}

      {/* ── Explainability tab ────────────────────────────────── */}
      {activeTab === 'explainability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {charts?.gradcam_samples ? (
            <div className="card">
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 8 }}>
                Grad-CAM Heatmap Samples
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                Gradient-weighted Class Activation Mapping (Grad-CAM) highlights the regions of each thermal scan that most influenced the AI's classification decision. Red and yellow areas indicate high influence — these are the thermal hot spots the model detected as diagnostically significant.
              </p>
              <img src={`data:image/png;base64,${charts.gradcam_samples}`}
                alt="Grad-CAM Samples"
                style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <span style={{ fontSize: 48 }}>🧠</span>
                <h3>Grad-CAM samples will appear here after training</h3>
                <p>The training script automatically generates 8 sample Grad-CAM heatmaps and saves them for display here.</p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
                How Grad-CAM Works
              </h3>
              {[
                ['Step 1', 'The thermal scan is passed through EfficientNetB3'],
                ['Step 2', 'The gradient of the predicted class score is computed with respect to the last convolutional layer'],
                ['Step 3', 'Gradients are pooled spatially to get channel-wise importance weights'],
                ['Step 4', 'Feature maps are weighted and combined to produce a heat map'],
                ['Step 5', 'The heatmap is overlaid on the original scan — red = high influence, blue = low influence'],
              ].map(([step, desc]) => (
                <div key={step} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 60, flexShrink: 0, background: 'var(--deep-teal)', borderRadius: 6,
                    fontSize: 10, fontWeight: 700, color: 'white', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                    {step}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--dark-text)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 16 }}>
                Why Explainability Matters in Medicine
              </h3>
              <p style={{ fontSize: 13, color: 'var(--dark-text)', lineHeight: 1.7, marginBottom: 12 }}>
                A black-box AI that says "this is cancer" without explanation will not be trusted or adopted by clinicians. Grad-CAM addresses this by making the model's reasoning visible.
              </p>
              {[
                ['Clinical Trust',    'Doctors can verify that the AI is looking at medically relevant regions, not artefacts'],
                ['Error Detection',   'If the heatmap highlights irrelevant regions, it signals the model may be unreliable on that image'],
                ['Patient Communication', 'Clinicians can show patients exactly which region was flagged, improving understanding'],
                ['Regulatory Compliance', 'Explainability is increasingly required for medical AI deployment in clinical settings'],
              ].map(([title, desc]) => (
                <div key={title} style={{ marginBottom: 12, padding: '10px 12px',
                  background: 'var(--light-bg)', borderRadius: 8,
                  borderLeft: '3px solid var(--mint)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--dark-text)', marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Training Charts tab ───────────────────────────────── */}
      {activeTab === 'charts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {charts ? (
            <>
              {charts.training_history && (
                <div className="card">
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 12 }}>
                    Training History — Accuracy & Loss
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    Shows how accuracy and loss evolved across all {(metrics?.epochs_phase1 || 0) + (metrics?.epochs_phase2 || 0)} training epochs across both phases. The orange dotted line marks where Phase 2 (full fine-tuning) began.
                  </p>
                  <img src={`data:image/png;base64,${charts.training_history}`}
                    alt="Training History" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                </div>
              )}
              {charts.dataset_distribution && (
                <div className="card">
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 12 }}>
                    Dataset Distribution
                  </h3>
                  <img src={`data:image/png;base64,${charts.dataset_distribution}`}
                    alt="Dataset Distribution" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                </div>
              )}
              {charts.metrics_bar && (
                <div className="card">
                  <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--deep-teal)', marginBottom: 12 }}>
                    All Metrics Summary Chart
                  </h3>
                  <img src={`data:image/png;base64,${charts.metrics_bar}`}
                    alt="Metrics Bar" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <span style={{ fontSize: 48 }}>🖼️</span>
                <h3>Training charts will appear here</h3>
                <p>After training, copy <strong>charts_base64.json</strong> to your backend/models/ folder.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}