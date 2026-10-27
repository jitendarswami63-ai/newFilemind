"""
FileMind Masterpiece Presentation Generator - Definitive Senior Designer Edition
Aesthetic: Modern Editorial Executive Studio (Strictly NO Blue / NO Cyber Neon / NO Card Soup)
Palette: Warm Studio Paper Canvas (#FAFAF9), Obsidian Ink (#0F172A), Slate (#475569), Warm Terracotta (#C2410C), Forest Emerald (#047857), Warm Ochre (#B45309).
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# -----------------------------------------------------------------------------
# PALETTE DEFINITIONS (Strictly NO BLUE)
# -----------------------------------------------------------------------------
C_BG_WARM       = RGBColor(250, 250, 249)  # #FAFAF9 Warm Studio Canvas
C_BG_WHITE      = RGBColor(255, 255, 255)  # #FFFFFF Pure Surface
C_BG_PANEL      = RGBColor(244, 244, 245)  # #F4F4F5 Subtle Panel Tint
C_BG_WARM_TINT  = RGBColor(255, 247, 237)  # #FFF7ED Warm Terracotta/Orange Tint
C_BG_ROSE_TINT  = RGBColor(254, 242, 242)  # #FEF2F2 Soft Rose Tint for Legacy

C_INK_HEADING   = RGBColor(15, 23, 42)     # #0F172A Deepest Obsidian
C_INK_PRIMARY   = RGBColor(30, 41, 59)     # #1E293B Deep Charcoal
C_INK_SECONDARY = RGBColor(71, 85, 105)    # #475569 Refined Slate
C_INK_MUTED     = RGBColor(148, 163, 184)  # #94A3B8 Subtle Muted / Tracking

C_BORDER_LIGHT  = RGBColor(226, 232, 240)  # #E2E8F0 Hairline Divider
C_BORDER_FOCUS  = RGBColor(203, 213, 225)  # #CBD5E1 Structural Border

C_ACCENT_TERRA  = RGBColor(194, 65, 12)    # #C2410C Warm Burnt Terracotta
C_ACCENT_EMER   = RGBColor(4, 120, 87)     # #047857 Deep Forest Emerald
C_ACCENT_OCHRE  = RGBColor(180, 83, 9)     # #B45309 Warm Ochre / Amber
C_ACCENT_RED    = RGBColor(185, 28, 28)    # #B91C1C Deep Crimson

FONT_HEAD = "Trebuchet MS"
FONT_BODY = "Calibri"
FONT_MONO = "Consolas"

# -----------------------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------------------
def set_canvas(slide):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = C_BG_WARM
    bg.line.fill.background()
    return bg

def add_editorial_header(slide, cat_num, cat_title, title, subtitle):
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.52), Inches(11.733), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_cat = tf.paragraphs[0]
    p_cat.text = f"{cat_num}  /  {cat_title.upper()}"
    p_cat.font.name = FONT_HEAD
    p_cat.font.size = Pt(9.5)
    p_cat.font.bold = True
    p_cat.font.color.rgb = C_ACCENT_TERRA

    p_t = tf.add_paragraph()
    p_t.text = title
    p_t.font.name = FONT_HEAD
    p_t.font.size = Pt(24)
    p_t.font.bold = True
    p_t.font.color.rgb = C_INK_HEADING
    p_t.space_before = Pt(3)

    p_s = tf.add_paragraph()
    p_s.text = subtitle
    p_s.font.name = FONT_BODY
    p_s.font.size = Pt(11.5)
    p_s.font.color.rgb = C_INK_SECONDARY
    p_s.space_before = Pt(2)

def draw_flat_card(slide, left, top, width, height, bg_color=C_BG_WHITE, border_color=C_BORDER_LIGHT):
    rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    rect.fill.solid()
    rect.fill.fore_color.rgb = bg_color
    if border_color:
        rect.line.color.rgb = border_color
        rect.line.width = Pt(1)
    else:
        rect.line.fill.background()
    return rect

def draw_hairline(slide, left, top, width, color=C_BORDER_LIGHT):
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Inches(0.015))
    line.fill.solid()
    line.fill.fore_color.rgb = color
    line.line.fill.background()
    return line

def add_notes(slide, text):
    notes = slide.notes_slide.notes_text_frame
    notes.text = text.strip()

# -----------------------------------------------------------------------------
# INITIALIZE PRESENTATION
# -----------------------------------------------------------------------------
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]

print("Generating FileMind Definitive Senior Designer Masterpiece...")

# =============================================================================
# SLIDE 1: COVER (Monumental Typographic Layout)
# =============================================================================
s1 = prs.slides.add_slide(blank)
set_canvas(s1)

# Eyebrow Pill
pill1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.95), Inches(4.8), Inches(0.34))
pill1.fill.solid()
pill1.fill.fore_color.rgb = C_BG_WARM_TINT
pill1.line.color.rgb = C_ACCENT_TERRA
pill1.line.width = Pt(1)

tb_p1 = s1.shapes.add_textbox(Inches(0.8), Inches(0.98), Inches(4.8), Inches(0.3))
tf_p1 = tb_p1.text_frame
p_p1 = tf_p1.paragraphs[0]
p_p1.text = "ACADEMIC CAPSTONE  •  ANNUAL HACKATHON 2026"
p_p1.alignment = PP_ALIGN.CENTER
p_p1.font.name = FONT_HEAD
p_p1.font.size = Pt(9.5)
p_p1.font.bold = True
p_p1.font.color.rgb = C_ACCENT_TERRA

# Monumental Brand Title
tb1 = s1.shapes.add_textbox(Inches(0.8), Inches(1.45), Inches(11.733), Inches(2.3))
tf1 = tb1.text_frame
tf1.word_wrap = True
tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

p_brand = tf1.paragraphs[0]
p_brand.text = "FileMind"
p_brand.font.name = FONT_HEAD
p_brand.font.size = Pt(56)
p_brand.font.bold = True
p_brand.font.color.rgb = C_INK_HEADING

p_sub = tf1.add_paragraph()
p_sub.text = "Autonomous Multimodal PDF Vault & High-Throughput Retrieval Engine"
p_sub.font.name = FONT_HEAD
p_sub.font.size = Pt(21)
p_sub.font.bold = True
p_sub.font.color.rgb = C_ACCENT_TERRA
p_sub.space_before = Pt(4)

p_desc = tf1.add_paragraph()
p_desc.text = "An enterprise document intelligence architecture that transforms static, fragmented PDF archives into a secure, semantically searchable knowledge vault using Google Gemini 3.6 multimodal vision and PostgreSQL pgvector."
p_desc.font.name = FONT_BODY
p_desc.font.size = Pt(13)
p_desc.font.color.rgb = C_INK_SECONDARY
p_desc.space_before = Pt(8)

# 4 Flat Architectural Spec Columns (Airy, Non-Boxed Swiss Layout)
specs = [
    ("150 Files", "CONCURRENT BATCHING", "Client-side sliding window; 4 uploads, 2 parallel AI worker threads."),
    ("49 MiB", "MAX FILE LIMIT", "Direct-to-S3 streaming bypassing serverless memory limits."),
    ("< 200 ms", "SEMANTIC RETRIEVAL", "768-dim vector embeddings paired with an in-memory 500-LRU cache."),
    ("100% RLS", "DATABASE ISOLATION", "PostgreSQL Row-Level Security with transactional advisory locks.")
]

spec_y = Inches(4.15)
col_w = Inches(2.7)
col_gap = Inches(0.31)

for i, (metric, tag, desc) in enumerate(specs):
    sx = Inches(0.8 + i * (2.7 + 0.31))
    
    # Hairline above column
    draw_hairline(s1, sx, spec_y, col_w, C_ACCENT_TERRA if i == 0 else C_BORDER_FOCUS)

    tb = s1.shapes.add_textbox(sx, spec_y + Inches(0.15), col_w, Inches(1.5))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_m = tf.paragraphs[0]
    p_m.text = metric
    p_m.font.name = FONT_HEAD
    p_m.font.size = Pt(22)
    p_m.font.bold = True
    p_m.font.color.rgb = C_INK_HEADING

    p_t = tf.add_paragraph()
    p_t.text = tag
    p_t.font.name = FONT_HEAD
    p_t.font.size = Pt(9.5)
    p_t.font.bold = True
    p_t.font.color.rgb = C_ACCENT_TERRA if i == 0 else C_INK_MUTED
    p_t.space_before = Pt(2)

    p_d = tf.add_paragraph()
    p_d.text = desc
    p_d.font.name = FONT_BODY
    p_d.font.size = Pt(10)
    p_d.font.color.rgb = C_INK_SECONDARY
    p_d.space_before = Pt(4)

# Footer Strip
f_panel = draw_flat_card(s1, Inches(0.8), Inches(6.0), Inches(11.733), Inches(0.72), C_BG_WHITE, C_BORDER_LIGHT)
tb_f = s1.shapes.add_textbox(Inches(1.05), Inches(6.18), Inches(11.2), Inches(0.4))
tf_f = tb_f.text_frame
p_f = tf_f.paragraphs[0]
p_f.text = "Lead Architect: Computer Science Capstone Team   |   Evaluation Track: Academic Project & Hackathon 2026   |   Demo: http://localhost:3000"
p_f.font.name = FONT_BODY
p_f.font.size = Pt(10)
p_f.font.color.rgb = C_INK_SECONDARY

add_notes(s1, """Good morning respected evaluator and hackathon judges. Today I am presenting FileMind — an autonomous, high-throughput PDF vault and multimodal knowledge retrieval engine.

