from fpdf import FPDF
import os

class VCReport(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, 'Codebase Explorer - VC Due Diligence Report | CONFIDENTIAL', align='C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

    def chapter_title(self, title):
        self.set_font('Helvetica', 'B', 16)
        self.set_text_color(30, 30, 80)
        self.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(80, 80, 180)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 13)
        self.set_text_color(50, 50, 120)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def subsection_title(self, title):
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(60, 60, 60)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, text)
        self.ln(3)

    def bullet(self, text):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(40, 40, 40)
        x = self.get_x()
        self.cell(8, 5.5, '-')
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def verdict_box(self, verdict, color):
        self.set_fill_color(*color)
        self.set_draw_color(*color)
        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 14)
        self.cell(0, 12, f'  VERDICT: {verdict}', fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)
        self.set_text_color(40, 40, 40)

    def score_row(self, label, score, max_score=10):
        self.set_font('Helvetica', '', 10)
        self.set_text_color(40, 40, 40)
        self.cell(80, 7, label)
        bar_width = 80
        filled = bar_width * score / max_score
        self.set_fill_color(80, 80, 180)
        self.cell(filled, 7, '', fill=True)
        self.set_fill_color(220, 220, 220)
        self.cell(bar_width - filled, 7, '', fill=True)
        self.set_font('Helvetica', 'B', 10)
        self.cell(20, 7, f' {score}/{max_score}', new_x="LMARGIN", new_y="NEXT")
        self.ln(1)


pdf = VCReport()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)

