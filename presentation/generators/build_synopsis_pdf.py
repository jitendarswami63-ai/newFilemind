import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
pt = 1
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, NextPageTemplate,
    Paragraph, Spacer, Table, TableStyle, PageBreak, Image
)
from reportlab.pdfgen import canvas
import pymupdf

class AcademicNumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to compute and render academic page numbers:
    - Page 1 (Cover Page): No header, no footer, no page number.
    - Page 2 (TOC): Roman numeral 'i' centered at bottom.
    - Pages 3 to 8 (Chapters): Running header at top and Arabic page numbers (1 to 6) centered at bottom.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        page_num = self._pageNumber
        
        # Margins for body: Left=1.5in (108pt), Right=1.0in (72pt), PageWidth=595.28pt
        left_margin = 108.0
        right_margin = 595.28 - 72.0
        center_x = (left_margin + right_margin) / 2.0
        
        if page_num == 1:
            # Cover page: completely clean, no header, no footer
            return
        elif page_num == 2:
            # Table of Contents page: roman numeral 'i'
            self.saveState()
            self.setFont("Times-Roman", 11)
            self.setFillColor(colors.black)
            self.drawCentredString(center_x, 42.0, "i")
            self.restoreState()
        else:
            # Body pages (Chapters 1 to 3): Pages 1 to 6
            body_page = page_num - 2
            self.saveState()
            
            # Running Header at y = 841.89 - 46 pt = 795.89 pt
            self.setFont("Times-Italic", 9.5)
            self.setFillColor(colors.HexColor("#333333"))
            self.drawString(left_margin, 796.0, "FileMind: AI-Powered Document Intelligence System")
            self.drawRightString(right_margin, 796.0, "Capstone Project Synopsis")
            
            # Thin academic header rule at y = 791 pt
            self.setStrokeColor(colors.HexColor("#888888"))
            self.setLineWidth(0.6)
            self.line(left_margin, 791.0, right_margin, 791.0)
            
            # Footer: Arabic page number centered at y = 42 pt
            self.setFont("Times-Roman", 11)
            self.setFillColor(colors.black)
            self.drawCentredString(center_x, 42.0, str(body_page))
            self.restoreState()

