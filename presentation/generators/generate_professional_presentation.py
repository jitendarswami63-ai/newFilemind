"""
generate_professional_presentation.py
Senior Designer Edition for FileMind — AI-Powered PDF Vault.

Design System:
- Palette: Deep Obsidian (#090D16), Card Surface (#111726), Hairline Border (#1E293B, 0.75pt)
- Primary Accent: Electric Cyan (#00D2FF)
- Secondary Accent: Neon Pink (#FF2D95)
- Success / Status: Emerald Green (#10B981)
- Subtle Accents: Slate 400 (#94A3B8), Slate 600 (#475569)
- Layouts: Asymmetric editorial compositions, metric hero anchors, browser mockups,
  timeline progressions, and bespoke comparison matrix. Zero generic box-soup.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

# Senior Design System Colors
C_BG = RGBColor(9, 13, 22)             # #090D16 (Deep Obsidian)
C_SURFACE = RGBColor(17, 23, 38)        # #111726 (Card Surface)
C_SURFACE_LIGHT = RGBColor(22, 31, 51)  # #161F33 (Slightly elevated surface)
C_BORDER = RGBColor(30, 41, 59)         # #1E293B (Hairline border)
C_BORDER_CYAN = RGBColor(0, 160, 200)   # Highlight border
C_CYAN = RGBColor(0, 210, 255)          # #00D2FF (Primary Electric Cyan)
C_PINK = RGBColor(255, 45, 149)         # #FF2D95 (Secondary Neon Pink)
C_GREEN = RGBColor(16, 185, 129)        # #10B981 (Status / Verified)
C_AMBER = RGBColor(245, 158, 11)        # #F59E0B (Notice)
C_PURPLE = RGBColor(168, 85, 247)       # #A855F7
C_WHITE = RGBColor(255, 255, 255)
C_SLATE_300 = RGBColor(203, 213, 225)   # #CBD5E1 (Body text)
C_SLATE_400 = RGBColor(148, 163, 184)   # #94A3B8 (Secondary text)
C_SLATE_500 = RGBColor(100, 116, 139)   # #64748B (Muted labels)

FONT_HEAD = "Segoe UI"
FONT_BODY = "Segoe UI"

def set_slide_bg(slide):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = C_BG
    bg.line.fill.background()
    return bg

def add_header(slide, tracker_num, tracker_title, main_title, subtitle=""):
    """Editorial header with section tracker breadcrumb."""
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(11.733), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    
    # Breadcrumb Tracker
    p_track = tf.paragraphs[0]
    r_num = p_track.add_run()
    r_num.text = f"// {tracker_num:02d} · "
    r_num.font.name = FONT_HEAD
    r_num.font.size = Pt(9.5)
    r_num.font.bold = True
    r_num.font.color.rgb = C_CYAN
    
    r_title = p_track.add_run()
    r_title.text = tracker_title.upper()
    r_title.font.name = FONT_HEAD
    r_title.font.size = Pt(9.5)
    r_title.font.bold = True
    r_title.font.color.rgb = C_SLATE_400
    
    # Main Headline
    p_main = tf.add_paragraph()
    p_main.space_before = Pt(3)
    r_main = p_main.add_run()
    r_main.text = main_title
    r_main.font.name = FONT_HEAD
    r_main.font.size = Pt(24)
    r_main.font.bold = True
    r_main.font.color.rgb = C_WHITE
    
    # Subtitle
    if subtitle:
        p_sub = tf.add_paragraph()
        p_sub.space_before = Pt(2)
        r_sub = p_sub.add_run()
        r_sub.text = subtitle
        r_sub.font.name = FONT_BODY
        r_sub.font.size = Pt(11.5)
        r_sub.font.color.rgb = C_SLATE_400

def create_card(slide, left, top, width, height, bg=C_SURFACE, border=C_BORDER, border_width=Pt(0.75)):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg
    card.line.color.rgb = border
    card.line.width = border_width
    return card

def add_speaker_note(slide, note_text):
    notes_slide = slide.notes_slide
    tf = notes_slide.notes_text_frame
    tf.text = note_text

# ==============================================================================
# SLIDE 1: EDITORIAL TITLE SLIDE
# ==============================================================================
s1 = prs.slides.add_slide(blank_layout)
set_slide_bg(s1)

# Left Column (Hero Content, 60% Width)
tb_hero = s1.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(6.8), Inches(3.6))
tf_h = tb_hero.text_frame
tf_h.word_wrap = True
tf_h.margin_left = tf_h.margin_right = tf_h.margin_top = tf_h.margin_bottom = 0

# Tagline pill
p_pill = tf_h.paragraphs[0]
r_pill = p_pill.add_run()
r_pill.text = "ACADEMIC CAPSTONE & HACKATHON 2026 · AI INTELLIGENCE VAULT"
r_pill.font.name = FONT_HEAD
r_pill.font.size = Pt(9.5)
r_pill.font.bold = True
r_pill.font.color.rgb = C_CYAN

# Main Title
p_t1 = tf_h.add_paragraph()
p_t1.space_before = Pt(12)
r_t1 = p_t1.add_run()
r_t1.text = "FileMind"
r_t1.font.name = FONT_HEAD
r_t1.font.size = Pt(56)
r_t1.font.bold = True
r_t1.font.color.rgb = C_WHITE

p_t2 = tf_h.add_paragraph()
p_t2.space_before = Pt(2)
r_t2 = p_t2.add_run()
r_t2.text = "AI-Powered PDF Vault & Retrieval Engine"
r_t2.font.name = FONT_HEAD
r_t2.font.size = Pt(20)
r_t2.font.bold = True
r_t2.font.color.rgb = C_CYAN

p_desc = tf_h.add_paragraph()
p_desc.space_before = Pt(14)
r_desc = p_desc.add_run()
r_desc.text = "A modern enterprise-grade document intelligence system that transforms static, fragmented PDF archives into an active, securely isolated, and semantically searchable knowledge vault."
r_desc.font.name = FONT_BODY
r_desc.font.size = Pt(12)
r_desc.font.color.rgb = C_SLATE_300

# Metric Anchor Chips below hero
chip_w = Inches(1.8)
chip_h = Inches(0.9)
chips_data = [
    ("150 Files", "Batch Capacity", C_CYAN),
    ("49 MiB", "Max File Size", C_PINK),
    ("< 200 ms", "Vector Retrieval", C_GREEN),
]
for i, (val, lbl, col) in enumerate(chips_data):
    cx = Inches(0.8) + i * (chip_w + Inches(0.2))
    cc = create_card(s1, cx, Inches(4.3), chip_w, chip_h, bg=C_SURFACE_LIGHT)
    tf_c = cc.text_frame
    tf_c.margin_left = tf_c.margin_right = tf_c.margin_top = Inches(0.12)
    p_v = tf_c.paragraphs[0]
    r_v = p_v.add_run()
    r_v.text = val
    r_v.font.name = FONT_HEAD
    r_v.font.size = Pt(16)
    r_v.font.bold = True
    r_v.font.color.rgb = col
    
    p_l = tf_c.add_paragraph()
    r_l = p_l.add_run()
    r_l.text = lbl
    r_l.font.name = FONT_BODY
    r_l.font.size = Pt(9)
    r_l.font.color.rgb = C_SLATE_400

# Right Column: "Live Vault Status" Mockup Card (40% Width)
rc = create_card(s1, Inches(7.9), Inches(1.2), Inches(4.6), Inches(4.0), bg=C_SURFACE, border=C_BORDER_CYAN, border_width=Pt(1.2))
tf_rc = rc.text_frame
tf_rc.margin_left = tf_rc.margin_right = Inches(0.35)
tf_rc.margin_top = Inches(0.3)

p_rh = tf_rc.paragraphs[0]
r_rh = p_rh.add_run()
r_rh.text = "SYSTEM ARCHITECTURE STATUS"
r_rh.font.name = FONT_HEAD
r_rh.font.size = Pt(10)
r_rh.font.bold = True
r_rh.font.color.rgb = C_CYAN

p_rsub = tf_rc.add_paragraph()
r_rsub = p_rsub.add_run()
r_rsub.text = "Production-Verified Invariants"
r_rsub.font.name = FONT_HEAD
r_rsub.font.size = Pt(14)
r_rsub.font.bold = True
r_rsub.font.color.rgb = C_WHITE

invariants = [
    ("Database Security", "PostgreSQL Row-Level Security (RLS) Active", C_GREEN),
    ("AI Processing", "Google Gemini 3.6 Multimodal Cascade Ready", C_CYAN),
    ("Storage Enclosure", "User-Isolated Private Bucket (49MB / 2GB Quota)", C_WHITE),
    ("Queue Engine", "Atomic SKIP LOCKED Leases with Fencing Tokens", C_AMBER),
    ("Search Acceleration", "500-Capacity LRU Query Embedding Cache", C_PINK),
]

for inv_title, inv_desc, dot_color in invariants:
    p_inv = tf_rc.add_paragraph()
    p_inv.space_before = Pt(8)
    r_dot = p_inv.add_run()
    r_dot.text = "● "
    r_dot.font.size = Pt(8)
    r_dot.font.color.rgb = dot_color
    
    r_it = p_inv.add_run()
    r_it.text = f"{inv_title}: "
    r_it.font.name = FONT_HEAD
    r_it.font.size = Pt(9.5)
    r_it.font.bold = True
    r_it.font.color.rgb = C_WHITE
    
    r_id = p_inv.add_run()
    r_id.text = inv_desc
    r_id.font.name = FONT_BODY
    r_id.font.size = Pt(9)
    r_id.font.color.rgb = C_SLATE_400

# Bottom Meta Strip (Presenter, Team, Department)
strip = create_card(s1, Inches(0.8), Inches(5.6), Inches(11.733), Inches(1.25), bg=C_SURFACE)
tf_s = strip.text_frame
tf_s.margin_left = Inches(0.4)
tf_s.margin_top = Inches(0.18)
tf_s.margin_right = Inches(0.4)

p_s1 = tf_s.paragraphs[0]
r_s1 = p_s1.add_run()
r_s1.text = "PRESENTATION & EVALUATION DETAILS"
r_s1.font.name = FONT_HEAD
r_s1.font.size = Pt(9)
r_s1.font.bold = True
r_s1.font.color.rgb = C_SLATE_500

p_s2 = tf_s.add_paragraph()
p_s2.space_before = Pt(4)
r_s2 = p_s2.add_run()
r_s2.text = "Lead Presenter: [Presenter Name]   |   Team: [Team Member 2, Team Member 3]   |   Department: [Computer Science & Engineering]\n"
r_s2.text += "Evaluation Track: [College Major Project Evaluation 2026] & [Annual College Hackathon 2026]   |   Host: [Institution / University Name]"
r_s2.font.name = FONT_BODY
r_s2.font.size = Pt(10)
r_s2.font.color.rgb = C_SLATE_300

add_speaker_note(s1, """Good morning respected evaluator and hackathon judges. 
Today, we are excited to present FileMind — an AI-Powered PDF Vault and Knowledge Retrieval Engine.

