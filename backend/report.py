"""
================================================================
report.py — Automated PDF Diagnostic Report Generator
================================================================
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                 Table, TableStyle, HRFlowable,
                                 Image as RLImage)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import os

REPORT_DIR = "reports"
os.makedirs(REPORT_DIR, exist_ok=True)

# ── Colours matching the deep teal theme ──────────────────────
DEEP_TEAL  = colors.HexColor("#023E58")
TEAL       = colors.HexColor("#028090")
MINT       = colors.HexColor("#02C39A")
PINK       = colors.HexColor("#D64F6E")
GOLD       = colors.HexColor("#F4A62A")
LIGHT_BG   = colors.HexColor("#F0F7F9")
DARK_TEXT  = colors.HexColor("#1A2E35")
MUTED      = colors.HexColor("#5A7A84")
WHITE      = colors.white

RISK_COLORS = {
    "Normal":     colors.HexColor("#02C39A"),
    "Suspicious": colors.HexColor("#F4A62A"),
    "Malignant":  colors.HexColor("#D64F6E")
}

def generate_pdf_report(scan: dict, user: dict) -> str:
    """Generate a professional PDF diagnostic report."""
    report_filename = f"report_scan_{scan['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    report_path = os.path.join(REPORT_DIR, report_filename)

    doc = SimpleDocTemplate(
        report_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Custom Styles ─────────────────────────────────────────
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=20,
        textColor=WHITE,
        alignment=TA_CENTER,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor("#A8D5DE"),
        alignment=TA_CENTER,
        spaceAfter=4
    )
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Normal'],
        fontSize=13,
        textColor=DEEP_TEAL,
        fontName='Helvetica-Bold',
        spaceBefore=16,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_TEXT,
        spaceAfter=4,
        leading=16
    )
    risk_style = ParagraphStyle(
        'Risk',
        parent=styles['Normal'],
        fontSize=28,
        fontName='Helvetica-Bold',
        textColor=RISK_COLORS.get(scan['risk_level'], TEAL),
        alignment=TA_CENTER
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=MUTED,
        alignment=TA_CENTER,
        leading=12
    )

    # ── HEADER SECTION ────────────────────────────────────────
    header_data = [[
        Paragraph("🩺 AI Breast Cancer Detection System", title_style),
    ]]
    header_table = Table(header_data, colWidths=[17*cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), DEEP_TEAL),
        ('TOPPADDING',    (0, 0), (-1, -1), 18),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING',   (0, 0), (-1, -1), 20),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 20),
        ('ROUNDEDCORNERS', [8]),
    ]))
    story.append(header_table)

    # Coloured accent line
    story.append(HRFlowable(width="100%", thickness=4, color=MINT, spaceAfter=16))

    # ── REPORT METADATA ───────────────────────────────────────
    story.append(Paragraph("DIAGNOSTIC REPORT", heading_style))

    meta_data = [
        ["Report ID",       f"RPT-{scan['id']:04d}",
         "Date Generated",  datetime.now().strftime("%d %B %Y, %H:%M")],
        ["Patient Name",    user.get('full_name', 'N/A'),
         "Patient Email",   user.get('email', 'N/A')],
        ["Scan File",       scan.get('filename', 'N/A'),
         "Scan ID",         str(scan['id'])],
        ["Scan Date",       scan.get('created_at', 'N/A')[:10],
         "System Version",  "v1.0.0 — EfficientNetB3 + SVM"],
    ]

    meta_table = Table(meta_data, colWidths=[3.5*cm, 5*cm, 3.5*cm, 5*cm])
    meta_table.setStyle(TableStyle([
        ('FONTNAME',      (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE',      (0, 0), (-1, -1), 9),
        ('FONTNAME',      (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME',      (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR',     (0, 0), (0, -1), TEAL),
        ('TEXTCOLOR',     (2, 0), (2, -1), TEAL),
        ('TEXTCOLOR',     (1, 0), (1, -1), DARK_TEXT),
        ('TEXTCOLOR',     (3, 0), (3, -1), DARK_TEXT),
        ('BACKGROUND',    (0, 0), (-1, -1), LIGHT_BG),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [LIGHT_BG, WHITE]),
        ('GRID',          (0, 0), (-1, -1), 0.5, colors.HexColor("#D0E8EE")),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # ── DIAGNOSIS RESULT ──────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=10))
    story.append(Paragraph("DIAGNOSIS RESULT", heading_style))

    risk_level   = scan.get('risk_level', 'Unknown')
    confidence   = scan.get('confidence', 0)
    risk_color   = RISK_COLORS.get(risk_level, TEAL)

    result_data = [[
        Paragraph(f"Risk Classification", ParagraphStyle('rl', fontSize=10, textColor=MUTED, fontName='Helvetica')),
        Paragraph(f"Confidence Score", ParagraphStyle('cs', fontSize=10, textColor=MUTED, fontName='Helvetica')),
        Paragraph(f"AI Model", ParagraphStyle('am', fontSize=10, textColor=MUTED, fontName='Helvetica')),
    ], [
        Paragraph(risk_level, ParagraphStyle('rv', fontSize=22, fontName='Helvetica-Bold', textColor=risk_color, alignment=TA_CENTER)),
        Paragraph(f"{confidence:.1f}%", ParagraphStyle('cv', fontSize=22, fontName='Helvetica-Bold', textColor=DEEP_TEAL, alignment=TA_CENTER)),
        Paragraph("EfficientNetB3\n+ SVM Hybrid", ParagraphStyle('mv', fontSize=11, textColor=TEAL, alignment=TA_CENTER)),
    ]]

    result_table = Table(result_data, colWidths=[5.67*cm, 5.67*cm, 5.67*cm])
    result_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), WHITE),
        ('BOX',           (0, 0), (-1, -1), 1.5, TEAL),
        ('INNERGRID',     (0, 0), (-1, -1), 0.5, colors.HexColor("#D0E8EE")),
        ('TOPPADDING',    (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(result_table)
    story.append(Spacer(1, 12))

    # ── PROBABILITY BREAKDOWN ─────────────────────────────────
    story.append(Paragraph("CLASS PROBABILITY BREAKDOWN", heading_style))

    probs = [
        ("Normal",     scan.get('normal_prob', 0),     MINT),
        ("Suspicious", scan.get('suspicious_prob', 0), GOLD),
        ("Malignant",  scan.get('malignant_prob', 0),  PINK),
    ]

    for label, prob, color in probs:
        bar_data = [[
            Paragraph(label, ParagraphStyle('lbl', fontSize=10, fontName='Helvetica-Bold', textColor=DARK_TEXT)),
            Paragraph(f"{prob:.1f}%", ParagraphStyle('pct', fontSize=10, fontName='Helvetica-Bold', textColor=color, alignment=TA_RIGHT)),
        ]]
        bar_table = Table(bar_data, colWidths=[14*cm, 3*cm])
        bar_table.setStyle(TableStyle([
            ('BACKGROUND',    (0, 0), (-1, -1), LIGHT_BG),
            ('TOPPADDING',    (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ]))
        story.append(bar_table)
        story.append(Spacer(1, 3))

    story.append(Spacer(1, 12))

    # ── RECOMMENDATION ────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=10))
    story.append(Paragraph("CLINICAL RECOMMENDATION", heading_style))

    recommendations = {
        "Normal": "No abnormalities detected in this thermal scan. Continue regular annual screenings. Maintain a healthy lifestyle and consult your doctor if you notice any physical changes to the breast.",
        "Suspicious": "Thermal patterns suggest a possible early-stage abnormality. A follow-up clinical examination within 2-4 weeks is strongly recommended. Additional imaging such as ultrasound or mammography is advised to confirm findings.",
        "Malignant": "URGENT: Thermal patterns are strongly associated with malignant tissue. Please consult an oncologist or breast specialist immediately. Early treatment significantly improves outcomes — do not delay seeking medical attention."
    }

    rec_text = recommendations.get(risk_level, "Please consult your doctor.")
    rec_color = RISK_COLORS.get(risk_level, TEAL)

    rec_data = [[Paragraph(rec_text, ParagraphStyle('rec', fontSize=10, textColor=DARK_TEXT, leading=16))]]
    rec_table = Table(rec_data, colWidths=[17*cm])
    rec_table.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), LIGHT_BG),
        ('LEFTBORDER',    (0, 0), (0, -1), 4, rec_color),
        ('BOX',           (0, 0), (-1, -1), 0.5, colors.HexColor("#D0E8EE")),
        ('TOPPADDING',    (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING',   (0, 0), (-1, -1), 16),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 16),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 20))

    # ── GRAD-CAM IMAGE (if available) ─────────────────────────
    gradcam_path = scan.get('gradcam_path', '')
    if gradcam_path and os.path.exists(gradcam_path):
        story.append(Paragraph("GRAD-CAM THERMAL ANALYSIS", heading_style))
        story.append(Paragraph(
            "The heatmap below highlights the regions of the thermal scan that most influenced the AI model's classification decision. Warmer colours (red/yellow) indicate higher influence.",
            body_style
        ))
        story.append(Spacer(1, 8))
        try:
            img = RLImage(gradcam_path, width=8*cm, height=8*cm)
            img_table = Table([[img]], colWidths=[17*cm])
            img_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('BOX',   (0, 0), (-1, -1), 1, TEAL),
            ]))
            story.append(img_table)
        except:
            pass
        story.append(Spacer(1, 16))

    # ── DISCLAIMER ────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=8))
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by an AI-powered diagnostic system and is intended to assist medical professionals. "
        "It does not replace clinical diagnosis. All results must be reviewed and confirmed by a qualified healthcare professional. "
        "The AI system uses EfficientNetB3 + SVM hybrid model trained on DMR-IR and Mendeley Breast Thermography datasets.",
        disclaimer_style
    ))

    # ── FOOTER ────────────────────────────────────────────────
    story.append(Spacer(1, 8))
    footer_data = [[
        Paragraph("AI Breast Cancer Detection System v1.0.0", ParagraphStyle('fl', fontSize=8, textColor=MUTED)),
        Paragraph(f"Generated: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ParagraphStyle('fr', fontSize=8, textColor=MUTED, alignment=TA_RIGHT)),
    ]]
    footer_table = Table(footer_data, colWidths=[8.5*cm, 8.5*cm])
    footer_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(footer_table)

    # Build PDF
    doc.build(story)
    return report_path