Static PDF archives represent an impenetrable operational bottleneck in corporate and academic domains. FileMind re-engineers this experience from the ground up: combining sliding-window bulk ingestion for 150 documents, direct Google Gemini 3.6 multimodal analysis, and PostgreSQL vector embeddings.

Our system enforces enterprise standards: atomic PostgreSQL advisory locks for quota integrity, strict Row-Level Security, and sub-200ms semantic search.""")

# =============================================================================
# SLIDE 2: THE PROBLEM (Editorial Asymmetric Layout)
# =============================================================================
s2 = prs.slides.add_slide(blank)
set_canvas(s2)
add_editorial_header(s2, "01", "Context & Problem Discovery", "The Crisis of Unstructured Document Management", "Standard file systems treat PDFs as opaque binary blobs, creating severe knowledge fragmentation.")

# Left 40% Column: Data Silo Callout
draw_flat_card(s2, Inches(0.8), Inches(2.1), Inches(4.4), Inches(4.8), C_BG_WHITE, C_BORDER_LIGHT)
tb_s2_l = s2.shapes.add_textbox(Inches(1.15), Inches(2.4), Inches(3.7), Inches(4.2))
tf_s2_l = tb_s2_l.text_frame
tf_s2_l.word_wrap = True
tf_s2_l.margin_left = tf_s2_l.margin_top = tf_s2_l.margin_right = tf_s2_l.margin_bottom = 0

p_s2_tag = tf_s2_l.paragraphs[0]
p_s2_tag.text = "THE ENTERPRISE DATA SILO"
p_s2_tag.font.name = FONT_HEAD
p_s2_tag.font.size = Pt(9.5)
p_s2_tag.font.bold = True
p_s2_tag.font.color.rgb = C_ACCENT_TERRA

p_s2_80 = tf_s2_l.add_paragraph()
p_s2_80.text = "80%"
p_s2_80.font.name = FONT_HEAD
p_s2_80.font.size = Pt(64)
p_s2_80.font.bold = True
p_s2_80.font.color.rgb = C_INK_HEADING
p_s2_80.space_before = Pt(2)

p_s2_lead = tf_s2_l.add_paragraph()
p_s2_lead.text = "of institutional knowledge is trapped inside unstructured documents (IDC / Gartner)."
p_s2_lead.font.name = FONT_HEAD
p_s2_lead.font.size = Pt(13)
p_s2_lead.font.bold = True
p_s2_lead.font.color.rgb = C_ACCENT_TERRA
p_s2_lead.space_before = Pt(2)

p_s2_desc = tf_s2_l.add_paragraph()
p_s2_desc.text = "Knowledge workers lose 2.5 hours every day — nearly 20% of their work week — searching through disconnected folders just to locate contract clauses, invoice line items, and research tables."
p_s2_desc.font.name = FONT_BODY
p_s2_desc.font.size = Pt(11)
p_s2_desc.font.color.rgb = C_INK_SECONDARY
p_s2_desc.space_before = Pt(10)

# Right 60% Column: 3 Clean Horizontal Editorial Rows
rx = Inches(5.5)
rw = Inches(7.033)
problems = [
    ("01", "Opaque Binary Files & Keyword Blindness", "Operating systems index file titles only. Image PDFs, two-column papers, and scanned invoices remain completely invisible to traditional searches."),
    ("02", "Manual Skimming & Data Extraction Fatigue", "Locating specific facts (e.g. renewal dates, indemnity clauses, totals) forces manual file opening, repetitive skimming, and error-prone copy-pasting."),
    ("03", "Concurrency, Scale & Security Vulnerabilities", "Desktop OCR tools crash on batches exceeding 50 files. Consumer cloud drives lack multi-tenant Row-Level Security, risking cross-tenant data leakage.")
]

for i, (num, p_title, p_body) in enumerate(problems):
    ry = Inches(2.1 + i * 1.66)
    draw_flat_card(s2, rx, ry, rw, Inches(1.48), C_BG_WHITE, C_BORDER_LIGHT)
    
    # Left accent indicator
    ind = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, rx, ry, Inches(0.06), Inches(1.48))
    ind.fill.solid()
    ind.fill.fore_color.rgb = C_ACCENT_TERRA if i == 0 else C_BORDER_FOCUS
    ind.line.fill.background()

    tb = s2.shapes.add_textbox(rx + Inches(0.35), ry + Inches(0.2), rw - Inches(0.55), Inches(1.1))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_head = tf.paragraphs[0]
    r_n = p_head.add_run()
    r_n.text = f"{num}  •  "
    r_n.font.name = FONT_HEAD
    r_n.font.size = Pt(12)
    r_n.font.bold = True
    r_n.font.color.rgb = C_ACCENT_TERRA

    r_t = p_head.add_run()
    r_t.text = p_title
    r_t.font.name = FONT_HEAD
    r_t.font.size = Pt(13)
    r_t.font.bold = True
    r_t.font.color.rgb = C_INK_HEADING

    p_b = tf.add_paragraph()
    p_b.text = p_body
    p_b.font.name = FONT_BODY
    p_b.font.size = Pt(10.5)
    p_b.font.color.rgb = C_INK_SECONDARY
    p_b.space_before = Pt(4)

add_notes(s2, """To understand why FileMind is essential, look at how institutions manage documents today. Over 80% of institutional data is trapped in static, unstructured PDFs.

When professors, researchers, or legal analysts search their file system, they are limited to matching file names. If a PDF is an image scan, a two-column research paper, or a complex financial sheet, the operating system is completely blind.

