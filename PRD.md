##  **Product Requirements Document (PRD): AI-VA**
* **Product Name:** AI-VA (Spatial BI & Generative Voice Assistant)
* **Document Status:** V1.7 (Global Identity Sync Launched)
* **Product Owner & Manager:** Manan

## **1. Executive Summary & Problem Space**
* **The Problem:** Modern enterprises sit on mountains of data stored in complex SQL databases, dense CSV files, and static BI dashboards. However, the business leaders who need this data the most often lack the technical SQL skills or the time to manually build charts. They rely heavily on data teams, creating massive operational bottlenecks.
* **The Solution:** AI-VA bridges the data-literacy gap by serving as an autonomous, voice-activated data analyst. By combining LLMs, Multi-Agent architecture, and dynamic frontend rendering, AI-VA allows stakeholders to literally "talk to their data" and receive instant spoken insights.

## **2. Target Audience & User Personas**
**Persona 1: The Time-Poor Executive (Primary)**
* **Role:** VP of Sales / Regional Director.
* **Pain Point:** Needs to know last quarter's revenue breakdown immediately before a board meeting, but the data team takes 2 days to generate a custom report.
* **Goal:** Instant, frictionless access to high-level KPIs and predictive trends without writing a single line of code.

**Persona 2: The Non-Technical Operator (Secondary)**
* **Role:** Marketing Manager / Operations Lead.
* **Pain Point:** Has a raw .csv export from a CRM tool but doesn't know how to use pivot tables or Tableau to visualize it.
* **Goal:** Upload a file and have the system automatically build the charts and explain the insights.

## **3. Core Use Cases & User Journey**
**The "Zero-to-Dashboard" Journey:**
1. **Connect:** The user securely logs in via Google SSO (OAuth 2.0). They toggle to "Enterprise SQL" mode or upload a raw CSV file.
2. **Command:** The user clicks the microphone and asks a natural language question (e.g., "What were our top-selling product categories last month? Please plot it on a bar chart.").
3. **Compute:** The Master Orchestrator delegates the command to a specialized SQL AI Agent to query the secure database, then passes the structured results to a separate Frontend Analyst AI Agent to generate UI components.
4. **Consume:** The user hears the spoken strategic insight while a dynamic Chart.js graph renders instantly on their screen.
5. **Contextual Follow-up:** The user asks a pronoun-driven follow-up question (e.g., "Break *that* down by region"). The Context Engine feeds the rolling memory back into the SQL Agent for seamless conversational continuity.
6. **Drill-Down:** The user physically clicks a concerning data point on the rendered chart, automatically triggering a deeper, granular SQL query without needing to use the microphone again.
7. **Retain:** The user clicks "Save to My Insights" to permanently store the session in the Time Machine gallery (accessed via the Sidebar Menu) for future reference.
8. **Distribute:** The user clicks "Download Exec Summary" to instantly package the visual chart and AI text insight into a branded, boardroom-ready PDF document, or pushes the insight directly to corporate Slack channels.

## **4. Feature Prioritization (MoSCoW Framework)**
To ensure rapid deployment of the MVP, features were strictly prioritized based on user value and engineering feasibility.
* **Must Have (Core MVP):**
  * Seamless Web Speech API integration (STT & TTS) with auto-muting to prevent audio looping.
  * LLM-driven JSON generation to parse data into valid Chart.js configurations.
  * Enterprise Security Gateway: Secure, authenticated login pipeline featuring Google SSO (OAuth 2.0) and cookie-based session management, alongside traditional bcrypt fallback.
* **Should Have (Enterprise Value):**
  * Agentic Text-to-SQL translation allowing direct connections to relational databases (SQLite).
  * Modular Multi-Agent architecture separating SQL generation and UI rendering to improve accuracy and allow for independent model scaling.
  * Persistent session memory (SQLite DB) to allow users to save and reload historical insights via an organized Sidebar Drawer navigation system.
* **Could Have (The "Wow" Factor):**
  * Slack Webhook Integrations: 1-click publishing module to push text and graphical insights directly into corporate communication channels.
  * Zero-shot predictive analytics ("The Oracle") to mathematically forecast future trends on graphs.
  * Spatial image highlighting using bounding box [ymin, xmin, ymax, xmax] coordinates for static dashboard analysis.
  * Automated anomaly detection (The Watchdog) to proactively flag and colorize data outliers.
  * Interactive click-to-query chart drill-downs bridging touch UI with backend SQL generation.
  * Comparative BI capabilities handling complex datasets and dynamically rendering dual-axis charts for metrics on different scales.
* **Won't Have (Deferred to V2):**
  * Multi-player collaboration (sharing dashboards via URL).
  * Automated CRON scheduled reporting (The "Monday Morning" Engine).
  * Global Database Identity Sync (syncing local storage files across Chrome profiles via backend lookup).
 
## **5. Success Metrics (KPIs)**
How do we know AI-VA is actually solving the problem?
1. **Time-to-Insight (TTI):** Measure the time from the end of the user's voice command to the final chart rendering. Target: < 4 seconds.
2. **Query Accuracy Rate:** The percentage of natural language queries successfully converted into valid SQL without throwing a 500 Server Error.
3. **Conversational Depth:** The average number of consecutive follow-up queries a user makes within a single session, indicating successful context retention.
