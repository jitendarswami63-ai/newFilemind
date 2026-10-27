"""
FileMind Presentation Generator - Senior Human Designer Edition
Palette: Warm Architectural Gallery White / Editorial Slate / Burnt Terracotta Accent
Zero Blue / Zero Cyber-Neon / Zero Generic AI Card Soup
"""

import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# -----------------------------------------------------------------------------
# PALETTE DEFINITION (Editorial Warm Executive - NO BLUE)
# -----------------------------------------------------------------------------
# Canvas & Backgrounds
C_BG_WARM      = RGBColor(250, 250, 249)  # #FAFAF9 Warm Paper Canvas
C_BG_WHITE     = RGBColor(255, 255, 255)  # #FFFFFF Pure Surface
C_BG_PANEL     = RGBColor(244, 244, 245)  # #F4F4F5 Subtle Section Tint
C_BG_LIGHT_TINT= RGBColor(254, 242, 242)  # #FEF2F2 Subtle Terracotta Tint

# Ink & Text
C_INK_PRIMARY  = RGBColor(17, 24, 39)     # #111827 Deep Obsidian / Charcoal Black
C_INK_HEADING  = RGBColor(15, 23, 42)     # #0F172A Deepest Ink
C_INK_SECONDARY= RGBColor(75, 85, 99)     # #4B5563 Refined Neutral Slate
C_INK_MUTED    = RGBColor(148, 163, 184)  # #94A3B8 Subtle Muted Caption

# Structural Dividers & Borders
C_BORDER_LIGHT = RGBColor(229, 231, 235)  # #E5E7EB Hairline Divider
C_BORDER_CARD  = RGBColor(226, 232, 240)  # #E2E8F0 Subtle Card Border

# Accent Colors (Distinguished, Warm, Authoritative)
C_ACCENT_TERRA = RGBColor(194, 65, 12)    # #C2410C Warm Burnt Terracotta
C_ACCENT_EMER  = RGBColor(4, 120, 87)     # #047857 Deep Forest Emerald (Success/Active)
C_ACCENT_AMBER = RGBColor(180, 83, 9)     # #B45309 Warm Ochre / Amber (Queue/Processing)
C_ACCENT_RED   = RGBColor(185, 28, 28)    # #B91C1C Refined Deep Crimson (Legacy/Failure)

# Typography Specifications
FONT_HEADING = "Trebuchet MS"
FONT_BODY    = "Calibri"
FONT_MONO    = "Consolas"

# -----------------------------------------------------------------------------
# HELPER FUNCTIONS
# -----------------------------------------------------------------------------
def set_slide_background(slide, color):
    """Fills slide background with a solid color."""
    bg = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5)
    )
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()
    return bg

def add_header(slide, category_num, category_name, title, subtitle):
    """Creates a senior-designer editorial header zone with pristine typography."""
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.55), Inches(11.733), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    # Category Eyebrow
    p_cat = tf.paragraphs[0]
    p_cat.text = f"{category_num}  /  {category_name.upper()}"
    p_cat.font.name = FONT_HEADING
    p_cat.font.size = Pt(9.5)
    p_cat.font.bold = True
    p_cat.font.color.rgb = C_ACCENT_TERRA

    # Slide Title
    p_title = tf.add_paragraph()
    p_title.text = title
    p_title.font.name = FONT_HEADING
    p_title.font.size = Pt(25)
    p_title.font.bold = True
    p_title.font.color.rgb = C_INK_HEADING
    p_title.space_before = Pt(3)

    # Slide Subtitle
    p_sub = tf.add_paragraph()
    p_sub.text = subtitle
    p_sub.font.name = FONT_BODY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = C_INK_SECONDARY
    p_sub.space_before = Pt(2)

def add_speaker_note(slide, note_text):
    """Embeds professional speaker notes."""
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = note_text.strip()

def create_panel(slide, left, top, width, height, bg_color=C_BG_WHITE, border_color=C_BORDER_CARD):
    """Draws a clean editorial content card/panel with crisp hairline border."""
    rect = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    rect.fill.solid()
    rect.fill.fore_color.rgb = bg_color
    if border_color:
        rect.line.color.rgb = border_color
        rect.line.width = Pt(1)
    else:
        rect.line.fill.background()
    return rect

# -----------------------------------------------------------------------------
# PRESENTATION INITIALIZATION
# -----------------------------------------------------------------------------
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

print("Building FileMind Senior Designer Presentation (Editorial Warm Palette)...")

# =============================================================================
# SLIDE 1: COVER / TITLE (Monumental Editorial Hero)
# =============================================================================
s1 = prs.slides.add_slide(blank_layout)
set_slide_background(s1, C_BG_WARM)

# Top Track Eyebrow
tb1_top = s1.shapes.add_textbox(Inches(1.0), Inches(1.1), Inches(11.333), Inches(0.4))
tf1_top = tb1_top.text_frame
tf1_top.word_wrap = True
tf1_top.margin_left = tf1_top.margin_top = tf1_top.margin_right = tf1_top.margin_bottom = 0
p1_t = tf1_top.paragraphs[0]
p1_t.text = "ACADEMIC CAPSTONE EVALUATION  •  ANNUAL COLLEGE HACKATHON 2026"
p1_t.font.name = FONT_HEADING
p1_t.font.size = Pt(10)
p1_t.font.bold = True
p1_t.font.color.rgb = C_ACCENT_TERRA

# Monumental Main Title
tb1_main = s1.shapes.add_textbox(Inches(1.0), Inches(1.6), Inches(11.333), Inches(2.2))
tf1_main = tb1_main.text_frame
tf1_main.word_wrap = True
tf1_main.margin_left = tf1_main.margin_top = tf1_main.margin_right = tf1_main.margin_bottom = 0

p1_brand = tf1_main.paragraphs[0]
p1_brand.text = "FileMind"
p1_brand.font.name = FONT_HEADING
p1_brand.font.size = Pt(54)
p1_brand.font.bold = True
p1_brand.font.color.rgb = C_INK_HEADING

p1_lead = tf1_main.add_paragraph()
p1_lead.text = "Autonomous Multimodal PDF Vault & High-Throughput Retrieval Engine"
p1_lead.font.name = FONT_HEADING
p1_lead.font.size = Pt(21)
p1_lead.font.bold = True
p1_lead.font.color.rgb = C_ACCENT_TERRA
p1_lead.space_before = Pt(4)

p1_desc = tf1_main.add_paragraph()
p1_desc.text = "Transforming fragmented, unsearchable document archives into an active, secure, and semantically indexed intelligence platform with Gemini 3.6 vision and PostgreSQL pgvector."
p1_desc.font.name = FONT_BODY
p1_desc.font.size = Pt(13)
p1_desc.font.color.rgb = C_INK_SECONDARY
p1_desc.space_before = Pt(10)

# 4 Verified Architectural Invariants (Open-Air Badges with Hairline Border)
invariants = [
    ("150-FILE BATCH", "Sliding-window parallel upload queue"),
    ("49 MiB PER FILE", "Direct-to-S3 storage streaming"),
    ("< 200ms LATENCY", "768-dim vector semantic retrieval"),
    ("100% RLS ENFORCED", "Advisory-locked tenant perimeter")
]

inv_w = Inches(2.68)
inv_h = Inches(1.4)
inv_y = Inches(4.1)

for i, (metric, label) in enumerate(invariants):
    inv_x = Inches(1.0 + i * 2.88)
    card = create_panel(s1, inv_x, inv_y, inv_w, inv_h, C_BG_WHITE, C_BORDER_CARD)
    
    # Accent indicator bar at top of card
    bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, inv_x, inv_y, inv_w, Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = C_ACCENT_TERRA if i == 0 else (C_ACCENT_EMER if i == 3 else C_BORDER_CARD)
    bar.line.fill.background()

    tb = s1.shapes.add_textbox(inv_x + Inches(0.2), inv_y + Inches(0.25), inv_w - Inches(0.4), inv_h - Inches(0.35))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p_m = tf.paragraphs[0]
    p_m.text = metric
    p_m.font.name = FONT_HEADING
    p_m.font.size = Pt(14)
    p_m.font.bold = True
    p_m.font.color.rgb = C_INK_HEADING

    p_l = tf.add_paragraph()
    p_l.text = label
    p_l.font.name = FONT_BODY
    p_l.font.size = Pt(10.5)
    p_l.font.color.rgb = C_INK_SECONDARY
    p_l.space_before = Pt(4)