Furthermore, existing desktop tools crash under heavy batches, and standard cloud folders lack granular row-level security. FileMind was engineered specifically to solve all three layers of this crisis.""")

# =============================================================================
# SLIDE 3: THE PARADIGM SHIFT (Comparative Split)
# =============================================================================
s3 = prs.slides.add_slide(blank)
set_canvas(s3)
add_editorial_header(s3, "02", "Solution Architecture", "The Paradigm Shift: From Passive Files to Active AI Vault", "How FileMind replaces fragile file trees with an autonomous, semantically searchable intelligence vault.")

c_w = Inches(5.65)
c_h = Inches(4.8)
c_y = Inches(2.1)

# Left: Traditional
draw_flat_card(s3, Inches(0.8), c_y, c_w, c_h, C_BG_WHITE, C_BORDER_LIGHT)
bar_l = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), c_y, c_w, Inches(0.06))
bar_l.fill.solid()
bar_l.fill.fore_color.rgb = C_ACCENT_RED
bar_l.line.fill.background()

tb_3l = s3.shapes.add_textbox(Inches(1.15), c_y + Inches(0.3), c_w - Inches(0.7), c_h - Inches(0.5))
tf_3l = tb_3l.text_frame
tf_3l.word_wrap = True
tf_3l.margin_left = tf_3l.margin_top = tf_3l.margin_right = tf_3l.margin_bottom = 0

p3_lt = tf_3l.paragraphs[0]
p3_lt.text = "TRADITIONAL PDF STORAGE"
p3_lt.font.name = FONT_HEAD
p3_lt.font.size = Pt(9.5)
p3_lt.font.bold = True
p3_lt.font.color.rgb = C_ACCENT_RED

p3_lh = tf_3l.add_paragraph()
p3_lh.text = "Passive, dumb folders with manual maintenance"
p3_lh.font.name = FONT_HEAD
p3_lh.font.size = Pt(15.5)
p3_lh.font.bold = True
p3_lh.font.color.rgb = C_INK_HEADING
p3_lh.space_before = Pt(3)

legacy_bullets = [
    ("Exact Filename Search", "Fails if you don't recall the exact file title (e.g. 'report_final_v2.pdf')."),
    ("Blind to Scanned Text", "Image-based PDFs and scanned invoices cannot be parsed or indexed."),
    ("Manual Fact Extraction", "Key numbers, renewal dates, and vendors must be typed out by hand."),
    ("Zero Tenant Isolation", "Shared network folders risk accidental data leakage without database RLS.")
]

for title, desc in legacy_bullets:
    p = tf_3l.add_paragraph()
    p.space_before = Pt(12)
    rx = p.add_run()
    rx.text = "✕  "
    rx.font.name = FONT_HEAD
    rx.font.size = Pt(11)
    rx.font.bold = True
    rx.font.color.rgb = C_ACCENT_RED

    rt = p.add_run()
    rt.text = f"{title}: "
    rt.font.name = FONT_HEAD
    rt.font.size = Pt(11)
    rt.font.bold = True
    rt.font.color.rgb = C_INK_HEADING

    rd = p.add_run()
    rd.text = desc
    rd.font.name = FONT_BODY
    rd.font.size = Pt(10)
    rd.font.color.rgb = C_INK_SECONDARY

# Right: FileMind
draw_flat_card(s3, Inches(6.85), c_y, c_w, c_h, C_BG_WHITE, C_BORDER_LIGHT)
bar_r = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), c_y, c_w, Inches(0.06))
bar_r.fill.solid()
bar_r.fill.fore_color.rgb = C_ACCENT_TERRA
bar_r.line.fill.background()

tb_3r = s3.shapes.add_textbox(Inches(7.2), c_y + Inches(0.3), c_w - Inches(0.7), c_h - Inches(0.5))
tf_3r = tb_3r.text_frame
tf_3r.word_wrap = True
tf_3r.margin_left = tf_3r.margin_top = tf_3r.margin_right = tf_3r.margin_bottom = 0

p3_rt = tf_3r.paragraphs[0]
p3_rt.text = "THE FILEMIND INTELLIGENCE VAULT"
p3_rt.font.name = FONT_HEAD
p3_rt.font.size = Pt(9.5)
p3_rt.font.bold = True
p3_rt.font.color.rgb = C_ACCENT_TERRA

p3_rh = tf_3r.add_paragraph()
p3_rh.text = "Autonomous multimodal indexing & instant semantic answers"
p3_rh.font.name = FONT_HEAD
p3_rh.font.size = Pt(15.5)
p3_rh.font.bold = True
p3_rh.font.color.rgb = C_INK_HEADING
p3_rh.space_before = Pt(3)

filemind_bullets = [
    ("Semantic Concept Search", "Search by concept (e.g. 'server billing terms') without matching exact words."),
    ("Native Multimodal Vision", "Google Gemini 3.6 extracts category, semantic topic tags, and text from complex layouts."),
    ("Structured Schema Output", "Automatically outputs verified JSON metadata (invoice totals, contract parties, dates)."),
    ("Database-Level RLS Security", "PostgreSQL Row-Level Security and transactional advisory locks prevent tenant cross-bleed.")
]

for title, desc in filemind_bullets:
    p = tf_3r.add_paragraph()
    p.space_before = Pt(12)
    rc = p.add_run()
    rc.text = "✓  "
    rc.font.name = FONT_HEAD
    rc.font.size = Pt(11)
    rc.font.bold = True
    rc.font.color.rgb = C_ACCENT_EMER

    rt = p.add_run()
    rt.text = f"{title}: "
    rt.font.name = FONT_HEAD
    rt.font.size = Pt(11)
    rt.font.bold = True
    rt.font.color.rgb = C_INK_HEADING

    rd = p.add_run()
    rd.text = desc
    rd.font.name = FONT_BODY
    rd.font.size = Pt(10)
    rd.font.color.rgb = C_INK_SECONDARY

add_notes(s3, """This comparison highlights the fundamental architectural shift FileMind delivers.

Traditional file systems treat documents as passive storage bins. If you don't recall the exact filename, the file is virtually lost. Traditional OCR also chokes on multi-column academic layouts or scanned contracts.

With FileMind, the moment a PDF is uploaded, our pipeline transforms it into an active intelligence vault. Google Gemini 3.6 inspects the visual document natively, while our 768-dimensional embedding model indexes the text semantically. Users can ask natural questions and find answers in sub-200 milliseconds.""")

# =============================================================================
# SLIDE 4: CORE CAPABILITIES (2x2 Clean Swiss Grid)
# =============================================================================
s4 = prs.slides.add_slide(blank)
set_canvas(s4)
add_editorial_header(s4, "03", "System Capabilities", "Engineered for Scale, Security, and Sub-Second Retrieval", "Battle-tested architectural metrics verified in automated test suites and live deployments.")

g_w = Inches(5.65)
g_h = Inches(2.28)
xs = [Inches(0.8), Inches(6.85)]
ys = [Inches(2.1), Inches(4.6)]

caps = [
    ("150 Files", "BULK INGESTION ENGINE", "Sliding-Window Batch Concurrency",
     "Handles up to 150 PDFs per batch (up to 49 MiB each). Client-side sliding-window queue maintains 4 parallel upload streams and 2 parallel AI worker threads with per-file error isolation.", C_ACCENT_TERRA),
    ("Gemini 3.6", "MULTIMODAL INTELLIGENCE", "Structured Schema Extraction",
     "Multimodal ingestion classifies documents (Invoice, Contract, Research, Report), parses complex tables, generates semantic topic tags, and enforces prompt injection defense via strict schemas.", C_INK_HEADING),
    ("< 200 ms", "SEARCH ACCELERATION", "Hybrid Semantic Vector Engine",
     "Cosine similarity search over 768-dimensional document embeddings paired with an in-memory 500-capacity LRU cache. Normalizes queries and collapses duplicate in-flight requests.", C_ACCENT_EMER),
    ("100% RLS", "ENTERPRISE SECURITY", "Multi-Tenant Lease Isolation",
     "PostgreSQL Row-Level Security prevents tenant data cross-bleed. Distributed queue utilizes FOR UPDATE SKIP LOCKED and cryptographic UUID fencing tokens to eliminate double-locking.", C_ACCENT_OCHRE)
]

for i, (stat, tag, cap_title, cap_desc, accent_color) in enumerate(caps):
    gx = xs[i % 2]
    gy = ys[i // 2]
    draw_flat_card(s4, gx, gy, g_w, g_h, C_BG_WHITE, C_BORDER_LIGHT)
    
    # Left accent indicator
    ind = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, gx, gy, Inches(0.06), g_h)
    ind.fill.solid()
    ind.fill.fore_color.rgb = accent_color
    ind.line.fill.background()

    tb = s4.shapes.add_textbox(gx + Inches(0.35), gy + Inches(0.2), g_w - Inches(0.55), g_h - Inches(0.35))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_top = tf.paragraphs[0]
    r_stat = p_top.add_run()
    r_stat.text = f"{stat}  "
    r_stat.font.name = FONT_HEAD
    r_stat.font.size = Pt(20)
    r_stat.font.bold = True
    r_stat.font.color.rgb = accent_color

    r_tag = p_top.add_run()
    r_tag.text = f"•  {tag}"
    r_tag.font.name = FONT_HEAD
    r_tag.font.size = Pt(9.5)
    r_tag.font.bold = True
    r_tag.font.color.rgb = C_INK_MUTED

    p_ct = tf.add_paragraph()
    p_ct.text = cap_title
    p_ct.font.name = FONT_HEAD
    p_ct.font.size = Pt(13)
    p_ct.font.bold = True
    p_ct.font.color.rgb = C_INK_HEADING
    p_ct.space_before = Pt(3)

    p_cd = tf.add_paragraph()
    p_cd.text = cap_desc
    p_cd.font.name = FONT_BODY
    p_cd.font.size = Pt(10.5)
    p_cd.font.color.rgb = C_INK_SECONDARY
    p_cd.space_before = Pt(4)

add_notes(s4, """These four numbers define the production engineering standards of FileMind.

First, 150 files: users can drop up to 150 PDFs simultaneously without crashing the browser or exhausting serverless functions. Our sliding-window batch upload manager maintains at most 4 active uploads and 2 parallel AI worker threads.

Second, Gemini 3.6: we ingest full PDFs into Google's Multimodal Files API to extract structured JSON metadata, including document category, topic tags, and key entities.

Third, sub-200ms semantic search: our 768-dimensional vector engine is paired with an in-memory 500-entry LRU cache to eliminate cache stampedes and return instant answers.

