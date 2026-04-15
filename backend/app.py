from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # NEW IMPORT
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
import uvicorn
import pandas as pd
import os
from dotenv import load_dotenv
from google import genai
import io
from PIL import Image
import json
import httpx
from typing import Optional
import shutil
import uuid

# --- PHASE 5.2: CREATE UPLOADS FOLDER ---
os.makedirs("uploads", exist_ok=True)

# NEW: Database & Security Imports
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.sql import func
import bcrypt


load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

# =====================================================================
# THE DYNAMIC SCHEMA MAPPER
# Role: Reads the internal structure of any SQLite DB on the fly.
# =====================================================================
def get_dynamic_schema(db_path: str = 'enterprise_data.db') -> str:
    import sqlite3
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Ask SQLite for a list of all tables in the database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        schema_lines = []
        for table in tables:
            table_name = table[0]
            # Skip internal SQLite system tables
            if table_name.startswith("sqlite_"): 
                continue
                
            # 2. Ask SQLite for the columns inside this specific table
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            # Format it perfectly for the LLM: Table: name (col1, col2, col3)
            column_names = [col[1] for col in columns]
            schema_lines.append(f"Table: {table_name} ({', '.join(column_names)})")
            
        conn.close()
        
        # Join all the table strings together into one master blueprint
        dynamic_schema = "\n".join(schema_lines)
        print(f"🔍 Dynamic Schema Mapped Successfully:\n{dynamic_schema}")
        return dynamic_schema
        
    except Exception as e:
        print(f"❌ Schema Mapping Error: {e}")
        return "Error reading schema."

app = FastAPI(title="AI-VA Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE ARCHITECTURE (PHASE 3) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./aiva_database.db"

# 1. Create the SQLite Engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 2. Create a Session Local class (this is how we talk to the DB)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Create a Base class for our models
Base = declarative_base()

# 4. Define the User Table schema
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String) 
    
    # NEW: Establish a one-to-many relationship with the sessions table
    sessions = relationship("SavedSession", back_populates="owner")

# NEW: 4.5. Define the Saved Sessions Table (The Memory)
class SavedSession(Base):
    __tablename__ = "saved_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    query_text = Column(Text)
    ai_response = Column(Text)
    chart_config = Column(Text, nullable=True)
    
    # --- PHASE 5.2 UPGRADE: FILE STORAGE ---
    file_path = Column(String, nullable=True) # Remembers where the CSV/Image is saved
    # ---------------------------------------
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Establish the reverse relationship back to the User
    owner = relationship("User", back_populates="sessions")

# 5. Tell SQLAlchemy to physically create the database and tables
Base.metadata.create_all(bind=engine)

# Dependency function to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- DATA MODELS ---
# This tells FastAPI exactly what a login/signup request should look like
class LoginRequest(BaseModel):
    email: str
    password: str

class SaveSessionRequest(BaseModel):
    email: str
    query_text: str
    ai_response: str
    chart_config: Optional[str] = None
    file_path: Optional[str] = None # NEW: The frontend will tell us where the file is saved!

class GetSessionsRequest(BaseModel):
    email: str

class GetSingleSessionRequest(BaseModel):
    email: str
    session_id: int

class DeleteSessionRequest(BaseModel):
    email: str
    session_id: int

# --- THE REGISTRATION PIPELINE (PHASE 3) ---

@app.post("/api/signup")
def signup_user(request: LoginRequest, db: Session = Depends(get_db)):
    print(f"Signup attempt for: {request.email}")
    
    # 1. Check if the email already exists
    db_user = db.query(User).filter(User.email == request.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # 2. Hash the password securely (NEVER save plain text!)
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(request.password.encode('utf-8'), salt)

    # 3. Save the new user to the SQLite database
    new_user = User(email=request.email, password_hash=hashed_password.decode('utf-8'))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"status": "success", "message": "Account created successfully!"}