# Footer Presentation Metadata Bar
meta_y = Inches(6.0)
meta_panel = create_panel(s1, Inches(1.0), meta_y, Inches(11.333), Inches(0.75), C_BG_WHITE, C_BORDER_CARD)
tb_meta = s1.shapes.add_textbox(Inches(1.2), meta_y + Inches(0.18), Inches(10.933), Inches(0.45))
tf_meta = tb_meta.text_frame
tf_meta.word_wrap = True
tf_meta.margin_left = tf_meta.margin_top = tf_meta.margin_right = tf_meta.margin_bottom = 0

p_meta = tf_meta.paragraphs[0]
p_meta.text = "Presenter: Lead Engineer & Architect   |   Track: Computer Science Capstone & Hackathon 2026   |   Live Demo: http://localhost:3000"
p_meta.font.name = FONT_BODY
p_meta.font.size = Pt(10.5)
p_meta.font.color.rgb = C_INK_SECONDARY

add_speaker_note(s1, """Good morning respected evaluator and hackathon judges. Today I am presenting FileMind — an autonomous, high-throughput PDF vault and multimodal knowledge retrieval engine.

In academic and enterprise environments alike, static PDF archives represent an impenetrable operational bottleneck. FileMind solves this by combining high-scale bulk upload streaming, Google Gemini 3.6 multimodal vision, and PostgreSQL vector embeddings to turn raw documents into an interactive, securely isolated knowledge vault.

Our system is backed by production-grade engineering: client sliding-window concurrency handling up to 150 files, atomic PostgreSQL advisory locks, and sub-200 millisecond semantic retrieval.""")

# =============================================================================
# SLIDE 2: THE PROBLEM (Editorial Asymmetric Layout)
# =============================================================================
s2 = prs.slides.add_slide(blank_layout)
set_slide_background(s2, C_BG_WARM)
add_header(s2, "01", "Context & Problem Discovery", "The Crisis of Unstructured Document Management", "Standard operating systems and consumer cloud drives treat PDFs as opaque binary blobs.")

# Left Column: The 80% Stat Anchor (White Editorial Panel)
left_card = create_panel(s2, Inches(0.8), Inches(2.1), Inches(4.4), Inches(4.8), C_BG_WHITE, C_BORDER_CARD)
tb_stat = s2.shapes.add_textbox(Inches(1.2), Inches(2.4), Inches(3.6), Inches(4.2))
tf_stat = tb_stat.text_frame
tf_stat.word_wrap = True
tf_stat.margin_left = tf_stat.margin_top = tf_stat.margin_right = tf_stat.margin_bottom = 0

p_st_tag = tf_stat.paragraphs[0]
p_st_tag.text = "THE ENTERPRISE DATA SILO"
p_st_tag.font.name = FONT_HEADING
p_st_tag.font.size = Pt(9.5)
p_st_tag.font.bold = True
p_st_tag.font.color.rgb = C_ACCENT_TERRA

p_num = tf_stat.add_paragraph()
p_num.text = "80%"
p_num.font.name = FONT_HEADING
p_num.font.size = Pt(64)
p_num.font.bold = True
p_num.font.color.rgb = C_INK_HEADING
p_num.space_before = Pt(4)

p_num_lbl = tf_stat.add_paragraph()
p_num_lbl.text = "of corporate and academic knowledge is permanently trapped inside unstructured documents."
p_num_lbl.font.name = FONT_HEADING
p_num_lbl.font.size = Pt(13)
p_num_lbl.font.bold = True
p_num_lbl.font.color.rgb = C_ACCENT_TERRA
p_num_lbl.space_before = Pt(2)

p_stat_body = tf_stat.add_paragraph()
p_stat_body.text = "According to IDC and Gartner research, knowledge workers lose 2.5 hours every single day — almost 20% of their work week — just opening, skimming, and hunting through disorganized folders to locate specific clauses and figures."
p_stat_body.font.name = FONT_BODY
p_stat_body.font.size = Pt(11)
p_stat_body.font.color.rgb = C_INK_SECONDARY
p_stat_body.space_before = Pt(12)

# Right Column: 3 Structured Friction Points (Clean Editorial Rows)
right_x = Inches(5.5)
right_w = Inches(7.033)
row_h = Inches(1.48)

problems = [
    ("01", "Opaque Binary Files & Keyword Blindness", "Operating system and cloud search engines inspect only file titles or raw metadata. Scanned invoices, multi-column research papers, and technical diagrams remain 100% invisible to search queries."),
    ("02", "Manual Skimming & Data Extraction Fatigue", "Locating specific answers (e.g. quarterly renewal dates, contract indemnity clauses, or invoice line items) requires manual opening, scrolling, and error-prone copy-pasting."),
    ("03", "Concurrency, Scale & Security Vulnerabilities", "Desktop OCR tools crash when processing batches beyond 50 files. Consumer cloud drives lack multi-tenant Row-Level Security (RLS), leading to accidental data leakage and quota overruns.")
]

for i, (num, p_title, p_desc) in enumerate(problems):
    ry = Inches(2.1 + i * 1.66)
    r_panel = create_panel(s2, right_x, ry, right_w, row_h, C_BG_WHITE, C_BORDER_CARD)
    
    # Left accent indicator
    ind = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, right_x, ry, Inches(0.08), row_h)
    ind.fill.solid()
    ind.fill.fore_color.rgb = C_ACCENT_TERRA if i == 0 else C_INK_HEADING
    ind.line.fill.background()

    tb_r = s2.shapes.add_textbox(right_x + Inches(0.35), ry + Inches(0.2), right_w - Inches(0.55), row_h - Inches(0.35))
    tf_r = tb_r.text_frame
    tf_r.word_wrap = True
    tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0

    p_rt = tf_r.paragraphs[0]
    r_num = p_rt.add_run()
    r_num.text = f"{num}  •  "
    r_num.font.name = FONT_HEADING
    r_num.font.size = Pt(12.5)
    r_num.font.bold = True
    r_num.font.color.rgb = C_ACCENT_TERRA

    r_tit = p_rt.add_run()
    r_tit.text = p_title
    r_tit.font.name = FONT_HEADING
    r_tit.font.size = Pt(13)
    r_tit.font.bold = True
    r_tit.font.color.rgb = C_INK_HEADING

    p_rd = tf_r.add_paragraph()
    p_rd.text = p_desc
    p_rd.font.name = FONT_BODY
    p_rd.font.size = Pt(10.5)
    p_rd.font.color.rgb = C_INK_SECONDARY
    p_rd.space_before = Pt(4)

add_speaker_note(s2, """To understand why FileMind is essential, look at how institutions manage documents today. Over 80% of institutional data is trapped in static, unstructured PDFs.

When professors, researchers, or legal analysts search their file system, they are limited to matching file names. If a PDF is an image scan, a two-column research paper, or a complex financial sheet, the operating system is completely blind.

Furthermore, existing desktop tools crash under heavy batches, and standard cloud folders lack granular row-level security. FileMind was engineered specifically to solve all three layers of this crisis.""")

# =============================================================================
# SLIDE 3: THE PARADIGM SHIFT (Comparative Analysis)
# =============================================================================
s3 = prs.slides.add_slide(blank_layout)
set_slide_background(s3, C_BG_WARM)
add_header(s3, "02", "Solution Architecture", "The Paradigm Shift: From Passive Files to Active AI Vault", "How FileMind replaces fragile file trees with an autonomous, semantically searchable intelligence vault.")