Fourth, 100% RLS: data isolation is enforced at the database level with PostgreSQL Row-Level Security and transactional advisory locks.""")

# =============================================================================
# SLIDE 5: INGESTION PIPELINE (Proportioned Rail + SLA Footer)
# =============================================================================
s5 = prs.slides.add_slide(blank)
set_canvas(s5)
add_editorial_header(s5, "04", "Execution Pipeline", "Deterministic 5-Stage Ingestion & Processing Lifecycle", "The exact end-to-end journey from client drag-and-drop to vector retrieval.")

# Background connecting rail
rail = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.28), Inches(11.733), Inches(0.03))
rail.fill.solid()
rail.fill.fore_color.rgb = C_BORDER_FOCUS
rail.line.fill.background()

col_w = Inches(2.18)
col_h = Inches(3.35)  # Perfectly proportioned
col_gap = Inches(0.2)

stages_v3 = [
    ("01", "INGEST", "Client Batch Upload",
     "Mechanism:\nBrowser validates 49 MiB limit & %PDF magic bytes.\n\nExecution:\nSliding-window queue streams files directly to Supabase S3.\n\nError Policy:\nPer-file retry; failure does not block batch.", C_ACCENT_TERRA),
    ("02", "VERIFY", "Atomic Quota Check",
     "Mechanism:\nStored procedure executes pg_advisory_xact_lock(user_id).\n\nExecution:\nValidates S3 object, checks 2 GB limit & 250 docs/hr quota.\n\nError Policy:\nAtomic transaction rollback on quota breach.", C_INK_HEADING),
    ("03", "LOCK", "Queue Lease Claim",
     "Mechanism:\nBackground worker claims pending job.\n\nExecution:\nRuns FOR UPDATE SKIP LOCKED & generates UUID fencing token.\n\nError Policy:\nEliminates double-locking & auto-recovers stale jobs.", C_ACCENT_OCHRE),
    ("04", "UNDERSTAND", "Multimodal Extraction",
     "Mechanism:\nStreams PDF to Gemini Files API.\n\nExecution:\nModel cascade (3.6-flash -> 3.8-flash -> preview) parses tags & entities.\n\nError Policy:\nBounded exponential backoff for 503/429 spikes.", C_ACCENT_TERRA),
    ("05", "INDEX", "Vector Index Commit",
     "Mechanism:\nWorker commits metadata & 768d embeddings.\n\nExecution:\nStores vectors in pgvector, marks 'ready', clears LRU cache.\n\nError Policy:\nFencing token validated before commit.", C_ACCENT_EMER)
]

for i, (num, tag, stage_title, stage_desc, step_color) in enumerate(stages_v3):
    cx = Inches(0.8 + i * (2.18 + 0.2))
    
    # Step Number Pill on Rail
    pill = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx + Inches(0.4), Inches(2.1), Inches(1.38), Inches(0.38))
    pill.fill.solid()
    pill.fill.fore_color.rgb = C_BG_WHITE
    pill.line.color.rgb = step_color
    pill.line.width = Pt(1.5)

    tb_p = s5.shapes.add_textbox(cx + Inches(0.4), Inches(2.12), Inches(1.38), Inches(0.34))
    tf_p = tb_p.text_frame
    tf_p.word_wrap = True
    tf_p.margin_left = tf_p.margin_top = tf_p.margin_right = tf_p.margin_bottom = 0
    p_pill = tf_p.paragraphs[0]
    p_pill.text = f"{num} · {tag}"
    p_pill.alignment = PP_ALIGN.CENTER
    p_pill.font.name = FONT_HEAD
    p_pill.font.size = Pt(9.5)
    p_pill.font.bold = True
    p_pill.font.color.rgb = step_color

    # Content Card
    draw_flat_card(s5, cx, Inches(2.65), col_w, col_h, C_BG_WHITE, C_BORDER_LIGHT)
    tb_c = s5.shapes.add_textbox(cx + Inches(0.18), Inches(2.78), col_w - Inches(0.36), col_h - Inches(0.2))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0

    p_st = tf_c.paragraphs[0]
    p_st.text = stage_title
    p_st.font.name = FONT_HEAD
    p_st.font.size = Pt(12)
    p_st.font.bold = True
    p_st.font.color.rgb = C_INK_HEADING

    paragraphs = stage_desc.split("\n\n")
    for para in paragraphs:
        p_p = tf_c.add_paragraph()
        p_p.space_before = Pt(5)
        lines = para.split(":\n")
        if len(lines) == 2:
            r_l = p_p.add_run()
            r_l.text = f"{lines[0]}: "
            r_l.font.name = FONT_HEAD
            r_l.font.size = Pt(8.5)
            r_l.font.bold = True
            r_l.font.color.rgb = step_color
            
            r_v = p_p.add_run()
            r_v.text = lines[1]
            r_v.font.name = FONT_BODY
            r_v.font.size = Pt(8.5)
            r_v.font.color.rgb = C_INK_SECONDARY
        else:
            r_v = p_p.add_run()
            r_v.text = para
            r_v.font.name = FONT_BODY
            r_v.font.size = Pt(8.5)
            r_v.font.color.rgb = C_INK_SECONDARY

# Bottom Ingestion SLA Ribbon
sla_panel = draw_flat_card(s5, Inches(0.8), Inches(6.25), Inches(11.733), Inches(0.65), C_BG_WHITE, C_BORDER_LIGHT)
tb_sla = s5.shapes.add_textbox(Inches(1.05), Inches(6.38), Inches(11.2), Inches(0.4))
tf_sla = tb_sla.text_frame
p_sla = tf_sla.paragraphs[0]
p_sla.text = "Pipeline SLA: < 4.5s per 10-page document  |  Concurrency Gate: Max 4 uploads / 2 AI workers  |  Integrity Guarantee: Atomic rollback on failure"
p_sla.font.name = FONT_BODY
p_sla.font.size = Pt(10)
p_sla.font.color.rgb = C_INK_SECONDARY

add_notes(s5, """Here is the deterministic execution pipeline powering FileMind.

Stage 1 is Ingest: the client validates magic bytes and streams files directly to private S3 storage with presigned URLs.

Stage 2 is Verify: our database procedure executes pg_advisory_xact_lock to verify storage existence and enforce the user's 2 GB quota atomically.

Stage 3 is Lock: distributed workers claim jobs with FOR UPDATE SKIP LOCKED and a cryptographic UUID fencing token to eliminate race conditions.

Stage 4 is Understand: the PDF is passed to Google Gemini 3.6 Flash. If transient 503 errors occur, our cascade backs off and falls back seamlessly.