@app.post("/api/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    print(f"Login attempt for: {request.email}")
    
    # 1. Find the user in the database
    db_user = db.query(User).filter(User.email == request.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # 2. Verify the hashed password
    is_password_correct = bcrypt.checkpw(
        request.password.encode('utf-8'), 
        db_user.password_hash.encode('utf-8')
    )
    
    if not is_password_correct:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {"status": "success", "message": "Authentication successful."}

# --- THE MEMORY PIPELINE (PHASE 4) ---
@app.post("/api/save_session")
def save_session(request: SaveSessionRequest, db: Session = Depends(get_db)):
    # 1. Verify the user exists
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # 2. Create the memory record
    new_session = SavedSession(
        user_id=user.id,
        query_text=request.query_text,
        ai_response=request.ai_response,
        chart_config=request.chart_config,
        file_path=request.file_path # NEW: Save it to SQLite!
    )
    
    # 3. Write to the database
    db.add(new_session)
    db.commit()
    
    return {"status": "success", "message": "Insight securely saved to gallery."}

@app.post("/api/my_sessions")
def get_my_sessions(request: GetSessionsRequest, db: Session = Depends(get_db)):
    # 1. Verify the user exists
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # 2. Fetch all sessions for this specific user, newest first
    sessions = db.query(SavedSession).filter(SavedSession.user_id == user.id).order_by(SavedSession.created_at.desc()).all()
    
    # 3. Package the data to send back to the frontend
    session_list = []
    for s in sessions:
        session_list.append({
            "id": s.id,
            "query_text": s.query_text,
            "ai_response": s.ai_response,
            "chart_config": s.chart_config,
            "created_at": s.created_at.isoformat()
        })
        
    return {"status": "success", "sessions": session_list}

@app.post("/api/get_session")
def get_single_session(request: GetSingleSessionRequest, db: Session = Depends(get_db)):
    # 1. Verify the user exists
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # 2. Fetch the specific session from the database, ensuring it belongs to this exact user
    session = db.query(SavedSession).filter(
        SavedSession.id == request.session_id,
        SavedSession.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or access denied.")
        
    # 3. Package the exact memory to send back to the frontend
    return {
        "status": "success",
        "query_text": session.query_text,
        "ai_response": session.ai_response,
        "chart_config": session.chart_config,
        "file_path": session.file_path, # NEW: Hand it back to the UI!
        "created_at": session.created_at.isoformat()
    }

# Existing API route
@app.post("/api/analyze")
async def analyze_data(
    transcript: str = Form(...),
    mode: str = Form(...),
    file: Optional[UploadFile] = File(None),
    saved_file_path: Optional[str] = Form(None) # NEW: For Time Machine follow-ups!
):
    # --- SMART FILE ROUTING ---
    current_file_path = None
    
    if file and file.filename:
        # 1A. It's a brand new upload! Save it to the hard drive.
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        current_file_path = os.path.join("uploads", unique_filename)
        
        # Save it physically to the server
        with open(current_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
    elif saved_file_path and os.path.exists(saved_file_path):
        # 1B. It's a follow-up question! Use the old file from the server's hard drive.
        current_file_path = saved_file_path
    else:
        raise HTTPException(status_code=400, detail="No data file found. Please upload a dashboard or CSV.")
        
    # 2. Read the file into memory for Gemini to analyze
    with open(current_file_path, "rb") as f:
        file_bytes = f.read() # USE THIS variable for your Gemini prompt!
        
    # 3. Determine the file type based on the path
    is_image = current_file_path.lower().endswith(('.png', '.jpg', '.jpeg'))

    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    try:
        # FIX 1: Look at the hard drive path for the extension, NOT the temporary file!
        file_ext = current_file_path.split('.')[-1].lower()

        # --- TRACK A: RAW CSV TO DASHBOARD ---
        if file_ext == 'csv':
            df = pd.read_csv(current_file_path)
            # Take just the first 50 rows to keep the context window fast and cheap
            csv_text = df.head(50).to_csv(index=False) 
            
            prompt = (
                "You are an expert Data Analyst, Business Strategist, and Frontend Developer. Analyze the provided CSV data and the User Voice Command. "
                "CRITICAL INSTRUCTION: You must return your response as a valid JSON object with EXACTLY two keys:\n"
                "1. 'response': Your spoken answer to the user's query (keep it conversational, no markdown).\n"
                "2. 'chart_config': A complete, valid JSON configuration object for Chart.js (version 3+) that visualizes the data.\n\n"
                "--- FORECASTING & PREDICTIVE ANALYTICS RULE ---\n"
                "If the user asks for a forecast, projection, or future prediction: Mathematically estimate the next 3-5 periods based on the historical trend. "
                "In your 'chart_config', you MUST create a 'line' chart with TWO datasets:\n"
                "- Dataset 1: 'Historical Data' (solid line, modern hex color).\n"
                "- Dataset 2: 'Projected Data' (dashed line, use the same color but add 'borderDash': [5, 5] to the dataset config).\n"
                "Ensure the X-axis labels include both the historical dates and your new projected dates, and align the data arrays with nulls so the line flows continuously from past to future.\n\n"
                "If no projection is asked for, just return a standard, beautiful chart ('bar', 'line', 'pie', 'doughnut'). "
                "If the query does not require a chart, return null for 'chart_config'.\n\n"
                f"User Voice Command: {transcript}\n\nCSV Data Sample:\n{csv_text}"
            )
            
            gemini_response = client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            
            raw_text = gemini_response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            
            try:
                parsed_data = json.loads(raw_text.strip())
            except json.JSONDecodeError:
                parsed_data = {"response": "I processed the data, but encountered a formatting error.", "chart_config": None}
            
            final_text = parsed_data.get("response", "I have analyzed the data.")
            chart_config = parsed_data.get("chart_config", None)
            
            # FIX 2: Added file_path so the frontend remembers it!
            return {
                "status": "success", 
                "response": final_text, 
                "chart_config": chart_config,
                "file_path": current_file_path 
            }

        # --- TRACK B: DASHBOARD IMAGE VISION ---
        elif file_ext in ['png', 'jpg', 'jpeg']:
            # FIX 3: Removed the 'await file.read()' line that was crashing the Time Machine
            image = Image.open(current_file_path)
            
            prompt = (
                "You are a spatial business strategist. Analyze the provided dashboard image and answer the user's question. "
                "CRITICAL INSTRUCTION: You must return your response as a valid JSON object with EXACTLY two keys: "
                "1. 'response': Your conversational answer to the user (no markdown). "
                "2. 'box': An array of four numbers [ymin, xmin, ymax, xmax] representing the bounding box of the specific chart, graph, or data point you are talking about. Scale the numbers from 0 to 1000. If the question is about the whole dashboard, return an empty array [].\n\n"
                f"User Voice Command: {transcript}"
            )
            
            gemini_response = client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=[image, prompt],
                config={"response_mime_type": "application/json"}
            )
            
            raw_text = gemini_response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            
            try:
                parsed_data = json.loads(raw_text.strip())
            except json.JSONDecodeError:
                parsed_data = {"response": "I processed the data, but encountered a formatting error.", "box": []}
                
            final_text = parsed_data.get("response", "I could not analyze the image.")
            box_coords = parsed_data.get("box", [])
            
            return {
                "status": "success", 
                "response": final_text, 
                "box": box_coords, 
                "file_path": current_file_path
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/delete_session")
def delete_single_session(request: DeleteSessionRequest, db: Session = Depends(get_db)):
    # 1. Verify the user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # 2. Find the exact session (and ensure they actually own it!)
    session = db.query(SavedSession).filter(
        SavedSession.id == request.session_id,
        SavedSession.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    # 3. Securely delete it from the SQLite database
    db.delete(session)
    db.commit()
    
    return {"status": "success", "message": "Insight permanently deleted."}

import sqlite3
import pandas as pd
import json

# =====================================================================
# AGENT 1: THE SQL DATA ENGINEER (Now with Dynamic Schema!)
# Role: Strictly translates human intent into highly accurate SQL queries.
# =====================================================================
def agent_sql_engineer(transcript: str, history: str) -> str:
    # THE UPGRADE: Generate the database blueprint on the fly!
    dynamic_schema = get_dynamic_schema('enterprise_data.db')

    sql_prompt = f"""
    You are an expert SQL Database Administrator. Convert the user's request into a valid SQLite SQL query.
    Use the following schema:
    {dynamic_schema}
    
    Previous Conversation History (Use this for context if the user uses pronouns like "it", "them", or asks a follow-up question):
    {history}
    
    Current User Request: "{transcript}"
    
    CRITICAL INSTRUCTION: Return ONLY the raw SQL query. No markdown, no explanations. Just the SELECT statement.
    """
    
    sql_response = client.models.generate_content(
        model='gemini-2.5-flash', 
        contents=sql_prompt
    )
    
    raw_sql = sql_response.text.strip()
    if raw_sql.startswith("```sql"):
        raw_sql = raw_sql.replace("```sql", "", 1)
    if raw_sql.startswith("```"):
        raw_sql = raw_sql.replace("```", "", 1)
    if raw_sql.endswith("```"):
        raw_sql = raw_sql.rsplit("```", 1)[0]
        
    return raw_sql.strip()

# =====================================================================
# AGENT 2: THE FRONTEND ANALYST
# Role: Analyzes raw data, writes strategic insights, and builds the UI.
# =====================================================================
def agent_frontend_analyst(transcript: str, raw_sql: str, sql_results_text: str) -> dict:
    insight_prompt = (
        "You are an expert Data Analyst and Frontend Developer. Analyze the provided SQL query results and the User Voice Command. "
        "CRITICAL INSTRUCTION: You must return your response as a valid JSON object with EXACTLY two keys:\n"
        "1. 'response': Your spoken answer to the user's query (keep it conversational, no markdown). "
        "**THE WATCHDOG DIRECTIVE:** Proactively scan the data for any significant anomalies, massive spikes, or severe drops. If you find one, explicitly call it out in your spoken response.\n"
        "2. 'chart_config': A complete, valid JSON configuration object for Chart.js (version 3+) that visualizes the data. "
        "**THE WATCHDOG HIGHLIGHT:** If you detected an anomaly, color the specific anomalous data point(s) bright red (#ef4444). "
        "**THE BOARDROOM SPLIT DIRECTIVE:** If the SQL data returns MULTIPLE metrics (e.g., Revenue AND Marketing Spend), you MUST create a comparative chart. Create multiple objects inside the 'datasets' array. If the two metrics are on vastly different scales, configure a dual-axis chart: assign 'yAxisID': 'y' to the first dataset and 'yAxisID': 'y1' to the second dataset. Ensure the 'scales' object in the options configures both 'y' and 'y1' axes properly. Use distinct, professional colors for each dataset (e.g., emerald green and slate blue).\n"
        "If the data is just a single number or doesn't need a chart, return null for 'chart_config'.\n\n"
        f"User Voice Command: {transcript}\n\nSQL Query Used:\n{raw_sql}\n\nQuery Results:\n{sql_results_text}"
    )
    
    insight_response = client.models.generate_content(
        model='gemini-2.5-flash', 
        contents=insight_prompt,
        config={"response_mime_type": "application/json"}
    )
    
    raw_text = insight_response.text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text.replace("```json", "", 1)
    if raw_text.endswith("```"):
        raw_text = raw_text.rsplit("```", 1)[0]
    
    return json.loads(raw_text.strip())

# =====================================================================
# THE MASTER ORCHESTRATOR (API ROUTE)
# Role: Manages the pipeline, coordinates agents, and executes DB logic.
# =====================================================================
@app.post("/api/enterprise_query")
async def enterprise_query(transcript: str = Form(...), history: str = Form(default="No previous history.")):
    try:
        # Step 1: Orchestrator calls Agent 1 (Passing the history!)
        print(f"Master: Received Context Window -> {history}")
        print("Master: Delegating to SQL Engineer Agent...")
        raw_sql = agent_sql_engineer(transcript, history)
        print(f"✅ SQL Engineer Returned: {raw_sql}")

        # Step 2: Orchestrator handles the secure Database Execution
        print("🗄️ Master: Executing Query on Database...")
        conn = sqlite3.connect('enterprise_data.db')
        df = pd.read_sql_query(raw_sql, conn)
        conn.close()
        
        sql_results_text = df.to_csv(index=False)
        print(f"Database execution complete. Rows returned: {len(df)}")

        # Step 3: Orchestrator calls Agent 2
        print("Master: Delegating to Frontend Analyst Agent...")
        parsed_data = agent_frontend_analyst(transcript, raw_sql, sql_results_text)
        print("Frontend Analyst generated insights and UI config.")

        # Step 4: Orchestrator returns the final payload to the client
        return {
            "status": "success", 
            "response": parsed_data.get("response", "I have analyzed the database."), 
            "chart_config": parsed_data.get("chart_config", None),
            "sql_query": raw_sql # We send the raw SQL to the frontend to prove it worked!
        }

    except Exception as e:
        print(f"❌ Critical Orchestration Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# ENTERPRISE SECURITY: GOOGLE SSO (OAUTH 2.0)
# =====================================================================
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# Environment Aware Routing: Check if we are on Render or Localhost
if os.getenv("RENDER"):
    GOOGLE_REDIRECT_URI = "https://ai-va-7zyw.onrender.com/auth/google/callback"
else:
    GOOGLE_REDIRECT_URI = "http://127.0.0.1:8000/auth/google/callback"

@app.get("/auth/google/login")
async def google_login():
    # Step 1: We construct the secure Google Login URL and send the user there.
    print("Initiating Google SSO Handshake...")
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline"
    )
    return RedirectResponse(auth_url)

@app.get("/auth/google/callback")
async def google_callback(code: str):
    try:
        # Step 2: Google sent them back with a 'code'. We trade it for an Access Token.
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        
        async with httpx.AsyncClient() as client:
            token_res = await client.post(token_url, data=data)
            token_data = token_res.json()
            access_token = token_data.get("access_token")

            # Step 3: We use the Access Token to ask Google for their Email & Name!
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            user_res = await client.get(userinfo_url, headers=headers)
            user_data = user_res.json()

        user_email = user_data.get("email")
        user_name = user_data.get("name")
        
        print(f"Secure SSO Login Successful!")
        print(f"Welcome, {user_name} ({user_email})")

        # Step 4: Create the redirect response
        response = RedirectResponse(url="/")
        
        # Step 5: Stamp the VIP Pass (Cookie) onto the user's browser!
        # We store their name, make it last for 7 days (604800 seconds).
        response.set_cookie(
            key="ai_va_user", 
            value=user_name, 
            max_age=604800, 
            httponly=False  # False allows our frontend JavaScript to read the name!
        )
        
        return response

    except Exception as e:
        print(f"Google SSO Error: {e}")
        raise HTTPException(status_code=500, detail="SSO Authentication Failed")
    
# =====================================================================
# THE DISTRIBUTION PLAY (SLACK WEBHOOKS)
# Role: Pushes insights directly to corporate communication channels.
# =====================================================================
import urllib.request
import urllib.error
import os

@app.post("/api/slack_push")
async def slack_push(insight: str = Form(...)):
    try:
        webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
        
        # We use Slack's 'Block Kit' to format a premium Enterprise message
        slack_payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "New AI-VA Boardroom Insight",
                        "emoji": True
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*AI Strategic Analysis:*\n{insight}"
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "Generated autonomously by the AI-VA Multi-Agent Orchestrator"
                        }
                    ]
                }
            ]
        }

        # 1. If there is no URL, simulate the push for local testing
        if not webhook_url:
            print("⚠️ SLACK SIMULATION: No Webhook URL found in .env.")
            print(f"📦 Simulated Payload: \n{json.dumps(slack_payload, indent=2)}")
            return {"status": "success", "message": "Simulated Slack Push (No URL configured)"}
        
        # 2. If a URL exists, fire the payload across the internet to Slack!
        req = urllib.request.Request(
            webhook_url, 
            data=json.dumps(slack_payload).encode('utf-8'), 
            headers={'Content-Type': 'application/json'}
        )
        urllib.request.urlopen(req)
        
        print("✅ Successfully pushed insight to Slack!")
        return {"status": "success", "message": "Pushed to Slack!"}

    except Exception as e:
        print(f"❌ Slack Push Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
   
# -------------------------------------------------------------------
# THE CATCH-ALL MUST BE AT THE ABSOLUTE BOTTOM (Right before __main__)
# -------------------------------------------------------------------
# --- NEW CONSOLIDATION CODE ---
# This tells FastAPI to host your HTML/CSS/JS files directly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    # Cloud providers assign a dynamic PORT environment variable. 
    # We default to 8000 for local testing if the cloud variable isn't found.
    port = int(os.environ.get("PORT", 8000))
    # Host "0.0.0.0" tells the server to listen on all available public IP addresses
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=port)