Every student, researcher, and organization deals with dozens of PDF files every single week — syllabi, research papers, financial receipts, and legal forms. Yet, our file storage systems have remained virtually unchanged for twenty years: passive, unsearchable folders that force you to manually open and skim through hundreds of pages.

FileMind completely solves this by combining modern cloud storage security with Google Gemini Multimodal AI and hybrid semantic retrieval. It doesn't just store your documents; it understands them. Let us show you how.""")


# ==============================================================================
# SLIDE 2: THE PROBLEM (ASYMMETRICAL DRAMATIC CONTRAST)
# ==============================================================================
s2 = prs.slides.add_slide(blank_layout)
set_slide_bg(s2)
add_header(s2, 1, "Problem Discovery", "The Crisis of Unstructured PDF Management",
           "Standard file systems treat PDFs as opaque binary blobs, creating severe knowledge fragmentation.")

# Left Impact Panel (35% Width): The Shocking Metric & Bottleneck
left_panel = create_card(s2, Inches(0.8), Inches(1.9), Inches(4.2), Inches(5.0), bg=C_SURFACE)
tf_lp = left_panel.text_frame
tf_lp.margin_left = tf_lp.margin_right = Inches(0.35)
tf_lp.margin_top = Inches(0.35)

p_lh1 = tf_lp.paragraphs[0]
r_lh1 = p_lh1.add_run()
r_lh1.text = "THE CORE BOTTLENECK"
r_lh1.font.name = FONT_HEAD
r_lh1.font.size = Pt(9.5)
r_lh1.font.bold = True
r_lh1.font.color.rgb = C_PINK

p_stat = tf_lp.add_paragraph()
p_stat.space_before = Pt(8)
r_stat = p_stat.add_run()
r_stat.text = "80%"
r_stat.font.name = FONT_HEAD
r_stat.font.size = Pt(56)
r_stat.font.bold = True
r_stat.font.color.rgb = C_WHITE

p_stat_lbl = tf_lp.add_paragraph()
r_stat_lbl = p_stat_lbl.add_run()
r_stat_lbl.text = "of enterprise and academic knowledge is trapped in unstructured documents (IDC / Gartner)."
r_stat_lbl.font.name = FONT_BODY
r_stat_lbl.font.size = Pt(11)
r_stat_lbl.font.color.rgb = C_SLATE_300

p_pain_h = tf_lp.add_paragraph()
p_pain_h.space_before = Pt(18)
r_pain_h = p_pain_h.add_run()
r_pain_h.text = "Daily Productivity Drain:"
r_pain_h.font.name = FONT_HEAD
r_pain_h.font.size = Pt(11)
r_pain_h.font.bold = True
r_pain_h.font.color.rgb = C_WHITE

p_pain_b = tf_lp.add_paragraph()
p_pain_b.space_before = Pt(4)
r_pain_b = p_pain_b.add_run()
r_pain_b.text = "Knowledge workers spend 2.5 hours every day—nearly 20% of their work week—searching for buried information across disorganized folders and cloud drives."
r_pain_b.font.name = FONT_BODY
r_pain_b.font.size = Pt(10)
r_pain_b.font.color.rgb = C_SLATE_400

# Right 3 Horizontal Problem Cards (65% Width)
probs = [
    ("01", "Opaque & Keyword-Blind Storage", "Standard OS and cloud search only inspect file names. Image-based PDFs, multi-column research papers, and scanned invoices remain 100% invisible to search queries.", C_PINK),
    ("02", "Manual Reading & Fact-Extraction Fatigue", "Extracting simple structured facts (e.g. invoice total, renewal date, contract indemnification clause) requires manual file opening, repetitive skimming, and error-prone copy-pasting.", C_AMBER),
    ("03", "Concurrency, Scale & Security Failures", "Generic desktop OCR tools crash on batches of 50+ files. Consumer cloud drives lack multi-tenant row-level access control, exposing sensitive private files to accidental data leaks.", C_CYAN)
]

y_p = Inches(1.9)
card_h = Inches(1.53)
for num, title, desc, col in probs:
    c_prob = create_card(s2, Inches(5.3), y_p, Inches(7.233), card_h, bg=C_SURFACE)
    tf_pr = c_prob.text_frame
    tf_pr.margin_left = Inches(0.35)
    tf_pr.margin_top = Inches(0.2)
    tf_pr.margin_right = Inches(0.35)
    
    p_pr1 = tf_pr.paragraphs[0]
    r_num = p_pr1.add_run()
    r_num.text = f"{num} · "
    r_num.font.name = FONT_HEAD
    r_num.font.size = Pt(13)
    r_num.font.bold = True
    r_num.font.color.rgb = col
    
    r_pt = p_pr1.add_run()
    r_pt.text = title
    r_pt.font.name = FONT_HEAD
    r_pt.font.size = Pt(13)
    r_pt.font.bold = True
    r_pt.font.color.rgb = C_WHITE
    
    p_pd = tf_pr.add_paragraph()
    p_pd.space_before = Pt(4)
    r_pd = p_pd.add_run()
    r_pd.text = desc
    r_pd.font.name = FONT_BODY
    r_pd.font.size = Pt(10)
    r_pd.font.color.rgb = C_SLATE_300
    
    y_p += card_h + Inches(0.2)