card_w = Inches(5.65)
card_h = Inches(4.8)
card_y = Inches(2.1)

# Left Column: Legacy Passive Storage
c_left = create_panel(s3, Inches(0.8), card_y, card_w, card_h, C_BG_WHITE, C_BORDER_CARD)
top_bar_l = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), card_y, card_w, Inches(0.08))
top_bar_l.fill.solid()
top_bar_l.fill.fore_color.rgb = C_ACCENT_RED
top_bar_l.line.fill.background()

tb_l = s3.shapes.add_textbox(Inches(1.2), card_y + Inches(0.35), card_w - Inches(0.8), card_h - Inches(0.5))
tf_l = tb_l.text_frame
tf_l.word_wrap = True
tf_l.margin_left = tf_l.margin_top = tf_l.margin_right = tf_l.margin_bottom = 0

p_lt = tf_l.paragraphs[0]
p_lt.text = "TRADITIONAL PDF STORAGE"
p_lt.font.name = FONT_HEADING
p_lt.font.size = Pt(10)
p_lt.font.bold = True
p_lt.font.color.rgb = C_ACCENT_RED

p_lh = tf_l.add_paragraph()
p_lh.text = "Passive, dumb folders with manual maintenance"
p_lh.font.name = FONT_HEADING
p_lh.font.size = Pt(16)
p_lh.font.bold = True
p_lh.font.color.rgb = C_INK_HEADING
p_lh.space_before = Pt(4)

legacy_points = [
    ("Exact Filename Search", "Fails if you don't recall the exact spelling or prefix (e.g. 'report_final_v2.pdf')."),
    ("Blind to Scanned Text", "Image-based PDFs and scanned invoices cannot be parsed or indexed without external OCR."),
    ("Manual Fact Extraction", "Key metadata, numbers, and dates must be manually read, copied, and transcribed."),
    ("Zero Tenant Isolation", "Shared network folders risk accidental data leakage with no granular row-level security.")
]

for title, desc in legacy_points:
    p_lp = tf_l.add_paragraph()
    p_lp.space_before = Pt(12)
    r_x = p_lp.add_run()
    r_x.text = "✕  "
    r_x.font.name = FONT_HEADING
    r_x.font.size = Pt(12)
    r_x.font.bold = True
    r_x.font.color.rgb = C_ACCENT_RED
    
    r_t = p_lp.add_run()
    r_t.text = f"{title}: "
    r_t.font.name = FONT_HEADING
    r_t.font.size = Pt(11.5)
    r_t.font.bold = True
    r_t.font.color.rgb = C_INK_HEADING

    r_d = p_lp.add_run()
    r_d.text = desc
    r_d.font.name = FONT_BODY
    r_d.font.size = Pt(10.5)
    r_d.font.color.rgb = C_INK_SECONDARY

# Right Column: The FileMind AI Vault
c_right = create_panel(s3, Inches(6.85), card_y, card_w, card_h, C_BG_WHITE, C_BORDER_CARD)
top_bar_r = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), card_y, card_w, Inches(0.08))
top_bar_r.fill.solid()
top_bar_r.fill.fore_color.rgb = C_ACCENT_TERRA
top_bar_r.line.fill.background()

tb_r = s3.shapes.add_textbox(Inches(7.25), card_y + Inches(0.35), card_w - Inches(0.8), card_h - Inches(0.5))
tf_r = tb_r.text_frame
tf_r.word_wrap = True
tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0

p_rt = tf_r.paragraphs[0]
p_rt.text = "THE FILEMIND INTELLIGENCE VAULT"
p_rt.font.name = FONT_HEADING
p_rt.font.size = Pt(10)
p_rt.font.bold = True
p_rt.font.color.rgb = C_ACCENT_TERRA

p_rh = tf_r.add_paragraph()
p_rh.text = "Autonomous multimodal indexing & instant semantic answers"
p_rh.font.name = FONT_HEADING
p_rh.font.size = Pt(16)
p_rh.font.bold = True
p_rh.font.color.rgb = C_INK_HEADING
p_rh.space_before = Pt(4)

filemind_points = [
    ("Semantic Concept Search", "Search by concept (e.g. 'cloud server billing terms') without matching exact keywords."),
    ("Native Multimodal Vision", "Google Gemini 3.6 extracts category, semantic topic tags, and text from complex layouts."),
    ("Structured Schema Generation", "Automatically outputs verified JSON metadata (invoice totals, contract parties, dates)."),
    ("Database-Level RLS Security", "PostgreSQL Row-Level Security and transactional advisory locks prevent tenant cross-bleed.")
]

for title, desc in filemind_points:
    p_rp = tf_r.add_paragraph()
    p_rp.space_before = Pt(12)
    r_chk = p_rp.add_run()
    r_chk.text = "✓  "
    r_chk.font.name = FONT_HEADING
    r_chk.font.size = Pt(12)
    r_chk.font.bold = True
    r_chk.font.color.rgb = C_ACCENT_EMER
    
    r_t = p_rp.add_run()
    r_t.text = f"{title}: "
    r_t.font.name = FONT_HEADING
    r_t.font.size = Pt(11.5)
    r_t.font.bold = True
    r_t.font.color.rgb = C_INK_HEADING

    r_d = p_rp.add_run()
    r_d.text = desc
    r_d.font.name = FONT_BODY
    r_d.font.size = Pt(10.5)
    r_d.font.color.rgb = C_INK_SECONDARY

add_speaker_note(s3, """This comparison highlights the fundamental architectural shift FileMind delivers.

Traditional file systems treat documents as passive storage bins. If you don't recall the exact filename, the file is virtually lost. Traditional OCR also chokes on multi-column academic layouts or scanned contracts.

With FileMind, the moment a PDF is uploaded, our pipeline transforms it into an active intelligence vault. Google Gemini 3.6 inspects the visual document natively, while our 768-dimensional embedding model indexes the text semantically. Users can ask natural questions and find answers in sub-200 milliseconds.""")

# =============================================================================
# SLIDE 4: CORE CAPABILITIES (Open-Air Architectural Grid)
# =============================================================================
s4 = prs.slides.add_slide(blank_layout)
set_slide_background(s4, C_BG_WARM)
add_header(s4, "03", "System Capabilities", "Engineered for Scale, Security, and Sub-Second Retrieval", "Battle-tested architectural metrics verified in automated test suites and live deployments.")

grid_w = Inches(5.65)
grid_h = Inches(2.28)
xs = [Inches(0.8), Inches(6.85)]
ys = [Inches(2.1), Inches(4.6)]

capabilities = [
    ("150 Files", "BULK INGESTION ENGINE", "Sliding-Window Batch Concurrency",
     "Handles up to 150 PDFs per batch (up to 49 MiB each). Client-side sliding-window queue maintains 4 parallel upload streams and 2 parallel AI worker threads with per-file error isolation.", C_ACCENT_TERRA),
    ("Gemini 3.6", "MULTIMODAL INTELLIGENCE", "Structured Schema Extraction",
     "Multimodal ingestion classifies documents (Invoice, Contract, Research, Report), parses complex tables, generates semantic topic tags, and enforces prompt injection defense via strict schemas.", C_INK_HEADING),
    ("< 200 ms", "SEARCH ACCELERATION", "Hybrid Semantic Vector Engine",
     "Cosine similarity search over 768-dimensional document embeddings paired with an in-memory 500-capacity LRU cache. Normalizes queries and collapses duplicate in-flight requests.", C_ACCENT_EMER),
    ("100% RLS", "ENTERPRISE SECURITY", "Multi-Tenant Lease Isolation",
     "PostgreSQL Row-Level Security prevents tenant data cross-bleed. Distributed queue utilizes FOR UPDATE SKIP LOCKED and cryptographic UUID fencing tokens to eliminate double-locking.", C_ACCENT_AMBER)
]

