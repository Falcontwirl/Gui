"""Generate a polished PDF explaining how Codebase Explorer works."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white, Color
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import os

# Colors (from CLAUDE.md dark theme)
BG_BASE      = HexColor("#0a0a14")
BG_SURFACE   = HexColor("#12131f")
BG_ELEVATED  = HexColor("#1a1b2e")
BG_ACCENT    = HexColor("#232442")
INDIGO       = HexColor("#6366f1")
AMBER        = HexColor("#f59e0b")
EMERALD      = HexColor("#10b981")
CYAN         = HexColor("#06b6d4")
ROSE         = HexColor("#f43f5e")
VIOLET       = HexColor("#8b5cf6")
ORANGE       = HexColor("#f97316")
TEXT_PRIMARY  = HexColor("#e2e8f0")
TEXT_SECONDARY= HexColor("#94a3b8")
TEXT_TERTIARY = HexColor("#64748b")
WHITE        = HexColor("#ffffff")
BORDER       = HexColor("#1e2035")

W, H = letter

OUTPUT = os.path.join(os.path.dirname(__file__), "Codebase_Explorer_How_It_Works.pdf")


def draw_bg(c, color=BG_BASE):
    c.setFillColor(color)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def draw_header_bar(c, y, color=INDIGO, height=4):
    c.setFillColor(color)
    c.rect(0, y, W, height, fill=1, stroke=0)


def draw_text(c, text, x, y, font="Helvetica", size=12, color=TEXT_PRIMARY, max_width=None):
    c.setFont(font, size)
    c.setFillColor(color)
    if max_width:
        lines = []
        words = text.split()
        current = ""
        for w in words:
            test = current + (" " if current else "") + w
            if c.stringWidth(test, font, size) > max_width:
                lines.append(current)
                current = w
            else:
                current = test
        if current:
            lines.append(current)
        for i, line in enumerate(lines):
            c.drawString(x, y - i * (size + 4), line)
        return len(lines) * (size + 4)
    else:
        c.drawString(x, y, text)
        return size + 4


def draw_centered(c, text, y, font="Helvetica", size=12, color=TEXT_PRIMARY):
    c.setFont(font, size)
    c.setFillColor(color)
    tw = c.stringWidth(text, font, size)
    c.drawString((W - tw) / 2, y, text)


def draw_card(c, x, y, w, h, fill=BG_SURFACE, border_color=BORDER, radius=8):
    c.setFillColor(fill)
    c.setStrokeColor(border_color)
    c.setLineWidth(0.5)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def draw_badge(c, text, x, y, color=INDIGO, text_color=WHITE, font_size=8):
    c.setFont("Helvetica-Bold", font_size)
    tw = c.stringWidth(text, "Helvetica-Bold", font_size) + 12
    c.setFillColor(color)
    c.roundRect(x, y - 4, tw, font_size + 8, 4, fill=1, stroke=0)
    c.setFillColor(text_color)
    c.drawString(x + 6, y, text)
    return tw


def draw_bullet(c, text, x, y, color=TEXT_PRIMARY, bullet_color=INDIGO, size=10, max_width=420):
    c.setFillColor(bullet_color)
    c.circle(x + 3, y + 3, 2.5, fill=1, stroke=0)
    return draw_text(c, text, x + 14, y, size=size, color=color, max_width=max_width)


def draw_flow_box(c, text, x, y, w=80, h=28, color=INDIGO, text_color=WHITE):
    c.setFillColor(color)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(text_color)
    tw = c.stringWidth(text, "Helvetica-Bold", 7)
    c.drawString(x + (w - tw) / 2, y + 10, text)


# PAGE 1: Title + Overview
def page_title(c):
    draw_bg(c)
    draw_header_bar(c, H - 6, INDIGO, 6)

    cx_pos, cy = W / 2, H - 160
    for i, color in enumerate([INDIGO, VIOLET, CYAN]):
        c.setFillColor(color)
        c.setFillAlpha(0.6 if i > 0 else 1)
        offset = (i - 1) * 22
        c.circle(cx_pos + offset, cy, 18, fill=1, stroke=0)
    c.setFillAlpha(1)

    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(WHITE)
    title = "Codebase Explorer"
    tw = c.stringWidth(title, "Helvetica-Bold", 36)
    c.drawString((W - tw) / 2, cy - 60, title)

    c.setFont("Helvetica", 14)
    c.setFillColor(TEXT_SECONDARY)
    sub = "AI-Powered Codebase Comprehension for Everyone"
    tw = c.stringWidth(sub, "Helvetica", 14)
    c.drawString((W - tw) / 2, cy - 85, sub)

    c.setStrokeColor(INDIGO)
    c.setLineWidth(1)
    c.line(W/2 - 40, cy - 110, W/2 + 40, cy - 110)

    card_x, card_w = 60, W - 120
    card_y, card_h = cy - 310, 170
    draw_card(c, card_x, card_y, card_w, card_h, BG_SURFACE)

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(INDIGO)
    c.drawString(card_x + 20, card_y + card_h - 28, "WHAT IS IT?")

    summary = (
        "Codebase Explorer is a full-stack web + CLI application that helps anyone "
        "understand any codebase instantly through AI-powered visual graph exploration. "
        "Upload a codebase or analyze a local repo via the terminal \u2014 the AI extracts "
        "architectural concepts and relationships, then renders them as an interactive "
        "force-directed graph. Users explore through chat, inspect code with syntax "
        "highlighting, take comprehension quizzes, and follow guided tours through "
        "the architecture."
    )
    y_pos = card_y + card_h - 50
    draw_text(c, summary, card_x + 20, y_pos, size=10, color=TEXT_PRIMARY, max_width=card_w - 40)

    badge_y = card_y - 50
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(TEXT_SECONDARY)
    c.drawString(60, badge_y + 16, "TECH STACK")

    techs = [
        ("React 19", INDIGO), ("Vite", VIOLET), ("D3-force", CYAN),
        ("Zustand", EMERALD), ("Tailwind", CYAN), ("Hono", ORANGE),
        ("Supabase", EMERALD), ("Claude API", VIOLET), ("Ink TUI", AMBER),
    ]
    bx = 60
    for name, color in techs:
        tw = draw_badge(c, name, bx, badge_y - 10, color)
        bx += tw + 6
        if bx > W - 80:
            bx = 60
            badge_y -= 22

    nums_y = 180
    draw_card(c, 60, nums_y - 10, W - 120, 60, BG_ELEVATED)
    stats = [
        ("6-Stage", "AI Pipeline"),
        ("3 Views", "Graph Modes"),
        ("10+", "CLI Commands"),
        ("3 Depths", "Explanation Levels"),
    ]
    col_w = (W - 120) / len(stats)
    for i, (val, label) in enumerate(stats):
        sx = 60 + i * col_w + col_w / 2
        c.setFont("Helvetica-Bold", 18)
        c.setFillColor(INDIGO)
        vw = c.stringWidth(val, "Helvetica-Bold", 18)
        c.drawString(sx - vw/2, nums_y + 24, val)
        c.setFont("Helvetica", 8)
        c.setFillColor(TEXT_SECONDARY)
        lw = c.stringWidth(label, "Helvetica", 8)
        c.drawString(sx - lw/2, nums_y + 8, label)

    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_TERTIARY)
    draw_centered(c, "codebaseexplorer.com", 40)
    c.drawRightString(W - 40, 40, "1 / 6")


# PAGE 2: The AI Pipeline
def page_pipeline(c):
    draw_bg(c)
    draw_header_bar(c, H - 4, INDIGO, 4)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(WHITE)
    c.drawString(50, H - 50, "The AI Pipeline")
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT_SECONDARY)
    c.drawString(50, H - 68, "6 stages transform raw code into an interactive visualization")

    flow_y = H - 110
    steps_flow = ["Upload", "Classify", "Analyze", "Synthesize", "Depths", "Embed", "Insights"]
    colors_flow = [TEXT_TERTIARY, AMBER, INDIGO, VIOLET, EMERALD, CYAN, ROSE]
    step_w = 68
    gap = (W - 80 - len(steps_flow) * step_w) / (len(steps_flow) - 1)
    sx = 40
    for i, (label, color) in enumerate(zip(steps_flow, colors_flow)):
        draw_flow_box(c, label, sx, flow_y, step_w, 24, color)
        if i < len(steps_flow) - 1:
            ax1 = sx + step_w + 2
            ax2 = sx + step_w + gap - 2
            c.setStrokeColor(TEXT_TERTIARY)
            c.setLineWidth(1)
            if gap > 8:
                c.line(ax1, flow_y + 12, ax2, flow_y + 12)
                c.line(ax2 - 4, flow_y + 15, ax2, flow_y + 12)
                c.line(ax2 - 4, flow_y + 9, ax2, flow_y + 12)
        sx += step_w + gap

    stages = [
        ("1", "File Classification", AMBER,
         "Reads uploaded files, detects framework and language (Express, Next.js, Django, etc.), "
         "scores files by importance, filters to the top 100 for AI analysis, and uploads file "
         "contents to Supabase Storage."),
        ("2", "Parallel File Analysis", INDIGO,
         "Claude analyzes files in batches of 50 with 3 concurrent waves. For each file: purpose, "
         "key concepts (2-3 keywords), exports, dependencies, complexity score, and role. "
         "Results stored in the database."),
        ("3", "Concept Synthesis", VIOLET,
         "Claude reads all file analyses and groups related files into 3-10 architectural concepts. "
         "Each concept gets a name, color, real-world metaphor, one-liner, explanation, and importance "
         "level. Edges between concepts capture relationships and strength."),
        ("4", "Depth Mapping", EMERALD,
         "Creates 3 explanation levels per concept: Conceptual (metaphors, no jargon for beginners), "
         "Applied (how it works practically), and Under the Hood (implementation details, algorithms). "
         "Users choose their depth level."),
        ("5", "File Embeddings", CYAN,
         "Chunks each file into 500-character segments with overlap, then embeds them via OpenAI. "
         "Stored in a code_chunks table to enable RAG (Retrieval Augmented Generation) for the "
         "context-aware chat system."),
        ("6", "Insights & Quizzes", ROSE,
         "Generates proactive architecture insights (risks, patterns, praise, suggestions) and "
         "comprehension quiz questions per concept. Quizzes include multiple choice, matching, "
         "ordering, and fill-in-the-blank with varying difficulty."),
    ]

    card_y = flow_y - 50
    card_h = 82
    card_gap = 8
    margin_x = 50
    card_w = W - 2 * margin_x

    for num, title, color, desc in stages:
        draw_card(c, margin_x, card_y - card_h, card_w, card_h, BG_SURFACE)

        c.setFillColor(color)
        c.circle(margin_x + 22, card_y - card_h + card_h / 2, 12, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(WHITE)
        nw = c.stringWidth(num, "Helvetica-Bold", 12)
        c.drawString(margin_x + 22 - nw/2, card_y - card_h + card_h/2 - 4, num)

        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(color)
        c.drawString(margin_x + 44, card_y - 16, title)

        draw_text(c, desc, margin_x + 44, card_y - 32, size=8.5, color=TEXT_SECONDARY,
                  max_width=card_w - 60)

        card_y -= card_h + card_gap

    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_TERTIARY)
    c.drawRightString(W - 40, 40, "2 / 6")


# PAGE 3: Graph Visualization
def page_graph(c):
    draw_bg(c)
    draw_header_bar(c, H - 4, CYAN, 4)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(WHITE)
    c.drawString(50, H - 50, "Graph Visualization")
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT_SECONDARY)
    c.drawString(50, H - 68, "Three interactive layers for exploring architecture at any level of detail")

    margin_x = 50
    card_w = W - 2 * margin_x

    # View 1: Concept Map
    y = H - 100
    draw_card(c, margin_x, y - 195, card_w, 195, BG_SURFACE)

    draw_badge(c, "DEFAULT VIEW", margin_x + 16, y - 14, INDIGO)
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(WHITE)
    c.drawString(margin_x + 110, y - 18, "Concept Map")

    desc1 = (
        "Force-directed graph powered by D3-force physics simulation. Each bubble represents "
        "an architectural concept, sized proportionally to the number of files it contains. "
        "Labeled edges show relationships between concepts. Built with a custom HTML5 Canvas "
        "renderer (just 2KB vs. 23MB for off-the-shelf libraries)."
    )
    draw_text(c, desc1, margin_x + 16, y - 40, size=9, color=TEXT_SECONDARY, max_width=card_w - 32)

    # Mini graph illustration
    gx, gy = W / 2, y - 140
    nodes = [
        (gx - 80, gy, 22, INDIGO, "Auth"),
        (gx + 60, gy - 20, 28, VIOLET, "API"),
        (gx, gy + 30, 18, EMERALD, "DB"),
        (gx + 90, gy + 25, 15, CYAN, "Utils"),
        (gx - 40, gy - 30, 20, AMBER, "UI"),
    ]
    c.setStrokeColor(HexColor("#2a2b4a"))
    c.setLineWidth(1)
    for i in range(len(nodes)):
        for j in range(i+1, len(nodes)):
            if abs(i - j) <= 2:
                c.line(nodes[i][0], nodes[i][1], nodes[j][0], nodes[j][1])
    for nx, ny, r, color, label in nodes:
        c.setFillColor(Color(color.red, color.green, color.blue, alpha=0.15))
        c.circle(nx, ny, r + 6, fill=1, stroke=0)
        c.setFillColor(color)
        c.circle(nx, ny, r, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 7)
        c.setFillColor(WHITE)
        lw = c.stringWidth(label, "Helvetica-Bold", 7)
        c.drawString(nx - lw/2, ny - 3, label)

    # View 2: Files View
    y2 = y - 215
    draw_card(c, margin_x, y2 - 120, card_w / 2 - 5, 120, BG_SURFACE)
    draw_badge(c, "FILES VIEW", margin_x + 16, y2 - 14, EMERALD)

    desc2 = (
        "Individual files grouped in soft dashed "
        "clusters by concept. Select a file to "
        "see its import relationships highlighted "
        "across the graph. Great for tracing "
        "dependencies."
    )
    draw_text(c, desc2, margin_x + 16, y2 - 36, size=8.5, color=TEXT_SECONDARY,
              max_width=card_w / 2 - 40)

    # View 3: Circle Pack
    cp_x = margin_x + card_w / 2 + 5
    draw_card(c, cp_x, y2 - 120, card_w / 2 - 5, 120, BG_SURFACE)
    draw_badge(c, "CIRCLE PACK", cp_x + 16, y2 - 14, VIOLET)

    desc3 = (
        "Hierarchical drill-in visualization. "
        "Zoom from the universe bubble down into "
        "concepts, sub-concepts, and individual "
        "code elements. Uses circle-packing layout "
        "algorithm."
    )
    draw_text(c, desc3, cp_x + 16, y2 - 36, size=8.5, color=TEXT_SECONDARY,
              max_width=card_w / 2 - 40)

    # Interactions section
    y3 = y2 - 145
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(CYAN)
    c.drawString(margin_x, y3, "Key Interactions")

    interactions = [
        "Click to select \u2014 fades unrelated nodes to 20% opacity, highlights connected edges",
        "Smooth zoom and pan with momentum physics, clamped to prevent losing the graph",
        "Keyboard navigation: arrow keys to move between nodes, +/- to zoom, Enter to select",
        "Touch gestures: pinch-to-zoom, two-finger pan, haptic feedback on mobile selection",
        "Auto-expand and collapse nodes based on viewport zoom level (heuristic radius check)",
        "Edge labels appear on hover only \u2014 keeps the graph clean at default zoom",
        "Nodes have soft glows, idle float animations, and selection pulse effects",
    ]
    iy = y3 - 22
    for item in interactions:
        h = draw_bullet(c, item, margin_x + 8, iy, TEXT_SECONDARY, CYAN, 8.5, card_w - 30)
        iy -= max(h, 14)

    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_TERTIARY)
    c.drawRightString(W - 40, 40, "3 / 6")


# PAGE 4: Chat, Inspector & Features
def page_features(c):
    draw_bg(c)
    draw_header_bar(c, H - 4, VIOLET, 4)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(WHITE)
    c.drawString(50, H - 50, "Chat, Inspector & Features")
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT_SECONDARY)
    c.drawString(50, H - 68, "AI-powered chat with RAG, deep code inspection, and guided learning")

    margin_x = 50
    card_w = (W - 2 * margin_x - 10) / 2
    full_w = W - 2 * margin_x

    y = H - 90
    ch = 250
    draw_card(c, margin_x, y - ch, card_w, ch, BG_SURFACE)

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(VIOLET)
    c.drawString(margin_x + 16, y - 20, "Chat System")

    chat_items = [
        "RAG-powered: message is embedded, top 10 code chunks retrieved for context",
        "Claude generates streaming SSE responses with full codebase awareness",
        "Clickable concept and file links inline \u2014 [[concept:auth]] or [[file:index.ts]]",
        "Graph expansion triggers: auto-expand concepts, highlight paths on the graph",
        "Multi-turn context with last 6 messages for coherent conversations",
        "Session persistence across page reloads and devices",
        "Suggested questions carousel based on the codebase analysis",
        "Chat history browser with sessions grouped by time",
    ]
    iy = y - 42
    for item in chat_items:
        h = draw_bullet(c, item, margin_x + 16, iy, TEXT_SECONDARY, VIOLET, 8, card_w - 36)
        iy -= max(h, 13)

    rx = margin_x + card_w + 10
    draw_card(c, rx, y - ch, card_w, ch, BG_SURFACE)

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(AMBER)
    c.drawString(rx + 16, y - 20, "Inspector Panel")

    inspector_items = [
        "Right sidebar showing the selected concept's full details",
        "Concept card with file list, related edges, and real-world metaphor",
        "Three depth levels with expandable explanations",
        "Reading order: guided path or import-importance ranking",
        "Sub-concept expansion \u2014 drill into nested architecture layers on demand",
        "Code walkthrough with syntax-highlighted file inspection",
        "Line-range focus: see only the relevant portion of large files",
        "Animates in from the side with smooth 300ms transition",
    ]
    iy = y - 42
    for item in inspector_items:
        h = draw_bullet(c, item, rx + 16, iy, TEXT_SECONDARY, AMBER, 8, card_w - 36)
        iy -= max(h, 13)

    # Other Features
    y2 = y - ch - 20
    feat_h = 280
    draw_card(c, margin_x, y2 - feat_h, full_w, feat_h, BG_SURFACE)

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(EMERALD)
    c.drawString(margin_x + 16, y2 - 20, "More Features")

    features = [
        ("Guided Tour Mode", INDIGO,
         "Step-by-step path through concepts ordered by architectural criticality. "
         "Progress tracked per user. Perfect for first-time exploration."),
        ("Three Depth Levels", EMERALD,
         "Conceptual (metaphors, no jargon), Applied (how things work practically), "
         "Under the Hood (implementation details). Preference persisted."),
        ("Proactive Insights", AMBER,
         "AI-generated cards highlighting architecture risks, design patterns, praise for good "
         "practices, and actionable improvement suggestions."),
        ("Quiz Gate", ROSE,
         "Comprehension quizzes before exploring further. Multiple choice, matching, ordering, "
         "fill-in-the-blank. Analytics per concept track understanding."),
        ("Shared Viewer", CYAN,
         "Public read-only links at /s/:id. No authentication required. Share your project's "
         "architecture with teammates or in documentation."),
        ("Settings & Personalization", VIOLET,
         "Dark/light theme toggle, depth level preference, persona selection (OSS contributor, "
         "onboarding engineer, due diligence reviewer, legacy code auditor)."),
    ]

    fy = y2 - 44
    left_x = margin_x + 16
    right_x = margin_x + full_w / 2 + 8
    for i, (title, color, desc) in enumerate(features):
        fx = left_x if i % 2 == 0 else right_x
        if i % 2 == 0 and i > 0:
            fy -= 6

        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(color)
        c.drawString(fx, fy, title)

        h = draw_text(c, desc, fx, fy - 14, size=7.5, color=TEXT_SECONDARY,
                      max_width=full_w / 2 - 32)
        if i % 2 == 1:
            fy -= max(h + 14, 38)

    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_TERTIARY)
    c.drawRightString(W - 40, 40, "4 / 6")


# PAGE 5: Terminal CLI
def page_cli(c):
    draw_bg(c)
    draw_header_bar(c, H - 4, AMBER, 4)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(WHITE)
    c.drawString(50, H - 50, "Terminal CLI")
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT_SECONDARY)
    c.drawString(50, H - 68, "Analyze any local repo from the command line with cx")

    margin_x = 50
    full_w = W - 2 * margin_x

    # Terminal mockup
    term_y = H - 90
    term_h = 130
    draw_card(c, margin_x, term_y - term_h, full_w, term_h, HexColor("#0d1117"), HexColor("#30363d"), 6)

    for i, col in enumerate([ROSE, AMBER, EMERALD]):
        c.setFillColor(col)
        c.circle(margin_x + 16 + i * 16, term_y - 12, 4, fill=1, stroke=0)

    term_lines = [
        [("$ ", TEXT_TERTIARY), ("cx", EMERALD), ("  # analyze current repo", TEXT_TERTIARY)],
        [],
        [("  Reading local files...", AMBER)],
        [("  Detected: React + Express (TypeScript)", TEXT_SECONDARY)],
        [("  Analyzing 47 files in 3 waves...", CYAN)],
        [("  Synthesizing 7 concepts with 12 edges", VIOLET)],
        [],
        [("  View at: ", TEXT_SECONDARY), ("https://codebaseexplorer.com/explore/abc123", INDIGO)],
    ]
    ty = term_y - 34
    for parts in term_lines:
        tx = margin_x + 16
        for text, color in parts:
            c.setFont("Courier", 8.5)
            c.setFillColor(color)
            c.drawString(tx, ty, text)
            tx += c.stringWidth(text, "Courier", 8.5)
        ty -= 12

    # Commands
    y = term_y - term_h - 20
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(AMBER)
    c.drawString(margin_x, y, "Commands")

    commands = [
        ("cx", "Interactive TUI mode. Reads local repo, detects framework, sends to server, "
         "streams analysis progress with real-time updates. Returns a share URL and opens browser."),
        ("cx <query>", "One-shot mode. Analyzes the repo and immediately answers your question "
         "about it. If the repo was previously analyzed, skips straight to the chat."),
        ("cx chat", "Interactive multi-turn chat on the last analyzed repo. Full conversation "
         "history with streaming responses. Same RAG engine as the web app."),
        ("cx login", "OAuth flow via browser. Opens Supabase auth page, receives callback, "
         "stores refresh token in ~/.gui/credentials.json. Auto-refreshes on expiry."),
        ("cx projects", "List all cached projects with creation date, project ID, and framework. "
         "Projects are cached locally for instant re-access."),
        ("cx open", "Open the web UI for the last analyzed repo in your default browser."),
        ("cx share", "Print a shareable public link to the project visualization."),
        ("cx status", "Check the current pipeline status on the server (useful for large repos)."),
        ("cx history [n]", "View chat sessions grouped by time period (Today, Yesterday, This Week, Older). "
         "Optionally limit to last n sessions."),
        ("cx rerun", "Re-analyze the current repo with the latest AI pipeline version. "
         "Useful after pipeline improvements."),
    ]

    cy = y - 22
    for cmd, desc in commands:
        c.setFont("Courier-Bold", 9)
        c.setFillColor(BG_ACCENT)
        cw = c.stringWidth(cmd, "Courier-Bold", 9) + 10
        c.roundRect(margin_x + 8, cy - 3, cw, 14, 3, fill=1, stroke=0)
        c.setFillColor(AMBER)
        c.drawString(margin_x + 13, cy, cmd)

        h = draw_text(c, desc, margin_x + cw + 20, cy, size=8, color=TEXT_SECONDARY,
                      max_width=full_w - cw - 32)
        cy -= max(h + 4, 18)

    # CLI Features
    cy -= 12
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(AMBER)
    c.drawString(margin_x, cy, "CLI Features")

    cli_feats = [
        "React-based terminal UI with Ink \u2014 progress bars, spinners, interactive menus",
        "ASCII concept map preview rendered directly in the terminal",
        "Automatic OAuth token refresh (60-second buffer before expiry)",
        "Cross-platform chat history \u2014 CLI and web app share the same sessions",
        "Local project caching for instant re-access without re-analysis",
        "Configurable API endpoint via CX_API_URL environment variable",
    ]
    cy -= 18
    for feat in cli_feats:
        h = draw_bullet(c, feat, margin_x + 8, cy, TEXT_SECONDARY, AMBER, 8.5, full_w - 30)
        cy -= max(h, 14)

    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_TERTIARY)
    c.drawRightString(W - 40, 40, "5 / 6")


# PAGE 6: Architecture & Data Flow
def page_architecture(c):
    draw_bg(c)
    draw_header_bar(c, H - 4, EMERALD, 4)

    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(WHITE)
    c.drawString(50, H - 50, "Architecture & Data Flow")
    c.setFont("Helvetica", 10)
    c.setFillColor(TEXT_SECONDARY)
    c.drawString(50, H - 68, "End-to-end system architecture from upload to interactive exploration")

    margin_x = 50
    full_w = W - 2 * margin_x

    # Web Flow
    y = H - 100
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(INDIGO)
    c.drawString(margin_x, y, "WEB FLOW")

    web_steps = [
        ("User uploads ZIP", TEXT_TERTIARY),
        ("JSZip extracts", AMBER),
        ("6-stage pipeline", INDIGO),
        ("Stored in Supabase", EMERALD),
        ("D3 renders graph", CYAN),
        ("User explores", VIOLET),
    ]
    sx = margin_x
    sw = 80
    sg = 6
    wy = y - 30
    for i, (label, color) in enumerate(web_steps):
        draw_flow_box(c, label, sx, wy, sw, 22, color)
        if i < len(web_steps) - 1:
            c.setStrokeColor(TEXT_TERTIARY)
            c.setLineWidth(0.8)
            c.line(sx + sw + 1, wy + 11, sx + sw + sg - 1, wy + 11)
        sx += sw + sg

    # CLI Flow
    cy = wy - 40
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(AMBER)
    c.drawString(margin_x, cy, "CLI FLOW")

    cli_steps = [
        ("cx in repo dir", TEXT_TERTIARY),
        ("Scan local files", AMBER),
        ("Detect framework", ORANGE),
        ("Send to server", INDIGO),
        ("Same 6 stages", VIOLET),
        ("Share URL / chat", EMERALD),
    ]
    sx = margin_x
    cy2 = cy - 30
    for i, (label, color) in enumerate(cli_steps):
        draw_flow_box(c, label, sx, cy2, sw, 22, color)
        if i < len(cli_steps) - 1:
            c.setStrokeColor(TEXT_TERTIARY)
            c.setLineWidth(0.8)
            c.line(sx + sw + 1, cy2 + 11, sx + sw + sg - 1, cy2 + 11)
        sx += sw + sg

    # Architecture Layers
    ay = cy2 - 50
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(WHITE)
    c.drawString(margin_x, ay, "System Architecture")

    layers = [
        ("FRONTEND", INDIGO, [
            "React 19 + Vite 8 build system",
            "Custom HTML5 Canvas graph renderer",
            "D3-force physics simulation",
            "Zustand state management",
            "Tailwind v4 styling",
            "Mobile-responsive with touch gestures",
        ]),
        ("API SERVER", VIOLET, [
            "Hono lightweight web framework",
            "Routes: pipeline, chat, explain, quiz, cx, admin",
            "SSE streaming for real-time responses",
            "CORS + auth middleware",
            "Deployed on Vercel",
        ]),
        ("AI LAYER", CYAN, [
            "Claude Sonnet 4.6 for all analysis",
            "Structured JSON output via tool_use",
            "OpenAI embeddings for RAG retrieval",
            "Batch processing (50 files/call, 3 waves)",
            "Graph expansion operations from chat",
        ]),
        ("DATA LAYER", EMERALD, [
            "Supabase PostgreSQL for all metadata",
            "Supabase Storage for file contents",
            "Supabase Auth (OAuth + refresh tokens)",
            "Tables: projects, files, concepts, edges,",
            "  code_chunks, chat_sessions, chat_messages",
        ]),
    ]

    layer_h = 108
    layer_gap = 8
    ly = ay - 24

    for name, color, items in layers:
        draw_card(c, margin_x, ly - layer_h, full_w, layer_h, BG_SURFACE)

        c.setFillColor(color)
        c.roundRect(margin_x + 12, ly - 22, 90, 16, 4, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(WHITE)
        lw = c.stringWidth(name, "Helvetica-Bold", 8)
        c.drawString(margin_x + 12 + (90 - lw) / 2, ly - 18, name)

        col_w = (full_w - 40) / 2
        ix = margin_x + 16
        iy = ly - 40
        for j, item in enumerate(items):
            cx_pos = ix if j % 2 == 0 else ix + col_w
            draw_bullet(c, item, cx_pos, iy, TEXT_SECONDARY, color, 8, col_w - 20)
            if j % 2 == 1:
                iy -= 15

        ly -= layer_h + layer_gap

    c.setFont("Helvetica", 8)
    c.setFillColor(TEXT_TERTIARY)
    draw_centered(c, "Built with Claude API  |  codebaseexplorer.com", 40)
    c.drawRightString(W - 40, 40, "6 / 6")


def main():
    c_pdf = canvas.Canvas(OUTPUT, pagesize=letter)
    c_pdf.setTitle("Codebase Explorer \u2014 How It Works")
    c_pdf.setAuthor("Codebase Explorer")
    c_pdf.setSubject("AI-Powered Codebase Comprehension")

    pages = [page_title, page_pipeline, page_graph, page_features, page_cli, page_architecture]
    for i, page_fn in enumerate(pages):
        page_fn(c_pdf)
        if i < len(pages) - 1:
            c_pdf.showPage()

    c_pdf.save()
    print(f"PDF generated: {OUTPUT}")


if __name__ == "__main__":
    main()