add_speaker_note(s2, """Let's look at why managing PDFs is broken today. 
First, documents are scattered everywhere — Downloads, Google Drive, email attachments. Standard file search only matches the filename. If a document is named 'scan_001.pdf', it is completely invisible.

Second, extracting structured data like invoice amounts, contract renewal dates, or research conclusions requires manually opening each file and skimming dozens of pages. Studies show knowledge workers spend up to 20% of their week just searching for information.

Third, current DIY tools lack security and concurrency. Uploading 50 files simultaneously crashes existing desktop scripts or triggers rate limits. FileMind was designed specifically to eliminate these bottlenecks.""")


# ==============================================================================
# SLIDE 3: OUR SOLUTION (BEFORE VS AFTER SPLIT SCREEN)
# ==============================================================================
s3 = prs.slides.add_slide(blank_layout)
set_slide_bg(s3)
add_header(s3, 2, "Product Solution", "Our Solution: The FileMind AI Vault",
           "Transforming passive PDF storage into an active, intelligent, and secure retrieval ecosystem.")

w_split = Inches(5.7)
h_split = Inches(4.9)

# Left Split: The Broken Traditional Way
c_trad = create_card(s3, Inches(0.8), Inches(2.0), w_split, h_split, bg=C_SURFACE)
tf_tr = c_trad.text_frame
tf_tr.margin_left = tf_tr.margin_right = Inches(0.4)
tf_tr.margin_top = Inches(0.3)

p_th = tf_tr.paragraphs[0]
r_th = p_th.add_run()
r_th.text = "TRADITIONAL PDF STORAGE"
r_th.font.name = FONT_HEAD
r_th.font.size = Pt(11)
r_th.font.bold = True
r_th.font.color.rgb = C_PINK

p_ts = tf_tr.add_paragraph()
r_ts = p_ts.add_run()
r_ts.text = "Passive, dumb folders with manual maintenance"
r_ts.font.name = FONT_HEAD
r_ts.font.size = Pt(15)
r_ts.font.bold = True
r_ts.font.color.rgb = C_WHITE

trad_points = [
    ("Exact Filename Search", "Fails if you don't recall exact spelling (e.g. 'report_v2_final.pdf')."),
    ("Blind to Scanned Text", "Image PDFs and scanned invoices cannot be indexed or queried."),
    ("Manual Data Extraction", "Key numbers, vendors, and renewal dates must be typed by hand."),
    ("Zero Tenant Isolation", "Shared folders risk data leakage with no row-level database security.")
]

for title, desc in trad_points:
    p_pt = tf_tr.add_paragraph()
    p_pt.space_before = Pt(12)
    r_pt1 = p_pt.add_run()
    r_pt1.text = f"✕  {title}\n"
    r_pt1.font.name = FONT_HEAD
    r_pt1.font.size = Pt(11)
    r_pt1.font.bold = True
    r_pt1.font.color.rgb = C_PINK
    
    r_pt2 = p_pt.add_run()
    r_pt2.text = desc
    r_pt2.font.name = FONT_BODY
    r_pt2.font.size = Pt(10)
    r_pt2.font.color.rgb = C_SLATE_400

# Right Split: The FileMind AI Vault (Cyan Bordered Hero)
c_fm = create_card(s3, Inches(6.8), Inches(2.0), Inches(5.733), h_split, bg=C_SURFACE_LIGHT, border=C_BORDER_CYAN, border_width=Pt(1.2))
tf_fm = c_fm.text_frame
tf_fm.margin_left = tf_fm.margin_right = Inches(0.4)
tf_fm.margin_top = Inches(0.3)

p_fh = tf_fm.paragraphs[0]
r_fh = p_fh.add_run()
r_fh.text = "FILEMIND AI-POWERED VAULT"
r_fh.font.name = FONT_HEAD
r_fh.font.size = Pt(11)
r_fh.font.bold = True
r_fh.font.color.rgb = C_CYAN

p_fs = tf_fm.add_paragraph()
r_fs = p_fs.add_run()
r_fs.text = "Autonomous document understanding & instant retrieval"
r_fs.font.name = FONT_HEAD
r_fs.font.size = Pt(15)
r_fs.font.bold = True
r_fs.font.color.rgb = C_WHITE

fm_points = [
    ("Semantic Concept Search", "Search by concept (e.g. 'cloud server bill') without exact keyword match."),
    ("Multimodal Understanding", "Google Gemini extracts category, semantic tags, and page-by-page text."),
    ("Structured Schema Generation", "Automatically outputs clean JSON (invoice totals, dates, contract parties)."),
    ("Cryptographic Vault Security", "PostgreSQL Row-Level Security (RLS) & transactional advisory locks.")
]

for title, desc in fm_points:
    p_ft = tf_fm.add_paragraph()
    p_ft.space_before = Pt(12)
    r_ft1 = p_ft.add_run()
    r_ft1.text = f"✔  {title}\n"
    r_ft1.font.name = FONT_HEAD
    r_ft1.font.size = Pt(11)
    r_ft1.font.bold = True
    r_ft1.font.color.rgb = C_CYAN
    
    r_ft2 = p_ft.add_run()
    r_ft2.text = desc
    r_ft2.font.name = FONT_BODY
    r_ft2.font.size = Pt(10)
    r_ft2.font.color.rgb = C_SLATE_300

add_speaker_note(s3, """Here is the core thesis of FileMind. 
On the left, you see the traditional approach: dumb folders, manual renaming, and zero insight into document contents. If you need a contract renewal date, you have to read the contract.

On the right is FileMind. When you drop your PDFs into FileMind, an automated background pipeline processes them using Google Gemini multimodal AI. It classifies the file into categories like Invoice, Legal Contract, or Research Paper, pulls out key-value metadata, generates semantic tags, and indexes every single page into high-dimensional vector embeddings.

The user doesn't just store files — they gain an interactive knowledge vault.""")


# ==============================================================================
# SLIDE 4: KEY FEATURES (4-QUADRANT STATISTICAL ANCHORS)
# ==============================================================================
s4 = prs.slides.add_slide(blank_layout)
set_slide_bg(s4)
add_header(s4, 3, "Core Capabilities", "Production-Verified System Features",
           "Every capability shown is verified by automated test suites and operational in the codebase.")

feats_4q = [
    {
        "stat": "150 Files",
        "tag": "BULK INGESTION ENGINE",
        "title": "Sliding-Window Batch Concurrency",
        "desc": "Handles up to 150 PDFs per batch (up to 49 MiB per file). Employs client-side windowing with at most 4 active uploads and 2 background AI workers, featuring per-file error isolation.",
        "col": C_CYAN
    },
    {
        "stat": "Gemini 3.6",
        "tag": "MULTIMODAL INTELLIGENCE",
        "title": "Structured Schema Extraction",
        "desc": "Multimodal ingestion extracting document classification (Invoice, Contract, Report), semantic topic tags, and key-value properties. Enforces prompt injection defense via strict system instructions.",
        "col": C_PINK
    },
    {
        "stat": "< 200 ms",
        "tag": "SEARCH & RETRIEVAL",
        "title": "Hybrid Semantic Vector Engine",
        "desc": "Cosine similarity over 768-dimensional document embeddings paired with an in-memory 500-capacity LRU cache. Normalizes queries and collapses duplicate in-flight requests to eliminate cache stampedes.",
        "col": C_GREEN
    },
    {
        "stat": "100% RLS",
        "tag": "ENTERPRISE SECURITY",
        "title": "Multi-Tenant Lease Isolation",
        "desc": "Database-enforced Row-Level Security ensuring zero tenant data bleed. Distributed worker queue uses SKIP LOCKED claiming and UUID fencing tokens to eliminate double-locking and stale writes.",
        "col": C_PURPLE
    }
]