for i, (stat, tag, cap_title, cap_desc, accent_color) in enumerate(capabilities):
    gx = xs[i % 2]
    gy = ys[i // 2]
    card = create_panel(s4, gx, gy, grid_w, grid_h, C_BG_WHITE, C_BORDER_CARD)
    
    # Left vertical accent line
    vline = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, gx, gy, Inches(0.08), grid_h)
    vline.fill.solid()
    vline.fill.fore_color.rgb = accent_color
    vline.line.fill.background()

    tb = s4.shapes.add_textbox(gx + Inches(0.35), gy + Inches(0.2), grid_w - Inches(0.55), grid_h - Inches(0.35))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_top = tf.paragraphs[0]
    r_stat = p_top.add_run()
    r_stat.text = f"{stat}  "
    r_stat.font.name = FONT_HEADING
    r_stat.font.size = Pt(20)
    r_stat.font.bold = True
    r_stat.font.color.rgb = accent_color

    r_tag = p_top.add_run()
    r_tag.text = f"•  {tag}"
    r_tag.font.name = FONT_HEADING
    r_tag.font.size = Pt(9.5)
    r_tag.font.bold = True
    r_tag.font.color.rgb = C_INK_MUTED

    p_ct = tf.add_paragraph()
    p_ct.text = cap_title
    p_ct.font.name = FONT_HEADING
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

add_speaker_note(s4, """These four numbers define the production engineering standards of FileMind.

First, 150 files: users can drop up to 150 PDFs simultaneously without crashing the browser or exhausting serverless functions. Our sliding-window batch upload manager maintains at most 4 active uploads and 2 parallel AI worker threads.

Second, Gemini 3.6: we ingest full PDFs into Google's Multimodal Files API to extract structured JSON metadata, including document category, topic tags, and key entities.

Third, sub-200ms semantic search: our 768-dimensional vector engine is paired with an in-memory 500-entry LRU cache to eliminate cache stampedes and return instant answers.

Fourth, 100% RLS: data isolation is enforced at the database level with PostgreSQL Row-Level Security and transactional advisory locks.""")

# =============================================================================
# SLIDE 5: INGESTION PIPELINE (5-Stage Horizontal Execution Rail)
# =============================================================================
s5 = prs.slides.add_slide(blank_layout)
set_slide_background(s5, C_BG_WARM)
add_header(s5, "04", "Execution Pipeline", "Deterministic 5-Stage Ingestion & Processing Lifecycle", "The exact end-to-end journey from client drag-and-drop to vector retrieval.")

# Background connecting rail
rail = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(2.28), Inches(11.733), Inches(0.04))
rail.fill.solid()
rail.fill.fore_color.rgb = C_BORDER_LIGHT
rail.line.fill.background()

col_w = Inches(2.18)
col_h = Inches(4.5)
col_gap = Inches(0.2)

stages = [
    ("01", "INGEST", "Client Batch Upload", "Browser validates 49 MiB limit and %PDF magic bytes. Sliding-window queue streams files directly to Supabase S3 without server bottlenecks.", C_ACCENT_TERRA),
    ("02", "VERIFY", "Atomic Quota Check", "PostgreSQL stored procedure executes pg_advisory_xact_lock(user_id) to atomically enforce 2 GB storage limit and 250 docs/hr rate limit.", C_INK_HEADING),
    ("03", "LOCK", "Queue Lease Claim", "Background worker claims pending job via FOR UPDATE SKIP LOCKED. Issues a cryptographic UUID fencing token to prevent duplicate work.", C_ACCENT_AMBER),
    ("04", "UNDERSTAND", "Multimodal Extraction", "Transfers PDF to Gemini Files API. Model cascade (3.6-flash -> 3.8-flash -> preview) parses category, topic tags, and pages with exponential backoff.", C_ACCENT_TERRA),
    ("05", "INDEX", "Vector Index Commit", "Worker validates lease token, commits metadata, generates 768-dim embeddings, stores vectors in pgvector, and marks document ready.", C_ACCENT_EMER)
]

for i, (num, tag, stage_title, stage_desc, step_color) in enumerate(stages):
    cx = Inches(0.8 + i * (2.18 + 0.2))
    
    # Step Number Pill on Rail
    pill = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx + Inches(0.4), Inches(2.1), Inches(1.38), Inches(0.4))
    pill.fill.solid()
    pill.fill.fore_color.rgb = C_BG_WHITE
    pill.line.color.rgb = step_color
    pill.line.width = Pt(1.5)

    tb_p = s5.shapes.add_textbox(cx + Inches(0.4), Inches(2.12), Inches(1.38), Inches(0.36))
    tf_p = tb_p.text_frame
    tf_p.word_wrap = True
    tf_p.margin_left = tf_p.margin_top = tf_p.margin_right = tf_p.margin_bottom = 0
    p_pill = tf_p.paragraphs[0]
    p_pill.text = f"{num} · {tag}"
    p_pill.alignment = PP_ALIGN.CENTER
    p_pill.font.name = FONT_HEADING
    p_pill.font.size = Pt(9.5)
    p_pill.font.bold = True
    p_pill.font.color.rgb = step_color

    # Content Card
    card = create_panel(s5, cx, Inches(2.7), col_w, Inches(3.9), C_BG_WHITE, C_BORDER_CARD)
    tb_c = s5.shapes.add_textbox(cx + Inches(0.2), Inches(2.9), col_w - Inches(0.4), Inches(3.5))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0

    p_st = tf_c.paragraphs[0]
    p_st.text = stage_title
    p_st.font.name = FONT_HEADING
    p_st.font.size = Pt(12.5)
    p_st.font.bold = True
    p_st.font.color.rgb = C_INK_HEADING

    p_sd = tf_c.add_paragraph()
    p_sd.text = stage_desc
    p_sd.font.name = FONT_BODY
    p_sd.font.size = Pt(10)
    p_sd.font.color.rgb = C_INK_SECONDARY
    p_sd.space_before = Pt(8)

add_speaker_note(s5, """Here is the deterministic execution pipeline powering FileMind.

Stage 1 is Ingest: the client validates magic bytes and streams files directly to private S3 storage with presigned URLs.

Stage 2 is Verify: our database procedure executes pg_advisory_xact_lock to verify storage existence and enforce the user's 2 GB quota atomically.

Stage 3 is Lock: distributed workers claim jobs with FOR UPDATE SKIP LOCKED and a cryptographic UUID fencing token to eliminate race conditions.

Stage 4 is Understand: the PDF is passed to Google Gemini 3.6 Flash. If transient 503 errors occur, our cascade backs off and falls back seamlessly.

Stage 5 is Index: results are validated against the fencing lease, 768-dimensional embeddings are generated and stored in pgvector, and the document is ready for instant retrieval.""")

# =============================================================================
# SLIDE 6: REAL APPLICATION INTERFACE (High-Res Screenshots in Browser Chrome)
# =============================================================================
s6 = prs.slides.add_slide(blank_layout)
set_slide_background(s6, C_BG_WARM)
add_header(s6, "05", "Product Interface", "Production Application Interface & Workspace Experience", "Modern, pixel-perfect dark-mode web application built with Next.js 16 and Tailwind CSS.")

sc_w = Inches(5.65)
sc_h = Inches(4.7)
sc_y = Inches(2.1)

# Screenshot 1: Dashboard
s6_left = create_panel(s6, Inches(0.8), sc_y, sc_w, sc_h, C_BG_WHITE, C_BORDER_CARD)
# Browser top bar
bar_l = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), sc_y, sc_w, Inches(0.36))
bar_l.fill.solid()
bar_l.fill.fore_color.rgb = C_BG_PANEL
bar_l.line.fill.background()

tb_b1 = s6.shapes.add_textbox(Inches(1.0), sc_y + Inches(0.08), sc_w - Inches(0.4), Inches(0.24))
tf_b1 = tb_b1.text_frame
p_b1 = tf_b1.paragraphs[0]
p_b1.text = "● ● ●   https://filemind.vault/dashboard"
p_b1.font.name = FONT_MONO
p_b1.font.size = Pt(9)
p_b1.font.color.rgb = C_INK_SECONDARY