Stage 5 is Index: results are validated against the fencing lease, 768-dimensional embeddings are generated and stored in pgvector, and the document is ready for instant retrieval.""")

# =============================================================================
# SLIDE 6: REAL APPLICATION INTERFACE (Perfect Aspect Ratio & Separation)
# =============================================================================
s6 = prs.slides.add_slide(blank)
set_canvas(s6)
add_editorial_header(s6, "05", "Product Interface", "Production Application Interface & Workspace Experience", "Modern, pixel-perfect dark-mode web application built with Next.js 16 and Tailwind CSS.")

sc_w = Inches(5.65)
sc_h = Inches(4.85)
sc_y = Inches(2.05)

# Left: Dashboard
draw_flat_card(s6, Inches(0.8), sc_y, sc_w, sc_h, C_BG_WHITE, C_BORDER_LIGHT)
bar_l = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), sc_y, sc_w, Inches(0.34))
bar_l.fill.solid()
bar_l.fill.fore_color.rgb = C_BG_PANEL
bar_l.line.fill.background()

tb_b1 = s6.shapes.add_textbox(Inches(1.0), sc_y + Inches(0.06), sc_w - Inches(0.4), Inches(0.22))
tf_b1 = tb_b1.text_frame
p_b1 = tf_b1.paragraphs[0]
p_b1.text = "● ● ●   https://filemind.vault/dashboard"
p_b1.font.name = FONT_MONO
p_b1.font.size = Pt(9)
p_b1.font.color.rgb = C_INK_SECONDARY

# Scaled Screenshot 1 (2880x1800 aspect ratio = 1.6)
# width = 5.25 inches -> height = 3.28 inches
img1_path = os.path.abspath("presentation_assets/01_dashboard.png")
if os.path.exists(img1_path):
    s6.shapes.add_picture(img1_path, Inches(1.0), sc_y + Inches(0.42), width=Inches(5.25))

# Hairline Divider between image and caption
draw_hairline(s6, Inches(1.0), sc_y + Inches(3.8), Inches(5.25), C_BORDER_LIGHT)

# Caption 1 (Cleanly placed in bottom dedicated zone)
tb_cap1 = s6.shapes.add_textbox(Inches(1.0), sc_y + Inches(3.9), Inches(5.25), Inches(0.8))
tf_cap1 = tb_cap1.text_frame
tf_cap1.word_wrap = True
tf_cap1.margin_left = tf_cap1.margin_top = tf_cap1.margin_right = tf_cap1.margin_bottom = 0
p_c1 = tf_cap1.paragraphs[0]
r_c1_t = p_c1.add_run()
r_c1_t.text = "Dashboard & Ingestion Zone: "
r_c1_t.font.name = FONT_HEAD
r_c1_t.font.size = Pt(10)
r_c1_t.font.bold = True
r_c1_t.font.color.rgb = C_ACCENT_TERRA

r_c1_d = p_c1.add_run()
r_c1_d.text = "Displays live storage quota telemetry (8.1 MB used of 2 GB), 150-file bulk drag-and-drop dropzone with 49 MiB per-file validation, and real-time processing status."
r_c1_d.font.name = FONT_BODY
r_c1_d.font.size = Pt(9)
r_c1_d.font.color.rgb = C_INK_SECONDARY

# Right: Documents Vault
draw_flat_card(s6, Inches(6.85), sc_y, sc_w, sc_h, C_BG_WHITE, C_BORDER_LIGHT)
bar_r = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), sc_y, sc_w, Inches(0.34))
bar_r.fill.solid()
bar_r.fill.fore_color.rgb = C_BG_PANEL
bar_r.line.fill.background()

tb_b2 = s6.shapes.add_textbox(Inches(7.05), sc_y + Inches(0.06), sc_w - Inches(0.4), Inches(0.22))
tf_b2 = tb_b2.text_frame
p_b2 = tf_b2.paragraphs[0]
p_b2.text = "● ● ●   https://filemind.vault/documents"
p_b2.font.name = FONT_MONO
p_b2.font.size = Pt(9)
p_b2.font.color.rgb = C_INK_SECONDARY

img2_path = os.path.abspath("presentation_assets/03_documents_vault.png")
if os.path.exists(img2_path):
    s6.shapes.add_picture(img2_path, Inches(7.05), sc_y + Inches(0.42), width=Inches(5.25))

# Hairline Divider between image and caption
draw_hairline(s6, Inches(7.05), sc_y + Inches(3.8), Inches(5.25), C_BORDER_LIGHT)

# Caption 2
tb_cap2 = s6.shapes.add_textbox(Inches(7.05), sc_y + Inches(3.9), Inches(5.25), Inches(0.8))
tf_cap2 = tb_cap2.text_frame
tf_cap2.word_wrap = True
tf_cap2.margin_left = tf_cap2.margin_top = tf_cap2.margin_right = tf_cap2.margin_bottom = 0
p_c2 = tf_cap2.paragraphs[0]
r_c2_t = p_c2.add_run()
r_c2_t.text = "Documents Vault & Semantic Explorer: "
r_c2_t.font.name = FONT_HEAD
r_c2_t.font.size = Pt(10)
r_c2_t.font.bold = True
r_c2_t.font.color.rgb = C_ACCENT_TERRA

r_c2_d = p_c2.add_run()
r_c2_d.text = "Filterable document repository showing Gemini-extracted categories (Financial Report, Contract, Research), topic tags, and verified file statuses."
r_c2_d.font.name = FONT_BODY
r_c2_d.font.size = Pt(9)
r_c2_d.font.color.rgb = C_INK_SECONDARY

add_notes(s6, """These screenshots show the actual, running FileMind interface captured directly from our production deployment.

On the left is our Dashboard. It presents a clean, responsive workspace displaying real-time quota metrics — here showing 8.1 MB of our 2 GB quota utilized — alongside our drag-and-drop batch ingestion area.

On the right is the Document Vault. As you can see, documents are not simply listed by file name. Google Gemini has categorized them into Financial Reports, Contracts, and Research Papers, and assigned semantic tags like #Finance, #Q3, and #Attention. Users can filter by status and launch the embedded viewer directly.""")

# =============================================================================
# SLIDE 7: VERIFIED TECH STACK (3-Column Foundation)
# =============================================================================
s7 = prs.slides.add_slide(blank)
set_canvas(s7)
add_editorial_header(s7, "06", "Technology Stack", "Modern, Type-Safe, Production Engineering Stack", "Engineered with production-grade frameworks ensuring performance, security, and developer ergonomics.")

col7_w = Inches(3.68)
col7_h = Inches(4.8)
col7_y = Inches(2.1)

stacks_v3 = [
    ("FRONTEND & CLIENT RUNTIME", C_ACCENT_TERRA, [
        ("Next.js 16.3 (App Router)", "Turbopack bundler for sub-second hot reloading, React Server Components, and Next.js 16 after() background execution."),
        ("React 19.2", "Concurrent rendering architecture supporting streaming transitions and optimistic UI updates."),
        ("Tailwind CSS v4", "High-contrast utility styles compiled ahead-of-time with zero heavy JavaScript CSS runtime overhead."),
        ("PDF.js & Lucide React", "Lossless client-side PDF document rendering paired with accessible, clean icon semantics.")
    ]),
    ("DATA PLANE & SECURITY PERIMETER", C_INK_HEADING, [
        ("Supabase PostgreSQL 15+", "Database Row-Level Security (RLS) guaranteeing strict multi-tenant vault isolation and data protection."),
        ("PL/pgSQL Atomic RPCs", "Stored procedures: create_document_with_quota, claim_next_pending_document, and finalize_document_processing."),
        ("PostgreSQL Advisory Locks", "Transactional locking via pg_advisory_xact_lock preventing concurrent quota circumvention."),
        ("Supabase S3 Private Storage", "Private document bucket with authenticated presigned download URLs expiring in 120-300 seconds.")
    ]),
    ("AI COGNITION & RETRIEVAL ENGINE", C_ACCENT_EMER, [
        ("Google Gemini 3.6 Flash API", "Direct PDF ingestion via Multimodal Files API with structured JSON schema output and prompt injection defense."),
        ("3-Tier Fallback Cascade", "Resilient fallbacks: gemini-3.6-flash -> gemini-3.8-flash -> preview with jittered backoff against 503 spikes."),
        ("Vector Embeddings (768-dim)", "Hybrid semantic search utilizing pgvector cosine similarity for high-recall question answering."),
        ("In-Memory 500 LRU Cache", "Normalizes user queries and collapses duplicate in-flight requests to eliminate cache stampedes.")
    ])
]

for i, (title, accent_color, items) in enumerate(stacks_v3):
    cx = Inches(0.8 + i * (3.68 + 0.35))
    draw_flat_card(s7, cx, col7_y, col7_w, col7_h, C_BG_WHITE, C_BORDER_LIGHT)
    
    # Top accent bar
    tbar = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, col7_y, col7_w, Inches(0.06))
    tbar.fill.solid()
    tbar.fill.fore_color.rgb = accent_color
    tbar.line.fill.background()

    tb = s7.shapes.add_textbox(cx + Inches(0.25), col7_y + Inches(0.25), col7_w - Inches(0.5), col7_h - Inches(0.35))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEAD
    p_t.font.size = Pt(10.5)
    p_t.font.bold = True
    p_t.font.color.rgb = accent_color

    for tech_name, tech_desc in items:
        p_item = tf.add_paragraph()
        p_item.space_before = Pt(9)
        
        r_name = p_item.add_run()
        r_name.text = f"• {tech_name}\n"
        r_name.font.name = FONT_HEAD
        r_name.font.size = Pt(10.5)
        r_name.font.bold = True
        r_name.font.color.rgb = C_INK_HEADING

        r_desc = p_item.add_run()
        r_desc.text = tech_desc
        r_desc.font.name = FONT_BODY
        r_desc.font.size = Pt(9)
        r_desc.font.color.rgb = C_INK_SECONDARY

add_notes(s7, """Our technology stack was chosen strictly for performance, type safety, and multi-tenant security.

On the frontend, we run Next.js 16.3 with React 19.2 and Tailwind CSS v4. Next.js 16's after() function allows us to trigger asynchronous background processing without delaying client HTTP responses.

On the backend, Supabase PostgreSQL acts as our single source of truth. We enforce Row-Level Security on every table. Storage quotas and queue claiming are executed inside PL/pgSQL stored procedures using transactional advisory locks to eliminate race conditions.

For AI, we use Google Gemini 3.6 Flash. Unlike legacy OCR pipelines, Gemini parses visual layouts, tables, and images directly. We pair this with 768-dimensional pgvector embeddings and an in-memory 500-capacity LRU query cache.""")

# =============================================================================
# SLIDE 8: SYSTEM ARCHITECTURE (Connected Flow Schematic)
# =============================================================================
s8 = prs.slides.add_slide(blank)
set_canvas(s8)
add_editorial_header(s8, "07", "System Architecture", "Decoupled Four-Tier Enterprise Architecture", "Clear separation of concerns across presentation, serverless routing, database security, and AI intelligence.")