qw = Inches(5.7)
qh = Inches(2.35)
qx_coords = [Inches(0.8), Inches(6.833)]
qy_coords = [Inches(2.0), Inches(4.55)]

for idx, f in enumerate(feats_4q):
    x = qx_coords[idx % 2]
    y = qy_coords[idx // 2]
    card = create_card(s4, x, y, qw, qh, bg=C_SURFACE)
    tf = card.text_frame
    tf.margin_left = tf.margin_right = Inches(0.35)
    tf.margin_top = Inches(0.2)
    
    # Top Row: Tag + Big Stat
    p_top = tf.paragraphs[0]
    r_stat = p_top.add_run()
    r_stat.text = f"{f['stat']}   "
    r_stat.font.name = FONT_HEAD
    r_stat.font.size = Pt(20)
    r_stat.font.bold = True
    r_stat.font.color.rgb = f['col']
    
    r_tag = p_top.add_run()
    r_tag.text = f"// {f['tag']}"
    r_tag.font.name = FONT_HEAD
    r_tag.font.size = Pt(9.5)
    r_tag.font.bold = True
    r_tag.font.color.rgb = C_SLATE_500
    
    # Title
    p_t = tf.add_paragraph()
    p_t.space_before = Pt(3)
    r_t = p_t.add_run()
    r_t.text = f['title']
    r_t.font.name = FONT_HEAD
    r_t.font.size = Pt(13)
    r_t.font.bold = True
    r_t.font.color.rgb = C_WHITE
    
    # Description
    p_d = tf.add_paragraph()
    p_d.space_before = Pt(4)
    r_d = p_d.add_run()
    r_d.text = f['desc']
    r_d.font.name = FONT_BODY
    r_d.font.size = Pt(9.8)
    r_d.font.color.rgb = C_SLATE_300

add_speaker_note(s4, """To ensure credibility for both our academic evaluator and hackathon judges: every feature on this slide is verified and running in our repository. 

First, our bulk upload manager supports up to 150 files per batch with sliding-window concurrency. 
Second, we use Google Gemini with strict response schemas to parse documents securely.
Third, our search engine pairs pgvector embeddings with an in-memory 500-capacity LRU cache so identical queries return instantly.
Fourth, we have database-enforced multi-tenancy with PostgreSQL Row-Level Security.
Fifth, distributed worker leases prevent double-locking when multiple workers process the queue.
And sixth, we perform non-destructive PDF stream compression using pdf-lib while preserving digital signatures.""")


# ==============================================================================
# SLIDE 5: SYSTEM WORKFLOW PIPELINE (SLEEK HORIZONTAL CONNECTORS)
# ==============================================================================
s5 = prs.slides.add_slide(blank_layout)
set_slide_bg(s5)
add_header(s5, 4, "Execution Flow", "End-to-End Ingestion & Processing Pipeline",
           "Step-by-step lifecycle from client drag-and-drop to vector indexing and viewer retrieval.")

# Horizontal visual connector bar behind nodes
conn = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.2), Inches(10.9), Inches(0.04))
conn.fill.solid()
conn.fill.fore_color.rgb = C_BORDER_CYAN
conn.line.fill.background()

steps_flow = [
    ("01", "INGEST", "Client Batch Upload", "Browser validates 49 MiB limit. Sliding-window queue streams files directly to private storage bucket without server bottleneck.", C_CYAN),
    ("02", "VERIFY", "Atomic Quota Check", "PostgreSQL stored procedure checks storage object existence and executes pg_advisory_xact_lock to enforce user's 2 GB quota.", C_WHITE),
    ("03", "LOCK", "Queue Lease Claim", "Background worker claims pending job with FOR UPDATE SKIP LOCKED. Issues a cryptographic UUID fencing token to prevent duplicate work.", C_AMBER),
    ("04", "UNDERSTAND", "Multimodal Extraction", "Transfers PDF to Gemini Files API. Model cascade (3.6-flash -> 3.8-flash -> preview) parses category, tags, and pages with backoff.", C_PINK),
    ("05", "INDEX", "Vector Index Commit", "finalize_document_processing validates lease token, commits metadata atomically, and schedules 768-dim vector embeddings.", C_GREEN),
]

nw = Inches(2.18)
nh = Inches(4.3)
start_x = Inches(0.8)
gap = Inches(0.2)

for i, (num, tag, title, desc, col) in enumerate(steps_flow):
    x = start_x + i * (nw + gap)
    card = create_card(s5, x, Inches(2.45), nw, nh, bg=C_SURFACE)
    
    # Step indicator pill above card
    node_pill = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.15), Inches(1.95), Inches(1.88), Inches(0.5))
    node_pill.fill.solid()
    node_pill.fill.fore_color.rgb = C_SURFACE_LIGHT
    node_pill.line.color.rgb = col
    node_pill.line.width = Pt(1)
    
    tf_np = node_pill.text_frame
    tf_np.margin_left = tf_np.margin_right = tf_np.margin_top = tf_np.margin_bottom = 0
    p_np = tf_np.paragraphs[0]
    p_np.alignment = PP_ALIGN.CENTER
    r_np1 = p_np.add_run()
    r_np1.text = f"{num} · "
    r_np1.font.name = FONT_HEAD
    r_np1.font.size = Pt(11)
    r_np1.font.bold = True
    r_np1.font.color.rgb = col
    
    r_np2 = p_np.add_run()
    r_np2.text = tag
    r_np2.font.name = FONT_HEAD
    r_np2.font.size = Pt(10)
    r_np2.font.bold = True
    r_np2.font.color.rgb = C_WHITE

    # Inside Card Text
    tf_c = card.text_frame
    tf_c.margin_left = tf_c.margin_right = Inches(0.2)
    tf_c.margin_top = Inches(0.3)
    
    p_t = tf_c.paragraphs[0]
    r_t = p_t.add_run()
    r_t.text = title
    r_t.font.name = FONT_HEAD
    r_t.font.size = Pt(12)
    r_t.font.bold = True
    r_t.font.color.rgb = C_WHITE
    
    p_d = tf_c.add_paragraph()
    p_d.space_before = Pt(8)
    r_d = p_d.add_run()
    r_d.text = desc
    r_d.font.name = FONT_BODY
    r_d.font.size = Pt(9.5)
    r_d.font.color.rgb = C_SLATE_300

add_speaker_note(s5, """This workflow diagram illustrates how FileMind processes documents from end to end.
In Step 1, the user drops a batch of PDFs into the web interface. 
In Step 2, the client uploads directly to Supabase Storage, and our PostgreSQL stored procedure atomically enforces the user's 2-gigabyte quota.
In Step 3, our queue engine uses PostgreSQL 'SKIP LOCKED' to acquire a lease with a unique fencing token.
In Step 4, Google Gemini multimodal model reads the document and extracts structured JSON.
In Step 5, the results are atomically written to the database, ensuring zero race conditions.
And in Step 6, page embeddings are indexed for instant semantic retrieval in our dashboard search.""")


# ==============================================================================
# SLIDE 6: LIVE APPLICATION SCREENSHOTS (BROWSER MOCKUP FRAMES)
# ==============================================================================
s6 = prs.slides.add_slide(blank_layout)
set_slide_bg(s6)
add_header(s6, 5, "Product Interface", "Production Application Screenshots",
           "Pixel-perfect dark-mode interface built with Next.js 16, Tailwind CSS v4, and Lucide React.")

shot_dir = os.path.join(os.getcwd(), "presentation_assets")
dash_path = os.path.join(shot_dir, "01_dashboard.png")
vault_path = os.path.join(shot_dir, "03_documents_vault.png")