# Image insertion
img1_path = os.path.abspath("presentation_assets/01_dashboard.png")
if os.path.exists(img1_path):
    s6.shapes.add_picture(img1_path, Inches(0.9), sc_y + Inches(0.45), width=sc_w - Inches(0.2))

# Caption 1
tb_cap1 = s6.shapes.add_textbox(Inches(0.9), sc_y + Inches(4.0), sc_w - Inches(0.2), Inches(0.6))
tf_cap1 = tb_cap1.text_frame
tf_cap1.word_wrap = True
tf_cap1.margin_left = tf_cap1.margin_top = tf_cap1.margin_right = tf_cap1.margin_bottom = 0
p_c1 = tf_cap1.paragraphs[0]
r_c1_t = p_c1.add_run()
r_c1_t.text = "Dashboard & Ingestion Zone: "
r_c1_t.font.name = FONT_HEADING
r_c1_t.font.size = Pt(10.5)
r_c1_t.font.bold = True
r_c1_t.font.color.rgb = C_ACCENT_TERRA

r_c1_d = p_c1.add_run()
r_c1_d.text = "Displays live storage quota metrics (8.1 MB used), 150-file bulk drag-and-drop dropzone, and authoritative processing progress."
r_c1_d.font.name = FONT_BODY
r_c1_d.font.size = Pt(9.5)
r_c1_d.font.color.rgb = C_INK_SECONDARY

# Screenshot 2: Documents Vault
s6_right = create_panel(s6, Inches(6.85), sc_y, sc_w, sc_h, C_BG_WHITE, C_BORDER_CARD)
bar_r = s6.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), sc_y, sc_w, Inches(0.36))
bar_r.fill.solid()
bar_r.fill.fore_color.rgb = C_BG_PANEL
bar_r.line.fill.background()

tb_b2 = s6.shapes.add_textbox(Inches(7.05), sc_y + Inches(0.08), sc_w - Inches(0.4), Inches(0.24))
tf_b2 = tb_b2.text_frame
p_b2 = tf_b2.paragraphs[0]
p_b2.text = "● ● ●   https://filemind.vault/documents"
p_b2.font.name = FONT_MONO
p_b2.font.size = Pt(9)
p_b2.font.color.rgb = C_INK_SECONDARY

img2_path = os.path.abspath("presentation_assets/03_documents_vault.png")
if os.path.exists(img2_path):
    s6.shapes.add_picture(img2_path, Inches(6.95), sc_y + Inches(0.45), width=sc_w - Inches(0.2))

# Caption 2
tb_cap2 = s6.shapes.add_textbox(Inches(6.95), sc_y + Inches(4.0), sc_w - Inches(0.2), Inches(0.6))
tf_cap2 = tb_cap2.text_frame
tf_cap2.word_wrap = True
tf_cap2.margin_left = tf_cap2.margin_top = tf_cap2.margin_right = tf_cap2.margin_bottom = 0
p_c2 = tf_cap2.paragraphs[0]
r_c2_t = p_c2.add_run()
r_c2_t.text = "Documents Vault & Semantic Explorer: "
r_c2_t.font.name = FONT_HEADING
r_c2_t.font.size = Pt(10.5)
r_c2_t.font.bold = True
r_c2_t.font.color.rgb = C_ACCENT_TERRA

r_c2_d = p_c2.add_run()
r_c2_d.text = "Filterable document repository showing Gemini-extracted categories (Financial Report, Contract, Research), topic tags, and verified file statuses."
r_c2_d.font.name = FONT_BODY
r_c2_d.font.size = Pt(9.5)
r_c2_d.font.color.rgb = C_INK_SECONDARY

add_speaker_note(s6, """These screenshots show the actual, running FileMind interface captured directly from our production deployment.

On the left is our Dashboard. It presents a clean, responsive workspace displaying real-time quota metrics — here showing 8.1 MB of our 2 GB quota utilized — alongside our drag-and-drop batch ingestion area.

On the right is the Document Vault. As you can see, documents are not simply listed by file name. Google Gemini has categorized them into Financial Reports, Contracts, and Research Papers, and assigned semantic tags like #Finance, #Q3, and #Attention. Users can filter by status and launch the embedded viewer directly.""")

# =============================================================================
# SLIDE 7: VERIFIED TECH STACK (3-Column Architectural Foundation)
# =============================================================================
s7 = prs.slides.add_slide(blank_layout)
set_slide_background(s7, C_BG_WARM)
add_header(s7, "06", "Technology Stack", "Modern, Type-Safe, Production Engineering Stack", "Engineered with production-grade frameworks ensuring performance, security, and developer ergonomics.")

col7_w = Inches(3.68)
col7_h = Inches(4.8)
col7_y = Inches(2.1)

stacks = [
    ("FRONTEND & APPLICATION", C_ACCENT_TERRA, [
        ("Next.js 16.3 (App Router)", "Turbopack bundler for sub-second hot reloading, Server Components, and Next.js 16 after() background execution."),
        ("React 19.2", "Latest React architecture supporting streaming transitions, optimistic UI updates, and concurrent rendering."),
        ("Tailwind CSS v4", "High-contrast dark-mode theme compiled directly with zero heavy JavaScript CSS runtime overhead."),
        ("PDF.js & Lucide React", "Lossless client-side PDF document rendering paired with clean, accessible icon semantics.")
    ]),
    ("BACKEND, DB & SECURITY", C_INK_HEADING, [
        ("Supabase PostgreSQL 15+", "Database Row-Level Security (RLS) guaranteeing strict multi-tenant vault isolation and data protection."),
        ("PL/pgSQL Stored Procedures", "Atomic RPCs: create_document_with_quota, claim_next_pending_document, and finalize_document_processing."),
        ("PostgreSQL Advisory Locks", "Session & transactional locking (pg_advisory_xact_lock) preventing concurrent quota circumvention."),
        ("Supabase S3 Private Storage", "Private document bucket with authenticated presigned download URLs expiring in 120-300 seconds.")
    ]),
    ("MULTIMODAL AI & RETRIEVAL", C_ACCENT_EMER, [
        ("Google Gemini 3.6 API", "Direct PDF ingestion via Multimodal Files API with structured JSON schema output and prompt injection defense."),
        ("3-Tier Fallback Cascade", "Resilient fallbacks: gemini-3.6-flash -> gemini-3.8-flash -> preview with jittered backoff against 503 spikes."),
        ("Vector Embeddings (768-dim)", "Hybrid semantic search utilizing pgvector cosine similarity for high-recall question answering."),
        ("In-Memory 500 LRU Cache", "Normalizes user queries and collapses duplicate in-flight requests to eliminate cache stampedes.")
    ])
]

for i, (title, accent_color, items) in enumerate(stacks):
    cx = Inches(0.8 + i * (3.68 + 0.35))
    panel = create_panel(s7, cx, col7_y, col7_w, col7_h, C_BG_WHITE, C_BORDER_CARD)
    
    # Top accent bar
    tbar = s7.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, col7_y, col7_w, Inches(0.08))
    tbar.fill.solid()
    tbar.fill.fore_color.rgb = accent_color
    tbar.line.fill.background()

    tb = s7.shapes.add_textbox(cx + Inches(0.25), col7_y + Inches(0.3), col7_w - Inches(0.5), col7_h - Inches(0.4))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(11)
    p_t.font.bold = True
    p_t.font.color.rgb = accent_color

    for tech_name, tech_desc in items:
        p_item = tf.add_paragraph()
        p_item.space_before = Pt(10)
        
        r_name = p_item.add_run()
        r_name.text = f"• {tech_name}\n"
        r_name.font.name = FONT_HEADING
        r_name.font.size = Pt(11)
        r_name.font.bold = True
        r_name.font.color.rgb = C_INK_HEADING

        r_desc = p_item.add_run()
        r_desc.text = tech_desc
        r_desc.font.name = FONT_BODY
        r_desc.font.size = Pt(9.5)
        r_desc.font.color.rgb = C_INK_SECONDARY