tier_w = Inches(11.733)
tier_h = Inches(0.86)
tier_gap = Inches(0.38)
tier_y_base = Inches(2.1)

tiers_v3 = [
    ("CLIENT PRESENTATION LAYER", C_ACCENT_TERRA,
     "Browser App Router UI (Dashboard, Documents Vault, PDF.js Viewer, Semantic Search Explorer)\nClient-Side Sliding-Window Batch Queue Manager (Max 4 concurrent uploads, independent progress & retry).",
     "↓ HTTPS Streaming Uploads with %PDF Magic Byte Validation"),
    ("APPLICATION GATEWAY & SERVERLESS ROUTING", C_INK_HEADING,
     "Next.js 16 Server Actions & Edge API Routes (/api/documents, /api/search, /api/cron/process-queue)\nExecution Budgets with Next.js 16 after() & Supabase Auth JWT Session Gateways.",
     "↓ Transactional Stored Procedure Calls & PostgreSQL Row-Level Security"),
    ("DATABASE & SECURE STORAGE TIER", C_ACCENT_EMER,
     "Supabase PostgreSQL with Row-Level Security (RLS) preventing tenant cross-bleed\nAtomic PL/pgSQL RPCs with Transactional Advisory Locks  •  Private S3 Storage Bucket 'documents' with expiring URLs.",
     "↓ Distributed Queue Claiming via FOR UPDATE SKIP LOCKED & UUID Fencing Tokens"),
    ("AI INTELLIGENCE & ACCELERATION ENGINE", C_ACCENT_OCHRE,
     "Google Gemini Multimodal Files API (Structured JSON Extraction, Category & Key-Value Metadata)\nVector Embeddings paired with in-memory 500-LRU Cache & Lossless pdf-lib Stream Optimizer.",
     None)
]

for i, (tier_title, accent_color, tier_desc, connector_label) in enumerate(tiers_v3):
    ty = Inches(2.1 + i * (0.86 + 0.38))
    draw_flat_card(s8, Inches(0.8), ty, tier_w, tier_h, C_BG_WHITE, C_BORDER_LIGHT)
    
    # Left ribbon
    ribbon = s8.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), ty, Inches(0.08), tier_h)
    ribbon.fill.solid()
    ribbon.fill.fore_color.rgb = accent_color
    ribbon.line.fill.background()

    tb = s8.shapes.add_textbox(Inches(1.15), ty + Inches(0.1), tier_w - Inches(0.5), tier_h - Inches(0.2))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    p_t.text = tier_title
    p_t.font.name = FONT_HEAD
    p_t.font.size = Pt(10.5)
    p_t.font.bold = True
    p_t.font.color.rgb = accent_color

    p_d = tf.add_paragraph()
    p_d.text = tier_desc
    p_d.font.name = FONT_BODY
    p_d.font.size = Pt(9.5)
    p_d.font.color.rgb = C_INK_SECONDARY
    p_d.space_before = Pt(2)

    # Connector line & label between tiers
    if connector_label:
        tb_conn = s8.shapes.add_textbox(Inches(1.5), ty + Inches(0.88), tier_w - Inches(1.5), Inches(0.32))
        tf_conn = tb_conn.text_frame
        tf_conn.margin_left = tf_conn.margin_top = tf_conn.margin_right = tf_conn.margin_bottom = 0
        p_c = tf_conn.paragraphs[0]
        p_c.text = connector_label
        p_c.font.name = FONT_HEAD
        p_c.font.size = Pt(8.5)
        p_c.font.bold = True
        p_c.font.color.rgb = C_INK_MUTED

add_notes(s8, """This diagram illustrates FileMind's four-tier decoupled architecture.

At the top, the Client Presentation Layer manages the interactive UI and our sliding-window upload manager. It controls concurrency directly in the browser, preventing server overload.

Second, the Application Gateway handles routing and authentication via Supabase Auth JWT tokens. Using Next.js 16's after() API, long-running AI jobs continue processing even after HTTP responses are closed.

Third, the Database & Storage Tier provides our security perimeter. Row-Level Security prevents users from reading or mutating other tenants' records. Storage verification and quota checks run inside atomic database transactions.

Finally, the AI Intelligence Tier handles Gemini multimodal analysis and vector embedding generation, supported by an in-memory LRU cache to eliminate redundant compute.""")

# =============================================================================
# SLIDE 9: FEATURE MATRIX (Tight Table + Key Takeaway Strip)
# =============================================================================
s9 = prs.slides.add_slide(blank)
set_canvas(s9)
add_editorial_header(s9, "08", "Competitive Analysis", "Architectural Capability & Feature Matrix", "Direct technical comparison against local operating system storage and generic cloud drives.")

tbl_shape = s9.shapes.add_table(6, 4, Inches(0.8), Inches(2.1), Inches(11.733), Inches(4.0))
tbl = tbl_shape.table

tbl.columns[0].width = Inches(2.8)
tbl.columns[1].width = Inches(2.7)
tbl.columns[2].width = Inches(2.7)
tbl.columns[3].width = Inches(3.533)

headers = ["Core Capability", "Local OS Folders", "Generic Cloud Drive", "FileMind AI Vault"]
for col_idx, h_text in enumerate(headers):
    cell = tbl.cell(0, col_idx)
    cell.fill.solid()
    cell.fill.fore_color.rgb = C_BG_PANEL if col_idx < 3 else C_BG_WARM_TINT
    tf = cell.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = h_text
    p.font.name = FONT_HEAD
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_TERRA if col_idx == 3 else C_INK_HEADING

matrix_rows = [
    ("Search Methodology", "Exact filename match only", "Keyword match on text PDFs", "Semantic Vector Retrieval (768-dim embeddings)"),
    ("Multimodal Understanding", "None (Manual reading)", "Basic text OCR only", "Structured JSON Schema (Category, Tags, Key-Values)"),
    ("Scanned & Image PDFs", "Opaque & Inaccessible", "Garbled multi-column text", "100% Understood via Multimodal Vision AI"),
    ("Bulk Batch Processing", "OS File Copy (No validation)", "Slow sequential sync", "150-File Sliding Window (4x concurrent streams)"),
    ("Security & Tenant Isolation", "Local user OS permissions", "Coarse folder sharing links", "Database Row-Level Security (RLS) & Fencing Leases")
]

for row_idx, r_data in enumerate(matrix_rows, start=1):
    for col_idx, val in enumerate(r_data):
        cell = tbl.cell(row_idx, col_idx)
        cell.fill.solid()
        if col_idx == 3:
            cell.fill.fore_color.rgb = C_BG_WARM_TINT
        else:
            cell.fill.fore_color.rgb = C_BG_WHITE if row_idx % 2 == 1 else C_BG_PANEL
        
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = val
        p.font.name = FONT_BODY
        p.font.size = Pt(9.5)
        if col_idx == 3:
            p.font.bold = True
            p.font.color.rgb = C_ACCENT_TERRA
        else:
            p.font.color.rgb = C_INK_SECONDARY

# Bottom Verdict Strip
v_panel = draw_flat_card(s9, Inches(0.8), Inches(6.25), Inches(11.733), Inches(0.65), C_BG_WHITE, C_BORDER_LIGHT)
tb_v = s9.shapes.add_textbox(Inches(1.05), Inches(6.38), Inches(11.2), Inches(0.4))
tf_v = tb_v.text_frame
p_v = tf_v.paragraphs[0]
p_v.text = "Key Verdict: FileMind completely eliminates the tradeoff between file scale (150 files) and deep multimodal intelligence while guaranteeing 100% database isolation."
p_v.font.name = FONT_BODY
p_v.font.size = Pt(10)
p_v.font.color.rgb = C_INK_SECONDARY

add_notes(s9, """This matrix demonstrates why FileMind represents a distinct technological upgrade over traditional solutions.

Local folders and generic cloud drives rely on filename matches or crude OCR that fails completely on multi-column papers and scanned invoices. FileMind understands documents natively via Google Gemini's multimodal vision and indexes their semantic meaning into 768-dimensional vector space.

From a systems engineering standpoint, FileMind introduces client-side sliding-window concurrency handling 150 files, atomic database quotas, and strict multi-tenant Row-Level Security. It bridges the gap between raw file storage and production document intelligence.""")

# =============================================================================
# SLIDE 10: ENGINEERING RIGOR (2x2 Grid with Exact Codebase Proof)
# =============================================================================
s10 = prs.slides.add_slide(blank)
set_canvas(s10)
add_editorial_header(s10, "09", "Engineering Rigor", "Technical Engineering Hurdles & Verified Solutions", "Real software engineering obstacles encountered during development and the verified solutions implemented.")