# Left Browser Frame: Dashboard Showcase
frame_w = Inches(5.7)
frame_h = Inches(4.9)

c_frame1 = create_card(s6, Inches(0.8), Inches(1.95), frame_w, frame_h, bg=C_SURFACE)
# Browser Header Bar
bar1 = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.95), frame_w, Inches(0.32))
bar1.fill.solid()
bar1.fill.fore_color.rgb = C_SURFACE_LIGHT
bar1.line.color.rgb = C_BORDER
bar1.line.width = Pt(0.75)
tf_b1 = bar1.text_frame
tf_b1.margin_left = Inches(0.2)
tf_b1.margin_top = Inches(0.04)
p_dots1 = tf_b1.paragraphs[0]
r_dots1 = p_dots1.add_run()
r_dots1.text = "● ● ●   https://filemind.vault/dashboard"
r_dots1.font.name = FONT_HEAD
r_dots1.font.size = Pt(8.5)
r_dots1.font.color.rgb = C_SLATE_500

if os.path.exists(dash_path):
    s6.shapes.add_picture(dash_path, Inches(0.95), Inches(2.35), width=Inches(5.4))

cap_box1 = s6.shapes.add_textbox(Inches(0.95), Inches(5.75), Inches(5.4), Inches(1.0))
tf_cb1 = cap_box1.text_frame
tf_cb1.word_wrap = True
tf_cb1.margin_left = tf_cb1.margin_right = tf_cb1.margin_top = tf_cb1.margin_bottom = 0
p_cb1 = tf_cb1.paragraphs[0]
r_cb1_h = p_cb1.add_run()
r_cb1_h.text = "Dashboard & Ingestion Zone: "
r_cb1_h.font.bold = True
r_cb1_h.font.size = Pt(10)
r_cb1_h.font.color.rgb = C_CYAN
r_cb1_d = p_cb1.add_run()
r_cb1_d.text = "Displays live storage quota metrics (8.1 MB used), 150-file bulk drag-and-drop dropzone, and authoritative processing progress."
r_cb1_d.font.size = Pt(9.5)
r_cb1_d.font.color.rgb = C_SLATE_300

# Right Browser Frame: Vault Showcase
c_frame2 = create_card(s6, Inches(6.8), Inches(1.95), Inches(5.733), frame_h, bg=C_SURFACE)
bar2 = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.8), Inches(1.95), Inches(5.733), Inches(0.32))
bar2.fill.solid()
bar2.fill.fore_color.rgb = C_SURFACE_LIGHT
bar2.line.color.rgb = C_BORDER
bar2.line.width = Pt(0.75)
tf_b2 = bar2.text_frame
tf_b2.margin_left = Inches(0.2)
tf_b2.margin_top = Inches(0.04)
p_dots2 = tf_b2.paragraphs[0]
r_dots2 = p_dots2.add_run()
r_dots2.text = "● ● ●   https://filemind.vault/documents"
r_dots2.font.name = FONT_HEAD
r_dots2.font.size = Pt(8.5)
r_dots2.font.color.rgb = C_SLATE_500

if os.path.exists(vault_path):
    s6.shapes.add_picture(vault_path, Inches(6.95), Inches(2.35), width=Inches(5.4))

cap_box2 = s6.shapes.add_textbox(Inches(6.95), Inches(5.75), Inches(5.4), Inches(1.0))
tf_cb2 = cap_box2.text_frame
tf_cb2.word_wrap = True
tf_cb2.margin_left = tf_cb2.margin_right = tf_cb2.margin_top = tf_cb2.margin_bottom = 0
p_cb2 = tf_cb2.paragraphs[0]
r_cb2_h = p_cb2.add_run()
r_cb2_h.text = "Documents Vault & Semantic Explorer: "
r_cb2_h.font.bold = True
r_cb2_h.font.size = Pt(10)
r_cb2_h.font.color.rgb = C_PINK
r_cb2_d = p_cb2.add_run()
r_cb2_d.text = "Filterable document repository showing Gemini-extracted categories (Financial Report, Contract, Research), topic tags, and verified file statuses."
r_cb2_d.font.size = Pt(9.5)
r_cb2_d.font.color.rgb = C_SLATE_300

add_speaker_note(s6, """Here are real screenshots captured directly from our running application on localhost:3000.
On the left, you see the FileMind Dashboard. Notice the welcome banner, the live statistics cards showing storage quota and processed document count, and the bulk upload zone.

On the right is our Documents Vault. Notice how each document is tagged automatically with category badges like 'Financial Report' or 'Contract'. Users can download the file, inspect page-by-page text, or trigger manual retries. The interface is completely responsive, styled in high-contrast near-black with electric cyan and neon pink accents.""")


# ==============================================================================
# SLIDE 7: TECHNOLOGY STACK (ARCHITECTURAL TIERS)
# ==============================================================================
s7 = prs.slides.add_slide(blank_layout)
set_slide_bg(s7)
add_header(s7, 6, "Engineering Stack", "Verified Technology Stack",
           "Engineered with modern, production-grade frameworks ensuring performance, security, and type safety.")

stack_tiers = [
    {
        "tier": "FRONTEND & APPLICATION LAYER",
        "tagline": "Server-rendered, streaming UI with zero runtime overhead",
        "color": C_CYAN,
        "tools": [
            ("Next.js 16.3 (App Router)", "Turbopack bundler for sub-second hot reloading, Server Components, and Next.js 16 after() background execution."),
            ("React 19.2", "Latest React architecture supporting streaming transitions and optimistic UI updates."),
            ("Tailwind CSS v4", "High-contrast dark-mode theme compiled directly without heavy JavaScript CSS runtimes.")
        ]
    },
    {
        "tier": "BACKEND, DATABASE & CLOUD SECURITY",
        "tagline": "Multi-tenant isolation and transactional advisory locking",
        "color": C_GREEN,
        "tools": [
            ("Supabase PostgreSQL 15+", "Database Row-Level Security (RLS) guaranteeing strict multi-tenant vault isolation."),
            ("PL/pgSQL Stored Procedures", "Atomic RPCs: create_document_with_quota, claim_next_pending_document, finalize_document_processing."),
            ("Supabase S3 Private Storage", "Private document bucket with authenticated presigned download URLs.")
        ]
    },
    {
        "tier": "MULTIMODAL AI & ACCELERATION",
        "tagline": "Direct vision document understanding and vector caching",
        "color": C_PURPLE,
        "tools": [
            ("Google Gemini API (@google/genai)", "Direct PDF ingestion via Files API with structured JSON schema output and prompt injection defense."),
            ("Vector Embeddings (768-dim)", "Hybrid semantic search paired with an in-memory 500-capacity LRU query embedding cache."),
            ("pdf-lib Engine", "Lossless structural stream compression safely skipping signed or encrypted documents.")
        ]
    }
]

cw_tier = Inches(3.7)
ch_tier = Inches(4.9)
x_coords_t = [Inches(0.8), Inches(4.8), Inches(8.8)]

for idx, t in enumerate(stack_tiers):
    x = x_coords_t[idx]
    card = create_card(s7, x, Inches(2.0), cw_tier, ch_tier, bg=C_SURFACE)
    
    # Top Accent bar
    top_bar = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(2.0), cw_tier, Inches(0.06))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = t["color"]
    top_bar.line.fill.background()
    
    tf = card.text_frame
    tf.margin_left = tf.margin_right = Inches(0.25)
    tf.margin_top = Inches(0.2)
    
    p_th = tf.paragraphs[0]
    r_th = p_th.add_run()
    r_th.text = t["tier"]
    r_th.font.name = FONT_HEAD
    r_th.font.size = Pt(10.5)
    r_th.font.bold = True
    r_th.font.color.rgb = t["color"]
    
    p_ts = tf.add_paragraph()
    r_ts = p_ts.add_run()
    r_ts.text = t["tagline"]
    r_ts.font.name = FONT_BODY
    r_ts.font.size = Pt(9)
    r_ts.font.color.rgb = C_SLATE_500
    
    for tool_name, tool_desc in t["tools"]:
        p_item = tf.add_paragraph()
        p_item.space_before = Pt(14)
        r_item_name = p_item.add_run()
        r_item_name.text = f"• {tool_name}\n"
        r_item_name.font.name = FONT_HEAD
        r_item_name.font.size = Pt(11)
        r_item_name.font.bold = True
        r_item_name.font.color.rgb = C_WHITE
        
        r_item_desc = p_item.add_run()
        r_item_desc.text = tool_desc
        r_item_desc.font.name = FONT_BODY
        r_item_desc.font.size = Pt(9.5)
        r_item_desc.font.color.rgb = C_SLATE_300