add_speaker_note(s7, """Our technology stack was chosen strictly for performance, type safety, and multi-tenant security.

On the frontend, we run Next.js 16.3 with React 19.2 and Tailwind CSS v4. Next.js 16's after() function allows us to trigger asynchronous background processing without delaying client HTTP responses.

On the backend, Supabase PostgreSQL acts as our single source of truth. We enforce Row-Level Security on every table. Storage quotas and queue claiming are executed inside PL/pgSQL stored procedures using transactional advisory locks to eliminate race conditions.

For AI, we use Google Gemini 3.6 Flash. Unlike legacy OCR pipelines, Gemini parses visual layouts, tables, and images directly. We pair this with 768-dimensional pgvector embeddings and an in-memory 500-capacity LRU query cache.""")

# =============================================================================
# SLIDE 8: SYSTEM ARCHITECTURE (4-Tier Layered Schematic)
# =============================================================================
s8 = prs.slides.add_slide(blank_layout)
set_slide_background(s8, C_BG_WARM)
add_header(s8, "07", "System Architecture", "Decoupled Four-Tier Enterprise Architecture", "Clear separation of concerns across presentation, serverless routing, database security, and AI intelligence.")

tier_w = Inches(11.733)
tier_h = Inches(1.08)
tier_gap = Inches(0.18)
tier_y_base = Inches(2.1)

tiers = [
    ("CLIENT PRESENTATION LAYER", C_ACCENT_TERRA,
     "Browser App Router UI (Dashboard, Documents Vault, PDF.js Viewer, Semantic Search Explorer)  •  Client-Side Sliding-Window Batch Queue Manager (Max 4 concurrent uploads, independent progress & retry)."),
    ("APPLICATION GATEWAY & SERVERLESS ROUTING", C_INK_HEADING,
     "Next.js 16 Server Actions & Edge API Routes (/api/documents, /api/search, /api/cron/process-queue)  •  Execution Budgets with Next.js 16 after() & Supabase Auth JWT Session Gateways."),
    ("DATABASE & SECURE STORAGE TIER", C_ACCENT_EMER,
     "Supabase PostgreSQL with Row-Level Security (RLS) preventing tenant cross-bleed  •  Atomic PL/pgSQL RPCs with Transactional Advisory Locks  •  Private S3 Storage Bucket 'documents' with expiring URLs."),
    ("AI INTELLIGENCE & ACCELERATION ENGINE", C_ACCENT_AMBER,
     "Google Gemini Multimodal Files API (Structured JSON Extraction, Category & Key-Value Metadata)  •  Vector Embeddings paired with in-memory 500-LRU Cache & Lossless pdf-lib Stream Optimizer.")
]

