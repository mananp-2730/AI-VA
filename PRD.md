##  **Product Requirements Document (PRD): AI-VA**
* **Product Name:** AI-VA (Spatial BI & Generative Voice Assistant)
* **Document Status:** V1 (MVP Launched)
* **Product Owner & Manager:** Manan

## **1. Executive Summary & Problem Space**
* **The Problem:** Modern enterprises sit on mountains of data stored in complex SQL databases, dense CSV files, and static BI dashboards. However, the business leaders who need this data the most (VPs, Directors, Managers) often lack the technical SQL skills or the time to manually build charts. They rely heavily on data teams, creating massive operational bottlenecks and slowing down decision-making.
* **The Solution:** AI-VA bridges the data-literacy gap by serving as an autonomous, voice-activated data analyst. By combining LLMs, Text-to-SQL architecture, and dynamic frontend rendering, AI-VA allows non-technical stakeholders to literally "talk to their data" and receive instant spoken insights alongside generated interactive dashboards.

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
1. **Connect:** The user toggles to "Enterprise SQL" mode or uploads a raw CSV file.
2. **Command:** The user clicks the microphone and asks a natural language question (e.g., "What were our top-selling product categories last month? Please plot it on a bar chart.").
3. **Compute:** AI-VA translates the intent to raw SQL, executes the query against the live database, and feeds the resulting numbers to the UI engine.
4. **Consume:** The user hears the spoken strategic insight while a dynamic Chart.js graph renders instantly on their screen.
5. **Retain:** The user clicks "Save to My Insights" to permanently store the session in the Time Machine gallery for future reference.

## **4. Feature Prioritization (MoSCoW Framework)**
To ensure rapid deployment of the MVP, features were strictly prioritized based on user value and engineering feasibility.
* **Must Have (Core MVP):**
  * Seamless Web Speech API integration (STT & TTS) with auto-muting to prevent audio looping.
  * LLM-driven JSON generation to parse data into valid Chart.js configurations.
  * Secure, authenticated login gateway (FastAPI + bcrypt) to protect sensitive business data.
* **Should Have (Enterprise Value):**
  * Agentic Text-to-SQL translation allowing direct connections to relational databases (SQLite).
  * Persistent session memory (SQLite DB) to allow users to save and reload historical insights.
* **Could Have (The "Wow" Factor):**
  * Zero-shot predictive analytics ("The Oracle") to mathematically forecast future trends on graphs.
  * Spatial image highlighting using bounding box [ymin, xmin, ymax, xmax] coordinates for static dashboard analysis.
* **Won't Have (Deferred to V2):**
  * Multi-player collaboration (sharing dashboards via URL).
  * OAuth 2.0 / Google SSO integration.

## **5. Success Metrics (KPIs)**
How do we know AI-VA is actually solving the problem?
1. **Time-to-Insight (TTI):** Measure the time from the end of the user's voice command to the final chart rendering. Target: < 4 seconds.
2. **Query Accuracy Rate:** The percentage of natural language queries successfully converted into valid SQL without throwing a 500 Server Error.
3. **Session Retention:** The percentage of users who save an insight to their gallery and reload it in a subsequent session.