add_speaker_note(s7, """Our technology stack represents the latest in web development and artificial intelligence. 
We selected Next.js 16 and React 19 as our full-stack framework for their native support for Server Actions, background tasks, and Turbopack build speeds.

For data storage and security, we rely on Supabase PostgreSQL. Crucially, we do not rely solely on application-level security; every document is isolated at the database level using PostgreSQL Row-Level Security policies.

For document understanding, we use the official Google GenAI SDK. Instead of running brittle OCR pipelines, we upload PDF binaries directly to the Gemini multimodal API, which understands complex layouts, tables, and handwritten signatures with human-level accuracy.""")


# ==============================================================================
# SLIDE 8: SYSTEM ARCHITECTURE
# ==============================================================================
s8 = prs.slides.add_slide(blank_layout)
set_slide_bg(s8)
add_header(s8, 7, "System Design", "Layered System Architecture",
           "Separation of concerns across presentation, serverless routing, database security, and AI intelligence.")

tiers = [
    ("CLIENT PRESENTATION LAYER", "Browser App Router UI (Dashboard, Documents Vault, PDF.js Viewer, Semantic Search Explorer)  •  Client-Side Sliding-Window Batch Queue Manager (Max 4 concurrent uploads, independent progress & retry)", C_CYAN),
    ("APPLICATION GATEWAY & SERVERLESS", "Next.js 16 Server Actions & Edge API Routes (/api/documents, /api/search, /api/cron/process-queue)  •  Execution Budgets with Next.js 16 after() & Supabase Auth JWT Session Gateways", C_PINK),
    ("DATABASE & SECURE STORAGE TIER", "Supabase PostgreSQL with Row-Level Security (RLS) preventing tenant cross-bleed  •  Atomic PL/pgSQL RPCs with Transactional Advisory Locks  •  Private S3 Storage Bucket 'documents'", C_GREEN),
    ("AI INTELLIGENCE & ACCELERATION ENGINE", "Google Gemini Multimodal Files API (Structured JSON Extraction, Category & Key-Value Metadata)  •  Vector Embeddings paired with in-memory 500-LRU Cache & Lossless pdf-lib Stream Optimizer", C_PURPLE)
]

y_pos = Inches(2.0)
tier_h = Inches(1.1)

for title, details, col in tiers:
    card = create_card(s8, Inches(0.8), y_pos, Inches(11.733), tier_h, bg=C_SURFACE)
    
    # Left vertical indicator bar
    vbar = s8.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y_pos, Inches(0.06), tier_h)
    vbar.fill.solid()
    vbar.fill.fore_color.rgb = col
    vbar.line.fill.background()
    
    tf = card.text_frame
    tf.margin_left = Inches(0.35)
    tf.margin_top = Inches(0.18)
    tf.margin_right = Inches(0.35)
    
    p_t = tf.paragraphs[0]
    r_t = p_t.add_run()
    r_t.text = title
    r_t.font.name = FONT_HEAD
    r_t.font.size = Pt(11)
    r_t.font.bold = True
    r_t.font.color.rgb = col
    
    p_d = tf.add_paragraph()
    p_d.space_before = Pt(3)
    r_d = p_d.add_run()
    r_d.text = details
    r_d.font.name = FONT_BODY
    r_d.font.size = Pt(10)
    r_d.font.color.rgb = C_SLATE_300
    
    y_pos += tier_h + Inches(0.18)

add_speaker_note(s8, """This architecture slide demonstrates how our system is engineered across four distinct tiers.
At Tier 1, the client browser manages a sliding-window queue that limits network saturation by uploading at most 4 files concurrently.
At Tier 2, Next.js serverless routes validate user sessions and schedule asynchronous execution using Next.js 16's 'after()' API.
At Tier 3, Supabase PostgreSQL handles atomic transactions. Stored procedures like 'create_document_with_quota' check user storage capacity and verify storage objects inside a single database transaction.
And at Tier 4, Google Gemini and vector embeddings process the document content asynchronously, making sure the user never experiences interface lag.""")


# ==============================================================================
# SLIDE 9: COMPETITIVE MATRIX (PROFESSIONAL TABLE)
# ==============================================================================
s9 = prs.slides.add_slide(blank_layout)
set_slide_bg(s9)
add_header(s9, 8, "Competitive Value", "What Makes FileMind Different?",
           "Direct architectural comparison against traditional folder storage, cloud drives, and generic OCR utilities.")

rows = 6
cols = 4
tbl_shape = s9.shapes.add_table(rows, cols, Inches(0.8), Inches(2.0), Inches(11.733), Inches(4.7))
tbl = tbl_shape.table

tbl.columns[0].width = Inches(3.2)
tbl.columns[1].width = Inches(2.7)
tbl.columns[2].width = Inches(2.7)
tbl.columns[3].width = Inches(3.133)

headers = ["Core Capability", "Local OS Folders", "Generic Cloud Drive", "FileMind AI Vault"]
for j, h in enumerate(headers):
    cell = tbl.cell(0, j)
    cell.fill.solid()
    cell.fill.fore_color.rgb = C_SURFACE_LIGHT if j < 3 else RGBColor(15, 38, 60)
    p = cell.text_frame.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT if j == 0 else PP_ALIGN.CENTER
    r = p.add_run()
    r.text = h
    r.font.name = FONT_HEAD
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = C_CYAN if j == 3 else C_WHITE

matrix = [
    ("Search Methodology", "Exact filename match only", "Keyword match on text PDFs", "Semantic Vector Retrieval (768-dim embeddings)"),
    ("Multimodal Understanding", "None (Manual reading)", "Basic text OCR only", "Structured JSON Schema (Category, Tags, Key-Values)"),
    ("Scanned & Image PDFs", "Opaque & Inaccessible", "Garbled multi-column text", "100% Understood via Multimodal Vision AI"),
    ("Bulk Batch Processing", "OS File Copy (No validation)", "Slow sequential sync", "150-File Sliding Window (4x concurrent streams)"),
    ("Security & Tenant Isolation", "Local user OS permissions", "Coarse folder sharing links", "Database Row-Level Security (RLS) & Fencing Leases")
]

for i, row in enumerate(matrix):
    for j, val in enumerate(row):
        cell = tbl.cell(i + 1, j)
        cell.fill.solid()
        cell.fill.fore_color.rgb = C_SURFACE if j < 3 else RGBColor(12, 28, 46)
        p = cell.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.LEFT if j == 0 else PP_ALIGN.CENTER
        r = p.add_run()
        r.text = val
        r.font.name = FONT_HEAD if j == 3 else FONT_BODY
        r.font.size = Pt(10)
        if j == 3:
            r.font.bold = True
            r.font.color.rgb = C_CYAN
        elif j == 0:
            r.font.bold = True
            r.font.color.rgb = C_WHITE
        else:
            r.font.color.rgb = C_SLATE_400