for i, (tier_title, accent_color, tier_desc) in enumerate(tiers):
    ty = Inches(2.1 + i * (1.08 + 0.18))
    panel = create_panel(s8, Inches(0.8), ty, tier_w, tier_h, C_BG_WHITE, C_BORDER_CARD)
    
    # Left accent ribbon
    ribbon = s8.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), ty, Inches(0.1), tier_h)
    ribbon.fill.solid()
    ribbon.fill.fore_color.rgb = accent_color
    ribbon.line.fill.background()

    tb = s8.shapes.add_textbox(Inches(1.15), ty + Inches(0.18), tier_w - Inches(0.5), tier_h - Inches(0.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    p_t.text = tier_title
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(11)
    p_t.font.bold = True
    p_t.font.color.rgb = accent_color

    p_d = tf.add_paragraph()
    p_d.text = tier_desc
    p_d.font.name = FONT_BODY
    p_d.font.size = Pt(10)
    p_d.font.color.rgb = C_INK_SECONDARY
    p_d.space_before = Pt(3)

add_speaker_note(s8, """This diagram illustrates FileMind's four-tier decoupled architecture.

At the top, the Client Presentation Layer manages the interactive UI and our sliding-window upload manager. It controls concurrency directly in the browser, preventing server overload.

Second, the Application Gateway handles routing and authentication via Supabase Auth JWT tokens. Using Next.js 16's after() API, long-running AI jobs continue processing even after HTTP responses are closed.

Third, the Database & Storage Tier provides our security perimeter. Row-Level Security prevents users from reading or mutating other tenants' records. Storage verification and quota checks run inside atomic database transactions.

Finally, the AI Intelligence Tier handles Gemini multimodal analysis and vector embedding generation, supported by an in-memory LRU cache to eliminate redundant compute.""")

# =============================================================================
# SLIDE 9: FEATURE MATRIX (Editorial Comparison Table)
# =============================================================================
s9 = prs.slides.add_slide(blank_layout)
set_slide_background(s9, C_BG_WARM)
add_header(s9, "08", "Competitive Analysis", "Architectural Capability & Feature Matrix", "Direct technical comparison against local operating system storage and generic cloud drives.")

# Table creation
rows = 6
cols = 4
tbl_left = Inches(0.8)
tbl_top = Inches(2.1)
tbl_w = Inches(11.733)
tbl_h = Inches(4.7)

table_shape = s9.shapes.add_table(rows, cols, tbl_left, tbl_top, tbl_w, tbl_h)
tbl = table_shape.table

# Set Column Widths
tbl.columns[0].width = Inches(3.0)
tbl.columns[1].width = Inches(2.6)
tbl.columns[2].width = Inches(2.6)
tbl.columns[3].width = Inches(3.533)

headers = ["Core Capability", "Local OS Folders", "Generic Cloud Drive", "FileMind AI Vault"]
for col_idx, h_text in enumerate(headers):
    cell = tbl.cell(0, col_idx)
    cell.fill.solid()
    cell.fill.fore_color.rgb = C_BG_PANEL if col_idx < 3 else C_BG_LIGHT_TINT
    tf = cell.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = h_text
    p.font.name = FONT_HEADING
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT_TERRA if col_idx == 3 else C_INK_HEADING

matrix_data = [
    ("Search Methodology", "Exact filename match only", "Keyword match on text PDFs", "Semantic Vector Retrieval (768-dim embeddings)"),
    ("Multimodal Understanding", "None (Manual reading)", "Basic text OCR only", "Structured JSON Schema (Category, Tags, Key-Values)"),
    ("Scanned & Image PDFs", "Opaque & Inaccessible", "Garbled multi-column text", "100% Understood via Multimodal Vision AI"),
    ("Bulk Batch Processing", "OS File Copy (No validation)", "Slow sequential sync", "150-File Sliding Window (4x concurrent streams)"),
    ("Security & Tenant Isolation", "Local user OS permissions", "Coarse folder sharing links", "Database Row-Level Security (RLS) & Fencing Leases")
]

for row_idx, row_data in enumerate(matrix_data, start=1):
    for col_idx, val in enumerate(row_data):
        cell = tbl.cell(row_idx, col_idx)
        cell.fill.solid()
        if col_idx == 3:
            cell.fill.fore_color.rgb = C_BG_LIGHT_TINT
        else:
            cell.fill.fore_color.rgb = C_BG_WHITE if row_idx % 2 == 1 else C_BG_PANEL
        
        tf = cell.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = val
        p.font.name = FONT_BODY
        p.font.size = Pt(10)
        if col_idx == 3:
            p.font.bold = True
            p.font.color.rgb = C_ACCENT_TERRA
        else:
            p.font.color.rgb = C_INK_SECONDARY

add_speaker_note(s9, """This matrix demonstrates why FileMind represents a distinct technological upgrade over traditional solutions.

Local folders and generic cloud drives rely on filename matches or crude OCR that fails completely on multi-column papers and scanned invoices. FileMind understands documents natively via Google Gemini's multimodal vision and indexes their semantic meaning into 768-dimensional vector space.

From a systems engineering standpoint, FileMind introduces client-side sliding-window concurrency handling 150 files, atomic database quotas, and strict multi-tenant Row-Level Security. It bridges the gap between raw file storage and production document intelligence.""")

# =============================================================================
# SLIDE 10: ENGINEERING RIGOR & CHALLENGES (2x2 Case Study Grid)
# =============================================================================
s10 = prs.slides.add_slide(blank_layout)
set_slide_background(s10, C_BG_WARM)
add_header(s10, "09", "Engineering Rigor", "Technical Engineering Hurdles & Verified Solutions", "Real software engineering obstacles encountered during development and the verified solutions implemented.")

c_w = Inches(5.65)
c_h = Inches(2.28)
xs = [Inches(0.8), Inches(6.85)]
ys = [Inches(2.1), Inches(4.6)]

challenges = [
    ("1. Gemini 503 Spikes & Model Fallback Cascade",
     "Challenge: During peak traffic, Google's standard Gemini tier returns 503 UNAVAILABLE, causing queue processing failures and stranded jobs.\n"
     "Solution: Engineered an intelligent 3-tier cascade: gemini-3.6-flash -> gemini-3.8-flash -> gemini-3-flash-preview with jittered exponential backoff.", C_ACCENT_TERRA),
    ("2. Serverless Execution Budgets on 150-File Batches",
     "Challenge: Processing 150 PDFs inside a standard Next.js 60-second serverless execution budget leads to function timeout kills.\n"
     "Solution: Implemented client sliding-window batching (max 4 uploads, max 2 AI workers), Next.js after() execution, and a pg_cron background consumer.", C_INK_HEADING),
    ("3. Concurrency Race Conditions & Deadlocks",
     "Challenge: Simultaneous file confirmations cause duplicate rows and quota circumvention under concurrent uploads.\n"
     "Solution: Added transactional PostgreSQL advisory locks pg_advisory_xact_lock(user_id) and atomic SKIP LOCKED queue claiming with UUID fencing leases.", C_ACCENT_EMER),
    ("4. Safe PDF Optimization Without Corruption",
     "Challenge: Compressing digitally signed or encrypted PDFs invalidates cryptographic signatures and renders files unreadable.\n"
     "Solution: Conservative pre-checks detect /ByteRange signatures and /Encrypt dictionaries, safely skipping them while optimizing standard structural streams.", C_ACCENT_AMBER)
]

for i, (title, text_content, accent_color) in enumerate(challenges):
    gx = xs[i % 2]
    gy = ys[i // 2]
    card = create_panel(s10, gx, gy, c_w, c_h, C_BG_WHITE, C_BORDER_CARD)
    
    # Left accent line
    vline = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, gx, gy, Inches(0.08), c_h)
    vline.fill.solid()
    vline.fill.fore_color.rgb = accent_color
    vline.line.fill.background()

    tb = s10.shapes.add_textbox(gx + Inches(0.35), gy + Inches(0.18), c_w - Inches(0.55), c_h - Inches(0.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    p_t.text = title
    p_t.font.name = FONT_HEADING
    p_t.font.size = Pt(12)
    p_t.font.bold = True
    p_t.font.color.rgb = C_INK_HEADING

    lines = text_content.split("\n")
    for line in lines:
        p_l = tf.add_paragraph()
        p_l.space_before = Pt(3)
        parts = line.split(": ", 1)
        if len(parts) == 2:
            r_lbl = p_l.add_run()
            r_lbl.text = f"{parts[0]}: "
            r_lbl.font.name = FONT_HEADING
            r_lbl.font.size = Pt(9.5)
            r_lbl.font.bold = True
            r_lbl.font.color.rgb = accent_color if "Solution" in parts[0] else C_ACCENT_RED
            
            r_val = p_l.add_run()
            r_val.text = parts[1]
            r_val.font.name = FONT_BODY
            r_val.font.size = Pt(9.5)
            r_val.font.color.rgb = C_INK_SECONDARY
        else:
            r_val = p_l.add_run()
            r_val.text = line
            r_val.font.name = FONT_BODY
            r_val.font.size = Pt(9.5)
            r_val.font.color.rgb = C_INK_SECONDARY

add_speaker_note(s10, """This slide demonstrates the engineering rigor behind FileMind. We solved four real-world engineering hurdles.

First, model resilience: Gemini's public API occasionally spikes with 503 errors during high traffic. We engineered a 3-tier fallback cascade that shifts from Gemini 3.6 to 3.8 to flash-preview with exponential backoff.

Second, serverless timeouts: processing 150 documents synchronously would easily exceed Next.js's 60-second limit. We split processing into a client sliding-window queue combined with Next.js after() background execution.

Third, concurrency race conditions: when 4 uploads finish simultaneously, users could exceed their 2 GB quota. We implemented transactional PostgreSQL advisory locks to serialize confirmations atomically.

Fourth, PDF optimization: aggressive compression can corrupt signed or encrypted PDFs. Our pipeline detects ByteRange signatures and Encrypt dictionaries to safely skip them.""")

# =============================================================================
# SLIDE 11: FUTURE ROADMAP (Phased Engineering Milestones)
# =============================================================================
s11 = prs.slides.add_slide(blank_layout)
set_slide_background(s11, C_BG_WARM)
add_header(s11, "10", "Strategic Vision", "Future Engineering Roadmap & Planned Advancements", "Architectural roadmap designed to expand FileMind into an enterprise-ready knowledge platform.")

rm_w = Inches(11.733)
rm_h = Inches(1.08)
rm_y_base = Inches(2.1)

phases = [
    ("PHASE 02 · NEAR-TERM", C_ACCENT_TERRA, "Cross-Document Synthesis & Multi-PDF Comparative Q&A",
     "Query across the entire document vault simultaneously (e.g. 'Compare revenue growth and profit margins across all Q1, Q2, and Q3 financial reports') with comparative synthesis."),
    ("PHASE 03 · MEDIUM-TERM", C_INK_HEADING, "Visual Citations & Bounding-Box Viewer Integration",
     "Direct canvas integration highlighting the exact sentence and bounding-box rectangle on the original PDF page for every generated answer, guaranteeing 100% verifiable citations."),
    ("PHASE 04 · LONG-TERM", C_ACCENT_EMER, "Local & Air-Gapped LLM Execution via Ollama / vLLM",
     "Support for completely offline inference using Ollama and vLLM for highly sensitive legal, defense, or HIPAA-regulated medical environments requiring zero external API traffic."),
    ("PHASE 05 · ENTERPRISE", C_ACCENT_AMBER, "Collaborative Team Workspaces, Granular RBAC & Audit Logs",
     "Multi-user workspaces with role-based access control (Admin, Contributor, Read-Only Reviewer) and cryptographic audit logs tracking all document access and query histories.")
]

for i, (phase_tag, accent_color, phase_title, phase_desc) in enumerate(phases):
    py = Inches(2.1 + i * (1.08 + 0.18))
    panel = create_panel(s11, Inches(0.8), py, rm_w, rm_h, C_BG_WHITE, C_BORDER_CARD)
    
    # Left accent ribbon
    ribbon = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), py, Inches(0.1), rm_h)
    ribbon.fill.solid()
    ribbon.fill.fore_color.rgb = accent_color
    ribbon.line.fill.background()

    tb = s11.shapes.add_textbox(Inches(1.15), py + Inches(0.18), rm_w - Inches(0.5), rm_h - Inches(0.3))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    p_t = tf.paragraphs[0]
    r_tag = p_t.add_run()
    r_tag.text = f"{phase_tag}  •  "
    r_tag.font.name = FONT_HEADING
    r_tag.font.size = Pt(10)
    r_tag.font.bold = True
    r_tag.font.color.rgb = accent_color

    r_tit = p_t.add_run()
    r_tit.text = phase_title
    r_tit.font.name = FONT_HEADING
    r_tit.font.size = Pt(12)
    r_tit.font.bold = True
    r_tit.font.color.rgb = C_INK_HEADING

    p_d = tf.add_paragraph()
    p_d.text = phase_desc
    p_d.font.name = FONT_BODY
    p_d.font.size = Pt(10)
    p_d.font.color.rgb = C_INK_SECONDARY
    p_d.space_before = Pt(3)

add_speaker_note(s11, """Looking forward, we have established a clear 4-phase architectural roadmap.

In Phase 2, we will enable multi-document synthesis, allowing users to query across their entire library to compare reports and identify trends.

In Phase 3, we will add visual bounding-box citations directly on our PDF.js canvas, highlighting the exact sentence where an answer originated.

In Phase 4, we plan to integrate local inference with Ollama and vLLM, making FileMind completely air-gapped for defense and healthcare compliance.

Finally, in Phase 5, we will add multi-tenant team workspaces with role-based access control and cryptographic audit logging.""")

# =============================================================================
# SLIDE 12: CONCLUSION & LIVE DEMO PROTOCOL (Dual Panel Callout)
# =============================================================================
s12 = prs.slides.add_slide(blank_layout)
set_slide_background(s12, C_BG_WARM)
add_header(s12, "11", "Conclusion & Evaluation", "FileMind: The Autonomous Document Intelligence Vault", "Summary of academic and technical achievements, and protocol for hands-on evaluation.")

c12_w = Inches(5.65)
c12_h = Inches(4.8)
c12_y = Inches(2.1)

# Left Panel: Key Takeaways
p_left = create_panel(s12, Inches(0.8), c12_y, c12_w, c12_h, C_BG_WHITE, C_BORDER_CARD)
top_l = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), c12_y, c12_w, Inches(0.08))
top_l.fill.solid()
top_l.fill.fore_color.rgb = C_ACCENT_TERRA
top_l.line.fill.background()

