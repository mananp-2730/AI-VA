# AI-VA | Spatial BI Voice Assistant

AI-VA is a cloud-hosted, multimodal web application that solves the enterprise data literacy gap. By bridging state-of-the-art vision models with spatial UI engineering, AI-VA allows users to upload complex business dashboards and have a seamless, continuous voice conversation with their data. 

**Live Demo:** [AI-VA on Render](https://ai-va-7zyw.onrender.com) *(Note: May take 50 seconds to spin up on the free tier)*

## The Product Vision (The Problem & Solution)
**The Problem:** A VP is handed a comprehensive BI dashboard by their data team. The data is accurate, but the VP lacks the time or technical context to decipher the complex visual charts. 
**The Solution:** AI-VA acts as an interactive data translator. The user uploads the dashboard image, starts a continuous voice session, and asks questions naturally. AI-VA not only speaks the strategic insights aloud but dynamically highlights the exact chart it is referencing in real-time.

## Key Features
* **Spatial Highlighting Engine:** Utilizes Gemini's spatial prompting to return strict bounding-box coordinates `[ymin, xmin, ymax, xmax]`, allowing the frontend to draw glowing, real-time CSS highlights over the exact data points being discussed.
* **Multimodal Vision Ingestion:** Processes both static raw data (`.csv`) and visual dashboards (`.png`, `.jpg`) using Gemini 2.5 Flash's vision capabilities.
* **Continuous Conversational Loop:** Engineered with a custom Web Speech API integration that auto-mutes the microphone during AI TTS playback and automatically resumes listening, creating a frictionless, hands-free experience.
* **Dual-Layer Analytics Toggle:** Empowers the user to switch between "Version A" (strict factual data retrieval) and "Version B" (strategic business insights and trend analysis).

## System Architecture & Tech Stack
* **Frontend:** HTML5, CSS3 Flexbox (Split-Pane Workspace), Vanilla JavaScript.
* **Voice Integration:** Native Browser **Web Speech API** (Speech-to-Text & Text-to-Speech) with continuous state management.
* **Backend:** **Python 3.12** & **FastAPI** for high-performance API routing and cloud environment management.
* **Vision & AI Processing:** **Pillow** for image byte-stream handling, integrated with the **Google Gemini 2.5 Flash** model via the `google-genai` SDK.
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

3. Configure the Environment
   Create a .env file in the backend directory and add your Google AI Studio key:
   ```Plaintext
   GEMINI_API_KEY=your_actual_api_key_here

4. Launch the Application
   Start the FastAPI server:
   ```bash
   python app.py
  Open a modern web browser (Chrome/Edge recommended) and navigate to http://127.0.0.1:8000. Upload a screenshot of a dashboard, click "Start Session", and speak to your data!

## Future Roadmap (Epic 5 & Beyond)
* **Track B Data Generation:** Enable the backend to ingest raw CSVs and dynamically write/render Chart.js configurations in the browser before analyzing them.
* **Enterprise Integrations:** Connect directly to live SQL databases or Tableau/PowerBI APIs to bypass static image uploads.
* **User Authentication:** Multi-tenant architecture with saved conversational histories and personalized strategic prompt profiles.

___
Architected and engineered by Manan.