add_speaker_note(s9, """Why does FileMind stand out compared to existing alternatives? This comparison table summarizes the differences.
Against local operating systems, FileMind eliminates manual search by indexing the full semantics of the document.
Against generic cloud drives like Google Drive or Dropbox, FileMind doesn't just store bytes — it extracts structured business metadata: vendor names, due dates, invoice numbers, and custom tags.
And against desktop OCR software, FileMind uses Google Gemini's multimodal vision model, which can understand scanned receipts, rotated pages, and tabular data that standard OCR engines garble. 
Most importantly, all of this is protected by strict database Row-Level Security.""")


# ==============================================================================
# SLIDE 10: CHALLENGES & ENGINEERING SOLUTIONS
# ==============================================================================
s10 = prs.slides.add_slide(blank_layout)
set_slide_bg(s10)
add_header(s10, 9, "Engineering Rigor", "Technical Challenges & Solutions",
           "Real software engineering hurdles encountered during development and the verified solutions implemented.")

challenges = [
    {
        "title": "1. Gemini 503 Spikes & Model Fallback Cascade",
        "tag": "FAULT TOLERANCE",
        "prob": "During peak hours, Google's standard tier returns 503 UNAVAILABLE, causing queue processing failures and stranded jobs.",
        "sol": "Engineered an intelligent 3-tier cascade: gemini-3.6-flash -> gemini-3.8-flash -> gemini-3-flash-preview with exponential backoff and jitter.",
        "col": C_CYAN
    },
    {
        "title": "2. Serverless Execution Budgets on 150-File Batches",
        "prob": "Processing 150 PDFs in a standard Next.js 60-second serverless execution budget leads to function timeout kills.",
        "tag": "CONCURRENCY ENGINE",
        "sol": "Implemented sliding-window batching (max 4 uploads, max 2 AI workers), Next.js after() execution, and a pg_cron background consumer.",
        "col": C_PINK
    },
    {
        "title": "3. Concurrency Race Conditions & Deadlocks",
        "prob": "Simultaneous file confirmations cause duplicate rows and quota circumvention under concurrent uploads.",
        "tag": "TRANSACTION SECURITY",
        "sol": "Added transactional PostgreSQL advisory locks pg_advisory_xact_lock(user_id) and atomic SKIP LOCKED queue claiming with UUID fencing leases.",
        "col": C_GREEN
    },
    {
        "title": "4. Safe PDF Optimization Without Corruption",
        "prob": "Compressing digitally signed or encrypted PDFs invalidates cryptographic signatures and renders files unreadable.",
        "tag": "BYTE-LEVEL INTEGRITY",
        "sol": "Conservative pre-checks detect /ByteRange signatures and /Encrypt dictionaries, safely skipping them while optimizing standard structural streams.",
        "col": C_AMBER
    }
]

cw_ch = Inches(5.7)
ch_ch = Inches(2.3)
cx_ch = [Inches(0.8), Inches(6.833)]
cy_ch = [Inches(2.0), Inches(4.55)]

for idx, ch in enumerate(challenges):
    x = cx_ch[idx % 2]
    y = cy_ch[idx // 2]
    card = create_card(s10, x, y, cw_ch, ch_ch, bg=C_SURFACE)
    
    tf = card.text_frame
    tf.margin_left = tf.margin_right = Inches(0.35)
    tf.margin_top = Inches(0.18)
    
    p_t = tf.paragraphs[0]
    r_t = p_t.add_run()
    r_t.text = ch["title"]
    r_t.font.name = FONT_HEAD
    r_t.font.size = Pt(12)
    r_t.font.bold = True
    r_t.font.color.rgb = ch["col"]
    
    p_prob = tf.add_paragraph()
    p_prob.space_before = Pt(4)
    r_pr_h = p_prob.add_run()
    r_pr_h.text = "Challenge: "
    r_pr_h.font.bold = True
    r_pr_h.font.size = Pt(9.5)
    r_pr_h.font.color.rgb = C_WHITE
    r_pr_d = p_prob.add_run()
    r_pr_d.text = ch["prob"]
    r_pr_d.font.size = Pt(9.5)
    r_pr_d.font.color.rgb = C_SLATE_400
    
    p_sol = tf.add_paragraph()
    p_sol.space_before = Pt(4)
    r_so_h = p_sol.add_run()
    r_so_h.text = "Solution: "
    r_so_h.font.bold = True
    r_so_h.font.size = Pt(9.5)
    r_so_h.font.color.rgb = C_GREEN
    r_so_d = p_sol.add_run()
    r_so_d.text = ch["sol"]
    r_so_d.font.size = Pt(9.5)
    r_so_d.font.color.rgb = C_SLATE_300

add_speaker_note(s10, """In any serious engineering project, the hardest parts are the edge cases.
One major challenge we faced was that Google's Gemini API occasionally returns 503 High Demand errors during peak hours. Rather than failing the user's upload, we built a 3-tier model cascade that retries with exponential backoff and automatically falls back to alternative verified models.

Another challenge was serverless timeouts on Vercel. A single request cannot process 150 PDFs within 60 seconds. We solved this by using a sliding-window queue and background pg_cron workers that drain at most 3 documents per invocation.

Finally, we used PostgreSQL transactional advisory locks to prevent race conditions during bulk uploads, guaranteeing that quota limits can never be bypassed.""")


# ==============================================================================
# SLIDE 11: FUTURE ROADMAP
# ==============================================================================
s11 = prs.slides.add_slide(blank_layout)
set_slide_bg(s11)
add_header(s11, 10, "Strategic Vision", "Future Roadmap & Planned Advancements",
           "Strategic enhancements designed to expand FileMind into an enterprise-ready knowledge platform.")

phases = [
    ("PHASE 02", "Cross-Document Synthesis & Multi-PDF Q&A", "Query across your entire document vault simultaneously (e.g. 'Compare revenue growth and profit margins across all Q1, Q2, and Q3 reports') with comparative summaries.", C_CYAN),
    ("PHASE 03", "Visual Citations & Bounding-Box Viewer", "Direct canvas integration highlighting the exact sentence and bounding box on the original PDF page for every generated answer, ensuring 100% verifiable citations.", C_PINK),
    ("PHASE 04", "Local & Air-Gapped LLM Execution", "Integration with Ollama and vLLM to support completely offline inference for highly sensitive legal, military, or HIPAA-regulated medical environments.", C_GREEN),
    ("PHASE 05", "Collaborative Team Workspaces & RBAC", "Granular role-based access control (Admin, Contributor, Read-Only Reviewer) with cryptographic audit logs tracking document access and metadata mutations.", C_PURPLE)
]

y_r = Inches(2.0)
rh = Inches(1.1)

for tag, title, desc, col in phases:
    card = create_card(s11, Inches(0.8), y_r, Inches(11.733), rh, bg=C_SURFACE)
    
    # Left pill indicator
    vpill = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y_r, Inches(0.06), rh)
    vpill.fill.solid()
    vpill.fill.fore_color.rgb = col
    vpill.line.fill.background()
    
    tf = card.text_frame
    tf.margin_left = Inches(0.35)
    tf.margin_top = Inches(0.14)
    tf.margin_right = Inches(0.35)
    
    p_t = tf.paragraphs[0]
    r_tag = p_t.add_run()
    r_tag.text = f"{tag} · "
    r_tag.font.name = FONT_HEAD
    r_tag.font.size = Pt(11)
    r_tag.font.bold = True
    r_tag.font.color.rgb = col
    
    r_title = p_t.add_run()
    r_title.text = title
    r_title.font.name = FONT_HEAD
    r_title.font.size = Pt(11.5)
    r_title.font.bold = True
    r_title.font.color.rgb = C_WHITE
    
    p_d = tf.add_paragraph()
    p_d.space_before = Pt(3)
    r_d = p_d.add_run()
    r_d.text = desc
    r_d.font.name = FONT_BODY
    r_d.font.size = Pt(9.8)
    r_d.font.color.rgb = C_SLATE_300
    
    y_r += rh + Inches(0.16)