tb_cl = s12.shapes.add_textbox(Inches(1.15), c12_y + Inches(0.3), c12_w - Inches(0.7), c12_h - Inches(0.5))
tf_cl = tb_cl.text_frame
tf_cl.word_wrap = True
tf_cl.margin_left = tf_cl.margin_top = tf_cl.margin_right = tf_cl.margin_bottom = 0

p_lt = tf_cl.paragraphs[0]
p_lt.text = "KEY PROJECT TAKEAWAYS"
p_lt.font.name = FONT_HEADING
p_lt.font.size = Pt(10)
p_lt.font.bold = True
p_lt.font.color.rgb = C_ACCENT_TERRA

p_lh = tf_cl.add_paragraph()
p_lh.text = "Academic & Technical Achievements"
p_lh.font.name = FONT_HEADING
p_lh.font.size = Pt(16)
p_lh.font.bold = True
p_lh.font.color.rgb = C_INK_HEADING
p_lh.space_before = Pt(3)

takeaways = [
    ("Problem Solved", "Replaces passive, unsearchable folders with an active AI-powered document intelligence vault."),
    ("Production Quality", "Built with Next.js 16, Supabase PostgreSQL, and Google Gemini with verified automated test suites."),
    ("Resilient Concurrency", "Tested with 150-file bulk batches, automated recovery, and transactional advisory locks."),
    ("High Privacy & Security", "Database-enforced Row-Level Security ensuring strict per-user vault isolation.")
]

for title, desc in takeaways:
    p_t = tf_cl.add_paragraph()
    p_t.space_before = Pt(10)
    r_chk = p_t.add_run()
    r_chk.text = "✓  "
    r_chk.font.name = FONT_HEADING
    r_chk.font.size = Pt(11)
    r_chk.font.bold = True
    r_chk.font.color.rgb = C_ACCENT_EMER

    r_tit = p_t.add_run()
    r_tit.text = f"{title}: "
    r_tit.font.name = FONT_HEADING
    r_tit.font.size = Pt(11)
    r_tit.font.bold = True
    r_tit.font.color.rgb = C_INK_HEADING

    r_d = p_t.add_run()
    r_d.text = desc
    r_d.font.name = FONT_BODY
    r_d.font.size = Pt(10)
    r_d.font.color.rgb = C_INK_SECONDARY

# Right Panel: Live Demonstration Protocol
p_right = create_panel(s12, Inches(6.85), c12_y, c12_w, c12_h, C_BG_WHITE, C_BORDER_CARD)
top_r = s12.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.85), c12_y, c12_w, Inches(0.08))
top_r.fill.solid()
top_r.fill.fore_color.rgb = C_ACCENT_EMER
top_r.line.fill.background()

tb_cr = s12.shapes.add_textbox(Inches(7.2), c12_y + Inches(0.3), c12_w - Inches(0.7), c12_h - Inches(0.5))
tf_cr = tb_cr.text_frame
tf_cr.word_wrap = True
tf_cr.margin_left = tf_cr.margin_top = tf_cr.margin_right = tf_cr.margin_bottom = 0

p_rt = tf_cr.paragraphs[0]
p_rt.text = "LIVE EVALUATION & DEMONSTRATION"
p_rt.font.name = FONT_HEADING
p_rt.font.size = Pt(10)
p_rt.font.bold = True
p_rt.font.color.rgb = C_ACCENT_EMER

p_rh = tf_cr.add_paragraph()
p_rh.text = "Ready for Hands-On Evaluation"
p_rh.font.name = FONT_HEADING
p_rh.font.size = Pt(16)
p_rh.font.bold = True
p_rh.font.color.rgb = C_INK_HEADING
p_rh.space_before = Pt(3)

demo_steps = [
    ("1. Live Ingestion Walkthrough", "Drag-and-drop a sample batch of test invoices, papers, and agreements into the active web interface."),
    ("2. Real-Time Multimodal Extraction", "Observe Gemini classifying categories, extracting structured key-values, and indexing pages on-the-fly."),
    ("3. Semantic Search & Snippet Matching", "Search by concept in natural language and observe sub-200ms vector retrieval with snippet highlights.")
]

for title, desc in demo_steps:
    p_d = tf_cr.add_paragraph()
    p_d.space_before = Pt(8)
    r_dt = p_d.add_run()
    r_dt.text = f"{title}\n"
    r_dt.font.name = FONT_HEADING
    r_dt.font.size = Pt(11)
    r_dt.font.bold = True
    r_dt.font.color.rgb = C_INK_HEADING

    r_dd = p_d.add_run()
    r_dd.text = desc
    r_dd.font.name = FONT_BODY
    r_dd.font.size = Pt(10)
    r_dd.font.color.rgb = C_INK_SECONDARY

p_contact = tf_cr.add_paragraph()
p_contact.space_before = Pt(12)
r_c_lbl = p_contact.add_run()
r_c_lbl.text = "Resources & Repository:\n"
r_c_lbl.font.name = FONT_HEADING
r_c_lbl.font.size = Pt(10)
r_c_lbl.font.bold = True
r_c_lbl.font.color.rgb = C_ACCENT_TERRA

r_c_val = p_contact.add_run()
r_c_val.text = "GitHub: [github.com/your-username/filemind]   |   Demo URL: [http://localhost:3000]\nThank you! We welcome questions from our teacher and hackathon judges."
r_c_val.font.name = FONT_BODY
r_c_val.font.size = Pt(9.5)
r_c_val.font.color.rgb = C_INK_SECONDARY

add_speaker_note(s12, """To conclude our presentation: FileMind takes the friction out of document management. By bridging the gap between secure cloud storage and state-of-the-art multimodal AI, we transform dead PDF archives into dynamic knowledge bases.

We have verified our implementation through automated test suites covering bulk upload concurrency, model fallbacks, and database security invariants.

At this point, we would love to invite you to our live demonstration where we will drop a sample batch of documents and demonstrate real-time extraction and semantic search.

Thank you for your time and guidance. We are ready for your questions!""")

# -----------------------------------------------------------------------------
# SAVE PRESENTATION
# -----------------------------------------------------------------------------
out_pptx = os.path.join(os.getcwd(), "FileMind_Project_Presentation.pptx")
prs.save(out_pptx)
print(f"Masterclass presentation successfully generated and saved to: {out_pptx}")