# ============================================================
# COVER PAGE
# ============================================================
pdf.add_page()
pdf.ln(50)
pdf.set_font('Helvetica', 'B', 32)
pdf.set_text_color(30, 30, 80)
pdf.cell(0, 15, 'CODEBASE EXPLORER', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.set_font('Helvetica', '', 14)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 10, 'Venture Capital Due Diligence Report', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.ln(10)
pdf.set_draw_color(80, 80, 180)
pdf.set_line_width(1)
pdf.line(60, pdf.get_y(), 150, pdf.get_y())
pdf.ln(10)
pdf.set_font('Helvetica', '', 11)
pdf.set_text_color(80, 80, 80)
pdf.cell(0, 8, 'Prepared: April 7, 2026', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, 'Sector: EdTech / AI-Powered Developer Tools', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, 'Stage: Pre-Seed / Prototype', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 8, 'Target User: CS Students (2nd year+)', align='C', new_x="LMARGIN", new_y="NEXT")
pdf.ln(20)
pdf.set_font('Helvetica', 'I', 9)
pdf.set_text_color(150, 150, 150)
pdf.cell(0, 6, 'CONFIDENTIAL - For internal investment committee review only', align='C', new_x="LMARGIN", new_y="NEXT")

# ============================================================
# EXECUTIVE SUMMARY
# ============================================================
pdf.add_page()
pdf.chapter_title('1. EXECUTIVE SUMMARY')

pdf.verdict_box('NOT INVESTABLE AT CURRENT STATE - HIGH POTENTIAL WITH PIVOTS', (180, 80, 40))

pdf.body_text(
    'Codebase Explorer is an AI-powered educational tool that helps CS students understand software architecture '
    'by transforming codebases into interactive, graph-based visualizations with guided narration at multiple depth levels. '
    'The product demonstrates genuine pedagogical insight and strong technical execution for a prototype, but faces '
    'fundamental challenges in market sizing, monetization, and competitive positioning that prevent it from being a '
    'billion-dollar outcome in its current form.'
)

pdf.body_text(
    'The core insight - that "vibe coding" has created a generation of developers who can build but cannot understand '
    'what they built - is extraordinarily timely. With 92% of developers using AI coding tools and CS enrollment '
    'declining at 62% of institutions, the need for architectural comprehension tools is real and growing. However, '
    'the current product is narrowly scoped to CS students and lacks the monetization levers, network effects, and '
    'platform dynamics required for venture-scale returns.'
)

pdf.section_title('Key Metrics Observed')
pdf.bullet('Processing pipeline: ~15 seconds for small projects (excellent)')
pdf.bullet('AI pipeline: 7-stage architecture with background enrichment (sophisticated)')
pdf.bullet('Content quality: Three depth levels (Conceptual/Applied/Under the Hood) with accurate, pedagogically sound explanations')
pdf.bullet('Skill tracking: 25 concepts across 4 categories with encounter-based proficiency')
pdf.bullet('Curated library: 6 pre-analyzed open-source projects at varying difficulty')
pdf.bullet('Tech stack: React 19 + Hono + Supabase + Claude Sonnet 4.6/Haiku 4.5 + OpenAI embeddings')

# ============================================================
# SCORECARD
# ============================================================
pdf.add_page()
pdf.chapter_title('2. INVESTMENT SCORECARD')

pdf.score_row('Product Vision & Insight', 8)
pdf.score_row('Technical Execution', 7)
pdf.score_row('UI/UX Quality', 5)
pdf.score_row('Market Size (Current Positioning)', 4)
pdf.score_row('Monetization Strategy', 2)
pdf.score_row('Competitive Moat', 4)
pdf.score_row('Network Effects / Virality', 3)
pdf.score_row('Scalability', 5)
pdf.score_row('Team Signal (Solo Builder)', 6)
pdf.score_row('Timing', 9)
pdf.ln(5)
pdf.set_font('Helvetica', 'B', 12)
pdf.set_text_color(30, 30, 80)
pdf.cell(0, 10, 'Overall: 53/100 - Below Investment Threshold (70+)', new_x="LMARGIN", new_y="NEXT")
pdf.ln(5)

# ============================================================
# PRODUCT DEEP DIVE
# ============================================================
pdf.add_page()
pdf.chapter_title('3. PRODUCT DEEP DIVE')

pdf.section_title('3.1 What It Does Well')

pdf.subsection_title('Pedagogical Design (A)')
pdf.body_text(
    'The three-tier depth model (Conceptual > Applied > Under the Hood) is genuinely brilliant for learning. '
    'Conceptual explanations use metaphors ("Think of this like the main() method in a Java program"), Applied '
    'shows real implementation details with highlighted keywords (component, handler, props), and Under the Hood '
    'explains design patterns and tradeoffs. This scaffolded approach mirrors Bloom\'s Taxonomy and is superior '
    'to most educational tools that dump everything at once.'
)

pdf.subsection_title('AI Pipeline Architecture (A-)')
pdf.body_text(
    'The 7-stage pipeline (file analysis > concept synthesis > depth mapping > insight generation > quiz generation > '
    'embedding > concept mapping) is well-designed. Smart optimization: the pipeline marks "complete" after concept '
    'synthesis so the UI loads immediately, then runs enrichment stages in the background. Uses Claude Sonnet 4.6 '
    'for complex analysis and Haiku 4.5 for fast operations - good cost optimization. Structured outputs via tool_use '
    'with retry logic for rate limiting.'
)

pdf.subsection_title('Graph Visualization & Guided Flow (B+)')
pdf.body_text(
    'The d3-force graph visualization with concept nodes, edges showing relationships, and smooth zoom/pan on '
    'concept selection creates an engaging exploration experience. The guided overlay advances through concepts '
    'in pedagogical order (critical > important > supporting), showing connections to previously explored concepts. '
    'Progress tracking (1/6 explored, 50% bar) gamifies the learning process.'
)

pdf.subsection_title('Skill Profile System (B+)')
pdf.body_text(
    'The cross-project skill tracking system maps individual concept encounters to universal CS concepts across '
    'categories (Frontend 4/4, Backend 5/6, Database 3/3, General 10/12). This is the embryo of a very valuable '
    'data asset - a verified skill graph for every user. With encounter dates and frequency tracking, this could '
    'become a credentialing system.'
)

pdf.section_title('3.2 Critical Issues Found')

pdf.subsection_title('React Hooks Bug (Severity: High)')
pdf.body_text(
    'Navigating directly to /explorer causes a React hooks error ("Rendered fewer hooks than expected") and a blank '
    'page. The explorer only works when reached through the proper flow (overview > start exploring). This means '
    'any bookmarked link, shared URL, or browser refresh on the explorer page results in a broken experience. '
    'For an educational tool where users return to continue learning, this is a critical bug.'
)

pdf.subsection_title('Chat Panel Overlap (Severity: Medium)')
pdf.body_text(
    'When the chat panel opens with a response, it overlaps with the guided overlay and graph visualization, '
    'creating an unreadable mess. The three panels (graph, guided overlay, chat) compete for the same screen '
    'real estate without proper layout management. This undermines two core features simultaneously.'
)

pdf.subsection_title('Mobile Experience (Severity: High)')
pdf.body_text(
    'At 375px (iPhone), the explorer is nearly unusable: overlapping nav elements, the chat and guided overlay '
    'stack on top of each other, graph nodes are too small to tap, and the overall layout breaks. The landing '
    'page cards run together without visible separation. Given that CS students are heavy mobile users, this is '
    'a significant gap. The CLAUDE.md design doc mandates extensive responsive design rules that are not implemented.'
)

pdf.subsection_title('Emoji Usage (Severity: Low)')
pdf.body_text(
    'The upload page uses a box emoji (package icon) despite the CLAUDE.md explicitly prohibiting emojis. The concept '
    'synthesis schema also includes an "emoji" field per concept. Minor but signals inconsistency between design '
    'standards and implementation.'
)

pdf.subsection_title('Preview Failure (Severity: Medium)')
pdf.body_text(
    'Clicking "React TodoMVC" in the curated library shows "Failed to load preview" before reaching the architecture. '
    'The error handling is graceful (offers "Explore architecture" fallback), but the preview feature itself is broken, '
    'reducing the perceived polish of the curated experience.'
)

pdf.subsection_title('Security: Exposed API Keys (Severity: Critical)')
pdf.body_text(
    'The .env file contains live Anthropic, OpenAI, and Supabase service role keys and is present in the project '
    'directory. If this is committed to a public repository, all keys are compromised. The Supabase service role key '
    'grants full database access bypassing RLS. This must be remediated immediately.'
)

# ============================================================
# MARKET ANALYSIS
# ============================================================
pdf.add_page()
pdf.chapter_title('4. MARKET ANALYSIS')

pdf.section_title('4.1 The Tailwind: Vibe Coding Creates the Problem')
pdf.body_text(
    'The timing thesis is strong. As of 2026, 92% of US developers use AI coding tools, and 75% use AI for more '
    'than half their coding. "Vibe coding" - building software without understanding the generated code - has gone '
    'mainstream. Harvard now teaches courses on it. The critical gap: students and junior developers can build but '
    'cannot debug, extend, or explain what they built. Codebase Explorer directly addresses this gap.'
)

pdf.section_title('4.2 The Headwind: CS Enrollment is Declining')
pdf.body_text(
    'CS enrollment declined at 62% of computing academic units in 2025-2026. Graduate CS enrollment dropped 15%. '
    'Students are shifting to cybersecurity, mechanical engineering, and other fields perceived as more AI-resistant. '
    'While this validates the need for tools that help remaining students learn faster, it shrinks the addressable '
    'market for a CS-student-only product.'
)

pdf.section_title('4.3 Market Size Assessment')

pdf.subsection_title('Current TAM (CS Students Only)')
pdf.body_text(
    'Approximately 1.3 million CS/IT students globally. At $10/month subscription, the theoretical TAM is ~$156M/year. '
    'With realistic 5-10% penetration, revenue ceiling is $8-16M/year. This is a solid business but not a venture-scale '
    'outcome.'
)

pdf.subsection_title('Expanded TAM (All Developers)')
pdf.body_text(
    'The global EdTech market is $214B in 2026, growing at 13.3% CAGR. The AI coding tools market (Cursor at $50B '
    'valuation, $2B ARR; Copilot with 4.7M paid subscribers) demonstrates massive willingness to pay for developer '
    'tools. If Codebase Explorer repositions as a code comprehension platform for ALL developers (not just students), '
    'the addressable market expands to $5-10B.'
)

pdf.section_title('4.4 Competitive Landscape')

pdf.subsection_title('Direct Competitors')
pdf.bullet('Code Comprehend (enterprise legacy code understanding) - different segment, enterprise-focused')
pdf.bullet('Codecademy/Brilliant (online CS education) - course-based, not codebase-based')
pdf.bullet('GitHub Copilot Workspace (code understanding) - integrated into existing workflow')
pdf.bullet('Cursor "codebase understanding" features - bundled with editor')

pdf.subsection_title('Indirect Competition')
pdf.bullet('ChatGPT/Claude chat - students can paste code and ask "explain this"')
pdf.bullet('YouTube tutorials and documentation')
pdf.bullet('Traditional IDE features (call hierarchy, type definitions)')

pdf.body_text(
    'The biggest competitive risk is that AI coding assistants (Cursor, Copilot, Claude Code) add "explain this '
    'codebase" features as a bundled capability. Cursor already has codebase indexing. The standalone tool must offer '
    'something these cannot: structured pedagogical progression, skill tracking, and verified comprehension (quizzes).'
)

# ============================================================
# PATH TO BILLION-DOLLAR OUTCOME
# ============================================================
pdf.add_page()
pdf.chapter_title('5. PATH TO BILLION-DOLLAR OUTCOME')

pdf.body_text(
    'The current product is not a billion-dollar business. Here are the structural changes required to reach that scale.'
)

pdf.section_title('5.1 PIVOT 1: From "Student Tool" to "Developer Comprehension Platform"')
pdf.body_text(
    'The core technology (AI-powered codebase analysis + graph visualization + guided narration) is not limited to '
    'students. Reposition as the universal tool for understanding ANY codebase. Target segments:\n\n'
    '1. New hire onboarding: Companies spend weeks getting developers productive on a new codebase. A tool that '
    'generates an interactive architecture map with guided walkthroughs could reduce onboarding time by 50%.\n\n'
    '2. Technical due diligence: VCs and acquirers need to understand codebases during M&A. Automated architecture '
    'analysis is a high-value, low-frequency use case with enterprise pricing.\n\n'
    '3. Legacy code comprehension: Code Comprehend targets this at the enterprise level. There\'s room for a '
    'developer-friendly, self-serve version.\n\n'
    '4. Open source maintainer tools: Help maintainers generate interactive documentation for contributors.'
)

pdf.section_title('5.2 PIVOT 2: Build a Verified Skills Marketplace')
pdf.body_text(
    'The skill profile system is the most investable feature in the product. If every concept encounter is tracked, '
    'verified through quizzes, and mapped to universal CS concepts, you are building a skills graph that is more '
    'accurate than any resume or certification.\n\n'
    'Duolingo proved that gamified learning + skill tracking + streaks = $4.5B market cap on $1B revenue. '
    'Apply the same model:\n\n'
    '1. "Duolingo for Code Architecture" - daily streaks, XP, leaderboards, concept mastery levels\n'
    '2. Verified skill badges shareable on LinkedIn/GitHub\n'
    '3. Employer marketplace: companies can find developers with verified understanding of specific architectures\n'
    '4. University partnerships: professors assign codebases, students explore, skills are tracked and graded\n\n'
    'Revenue model: Free tier (3 codebases/month) > Pro ($15/month, unlimited) > Teams ($30/seat/month) > Enterprise'
)

pdf.section_title('5.3 PIVOT 3: GitHub Integration as Distribution Moat')
pdf.body_text(
    'The current upload-a-zip flow is high friction. The product already has a /api/github route for repo fetching. '
    'Go all-in on GitHub integration:\n\n'
    '1. GitHub App that auto-generates architecture maps for any repo\n'
    '2. "Understand This Repo" button on GitHub (browser extension)\n'
    '3. README badges showing architecture complexity scores\n'
    '4. PR review integration: "This PR changes these architectural concepts"\n'
    '5. GitHub Marketplace listing for organic distribution\n\n'
    'This creates a distribution moat. If 10% of GitHub\'s 100M+ developers install the extension, you have 10M users '
    'with near-zero CAC.'
)

pdf.section_title('5.4 PIVOT 4: Platform Play - User-Generated Curated Libraries')
pdf.body_text(
    'The curated library (6 projects) is hand-crafted. Open it up:\n\n'
    '1. Professors create curated learning paths from real-world codebases\n'
    '2. Bootcamps build curriculum around architectural exploration\n'
    '3. Companies create onboarding paths for their internal codebases\n'
    '4. Community members contribute and rate learning paths\n\n'
    'This creates a marketplace with network effects: more content attracts more learners, which attracts more '
    'content creators. The platform becomes a two-sided marketplace for code education.'
)

pdf.section_title('5.5 PIVOT 5: AI Architecture Advisor (B2B SaaS)')
pdf.body_text(
    'The analysis pipeline already identifies architectural concepts, relationships, and patterns. Extend this into:\n\n'
    '1. Architecture health scoring (technical debt detection)\n'
    '2. Dependency risk analysis\n'
    '3. Architecture drift monitoring (CI/CD integration)\n'
    '4. Recommended refactoring paths\n'
    '5. Architecture decision records (ADR) generation\n\n'
    'This is a $5-10B market segment. Companies like Sonar, Snyk, and CodeClimate have proven that developers pay '
    'for code quality tools. Architecture-level analysis is the next frontier.'
)

# ============================================================
# FINANCIAL MODEL
# ============================================================
pdf.add_page()
pdf.chapter_title('6. FINANCIAL PROJECTIONS (POST-PIVOT)')

pdf.section_title('Revenue Model: Freemium + B2B SaaS')

pdf.subsection_title('Year 1 (Post-Pivot): $0-500K ARR')
pdf.bullet('Launch GitHub extension for organic distribution')
pdf.bullet('Free tier: 3 repos/month, basic architecture maps')
pdf.bullet('Pro tier ($15/month): unlimited repos, skill tracking, quizzes')
pdf.bullet('Target: 50K free users, 2K paid ($360K ARR)')

pdf.subsection_title('Year 2: $2-5M ARR')
pdf.bullet('University partnerships (10 universities, $50K/year each = $500K)')
pdf.bullet('Teams tier for bootcamps and small companies ($30/seat/month)')
pdf.bullet('Pro subscriber growth to 10K ($1.8M ARR)')
pdf.bullet('Marketplace for curated learning paths (15% platform fee)')

pdf.subsection_title('Year 3: $15-30M ARR')
pdf.bullet('Enterprise tier for onboarding and architecture monitoring')
pdf.bullet('B2B SaaS: architecture health scoring for CI/CD pipelines')
pdf.bullet('100K+ Pro subscribers, 50+ enterprise customers')
pdf.bullet('Verified skills marketplace with employer partnerships')

pdf.subsection_title('Year 5: $100M+ ARR (Unicorn Path)')
pdf.bullet('"Duolingo for Code" brand recognition')
pdf.bullet('1M+ active users, 100K+ paid subscribers')
pdf.bullet('Enterprise architecture platform with 500+ customers')
pdf.bullet('Skills marketplace generating $20M+ in transaction fees')
pdf.bullet('University standard adopted by 500+ institutions')

pdf.section_title('Unit Economics (Target)')
pdf.bullet('CAC: $5-15 (organic via GitHub extension + word of mouth)')
pdf.bullet('LTV: $180-360 (12-24 month retention at $15/month)')
pdf.bullet('LTV/CAC ratio: 12-72x (exceptional if achieved)')
pdf.bullet('Gross margin: 60-70% (AI API costs are the main COGS)')

pdf.section_title('AI Cost Concerns')
pdf.body_text(
    'Each codebase analysis requires multiple Claude API calls (file analysis, concept synthesis, depth mapping, '
    'insight generation, quiz generation) plus OpenAI embedding calls. Estimated cost per analysis: $0.50-2.00 '
    'depending on codebase size. At scale, this creates margin pressure. Mitigation strategies:\n\n'
    '1. Cache analysis results aggressively (same repo = same analysis)\n'
    '2. Use Haiku 4.5 for more pipeline stages (already partially implemented)\n'
    '3. Batch processing during off-peak hours\n'
    '4. Fine-tuned smaller models for common patterns'
)

# ============================================================
# TECHNICAL ASSESSMENT
# ============================================================
pdf.add_page()
pdf.chapter_title('7. TECHNICAL ARCHITECTURE ASSESSMENT')

pdf.section_title('7.1 Strengths')
pdf.bullet('Clean separation of concerns: Hono server with modular route handlers')
pdf.bullet('9 API route modules (pipeline, chat, explain, proactive, user-state, github, curated, skill-profile, quiz)')
pdf.bullet('Structured AI outputs using tool_use pattern with JSON schemas - reliable and type-safe')
pdf.bullet('Background enrichment pattern: UI loads immediately, enrichment runs async')
pdf.bullet('Dual-model strategy (Sonnet for quality, Haiku for speed) with automatic retry on rate limits')
pdf.bullet('Supabase for auth-ready database with real-time capabilities')
pdf.bullet('RAG system with OpenAI embeddings for contextual chat responses')

pdf.section_title('7.2 Concerns')
pdf.bullet('No TypeScript on frontend (all .jsx files) - inconsistent with backend (.ts)')
pdf.bullet('Single Zustand store (useStore.js) likely growing large - no state slicing visible')
pdf.bullet('No test files found - zero test coverage')
pdf.bullet('No database migrations tracked in code - schema managed via Supabase dashboard')
pdf.bullet('CORS set to wildcard (*) in development - needs lockdown for production')
pdf.bullet('Service role key used server-side (bypasses RLS) - correct pattern but requires careful API security')
pdf.bullet('No rate limiting on API endpoints - vulnerable to abuse')
pdf.bullet('No authentication system - any user can access any project')

pdf.section_title('7.3 Scalability')
pdf.body_text(
    'The current architecture (single Node.js server + Supabase) can handle early-stage traffic but will need '
    'significant work for scale:\n\n'
    '1. Pipeline processing is synchronous per-project - needs a job queue (BullMQ, Inngest) for concurrent analysis\n'
    '2. No CDN or edge caching for static assets\n'
    '3. No WebSocket/SSE for real-time pipeline progress (uses polling)\n'
    '4. Database queries are not optimized (no visible indexes beyond Supabase defaults)\n'
    '5. No observability (logging exists but no structured metrics, tracing, or alerting)'
)

# ============================================================
# UX ASSESSMENT
# ============================================================
pdf.add_page()
pdf.chapter_title('8. UI/UX ASSESSMENT')

pdf.section_title('8.1 Desktop Experience (Score: 6/10)')
pdf.body_text(
    'The desktop experience is functional and shows design ambition. The dark theme with layered surfaces, '
    'the graph visualization, and the guided overlay create an engaging exploration experience. The processing '
    'screen with animated particles and step-by-step progress is well-executed.\n\n'
    'However, layout management breaks down when multiple panels are open simultaneously (chat + guided overlay + graph). '
    'The skill profile page is dense but well-organized. The curated library cards are clean but lack hover states '
    'beyond basic highlights.'
)

pdf.section_title('8.2 Mobile Experience (Score: 2/10)')
pdf.body_text(
    'Mobile is severely broken. The explorer is nearly unusable at 375px: overlapping elements, cramped navigation, '
    'unreadable text, and no touch-optimized interactions. The landing page is passable but cards lack visual '
    'separation. The CLAUDE.md design document contains extensive responsive design requirements (bottom sheets, '
    '44px touch targets, single-column layouts) that are not implemented. For a product targeting college students '
    'who primarily use phones, this is a critical gap.'
)

pdf.section_title('8.3 Time-to-Value (Score: 8/10)')
pdf.body_text(
    'Upload-to-exploration takes ~15 seconds for a small project. The processing screen provides clear progress '
    'feedback. The overview page gives an immediate summary before diving into the graph. The guided flow auto-starts '
    'on the first concept. This is a strong time-to-value story - users see the product\'s value within 30 seconds.'
)

pdf.section_title('8.4 Engagement Mechanics (Score: 7/10)')
pdf.body_text(
    'Progress tracking (1/6 explored, 50% bar), proactive hints ("This connects to REST API Routing Layer"), '
    'concept depth tabs, and the skill profile all create reasons to continue exploring. The quiz gate (not fully '
    'tested but present in code) adds comprehension verification. Missing: streaks, XP, leaderboards, social features.'
)

# ============================================================
# RECOMMENDATIONS
# ============================================================
pdf.add_page()
pdf.chapter_title('9. RECOMMENDATIONS')

pdf.section_title('9.1 Immediate (Before Any Fundraise)')
pdf.bullet('FIX: Rotate all exposed API keys immediately')
pdf.bullet('FIX: React hooks bug on direct /explorer navigation')
pdf.bullet('FIX: Chat/overlay layout collision')
pdf.bullet('FIX: Mobile responsive design (minimum viable)')
pdf.bullet('FIX: Preview loading for curated codebases')
pdf.bullet('ADD: GitHub repo URL input (reduce friction from zip upload)')
pdf.bullet('ADD: Basic authentication (magic link via Supabase Auth)')
pdf.bullet('ADD: Usage analytics (Posthog or Mixpanel)')

pdf.section_title('9.2 Pre-Seed Milestones ($500K-1M raise)')
pdf.bullet('Ship GitHub browser extension for organic distribution')
pdf.bullet('Launch free tier with 3 repos/month limit')
pdf.bullet('Partner with 3-5 universities for pilot programs')
pdf.bullet('Implement Duolingo-style engagement (streaks, XP, daily goals)')
pdf.bullet('Reach 10K MAU and 500 paid subscribers')
pdf.bullet('Demonstrate 30-day retention > 40%')

pdf.section_title('9.3 Seed Milestones ($3-5M raise)')
pdf.bullet('Launch Teams tier for bootcamps and enterprises')
pdf.bullet('Build B2B architecture health scoring product')
pdf.bullet('User-generated curated learning paths marketplace')
pdf.bullet('Verified skill badges with LinkedIn integration')
pdf.bullet('Reach 100K MAU and 5K paid subscribers ($1M ARR)')

pdf.section_title('9.4 Series A ($15-25M raise)')
pdf.bullet('Enterprise architecture monitoring (CI/CD integration)')
pdf.bullet('Skills marketplace with employer partnerships')
pdf.bullet('International expansion (localized explanations)')
pdf.bullet('Reach 500K MAU and 30K paid subscribers ($5M+ ARR)')

# ============================================================
# CONCLUSION
# ============================================================
pdf.add_page()
pdf.chapter_title('10. CONCLUSION')

pdf.body_text(
    'Codebase Explorer demonstrates a genuine insight about the vibe coding era: as AI makes code generation '
    'trivially easy, code COMPREHENSION becomes the scarce and valuable skill. The pedagogical design (three depth '
    'levels, guided exploration, skill tracking) is more thoughtful than most EdTech products we review. The AI '
    'pipeline is well-architected with smart cost optimizations.\n\n'
    'However, the current product is a prototype, not a business. No authentication, no monetization, broken mobile, '
    'bugs on core flows, and exposed secrets. More fundamentally, the CS-student-only positioning limits the market '
    'to ~$150M TAM, well below venture scale.\n\n'
    'The path to a billion-dollar outcome requires three structural shifts:\n\n'
    '1. EXPAND THE MARKET: From CS students to all developers (onboarding, due diligence, legacy code)\n'
    '2. BUILD DISTRIBUTION: GitHub integration as the primary acquisition channel\n'
    '3. CREATE NETWORK EFFECTS: User-generated learning paths + verified skills marketplace\n\n'
    'If the founder executes these pivots and demonstrates strong retention metrics (>40% D30), this becomes a '
    'compelling pre-seed investment. The timing is perfect - the vibe coding wave is creating demand for comprehension '
    'tools, and no dominant player has emerged in this specific niche.\n\n'
    'We recommend PASSING at current state but MONITORING closely. If the founder:\n'
    '- Fixes the critical bugs and security issues\n'
    '- Ships GitHub integration\n'
    '- Demonstrates organic growth to 5K+ MAU\n'
    '- Shows >35% 30-day retention\n\n'
    '...we would re-evaluate for a $500K-1M pre-seed check with a $5-8M cap.'
)

pdf.ln(10)
pdf.set_font('Helvetica', 'I', 9)
pdf.set_text_color(120, 120, 120)
pdf.cell(0, 6, 'This report was generated through hands-on product testing, codebase review, and market research.', new_x="LMARGIN", new_y="NEXT")
pdf.cell(0, 6, 'All assessments reflect the state of the product as of April 7, 2026.', new_x="LMARGIN", new_y="NEXT")

# ============================================================
# APPENDIX: SCREENSHOTS
# ============================================================
pdf.add_page()
pdf.chapter_title('APPENDIX: PRODUCT SCREENSHOTS')

screenshots = [
    ('01_landing_page.png', 'Landing Page - Two-path entry (Upload vs Curated Library)'),
    ('02_curated_library.png', 'Curated Library - 6 projects at varying difficulty levels'),
    ('03_todomvc_preview.png', 'Preview Failure - "Failed to load preview" error state'),
    ('04_big_picture.png', 'Architecture Overview - AI-generated project summary'),
    ('05_explorer_view.png', 'Explorer View - Graph visualization with guided narration'),
    ('06_applied_tab.png', 'Applied Tab - Technical depth with highlighted keywords'),
    ('08_next_concept.png', 'Concept Progression - Advancing through guided tour'),
    ('10_mobile_explorer.png', 'Mobile Explorer - Broken responsive layout at 375px'),
    ('12_upload_screen.png', 'Upload Screen - Drag-and-drop with demo option'),
    ('13_processing_start.png', 'Processing Pipeline - Animated progress with step tracking'),
    ('14_generated_overview.png', 'Generated Overview - AI-analyzed uploaded project'),
    ('15_uploaded_explorer.png', 'Uploaded Project Explorer - AI-generated concept graph'),
    ('16_skill_profile.png', 'Skill Profile - Cross-project concept tracking'),
]

script_dir = os.path.dirname(os.path.abspath(__file__))

for filename, caption in screenshots:
    filepath = os.path.join(script_dir, filename)
    if os.path.exists(filepath):
        if pdf.get_y() > 200:
            pdf.add_page()
        pdf.set_font('Helvetica', 'B', 9)
        pdf.set_text_color(50, 50, 120)
        pdf.cell(0, 6, caption, new_x="LMARGIN", new_y="NEXT")
        try:
            pdf.image(filepath, x=15, w=180)
        except Exception as e:
            pdf.set_font('Helvetica', 'I', 9)
            pdf.cell(0, 6, f'[Image could not be loaded: {e}]', new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

# Save
output_path = os.path.join(os.path.dirname(script_dir), 'VC_Due_Diligence_Report_Codebase_Explorer.pdf')
pdf.output(output_path)
print(f'Report saved to: {output_path}')