def build_pdf():
    pdf_filename = "FileMind_Capstone_Project_Synopsis_Jitendar_Swami.pdf"
    
    # A4 dimensions: 595.28 pt x 841.89 pt
    # Frame 1: Cover Page (Centered on physical page: Left=72pt, Right=72pt, Width=451.28pt)
    cover_frame = Frame(
        72.0, 48.0, 451.28, 745.0,
        id='cover_frame',
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0
    )
    
    # Frame 2: Body Pages (University thesis margins: Left=1.5in/108pt, Right=1.0in/72pt, Width=415.28pt)
    # Content height: from y=56 to y=782 (height = 726 pt)
    body_frame = Frame(
        108.0, 56.0, 415.28, 726.0,
        id='body_frame',
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0
    )
    
    doc = BaseDocTemplate(pdf_filename, pagesize=A4)
    doc.addPageTemplates([
        PageTemplate(id='CoverTemplate', frames=cover_frame),
        PageTemplate(id='BodyTemplate', frames=body_frame),
    ])
    
    styles = getSampleStyleSheet()
    
    # Cover Page Styles
    cover_right = ParagraphStyle(
        'CoverRight', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=11, leading=14, alignment=2
    )
    cover_a = ParagraphStyle(
        'CoverA', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=14, leading=16.5, alignment=1
    )
    cover_h1 = ParagraphStyle(
        'CoverH1', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=18, leading=22, alignment=1
    )
    cover_on = ParagraphStyle(
        'CoverOn', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=14, leading=16.5, alignment=1
    )
    cover_title = ParagraphStyle(
        'CoverTitle', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=16, leading=20, alignment=1
    )
    cover_sub = ParagraphStyle(
        'CoverSub', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=13, leading=16, alignment=1
    )
    cover_bold16 = ParagraphStyle(
        'CoverBold16', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=16, leading=20, alignment=1
    )
    cover_reg13 = ParagraphStyle(
        'CoverReg13', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=13, leading=16, alignment=1
    )
    cover_dept = ParagraphStyle(
        'CoverDept', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=13.5, leading=17, alignment=1
    )
    cover_inst = ParagraphStyle(
        'CoverInst', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=13.5, leading=17, alignment=1
    )
    cover_loc = ParagraphStyle(
        'CoverLoc', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=13, leading=16.5, alignment=1
    )
    cover_date = ParagraphStyle(
        'CoverDate', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=13.5, leading=17, alignment=1
    )
    
    # Body Styles (1.15 line spacing: fontSize=11.5, leading=14.5)
    chap_heading = ParagraphStyle(
        'ChapHeading', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=15, leading=18, alignment=1, spaceAfter=10
    )
    sec_heading = ParagraphStyle(
        'SecHeading', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=13, leading=16, alignment=0, spaceBefore=6, spaceAfter=3
    )
    subsec_heading = ParagraphStyle(
        'SubSecHeading', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=11.5, leading=14.5, alignment=0, spaceBefore=5, spaceAfter=2
    )
    body_text = ParagraphStyle(
        'BodyTextCustom', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=11, leading=14.0, alignment=4,
        firstLineIndent=20, spaceAfter=4
    )
    body_text_noindent = ParagraphStyle(
        'BodyTextNoIndent', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=11, leading=14.0, alignment=4,
        firstLineIndent=0, spaceAfter=4
    )
    body_bullet = ParagraphStyle(
        'BodyBullet', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=11, leading=14.0, alignment=4,
        leftIndent=20, firstLineIndent=-12, spaceAfter=3.5
    )
    
    # Table & TOC Styles
    toc_title = ParagraphStyle(
        'TOCTitle', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=16, leading=20, alignment=1, spaceAfter=24
    )
    toc_chap = ParagraphStyle(
        'TOCChap', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=12, leading=16
    )
    toc_sec = ParagraphStyle(
        'TOCSec', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=11.5, leading=15, leftIndent=16
    )
    toc_dots = ParagraphStyle(
        'TOCDots', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=10, leading=15, alignment=2,
        textColor=colors.HexColor("#555555")
    )
    toc_page_num = ParagraphStyle(
        'TOCPageNum', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=12, leading=16, alignment=2
    )
    toc_page_reg = ParagraphStyle(
        'TOCPageReg', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=11.5, leading=15, alignment=2
    )
    
    table_hdr = ParagraphStyle(
        'TableHdr', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=9, leading=11.5, alignment=1
    )
    table_cell = ParagraphStyle(
        'TableCell', parent=styles['Normal'],
        fontName='Times-Roman', fontSize=8.5, leading=11, alignment=0
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=8.5, leading=11, alignment=0
    )

    story = []

    # =========================================================================
    # PAGE 1: COVER PAGE (APPENDIX 1)
    # =========================================================================
    story.append(Paragraph("APPENDIX 1", cover_right))
    story.append(Spacer(1, 10))
    story.append(Paragraph("A", cover_a))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Capstone Project Synopsis", cover_h1))
    story.append(Spacer(1, 6))
    story.append(Paragraph("On", cover_on))
    story.append(Spacer(1, 6))
    story.append(Paragraph("FileMind – AI-Powered Document Intelligence System", cover_title))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "Submitted during 3rd semester in partial fulfilment of the requirements<br/>for the award of degree of",
        cover_sub
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Bachelor of Technology", cover_bold16))
    story.append(Spacer(1, 4))
    story.append(Paragraph("In", cover_reg13))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Information Technology", cover_bold16))
    story.append(Spacer(1, 10))
    story.append(Paragraph("By", cover_reg13))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Jitendar Swami", cover_bold16))
    story.append(Paragraph("(25001011024)", cover_bold16))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Under supervision of", cover_reg13))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Dr. Parul Gupta", cover_bold16))
    story.append(Spacer(1, 10))
    
    # Authentic University Logo
    logo_path = os.path.join(os.getcwd(), "college_logo.png")
    if not os.path.exists(logo_path):
        logo_path = os.path.join(os.getcwd(), "synopsis_ref", "word", "media", "image1.jpeg")
        
    if os.path.exists(logo_path):
        story.append(Image(logo_path, width=1.85*inch, height=1.61*inch))
    else:
        story.append(Spacer(1, 1.6*inch))
        
    story.append(Spacer(1, 10))
    story.append(Paragraph("Department of Information Technology", cover_dept))
    story.append(Paragraph("FACULTY OF INFORMATICS & COMPUTING", cover_dept))
    story.append(Spacer(1, 6))
    story.append(Paragraph("J.C. Bose University of Science & Technology, YMCA", cover_inst))
    story.append(Paragraph("Faridabad – 121006", cover_loc))
    story.append(Spacer(1, 8))
    story.append(Paragraph("SEPTEMBER 2026", cover_date))
    
    # Transition to BodyTemplate for all subsequent pages
    story.append(NextPageTemplate('BodyTemplate'))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: TABLE OF CONTENTS (APPENDIX 2) [Page i]
    # =========================================================================
    story.append(Paragraph("APPENDIX 2", ParagraphStyle(
        'TOCApp', parent=styles['Normal'],
        fontName='Times-Bold', fontSize=12, leading=15, alignment=2
    )))
    story.append(Spacer(1, 10))
    story.append(Paragraph("TABLE OF CONTENTS", toc_title))
    story.append(Spacer(1, 10))
    
    # 3-column TOC with bounded 25-dot leaders (guaranteed never to wrap)
    dots = ". " * 25
    toc_data = [
        [Paragraph("<b>Chapter 1: Introduction</b>", toc_chap), 
         Paragraph(dots, toc_dots), 
         Paragraph("<b>1</b>", toc_page_num)],
        [Paragraph("1.1 Brief of the Project", toc_sec), 
         Paragraph(dots, toc_dots), 
         Paragraph("1", toc_page_reg)],
        [Paragraph("1.2 Technologies Used", toc_sec), 
         Paragraph(dots, toc_dots), 
         Paragraph("2", toc_page_reg)],
        [Spacer(1, 8), Spacer(1, 8), Spacer(1, 8)],
        [Paragraph("<b>Chapter 2: Proposed Methodology</b>", toc_chap), 
         Paragraph(dots, toc_dots), 
         Paragraph("<b>3</b>", toc_page_num)],
        [Spacer(1, 8), Spacer(1, 8), Spacer(1, 8)],
        [Paragraph("<b>Chapter 3: Applications and Scope</b>", toc_chap), 
         Paragraph(dots, toc_dots), 
         Paragraph("<b>5</b>", toc_page_num)],
        [Paragraph("3.1 Practical Applications", toc_sec), 
         Paragraph(dots, toc_dots), 
         Paragraph("5", toc_page_reg)],
        [Paragraph("3.2 Future Scope", toc_sec), 
         Paragraph(dots, toc_dots), 
         Paragraph("6", toc_page_reg)],
    ]
    
    t_toc = Table(
        toc_data,
        colWidths=[205*pt, 165*pt, 45*pt],
        hAlign='CENTER'
    )
    t_toc.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_toc)
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: CHAPTER 1 — INTRODUCTION (PART 1) [BODY PAGE 1]
    # =========================================================================
    story.append(Paragraph("CHAPTER 1: INTRODUCTION", chap_heading))
    story.append(Paragraph("1.1 BRIEF OF THE PROJECT", sec_heading))
    
    story.append(Paragraph(
        "In modern academic, professional, and commercial ecosystems, the volume of digital documents "
        "generated daily is expanding exponentially. Most of these documents are stored in Portable Document "
        "Format (PDF) due to its cross-platform layout fidelity and universal support. However, this ubiquity "
        "has created a profound operational crisis: individuals and organizations routinely amass vast archives "
        "of unstructured PDFs characterized by uninformative filenames (such as <i>doc23e3y49.pdf</i>, <i>scan0042.pdf</i>, "
        "or machine-generated export labels), fragmented folder structures, rampant document duplication, and "
        "an absence of unified organization. Conventional document storage systems—ranging from native operating "
        "system file directories to standard cloud storage drives—treat PDFs as passive, opaque binary blobs. "
        "While these systems excel at basic bit-level file persistence and streaming, they possess no semantic "
        "comprehension of the text, structure, or real-world meaning of the information contained inside the "
        "pages. Consequently, knowledge workers and students are forced to manually inspect, rename, and sort "
        "dozens or hundreds of files one by one, squandering valuable time and frequently failing to locate critical records.",
        body_text
    ))
    
    story.append(Paragraph(
        "To resolve these fundamental limitations, <b>FileMind</b> is conceived and engineered as an autonomous, "
        "AI-powered document intelligence system. FileMind eliminates the burdensome clerical overhead of manual "
        "classification, taxonomy tagging, and file renaming. Instead of requiring human intervention to organize "
        "incoming files, the system autonomously analyzes uploaded PDF documents and understands their semantic "
        "nature, contextual domain, and key data attributes directly from their internal content.",
        body_text
    ))
    
    story.append(Paragraph(
        "The core understanding engine of FileMind operates on Google’s advanced multimodal artificial "
        "intelligence model, <b>Gemini 3.8 Flash</b>. When a PDF document is ingested into the system, the AI pipeline "
        "performs a holistic analysis that goes beyond simple optical character recognition. It automatically derives "
        "a definitive <b>document category</b> (e.g., Invoice, Receipt, Academic Transcript, Legal Contract, or Bank Statement), "
        "generates relevant descriptive <b>domain tags</b> (e.g., <i>tax</i>, <i>audit</i>, <i>tuition</i>, <i>vendor</i>), "
        "extracts standardized <b>key-value metadata</b> (such as invoice identifiers, currency, billing parties, dates, "
        "and net payable amounts), and captures clean <b>page-wise text extractions</b>. For instance, if an invoice "
        "bearing the obscure filename <i>doc23e3y49.pdf</i> is submitted, FileMind immediately detects that it is a vendor billing "
        "document, identifies invoice code <i>INV-9842-X</i>, extracts monetary totals, and indexes the text with zero human prompting.",
        body_text
    ))
    
    story.append(Paragraph(
        "Data security, multi-tenant isolation, and institutional privacy are architectural cornerstones of FileMind. "
        "All uploaded documents are stored in private, cryptographically segregated object storage paths using "
        "<b>Supabase Storage</b>. User identity and authentication are strictly regulated via <b>Supabase Auth</b>. "
        "At the database layer, PostgreSQL Row-Level Security (RLS) guarantees that document records, metadata, page texts, "
        "and retrieval indexes remain strictly isolated to the authenticated owner. Unauthorized cross-tenant access "
        "is categorically prevented by database-enforced policies rather than discretionary application logic.",
        body_text
    ))
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: CHAPTER 1 — TECH USED & RETRIEVAL [BODY PAGE 2]
    # =========================================================================
    story.append(Paragraph(
        "The AI processing workflow follows a deterministic, state-machine lifecycle: <b>Upload &rarr; Pending &rarr; "
        "AI Processing &rarr; Schema Validation &rarr; Structured Persistence &rarr; Completed</b>. Robust runtime "
        "validation using <b>Zod</b> ensures that all AI-generated structured data satisfies rigid type constraints, "
        "coercing raw outputs and stripping invalid keys. Crucially, page integrity checks enforce that page numbering "
        "is fully contiguous (1, 2, ..., N) and matches the verified document page count before committing data.",
        body_text
    ))

    story.append(Paragraph(
        "Beyond document classification and structured parsing, FileMind incorporates an advanced <b>intelligent "
        "hybrid retrieval engine</b> (Phase 1B). Rather than relying purely on rudimentary lexical substring matches, "
        "the system transforms validated page-wise extracted text into high-dimensional mathematical representations "
        "using <b>Gemini Embedding 2</b>, producing 768-dimensional dense vectors. These embeddings are stored and indexed "
        "directly within PostgreSQL utilizing the <b>pgvector</b> extension configured with a <b>Hierarchical Navigable "
        "Small World (HNSW)</b> cosine index. To deliver maximum retrieval precision, FileMind implements a multi-channel "
        "hybrid search architecture combining dense semantic retrieval, PostgreSQL full-text search (GIN tsvector tokens), "
        "and deterministic exact identifier matching, fused through <b>Reciprocal Rank Fusion (RRF, <i>k</i> = 60)</b>.",
        body_text
    ))
    
    story.append(Paragraph(
        "Users can query their repository using natural language expressions (such as <i>\"ABC company invoices from last quarter\"</i>) "
        "or exact alphanumeric reference codes (such as <i>\"INV-9842-X\"</i>). Complex generative question-answering and Retrieval-Augmented "
        "Generation (RAG / \"Ask This Document\") represent the planned <b>Phase 1C</b> roadmap. FileMind transforms passive "
        "digital archives into structured, searchable, and intelligent knowledge repositories.",
        body_text
    ))
    
    story.append(Paragraph("1.2 TECHNOLOGIES USED", sec_heading))
    story.append(Paragraph(
        "The architecture of FileMind leverages an enterprise-grade technology stack chosen for security, "
        "mathematical retrieval performance, and operational reliability, summarized in Table 1.1 below.",
        body_text_noindent
    ))
    story.append(Spacer(1, 3))
    
    # Table of Technologies (Compact layout to fit completely on Body Page 2)
    tech_data = [
        [Paragraph("<b>Component / Layer</b>", table_hdr), 
         Paragraph("<b>Technology / Tool</b>", table_hdr), 
         Paragraph("<b>Functional Role in FileMind</b>", table_hdr)],
        [Paragraph("Frontend Application", table_cell_bold), 
         Paragraph("Next.js 16 (App Router)<br/>React 19 & TypeScript", table_cell), 
         Paragraph("Full-stack web application, responsive dashboard UI, encrypted PDF reader viewport.", table_cell)],
        [Paragraph("Authentication", table_cell_bold), 
         Paragraph("Supabase Auth", table_cell), 
         Paragraph("User lifecycle management, JWT session cookies, tenant identity verification.", table_cell)],
        [Paragraph("Object Storage", table_cell_bold), 
         Paragraph("Supabase Storage", table_cell), 
         Paragraph("Private PDF storage buckets, isolated cryptographic paths, short-lived signed URLs.", table_cell)],
        [Paragraph("Relational Database", table_cell_bold), 
         Paragraph("PostgreSQL / Supabase", table_cell), 
         Paragraph("Transactional metadata persistence, Row-Level Security (RLS), atomic RPC functions.", table_cell)],
        [Paragraph("AI Understanding", table_cell_bold), 
         Paragraph("Google Gemini 3.8 Flash<br/>(@google/genai SDK)", table_cell), 
         Paragraph("Multimodal document parsing, automatic categorization, tagging, and text extraction.", table_cell)],
        [Paragraph("Structured Validation", table_cell_bold), 
         Paragraph("Zod Runtime Schema", table_cell), 
         Paragraph("Validation, normalization, and typing of AI outputs; page sequence integrity checks.", table_cell)],
        [Paragraph("Vector Embeddings", table_cell_bold), 
         Paragraph("Gemini Embedding 2<br/>(768 Dimensions)", table_cell), 
         Paragraph("High-dimensional semantic representation of chunked text for similarity search.", table_cell)],
        [Paragraph("Vector Engine & Index", table_cell_bold), 
         Paragraph("PostgreSQL pgvector<br/>(HNSW Index)", table_cell), 
         Paragraph("Sub-linear approximate nearest neighbor vector search with cosine distance metric.", table_cell)],
        [Paragraph("Hybrid Search Engine", table_cell_bold), 
         Paragraph("Reciprocal Rank Fusion<br/>(RRF, <i>k</i> = 60 + GIN FTS)", table_cell), 
         Paragraph("Fused ranking combining dense semantic search, lexical full-text, and exact match boost.", table_cell)],
        [Paragraph("Deployment Environment", table_cell_bold), 
         Paragraph("Vercel Cloud Platform", table_cell), 
         Paragraph("Global Edge CDN, serverless API Route Handlers, background worker execution.", table_cell)],
    ]
    
    t_tech = Table(
        tech_data,
        colWidths=[105*pt, 130*pt, 180*pt],
        hAlign='CENTER'
    )
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f0f3f8")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#b0b8c4")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 3))
    story.append(Paragraph("<i>Table 1.1: Core Architectural Technology Stack of FileMind.</i>", ParagraphStyle(
        'TableCaption', parent=styles['Normal'], fontName='Times-Italic', fontSize=9, leading=11, alignment=1
    )))
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: CHAPTER 2 — PROPOSED METHODOLOGY (PART 1) [BODY PAGE 3]
    # =========================================================================
    story.append(Paragraph("CHAPTER 2: PROPOSED METHODOLOGY", chap_heading))
    story.append(Paragraph(
        "The proposed methodology for FileMind encompasses a secure, multi-stage pipeline designed to transition "
        "raw PDF files from unorganized byte streams into rigorously validated, searchable, and intelligent data entities. "
        "The system architecture is structured across clear operational stages from initial user authentication to "
        "high-speed hybrid retrieval.",
        body_text_noindent
    ))
    
    story.append(Paragraph("1. User Authentication & Session Establishment", subsec_heading))
    story.append(Paragraph(
        "The workflow initiates with secure user authentication managed by Supabase Auth. Upon successful login, "
        "cryptographic JSON Web Tokens (JWT) are issued and stored within secure, HTTP-only cookies. Every downstream "
        "API request derives user identity strictly from this authenticated server session. Client-supplied user "
        "identifiers are disregarded to prevent spoofing or impersonation.",
        body_text
    ))
    
    story.append(Paragraph("2. Secure PDF Upload & Pre-flight Ingestion", subsec_heading))
    story.append(Paragraph(
        "FileMind supports both single and bulk document uploads. To ensure system stability and compliance with cloud "
        "infrastructure limits, a strict file size ceiling of <b>49 MB per individual PDF</b> is enforced. Crucially, "
        "this 49 MB constraint applies to each distinct PDF file independently, enabling users to select and submit "
        "large batches of documents simultaneously without exceeding batch limits. Before committing files to storage, "
        "the server performs pre-flight validation: verifying binary magic bytes (<code>%PDF-1.x</code>), validating MIME types, "
        "and sanitizing filenames against directory path traversal (<code>../</code>) and script injection vectors.",
        body_text
    ))
    
    story.append(Paragraph("3. Isolated Object Persistence & Metadata Initialization", subsec_heading))
    story.append(Paragraph(
        "Validated documents are persisted into private Supabase Storage buckets under cryptographically isolated folder "
        "paths structured as <code>{user_id}/{document_id}/{filename}</code>. Concurrently, an initial database record is "
        "created in the <code>public.documents</code> table with an initial lifecycle status of <code>pending</code>. This stage "
        "enforces user storage quotas and tracks document file attributes before AI invocation.",
        body_text
    ))
    
    story.append(Paragraph("4. Multimodal AI Document Understanding (Phase 1A)", subsec_heading))
    story.append(Paragraph(
        "The AI understanding worker executes server-side using Google's <code>gemini-3.8-flash</code> via the Gemini Files API. "
        "The model analyzes the complete visual and textual structure of the PDF across all pages. Under strict system instructions, "
        "the model extracts a high-level document category, contextual tags, generic normalized key-value metadata items, "
        "page counts, scanned document flags, and complete page-by-page extracted text. The model output is strictly constrained "
        "to a standardized JSON schema. Crucially, runtime parsing using <b>Zod</b> validates the extracted payload, coercing "
        "types and verifying that page numbers are contiguous and completely match the physical page count.",
        body_text
    ))
    
    story.append(Paragraph("5. Processing Security, Lease Fencing & Recovery", subsec_heading))
    story.append(Paragraph(
        "To guarantee transactional integrity during asynchronous execution, FileMind incorporates an atomic lease fencing "
        "protocol. The server worker acquires an exclusive processing lock via the PostgreSQL RPC <code>acquire_document_processing</code>, "
        "which issues a fresh UUID <code>processing_token</code> and timestamps the lease. If processing exceeds a 10-minute timeout "
        "threshold or an environment crash occurs, the lease expires. Stale workers attempting to commit results are fenced out "
        "because their token no longer matches the database state. Furthermore, a dedicated recovery endpoint "
        "(<code>POST /api/documents/[id]/retry</code>) allows pending or stalled documents to be securely re-scheduled.",
        body_text
    ))
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: CHAPTER 2 — PROPOSED METHODOLOGY (PART 2) [BODY PAGE 4]
    # =========================================================================
    story.append(Paragraph("6. Structured Page-wise Text Storage", subsec_heading))
    story.append(Paragraph(
        "Upon successful validation and fencing checks, the atomic RPC <code>finalize_document_processing</code> commits the "
        "extracted metadata and inserts page records into <code>public.document_pages</code>. Each page entry maintains "
        "an exact mapping between the parent <code>document_id</code>, <code>page_number</code>, and validated <code>extracted_text</code>.",
        body_text
    ))

    story.append(Paragraph("7. Deterministic Text Chunking (Phase 1B)", subsec_heading))
    story.append(Paragraph(
        "To transition page-wise text into granular, searchable retrieval units, the system implements a deterministic, "
        "boundary-aware chunker. The chunker processes sequentially ordered page texts, targeting segments of approximately "
        "<b>3,200 characters (~700–900 tokens)</b> with a bounded overlap of <b>500 characters (~100–150 tokens)</b>. It respects "
        "paragraph boundaries and preserves specialized alphanumeric identifiers (such as invoice codes, PAN, GSTIN, and dates) "
        "to prevent fragmenting critical tokens. Each chunk is assigned a contiguous 0-indexed <code>chunk_index</code>, tracks its source "
        "span (<code>page_start</code> to <code>page_end</code>), and computes a deterministic SHA-256 <code>content_hash</code>.",
        body_text
    ))
    
    story.append(Paragraph("8. High-Dimensional Embedding Generation", subsec_heading))
    story.append(Paragraph(
        "Each text chunk is converted into a 768-dimensional dense vector using <b>Gemini Embedding 2</b>. Chunk texts are structured "
        "with semantic task prefixes (<code>title: {doc_title} | text: {chunk_text}</code>) to optimize representation density. "
        "Embedding calls are throttled through a bounded concurrency queue (maximum 5 concurrent requests) with exponential "
        "backoff and randomized jitter to handle transient API rate limits. Generated vectors are validated to ensure exactly "
        "768 finite floating-point dimensions before database ingestion.",
        body_text
    ))
    
    story.append(Paragraph("9. Vector Persistence & HNSW Indexing", subsec_heading))
    story.append(Paragraph(
        "Validated chunks and vectors are transactionally committed to the <code>public.document_chunks</code> table through the "
        "atomic RPC <code>finalize_document_indexing</code>. The table is indexed with a <b>Hierarchical Navigable Small World (HNSW)</b> "
        "cosine index (<code>USING hnsw (embedding vector_cosine_ops)</code>), which enables sub-linear approximate nearest neighbor search. "
        "Simultaneously, a generated <code>fts_tokens tsvector</code> column is indexed using a PostgreSQL Generalized Inverted Index (GIN) "
        "to empower rapid lexical keyword matching.",
        body_text
    ))
    
    story.append(Paragraph("10. Multi-Channel Hybrid Search & Reciprocal Rank Fusion", subsec_heading))
    story.append(Paragraph(
        "When a user executes a search query, FileMind triggers a multi-channel retrieval engine. The user query is converted into a "
        "768-dimensional vector to retrieve the top 30 semantic candidates via <code>match_document_chunks</code>. In parallel, "
        "the query text is evaluated against the lexical index via <code>search_document_chunks_lexical</code> to retrieve the top 30 "
        "full-text candidates. The candidates are merged using <b>Reciprocal Rank Fusion (RRF)</b> with constant <i>k</i> = 60:",
        body_text
    ))
    
    # RRF Formula block
    story.append(Spacer(1, 3))
    story.append(Paragraph(
        "<b>RRF Score &nbsp;=&nbsp; "
        "[ 1 / (60 + Rank<sub>semantic</sub>) ] &nbsp;+&nbsp; "
        "[ 1 / (60 + Rank<sub>lexical</sub>) ] &nbsp;+&nbsp; "
        "Exact Match Boost</b>",
        ParagraphStyle('Formula', parent=styles['Normal'], fontName='Times-Bold', fontSize=10.5, leading=14, alignment=1)
    ))
    story.append(Spacer(1, 3))
    
    story.append(Paragraph(
        "A deterministic exact match boost (+0.05) is awarded to chunks containing exact alphanumeric identifier matches, "
        "guaranteeing that precise codes (such as reference numbers or transaction IDs) surface at the absolute top of results.",
        body_text
    ))
    
    story.append(Paragraph("11. Contextual Snippet Extraction & Deep Viewer Linking", subsec_heading))
    story.append(Paragraph(
        "Search results return bounded text snippets (maximum 750 characters) contextually anchored around the matched query "
        "terms. In the client interface, each result displays the document title, category, score, and source page range. "
        "Clicking a result opens the integrated PDF viewer automatically deep-linked to the corresponding page (<code>#page=X</code>).",
        body_text
    ))
    
    story.append(Paragraph("12. Architectural Scope Boundary", subsec_heading))
    story.append(Paragraph(
        "Phase 1B concludes with complete hybrid retrieval and deep-linked document inspection. Higher-level generative capabilities—such "
        "as conversational Q&A, LLM-generated answers, and automated synthesis—are strictly designated as Phase 1C future scope.",
        body_text
    ))
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: CHAPTER 3 — APPLICATIONS AND SCOPE (PART 1) [BODY PAGE 5]
    # =========================================================================
    story.append(Paragraph("CHAPTER 3: APPLICATIONS AND SCOPE", chap_heading))
    story.append(Paragraph("3.1 PRACTICAL APPLICATIONS", sec_heading))
    story.append(Paragraph(
        "The automated intelligence, structured classification, and hybrid retrieval capabilities of FileMind address "
        "critical operational bottlenecks across a wide variety of practical domains:",
        body_text_noindent
    ))
    
    story.append(Paragraph(
        "<b>1. Personal Document Management:</b> Individuals routinely accumulate hundreds of critical PDFs, including academic degrees, "
        "tax filings, insurance policies, medical records, and utility receipts. FileMind eliminates chaotic naming, allowing users to "
        "instantly locate records via natural inquiries like <i>\"life insurance premium 2025\"</i> or policy numbers.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>2. Educational Institutions & Universities:</b> Academic administrations manage immense volumes of student records, admission "
        "dossiers, examination transcripts, and departmental circulars. FileMind facilitates rapid archiving and instant retrieval of student "
        "records by roll number or semester without tedious manual indexing.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>3. Corporate & Enterprise Operations:</b> Businesses handle continuous inflows of vendor invoices, purchase orders, non-disclosure "
        "agreements, and employee contracts. The system streamlines accounts payable and legal archiving by categorizing incoming documents and "
        "extracting payment amounts, billing entities, and due dates autonomously.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>4. Accounting & Chartered Accountancy (CA) Firms:</b> Auditing and accounting professionals navigate thousands of client receipts, "
        "bank statements, and GST returns. FileMind's exact identifier boosting ensures that specific invoice numbers (e.g. <i>INV-9842-X</i>) "
        "or tax registration numbers are retrieved instantaneously with 100% precision.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>5. Institutional Archives & Digital Libraries:</b> Historical document repositories, research paper archives, and public records "
        "can be ingested in bulk and made semantically discoverable without requiring manual metadata curation for every volume.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>6. Administrative & Clerical Workflow Optimization:</b> FileMind significantly reduces bureaucratic delay and manual filing errors "
        "in government and administrative offices by automating document intake, taxonomy assignment, and departmental routing.",
        body_bullet
    ))
    
    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: CHAPTER 3 — APPLICATIONS AND SCOPE (PART 2) [BODY PAGE 6]
    # =========================================================================
    story.append(Paragraph("3.2 FUTURE SCOPE", sec_heading))
    story.append(Paragraph(
        "While the current implementation of FileMind delivers a robust, verified hybrid retrieval and document understanding platform "
        "(Phases 0, 1A, and 1B), several advanced research and development vectors are planned for future phases:",
        body_text_noindent
    ))
    
    story.append(Paragraph(
        "<b>1. Retrieval-Augmented Generation (RAG) & Document Q&A (Phase 1C):</b> Implementing conversational intelligence enabling "
        "users to \"Ask This Document\" complex questions, with generative answers synthesised directly from retrieved chunks.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>2. Page-Grounded Synthesis with Exact Citations:</b> Augmenting generative responses with verbatim sentence-level citations "
        "and direct visual bounding boxes on original PDF pages to eliminate AI hallucinations.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>3. Multi-Document Cross-Comparison & Summarization:</b> Providing comparative analysis across multiple related documents "
        "(e.g., comparing quarterly financial statements or vendor contract clauses side by side).",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>4. Intelligent Duplicate & Version Detection:</b> Developing semantic deduplication algorithms to detect identical or revised "
        "documents across large archives, tracking version history automatically.",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>5. Proactive Expiry & Renewal Reminders:</b> Implementing automated temporal tracking to alert users ahead of document "
        "expiration dates (e.g., passport renewals, warranty lapses, or lease expirations).",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>6. Multi-Format Ingestion Support:</b> Extending the ingestion pipeline beyond PDFs to natively support Microsoft Word (DOCX), "
        "spreadsheets (XLSX), presentations (PPTX), and high-resolution scanned image formats (TIFF, PNG).",
        body_bullet
    ))
    
    story.append(Paragraph(
        "<b>7. Enterprise Workflow & ERP Integration:</b> Constructing pre-built webhooks and API connectors to synchronize with enterprise "
        "systems (SAP, Salesforce, QuickBooks) and cloud storage platforms (Google Drive, OneDrive).",
        body_bullet
    ))
    
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Conclusion:</b> FileMind demonstrates the efficacy of fusing state-of-the-art multimodal AI document understanding "
        "with pgvector-backed HNSW hybrid retrieval. By automating the classification, extraction, and indexing lifecycle, FileMind "
        "provides a resilient, production-ready foundation for next-generation intelligent document repositories.",
        body_text
    ))

    # Build Document
    doc.build(story, canvasmaker=AcademicNumberedCanvas)
    print(f"[SUCCESS] Generated: {pdf_filename}")
    return pdf_filename

def verify_pdf(pdf_filename):
    doc = pymupdf.open(pdf_filename)
    page_count = len(doc)
    print(f"[VERIFY] Total Pages in Generated PDF: {page_count}")
    
    img_dir = "synopsis_pages"
    os.makedirs(img_dir, exist_ok=True)
    
    rendered_images = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=150)
        img_path = os.path.join(img_dir, f"page_{i+1}.png")
        pix.save(img_path)
        rendered_images.append(img_path)
        print(f"  - Rendered Page {i+1} to {img_path}")
        
    return rendered_images

if __name__ == '__main__':
    pdf_name = build_pdf()
    verify_pdf(pdf_name)
