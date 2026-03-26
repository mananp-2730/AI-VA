## **AI-VA | Multimodal AI Business Intelligence & Text-to-SQL Agent**

AI-VA is a cloud-hosted, stateful, multimodal web application that bridges the enterprise data literacy gap. By combining state-of-the-art vision models, Agentic Text-to-SQL pipelines, and dynamic UI engineering, AI-VA allows users to bypass complex SQL queries and BI tools. Users can upload raw datasets, share visual dashboards, or connect directly to a live database, and have a seamless, continuous voice conversation with their data.

**Live Demo:** [AI-VA on Render](https://ai-va-7zyw.onrender.com) *(Note: May take 50 seconds to spin up on the free tier)*

## The Product Vision (The Problem & Solution)
* **The Problem:** Enterprise data is locked behind complex SQL queries, static CSVs, or dense visual dashboards. Executives and non-technical stakeholders lack the time to write queries or decipher complex charts to extract actionable insights.
* **The Solution:** AI-VA acts as an interactive, generative data translator. Users simply speak their questions. AI-VA dynamically queries the database, forecasts trends, generates interactive Chart.js dashboards in the browser, and speaks the strategic insights aloud.
  
## Core Architecture & Enterprise Features
* **Enterprise Text-to-SQL Agent:** Users can bypass file uploads entirely. AI-VA translates natural language voice commands into secure, raw SELECT queries, executes them against a live relational database (SQLite), and feeds the data back into the LLM to generate UI components.
* **Zero-Shot Predictive Analytics:** Engineered with advanced prompt constraints allowing the AI to mathematically analyze historical sales/revenue trends, extend the timeline, and automatically render dashed predictive forecasting lines on the frontend UI.
* **Stateful "Time Machine" Memory:** Full-stack asynchronous state management backed by SQLite. AI-VA saves physical files, logs session metadata, and allows users to load historical conversations from a side-panel gallery, seamlessly restoring the exact Chart.js configuration and context window.
* **Generative BI Dashboards:** Upload a raw .csv file and ask a question. AI-VA acts as a data analyst and frontend developer, dynamically writing and rendering interactive Chart.js graphs directly in the browser.
* **Spatial Highlighting Engine:** Upload a static dashboard image. AI-VA utilizes Gemini's spatial prompting to return strict bounding-box coordinates [ymin, xmin, ymax, xmax], drawing glowing, real-time CSS highlights over the exact data points being discussed.
* **Continuous Conversational Loop:** Engineered with a custom Web Speech API integration that auto-mutes the microphone during AI TTS playback and automatically resumes listening, creating a frictionless, hands-free experience.
* **Secure Authentication Pipeline:** A full-stack security gatekeeper featuring a premium glass-morphic frontend UI wired to a FastAPI backend endpoint, utilizing bcrypt for cryptographic password hashing and SQLAlchemy for ORM.

## System Architecture & Tech Stack
* **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript, Chart.js (Dynamic Data Visualization).
* **Voice & UI:** Native Browser **Web Speech API** (STT/TTS), responsive split-pane architecture.
* **Backend:** **Python 3.12** & **FastAPI** for high-performance API routing and cloud environment management.
* **Database & Memory:** **SQLite**, **SQLAlchemy**, and **Pandas** for robust data manipulation and SQL query execution.
* **AI Processing:** **Pillow** for image byte-stream handling, integrated with the **Google Gemini 2.5 Flash** model via the `google-genai` SDK.
* **Deployment:** CI/CD pipeline integrated directly with **Render**.
  
## Quick Start Guide (Local Development)

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

Open a modern web browser and navigate to http://127.0.0.1:8000. Select "Enterprise SQL Database" from the dropdown, click the mic, and ask: "What were our total sales revenues by region? Please plot it on a pie chart."

## Future Roadmap
* **Cloud Storage Migration:** Transition local file system memory to an AWS S3 bucket to ensure permanent file retention across ephemeral cloud hosting instances.
* **Multi-Agent Orchestration:** Implement frameworks like LangChain or AutoGen to separate the Text-to-SQL logic and the UI generation logic into distinct, highly specialized AI agents.
* **OAuth 2.0 Integration:** Upgrade the custom authentication pipeline to support Google/Microsoft SSO for enterprise-grade security.



~ Manan