add_speaker_note(s11, """Looking forward, FileMind has a clear roadmap for future development.
Our immediate next milestone is Cross-Document Synthesis. Instead of querying one PDF at a time, users will be able to ask questions across their entire vault — for example, 'Summarize all changes between the 2024 and 2025 service contracts.'

Next, we plan to implement Visual Bounding-Box Citations, so that when the AI returns an answer, clicking it highlights the exact sentence on the rendered PDF page.

We also plan to support local LLMs like Ollama for organizations with strict privacy requirements that cannot send documents to the cloud, as well as team workspaces with role-based access control.""")


# ==============================================================================
# SLIDE 12: CONCLUSION & LIVE DEMO
# ==============================================================================
s12 = prs.slides.add_slide(blank_layout)
set_slide_bg(s12)

# Top Bar
tb12 = s12.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(11.733), Inches(1.3))
tf12 = tb12.text_frame
tf12.word_wrap = True
tf12.margin_left = tf12.margin_right = tf12.margin_top = tf12.margin_bottom = 0

p12_track = tf12.paragraphs[0]
r12_num = p12_track.add_run()
r12_num.text = "// 11 · CONCLUSION & EVALUATION"
r12_num.font.name = FONT_HEAD
r12_num.font.size = Pt(9.5)
r12_num.font.bold = True
r12_num.font.color.rgb = C_GREEN

p12_main = tf12.add_paragraph()
p12_main.space_before = Pt(3)
r12_main = p12_main.add_run()
r12_main.text = "FileMind — The Intelligent Document Vault"
r12_main.font.name = FONT_HEAD
r12_main.font.size = Pt(28)
r12_main.font.bold = True
r12_main.font.color.rgb = C_WHITE

p12_sub = tf12.add_paragraph()
p12_sub.space_before = Pt(2)
r12_sub = p12_sub.add_run()
r12_sub.text = "“Stop searching for documents. Start finding answers with FileMind.”"
r12_sub.font.name = FONT_BODY
r12_sub.font.size = Pt(13)
r12_sub.font.italic = True
r12_sub.font.color.rgb = C_CYAN

# Left Column: Project Summary Takeaways
c_takeaways = create_card(s12, Inches(0.8), Inches(1.9), Inches(5.7), Inches(5.0), bg=C_SURFACE)
tf_tkw = c_takeaways.text_frame
tf_tkw.margin_left = tf_tkw.margin_right = Inches(0.4)
tf_tkw.margin_top = Inches(0.3)

p_tkw_h = tf_tkw.paragraphs[0]
r_tkw_h = p_tkw_h.add_run()
r_tkw_h.text = "KEY PROJECT TAKEAWAYS"
r_tkw_h.font.name = FONT_HEAD
r_tkw_h.font.size = Pt(10.5)
r_tkw_h.font.bold = True
r_tkw_h.font.color.rgb = C_GREEN

p_tkw_sub = tf_tkw.add_paragraph()
r_tkw_sub = p_tkw_sub.add_run()
r_tkw_sub.text = "Academic & Technical Achievements"
r_tkw_sub.font.name = FONT_HEAD
r_tkw_sub.font.size = Pt(14)
r_tkw_sub.font.bold = True
r_tkw_sub.font.color.rgb = C_WHITE

recap = [
    ("Problem Solved", "Replaces passive, unsearchable folders with an active AI-powered document intelligence vault."),
    ("Production Quality", "Built with Next.js 16, Supabase PostgreSQL, and Google Gemini with verified test suites."),
    ("Resilient Concurrency", "Tested with 150-file bulk batches, automated recovery, and transactional advisory locks."),
    ("High Privacy", "Database-enforced Row-Level Security ensuring strict per-user vault isolation.")
]

for title, desc in recap:
    p_rc = tf_tkw.add_paragraph()
    p_rc.space_before = Pt(12)
    r_rc_h = p_rc.add_run()
    r_rc_h.text = f"✔  {title}\n"
    r_rc_h.font.name = FONT_HEAD
    r_rc_h.font.size = Pt(11)
    r_rc_h.font.bold = True
    r_rc_h.font.color.rgb = C_GREEN
    
    r_rc_d = p_rc.add_run()
    r_rc_d.text = desc
    r_rc_d.font.name = FONT_BODY
    r_rc_d.font.size = Pt(10)
    r_rc_d.font.color.rgb = C_SLATE_300

# Right Column: Live Demo & Evaluation Invitee
c_demo = create_card(s12, Inches(6.8), Inches(1.9), Inches(5.733), Inches(5.0), bg=C_SURFACE_LIGHT, border=C_BORDER_CYAN, border_width=Pt(1.2))
tf_dm = c_demo.text_frame
tf_dm.margin_left = tf_dm.margin_right = Inches(0.4)
tf_dm.margin_top = Inches(0.3)

p_dm_h = tf_dm.paragraphs[0]
r_dm_h = p_dm_h.add_run()
r_dm_h.text = "LIVE EVALUATION & DEMONSTRATION"
r_dm_h.font.name = FONT_HEAD
r_dm_h.font.size = Pt(10.5)
r_dm_h.font.bold = True
r_dm_h.font.color.rgb = C_CYAN

p_dm_sub = tf_dm.add_paragraph()
r_dm_sub = p_dm_sub.add_run()
r_dm_sub.text = "Ready for Hands-On Evaluation"
r_dm_sub.font.name = FONT_HEAD
r_dm_sub.font.size = Pt(14)
r_dm_sub.font.bold = True
r_dm_sub.font.color.rgb = C_WHITE

demo_steps = [
    ("1. Live Ingestion Walkthrough", "Drag-and-drop a batch of test invoices, papers, and legal agreements into the running web interface."),
    ("2. Real-Time Multimodal Extraction", "Observe Gemini classifying categories, extracting structured key-values, and indexing pages on-the-fly."),
    ("3. Semantic Search & Snippet Matching", "Search by concept in natural language and observe sub-200ms vector retrieval with snippet highlights.")
]

for title, desc in demo_steps:
    p_ds = tf_dm.add_paragraph()
    p_ds.space_before = Pt(10)
    r_ds_h = p_ds.add_run()
    r_ds_h.text = f"{title}\n"
    r_ds_h.font.name = FONT_HEAD
    r_ds_h.font.size = Pt(11)
    r_ds_h.font.bold = True
    r_ds_h.font.color.rgb = C_WHITE
    
    r_ds_d = p_ds.add_run()
    r_ds_d.text = desc
    r_ds_d.font.name = FONT_BODY
    r_ds_d.font.size = Pt(9.5)
    r_ds_d.font.color.rgb = C_SLATE_300

p_contact = tf_dm.add_paragraph()
p_contact.space_before = Pt(14)
r_c_lbl = p_contact.add_run()
r_c_lbl.text = "Resources & Repository:\n"
r_c_lbl.font.name = FONT_HEAD
r_c_lbl.font.size = Pt(10)
r_c_lbl.font.bold = True
r_c_lbl.font.color.rgb = C_PINK

r_c_val = p_contact.add_run()
r_c_val.text = "GitHub: [github.com/your-username/filemind]   |   Demo URL: [http://localhost:3000]\nThank you! We welcome questions from our teacher and hackathon judges."
r_c_val.font.name = FONT_BODY
r_c_val.font.size = Pt(9)
r_c_val.font.color.rgb = C_SLATE_300

add_speaker_note(s12, """To conclude our presentation: FileMind takes the friction out of document management. By bridging the gap between secure cloud storage and state-of-the-art multimodal AI, we transform dead PDF archives into dynamic knowledge bases.

We have verified our implementation through automated test suites covering bulk upload concurrency, model fallbacks, and database security invariants.

At this point, we would love to invite you to our live demonstration where we will drop a sample batch of documents and demonstrate real-time extraction and semantic search.

Thank you for your time and guidance. We are ready for your questions!""")

# Save presentation
out_path = os.path.join(os.getcwd(), "FileMind_Project_Presentation.pptx")
prs.save(out_path)
print(f"Professional presentation saved to: {out_path}")
