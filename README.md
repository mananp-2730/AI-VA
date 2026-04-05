## **AI-VA | Multimodal AI Business Intelligence & Text-to-SQL Agent**

AI-VA is a cloud-hosted, stateful, multimodal web application that bridges the enterprise data literacy gap. By combining state-of-the-art vision models, Agentic Text-to-SQL pipelines, and dynamic UI engineering, AI-VA allows users to bypass complex SQL queries and BI tools. Users can upload raw datasets, share visual dashboards, or connect directly to a live database, and have a seamless, continuous voice conversation with their data.

**Live Demo:** [AI-VA on Render](https://ai-va-7zyw.onrender.com) *(Note: May take 50 seconds to spin up on the free tier)*

## **The Product Vision (The Problem & Solution)**
* **The Problem:** Enterprise data is locked behind complex SQL queries, static CSVs, or dense visual dashboards. Executives and non-technical stakeholders lack the time to write queries or decipher complex charts to extract actionable insights.
* **The Solution:** AI-VA acts as an interactive, generative data translator. Users simply speak their questions. AI-VA dynamically queries the database, forecasts trends, generates interactive Chart.js dashboards in the browser, and speaks the strategic insights aloud.
  
## **Core Architecture & Enterprise Features**
* **Multi-Agent Orchestration Pipeline:** Refactored the backend from a monolithic prompt into a modular AI pipeline. A 'Master Orchestrator' API route coordinates tasks between an Agentic SQL Engineer (specialized purely in text-to-SQL) and a Frontend Analyst Agent (specialized in data analysis and JSON UI generation).
* **Comparative BI (Dual-Axis Charts):** Upgraded the Frontend Analyst Agent to automatically detect scale mismatches across multiple metrics (e.g., Revenue vs. Units Sold) and dynamically render dual-axis Chart.js configurations for complex executive analysis.
* **Enterprise Text-to-SQL Agent:** Users can bypass file uploads entirely. AI-VA translates natural language voice commands into secure, raw SELECT queries, executes them against a live relational database (SQLite), and feeds the data back into the LLM to generate UI components.
* **The Watchdog (Automated Anomaly Detection):** Upgraded the LLM system prompt to proactively scan SQL results for statistical anomalies (spikes/drops) and dynamically highlight specific outlier data points in bright red (#ef4444) on the generated UI, accompanied by a verbal warning.
* **Dynamic UI Drill-Downs (Click-to-Query):** Transformed static Chart.js canvases into interactive API triggers. Users can click specific data bars or pie slices to automatically generate and dispatch follow-up SQL queries without using the microphone, creating a frictionless, deep-dive analytical loop.
* **Executive Summary Generator:** Engineered a zero-latency client-side PDF export engine. Users can instantly capture the AI's strategic insights alongside the rendered Chart.js graphs into a professionally branded, dark-mode PDF document for boardroom distribution.
* **Zero-Shot Predictive Analytics:** Engineered with advanced prompt constraints allowing the AI to mathematically analyze historical sales/revenue trends, extend the timeline, and automatically render dashed predictive forecasting lines on the frontend UI.
* **Stateful "Time Machine" Memory:** Full-stack asynchronous state management backed by SQLite. AI-VA saves physical files, logs session metadata, and allows users to load historical conversations from a side-panel gallery, seamlessly restoring the exact Chart.js configuration and context window.
* **Generative BI Dashboards:** Upload a raw .csv file and ask a question. AI-VA acts as a data analyst and frontend developer, dynamically writing and rendering interactive Chart.js graphs directly in the browser.
* **Spatial Highlighting Engine:** Upload a static dashboard image. AI-VA utilizes Gemini's spatial prompting to return strict bounding-box coordinates [ymin, xmin, ymax, xmax], drawing glowing, real-time CSS highlights over the exact data points being discussed.
* **Continuous Conversational Loop:** Engineered with a custom Web Speech API integration that auto-mutes the microphone during AI TTS playback and automatically resumes listening, creating a frictionless, hands-free experience.
* **Secure Authentication Pipeline:** A full-stack security gatekeeper featuring a premium glass-morphic frontend UI wired to a FastAPI backend endpoint, utilizing bcrypt for cryptographic password hashing and SQLAlchemy for ORM.

## **PM Thinking & Strategic Trade-Offs**
Building AI-VA required balancing technical complexity with a frictionless user experience. Here are the key product decisions made during the MVP development:

* **Decision 1: Gemini 2.5 Flash vs. Pro Models**
  * **The Trade-off:** We sacrificed the deeper, multi-step reasoning of heavier models (like Gemini Pro or GPT-4) in favor of the blazing speed of Gemini 2.5 Flash.
  * **The PM Rationale:** For a voice-activated assistant, latency is the ultimate metric. A user waiting 10 seconds for a response breaks the conversational illusion. Flash provides sub-second Text-to-SQL translation, keeping the voice loop natural and instantaneous.

* **Decision 2: SQLite vs. Cloud PostgreSQL**
  * **The Trade-off:** We launched with a local SQLite database instead of a scalable, enterprise-grade cloud SQL server.
  * **The PM Rationale:** The core hypothesis to prove was "Can an LLM reliably translate voice to SQL and render UI components?" SQLite allowed for zero-configuration local testing and immediate validation of this "Text-to-SQL" agent without incurring cloud database costs or setting up complex VPCs for an MVP.

* **Decision 3: Muting the Mic During TTS Playback**
  * **The Trade-off:** The user cannot interrupt the AI while it is speaking, creating a walkie-talkie-style interaction rather than true full-duplex conversation.
  * **The PM Rationale:** If the Web Speech API mic remained active while the AI's Text-to-Speech (TTS) engine spoke, the system would transcribe its own voice, creating an infinite hallucination loop. Ensuring data accuracy and system stability took priority over concurrent speaking capabilities.

* **Decision 4: Skipping API Integrations (Salesforce/HubSpot)**
  * **The Trade-off:** We require the user to upload a CSV or use our dummy SQL database rather than connecting directly to their real SaaS tools.
  * **The PM Rationale:** Building OAuth pipelines for external APIs would delay the MVP launch by weeks. We prioritized building the core Generative Dashboard Engine first. If users find value in generating Chart.js files from raw CSVs, the logical next iteration is to build the API connectors.

* **Decision 5: Frontend (jsPDF) vs. Backend PDF Generation**
  * **The Trade-off:** We offloaded PDF rendering entirely to the user's browser using `jsPDF` rather than building a backend Python rendering engine (like ReportLab).
  * **The PM Rationale:** Generating PDFs on the server requires heavy compute and adds unnecessary network latency. By capturing the HTML canvas directly on the client side, we achieve instant downloads, zero server compute costs, and preserve the exact visual state of the user's dashboard.

* **Decision 6: Click-to-Query vs. Voice-Only Follow-ups**
  * **The Trade-off:** We added click event listeners to the generated charts, allowing users to physically click the UI to trigger follow-up queries instead of strictly forcing voice commands.
  * **The PM Rationale:** Multimodal inputs reduce user friction. If a user sees a concerning metric flagged by the anomaly detector, clicking the red bar is vastly faster and more intuitive than speaking a new command. This creates a hybrid voice-touch interface that respects the executive's natural analytical workflow.

* **Decision 7: Multi-Agent Pipeline vs. Monolithic Prompting**
  * **The Trade-off:** We migrated from a single, massive LLM prompt to a multi-agent orchestrated pipeline, increasing backend architectural complexity.
  * **The PM Rationale:** Monolithic prompts suffer from context degradation when tasked with multiple diverse operations (writing SQL, analyzing data, and formatting JSON simultaneously). Applying the "Separation of Concerns" principle ensures each specialized agent performs exactly one job flawlessly, vastly increasing the overall accuracy, security, and scalability of the tool.

## **System Architecture & Tech Stack**
* **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript, Chart.js (Dynamic Data Visualization).
* **Voice & UI:** Native Browser **Web Speech API** (STT/TTS), responsive split-pane architecture.
* **Backend:** **Python 3.12** & **FastAPI** for high-performance API routing and cloud environment management.
* **Database & Memory:** **SQLite**, **SQLAlchemy**, and **Pandas** for robust data manipulation and SQL query execution.
* **AI Processing:** **Pillow** for image byte-stream handling, integrated with the **Google Gemini 2.5 Flash** model via the `google-genai` SDK.
* **Deployment:** CI/CD pipeline integrated directly with **Render**.
  
## **Quick Start Guide (Local Development)**

1. Clone the Repository
   ```bash
   git clone [https://github.com/mananp-2730/AI-VA.git](https://github.com/mananp-2730/AI-VA.git)
   cd AI-VA

2. Set Up the Backend Engine
   Ensure you are using Python 3.12 for optimal dependency compatibility. Create a virtual environment and install the required libraries:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt

3. Initialize the Enterprise Database Sandbox
   Run the setup script to generate the local SQLite database populated with dummy corporate data:
   ```Bash
   python setup_enterprise_db.py
   
4. Configure the Environment
   Create a .env file in the backend directory and add your Google AI Studio key:
   ```Plaintext
   GEMINI_API_KEY=your_actual_api_key_here

5. Launch the Application
   Start the FastAPI server:
   ```bash
   python app.py

Open a modern web browser and navigate to server link (e.g. http://127.0.0.1:8000). Select "Enterprise SQL Database" from the dropdown, click the mic, and ask: "What were our total sales revenues by region? Please plot it on a pie chart."

## **Future Roadmap**
* **Cloud Storage Migration:** Transition local file system memory to an AWS S3 bucket to ensure permanent file retention across ephemeral cloud hosting instances.
* **OAuth 2.0 Integration:** Upgrade the custom authentication pipeline to support Google/Microsoft SSO for enterprise-grade security.



~ Manan