c10_w = Inches(5.65)
c10_h = Inches(2.28)
xs = [Inches(0.8), Inches(6.85)]
ys = [Inches(2.1), Inches(4.6)]

challenges_v3 = [
    ("1. Gemini 503 Spikes & Model Fallback Cascade",
     "Failure Mode:\nDuring peak traffic, Google's standard Gemini tier returns 503 UNAVAILABLE, causing queue processing failures and stranded jobs.\n\nVerified Solution:\nEngineered an intelligent 3-tier cascade: gemini-3.6-flash -> gemini-3.8-flash -> gemini-3-flash-preview with jittered exponential backoff.\n\nCodebase Verification:\nlib/ai/processor.ts with bounded retry thresholds and safe error redaction.", C_ACCENT_TERRA),
    ("2. Serverless Execution Budgets on 150-File Batches",
     "Failure Mode:\nProcessing 150 PDFs inside a standard Next.js 60-second serverless execution budget leads to function timeout kills.\n\nVerified Solution:\nImplemented client sliding-window batching (max 4 uploads, max 2 AI workers), Next.js after() execution, and a pg_cron background consumer.\n\nCodebase Verification:\nlib/upload/batch-upload-manager.ts & app/api/cron/process-queue/route.ts.", C_INK_HEADING),
    ("3. Concurrency Race Conditions & Deadlocks",
     "Failure Mode:\nSimultaneous file confirmations cause duplicate rows and quota circumvention under concurrent uploads.\n\nVerified Solution:\nAdded transactional PostgreSQL advisory locks pg_advisory_xact_lock(user_id) and atomic SKIP LOCKED queue claiming with UUID fencing leases.\n\nCodebase Verification:\ncreate_document_with_quota & claim_next_pending_document RPCs.", C_ACCENT_EMER),
    ("4. Safe PDF Optimization Without Corruption",
     "Failure Mode:\nCompressing digitally signed or encrypted PDFs invalidates cryptographic signatures and renders files unreadable.\n\nVerified Solution:\nConservative pre-checks detect /ByteRange signatures and /Encrypt dictionaries, safely skipping them while optimizing standard structural streams.\n\nCodebase Verification:\nlib/pdf/optimizer.ts (validated with zero corruption across signed sample PDFs).", C_ACCENT_OCHRE)
]

for i, (title, content, accent_color) in enumerate(challenges_v3):
    gx = xs[i % 2]
    gy = ys[i // 2]
    draw_flat_card(s10, gx, gy, c10_w, c10_h, C_BG_WHITE, C_BORDER_LIGHT)
    
    # Left accent line
    ind = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, gx, gy, Inches(0.06), c10_h)
    ind.fill.solid()
    ind.fill.fore_color.rgb = accent_color
    ind.line.fill.background()

    tb = s10.shapes.add_textbox(gx + Inches(0.35), gy + Inches(0.15), c10_w - Inches(0.55), c10_h - Inches(0.25))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEAD
    p_t.font.size = Pt(11)
    p_t.font.bold = True
    p_t.font.color.rgb = C_INK_HEADING

    sections = content.split("\n\n")
    for sec in sections:
        p_s = tf.add_paragraph()
        p_s.space_before = Pt(3)
        parts = sec.split(":\n")
        if len(parts) == 2:
            r_l = p_s.add_run()
            r_l.text = f"{parts[0]}: "
            r_l.font.name = FONT_HEAD
            r_l.font.size = Pt(9)
            r_l.font.bold = True
            if "Failure" in parts[0]:
                r_l.font.color.rgb = C_ACCENT_RED
            elif "Verification" in parts[0]:
                r_l.font.color.rgb = C_INK_MUTED
            else:
                r_l.font.color.rgb = accent_color
            
            r_v = p_s.add_run()
            r_v.text = parts[1]
            r_v.font.name = FONT_BODY
            r_v.font.size = Pt(8.5)
            r_v.font.color.rgb = C_INK_SECONDARY
        else:
            r_v = p_s.add_run()
            r_v.text = sec
            r_v.font.name = FONT_BODY
            r_v.font.size = Pt(8.5)
            r_v.font.color.rgb = C_INK_SECONDARY

add_notes(s10, """This slide demonstrates the engineering rigor behind FileMind. We solved four real-world engineering hurdles.

First, model resilience: Gemini's public API occasionally spikes with 503 errors during high traffic. We engineered a 3-tier fallback cascade that shifts from Gemini 3.6 to 3.8 to flash-preview with exponential backoff.

Second, serverless timeouts: processing 150 documents synchronously would easily exceed Next.js's 60-second limit. We split processing into a client sliding-window queue combined with Next.js after() background execution.

Third, concurrency race conditions: when 4 uploads finish simultaneously, users could exceed their 2 GB quota. We implemented transactional PostgreSQL advisory locks to serialize confirmations atomically.

Fourth, PDF optimization: aggressive compression can corrupt signed or encrypted PDFs. Our pipeline detects ByteRange signatures and Encrypt dictionaries to safely skip them.""")

# =============================================================================
# SLIDE 11: FUTURE ROADMAP (Detailed Strategic Advancements)
# =============================================================================
s11 = prs.slides.add_slide(blank)
set_canvas(s11)
add_editorial_header(s11, "10", "Strategic Vision", "Future Engineering Roadmap & Planned Advancements", "Architectural roadmap designed to expand FileMind into an enterprise-ready knowledge platform.")

rm_w = Inches(11.733)
rm_h = Inches(1.02)
rm_y_base = Inches(2.1)

phases_v3 = [
    ("PHASE 02 · NEAR-TERM (Q3 2026)", C_ACCENT_TERRA, "Cross-Document Synthesis & Multi-PDF Comparative Q&A",
     "Query across the entire document vault simultaneously (e.g. 'Compare revenue growth and profit margins across all Q1, Q2, and Q3 financial reports').\nKey Deliverables: Cross-encoder re-ranking, multi-document synthesis prompt, aggregate token budget optimizer."),
    ("PHASE 03 · MEDIUM-TERM (Q4 2026)", C_INK_HEADING, "Visual Citations & Bounding-Box Viewer Integration",
     "Direct canvas integration highlighting the exact sentence and bounding-box rectangle on the original PDF page for every generated answer.\nKey Deliverables: PDF.js annotation layer, Gemini bounding-box normalization, verifiable source citations."),
    ("PHASE 04 · LONG-TERM (2027)", C_ACCENT_EMER, "Local & Air-Gapped LLM Execution via Ollama / vLLM",
     "Support for completely offline inference using Ollama and vLLM for highly sensitive legal, defense, or HIPAA-regulated medical environments.\nKey Deliverables: Local GGUF embedding model, zero external API traffic mode, local vector search."),
    ("PHASE 05 · ENTERPRISE (2027+)", C_ACCENT_OCHRE, "Collaborative Team Workspaces, Granular RBAC & Audit Logs",
     "Multi-user workspaces with role-based access control (Admin, Contributor, Read-Only Reviewer) and cryptographic audit logs.\nKey Deliverables: Organization tenancy, cryptographic activity audit logs, fine-grained folder permissions.")
]

for i, (phase_tag, accent_color, phase_title, phase_desc) in enumerate(phases_v3):
    py = Inches(2.1 + i * (1.02 + 0.22))
    draw_flat_card(s11, Inches(0.8), py, rm_w, rm_h, C_BG_WHITE, C_BORDER_LIGHT)
    
    # Left accent ribbon
    ribbon = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), py, Inches(0.08), rm_h)
    ribbon.fill.solid()
    ribbon.fill.fore_color.rgb = accent_color
    ribbon.line.fill.background()

    tb = s11.shapes.add_textbox(Inches(1.15), py + Inches(0.12), rm_w - Inches(0.5), rm_h - Inches(0.24))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    r_tag = p_t.add_run()
    r_tag.text = f"{phase_tag}  •  "
    r_tag.font.name = FONT_HEAD
    r_tag.font.size = Pt(9.5)
    r_tag.font.bold = True
    r_tag.font.color.rgb = accent_color

    r_tit = p_t.add_run()
    r_tit.text = phase_title
    r_tit.font.name = FONT_HEAD
    r_tit.font.size = Pt(11)
    r_tit.font.bold = True
    r_tit.font.color.rgb = C_INK_HEADING

    p_d = tf.add_paragraph()
    p_d.text = phase_desc
    p_d.font.name = FONT_BODY
    p_d.font.size = Pt(9)
    p_d.font.color.rgb = C_INK_SECONDARY
    p_d.space_before = Pt(2)

