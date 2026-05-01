# AI-VA: Internal Master Strategy & Execution Ledger
**Confidential - Founders & Core Engineering Only**

## 1. The Meta-Planning (Our Operating System)
We do not build features just because they are cool; we build them to eliminate enterprise friction. Our internal operating principles are:
* **Frictionless over Feature-Rich:** If a feature requires the executive to read a manual, we engineered it wrong.
* **The "Zero-Cost" Bias:** Before integrating any paid API or spinning up a paid server, we must exhaust all open-source, client-side, or free-tier alternatives (e.g., using `jsPDF` over paid backend PDF generators).
* **Speed to Value:** Time-to-Insight (TTI) must remain under 4 seconds. Any backend addition that adds latency must be ruthlessly optimized.

## 2. The Version-Mapped Roadmap
This is the chronological sequence of our engineering milestones.

### Phase 1: The Foundation (V1.0 - V1.8) -> *COMPLETED*
* **Core Loop:** Voice-to-SQL translation, Multi-Agent Orchestrator, dynamic Chart.js rendering.
* **Enterprise Polish:** Google SSO, Triple-Net Error Handling, Native Vector PDF Engine, Spatial Image Highlighting.
* **Result:** A functioning, stateful, single-player MVP operating on a local SQLite sandbox.

### Phase 2: The Infrastructure Pivot (V2.0) -> *NEXT UP*
* **Feature 1:** Cloud Storage Migration (Transitioning from local file saves to AWS S3 / Google Cloud Storage for permanent file retention).
* **Feature 2:** Dockerization (Containerizing the FastAPI backend to ensure environment consistency and prepare for auto-scaling).
* **Feature 3:** Role-Based Access Control (RBAC) (Engineering the backend to ensure a regional manager can only query data from their assigned region).

### Phase 3: The Live Ecosystem (V2.5)
* **Feature 1:** OAuth Data Connectors (Building the pipeline to allow users to authenticate and query live HubSpot, Salesforce, or Snowflake instances instead of CSVs).
* **Feature 2:** Streaming Responses (Implementing WebSocket connections to stream the AI's text response in real-time while the chart renders, reducing perceived latency to near-zero).

### Phase 4: Proactive & Viral BI (V3.0+)
* **Feature 1:** The "Monday Morning" Engine (Automated Cron jobs that query data, generate insights, and push PDF reports to Slack automatically).
* **Feature 2:** Multi-Player Collaboration (Generating secure, read-only URLs for executives to share interactive dashboards across the company).

## 3. The "Watchout" Factors (Risk & Cost Mitigation)
As a startup, cash flow and runway are everything. We must watch out for these hidden traps:

* **The Cloud Storage Trap:** Storing thousands of user-uploaded CSVs in AWS S3 gets expensive.
  * *Mitigation Strategy:* We must implement a strict "Data Expiry" policy. Raw CSV uploads are automatically purged after 30 days unless the user is on a premium enterprise tier. We only save the metadata/insights.
* **The LLM Token Bloat:** Feeding entire databases or massive chat histories into Gemini will cause our API costs to skyrocket.
  * *Mitigation Strategy:* Strict implementation of the "Rolling Window" memory array (which we already started) and using Pandas to pre-aggregate data before passing it to the AI. We never send raw rows; we only send summaries.
* **The Server-Side Rendering Trap:** Generating PDFs or complex charts on our Python server will require massive, expensive CPU compute instances.
  * *Mitigation Strategy:* We continue our strategy of offloading all UI/PDF rendering entirely to the user's browser (client-side compute costs us $0).
* **Enterprise Security Liability:** Connecting to live corporate databases (V2.5) means we are handling highly sensitive data.
  * *Mitigation Strategy:* We must never store a client's actual data on our servers. AI-VA must act purely as a pass-through processing layer.

## 4. Execution Ledger & Progress Tracking

| Milestone / Epic | Status | Time Taken | Budget Impact | Notes |
| :--- | :---: | :---: | :---: | :--- |