add_notes(s11, """Looking forward, we have established a clear 4-phase architectural roadmap.

In Phase 2, we will enable multi-document synthesis, allowing users to query across their entire library to compare reports and identify trends.

In Phase 3, we will add visual bounding-box citations directly on our PDF.js canvas, highlighting the exact sentence where an answer originated.

In Phase 4, we plan to integrate local inference with Ollama and vLLM, making FileMind completely air-gapped for defense and healthcare compliance.

Finally, in Phase 5, we will add multi-tenant team workspaces with role-based access control and cryptographic audit logging.""")

# =============================================================================
# SLIDE 12: CONCLUSION & DEMO (Balanced Dual Panel)
# =============================================================================
s12 = prs.slides.add_slide(blank)
set_canvas(s12)
add_editorial_header(s12, "11", "Conclusion & Evaluation", "FileMind: The Autonomous Document Intelligence Vault", "Summary of academic and technical achievements, and protocol for hands-on evaluation.")

c12_w = Inches(5.65)
c12_h = Inches(4.8)
c12_y = Inches(2.1)

# Left: Takeaways
draw_flat_card(s12, Inches(0.8), c12_y, c12_w, c12_h, C_BG_WHITE, C_BORDER_LIGHT)
bar_l12 = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), c12_y, c12_w, Inches(0.06))
bar_l12.fill.solid()
bar_l12.fill.fore_color.rgb = C_ACCENT_TERRA
bar_l12.line.fill.background()

tb_12l = s12.shapes.add_textbox(Inches(1.15), c12_y + Inches(0.25), c12_w - Inches(0.7), c12_h - Inches(0.45))
tf_12l = tb_12l.text_frame
tf_12l.word_wrap = True
tf_12l.margin_left = tf_12l.margin_top = tf_12l.margin_right = tf_12l.margin_bottom = 0

p12_lt = tf_12l.paragraphs[0]
p12_lt.text = "KEY PROJECT TAKEAWAYS"
p12_lt.font.name = FONT_HEAD
p12_lt.font.size = Pt(9.5)
p12_lt.font.bold = True
p12_lt.font.color.rgb = C_ACCENT_TERRA

p12_lh = tf_12l.add_paragraph()
p12_lh.text = "Academic & Technical Achievements"
p12_lh.font.name = FONT_HEAD
p12_lh.font.size = Pt(15.5)
p12_lh.font.bold = True
p12_lh.font.color.rgb = C_INK_HEADING
p12_lh.space_before = Pt(3)

takeaways_v3 = [
    ("Problem Solved", "Replaces passive, unsearchable folders with an active AI-powered document intelligence vault."),
    ("Production Quality", "Built with Next.js 16, Supabase PostgreSQL, and Google Gemini with verified automated test suites."),
    ("Resilient Concurrency", "Tested with 150-file bulk batches, automated recovery, and transactional advisory locks."),
    ("High Privacy & Security", "Database-enforced Row-Level Security ensuring strict per-user vault isolation.")
]

for title, desc in takeaways_v3:
    p = tf_12l.add_paragraph()
    p.space_before = Pt(9)
    rc = p.add_run()
    rc.text = "✓  "
    rc.font.name = FONT_HEAD
    rc.font.size = Pt(11)
    rc.font.bold = True
    rc.font.color.rgb = C_ACCENT_EMER

    rt = p.add_run()
    rt.text = f"{title}: "
    rt.font.name = FONT_HEAD
    rt.font.size = Pt(10.5)
    rt.font.bold = True
    rt.font.color.rgb = C_INK_HEADING

    rd = p.add_run()
    rd.text = desc
    rd.font.name = FONT_BODY
    rd.font.size = Pt(9.5)
    rd.font.color.rgb = C_INK_SECONDARY

# Bottom Invariant Badge on Left Card
p_inv = tf_12l.add_paragraph()
p_inv.space_before = Pt(18)
r_inv_lbl = p_inv.add_run()
r_inv_lbl.text = "Production Invariants Verified:\n"
r_inv_lbl.font.name = FONT_HEAD
r_inv_lbl.font.size = Pt(9.5)
r_inv_lbl.font.bold = True
r_inv_lbl.font.color.rgb = C_ACCENT_TERRA

r_inv_val = p_inv.add_run()
r_inv_val.text = "• 100% PostgreSQL Row-Level Security Enforced\n• 49 MiB Direct Storage Ingestion & %PDF Magic Byte Validation\n• 150-File Sliding Window Batch Queue with UUID Fencing Tokens\n• 768-dim Vector Embeddings with 500-LRU Query Cache"
r_inv_val.font.name = FONT_BODY
r_inv_val.font.size = Pt(9)
r_inv_val.font.color.rgb = C_INK_SECONDARY

# Right: Demo Protocol
draw_flat_card(s12, Inches(6.85), c12_y, c12_w, c12_h, C_BG_WHITE, C_BORDER_LIGHT)
bar_r12 = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), c12_y, c12_w, Inches(0.06))
bar_r12.fill.solid()
bar_r12.fill.fore_color.rgb = C_ACCENT_EMER
bar_r12.line.fill.background()

tb_12r = s12.shapes.add_textbox(Inches(7.2), c12_y + Inches(0.25), c12_w - Inches(0.7), c12_h - Inches(0.45))
tf_12r = tb_12r.text_frame
tf_12r.word_wrap = True
tf_12r.margin_left = tf_12r.margin_top = tf_12r.margin_right = tf_12r.margin_bottom = 0

p12_rt = tf_12r.paragraphs[0]
p12_rt.text = "LIVE EVALUATION & DEMONSTRATION"
p12_rt.font.name = FONT_HEAD
p12_rt.font.size = Pt(9.5)
p12_rt.font.bold = True
p12_rt.font.color.rgb = C_ACCENT_EMER

p12_rh = tf_12r.add_paragraph()
p12_rh.text = "Ready for Hands-On Evaluation"
p12_rh.font.name = FONT_HEAD
p12_rh.font.size = Pt(15.5)
p12_rh.font.bold = True
p12_rh.font.color.rgb = C_INK_HEADING
p12_rh.space_before = Pt(3)

demo_v3 = [
    ("1. Live Ingestion Walkthrough", "Drag-and-drop a sample batch of test invoices, papers, and agreements into the active web interface."),
    ("2. Real-Time Multimodal Extraction", "Observe Gemini classifying categories, extracting structured key-values, and indexing pages on-the-fly."),
    ("3. Semantic Search & Snippet Matching", "Search by concept in natural language and observe sub-200ms vector retrieval with snippet highlights.")
]

for title, desc in demo_v3:
    p = tf_12r.add_paragraph()
    p.space_before = Pt(8)
    rt = p.add_run()
    rt.text = f"{title}\n"
    rt.font.name = FONT_HEAD
    rt.font.size = Pt(10.5)
    rt.font.bold = True
    rt.font.color.rgb = C_INK_HEADING

    rd = p.add_run()
    rd.text = desc
    rd.font.name = FONT_BODY
    rd.font.size = Pt(9.5)
    rd.font.color.rgb = C_INK_SECONDARY

p_contact = tf_12r.add_paragraph()
p_contact.space_before = Pt(11)
r_c_lbl = p_contact.add_run()
r_c_lbl.text = "Resources & Repository:\n"
r_c_lbl.font.name = FONT_HEAD
r_c_lbl.font.size = Pt(9.5)
r_c_lbl.font.bold = True
r_c_lbl.font.color.rgb = C_ACCENT_TERRA

r_c_val = p_contact.add_run()
r_c_val.text = "GitHub: [github.com/your-username/filemind]   |   Demo URL: [http://localhost:3000]\nThank you! We welcome questions from our teacher and hackathon judges."
r_c_val.font.name = FONT_BODY
r_c_val.font.size = Pt(9)
r_c_val.font.color.rgb = C_INK_SECONDARY

add_notes(s12, """To conclude our presentation: FileMind takes the friction out of document management. By bridging the gap between secure cloud storage and state-of-the-art multimodal AI, we transform dead PDF archives into dynamic knowledge bases.

We have verified our implementation through automated test suites covering bulk upload concurrency, model fallbacks, and database security invariants.

At this point, we would love to invite you to our live demonstration where we will drop a sample batch of documents and demonstrate real-time extraction and semantic search.

Thank you for your time and guidance. We are ready for your questions!""")

# -----------------------------------------------------------------------------
# SAVE PRESENTATION
# -----------------------------------------------------------------------------
out_pptx = os.path.join(os.getcwd(), "FileMind_Project_Presentation.pptx")
prs.save(out_pptx)
print(f"Masterpiece presentation saved to: {out_pptx}")
