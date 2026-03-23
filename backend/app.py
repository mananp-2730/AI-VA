from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # NEW IMPORT
from pydantic import BaseModel
import uvicorn
import pandas as pd
import os
from dotenv import load_dotenv
from google import genai
import io
from PIL import Image
import json
from typing import Optional

# NEW: Database & Security Imports
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.sql import func
import bcrypt


load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

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
    user_id = Column(Integer, ForeignKey("users.id")) # This links the session to a specific user
    query_text = Column(Text) # What the user asked
    ai_response = Column(Text) # What the AI said
    chart_config = Column(Text, nullable=True) # The JSON string of the chart (if one was generated)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # Automatic timestamp
    
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

class GetSessionsRequest(BaseModel):
    email: str
    
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
        chart_config=request.chart_config
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
    
# Existing API route
@app.post("/api/analyze")
async def analyze_data(
    transcript: str = Form(...), 
    file: UploadFile = File(...),
    mode: str = Form(...)
):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    try:
        file_ext = file.filename.split('.')[-1].lower()

        # --- TRACK B: RAW CSV TO DASHBOARD ---
        if file_ext == 'csv':
            df = pd.read_csv(file.file)
            # Take just the first 50 rows to keep the context window fast and cheap
            csv_text = df.head(50).to_csv(index=False) 
            
            prompt = (
                "You are an expert Data Analyst and Frontend Developer. Analyze the provided CSV data and the User Voice Command. "
                "CRITICAL INSTRUCTION: You must return your response as a valid JSON object with EXACTLY two keys:\n"
                "1. 'response': Your spoken answer to the user's query (keep it conversational, no markdown).\n"
                "2. 'chart_config': A complete, valid JSON configuration object for Chart.js (version 3+) that visualizes the data relevant to the user's query. "
                "Choose the appropriate chart type ('bar', 'line', 'pie', 'doughnut'). Include 'type', 'data' (with 'labels' and 'datasets'), and 'options'. "
                "Make the chart visually appealing using modern hex colors. If the user query does not require a chart, return null for 'chart_config'.\n\n"
                f"User Voice Command: {transcript}\n\nCSV Data Sample:\n{csv_text}"
            )
            
            # Force the model to output strict JSON
            gemini_response = client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            
            # Parse the AI's JSON output
            # --- Bulletproof JSON Parsing ---
            raw_text = gemini_response.text.strip()
            # If Gemini accidentally wraps the output in markdown, strip it off!
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            
            try:
                parsed_data = json.loads(raw_text.strip())
            except json.JSONDecodeError:
                # Fallback if Gemini completely hallucinates the formatting
                parsed_data = {"response": "I processed the data, but encountered an formatting error.", "chart_config": None, "box": []}
            final_text = parsed_data.get("response", "I have analyzed the data.")
            chart_config = parsed_data.get("chart_config", None)
            
            return {"status": "success", "response": final_text, "chart_config": chart_config}

        # --- TRACK A: DASHBOARD IMAGE VISION ---
        elif file_ext in ['png', 'jpg', 'jpeg']:
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))
            
            prompt = (
                "You are a spatial business strategist. Analyze the provided dashboard image and answer the user's question. "
                "CRITICAL INSTRUCTION: You must return your response as a valid JSON object with EXACTLY two keys: "
                "1. 'response': Your conversational answer to the user (no markdown). "
                "2. 'box': An array of four numbers [ymin, xmin, ymax, xmax] representing the bounding box of the specific chart, graph, or data point you are talking about. Scale the numbers from 0 to 1000. If the question is about the whole dashboard, return an empty array [].\n\n"
                f"User Voice Command: {transcript}"
            )
            
            # We force the model to output strict JSON
            gemini_response = client.models.generate_content(
                model='gemini-2.5-flash', 
                contents=[image, prompt],
                config={"response_mime_type": "application/json"}
            )
            
            # Parse the AI's JSON output
            # --- Bulletproof JSON Parsing ---
            raw_text = gemini_response.text.strip()
            # If Gemini accidentally wraps the output in markdown, strip it off!
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text.rsplit("```", 1)[0]
            
            try:
                parsed_data = json.loads(raw_text.strip())
            except json.JSONDecodeError:
                # Fallback if Gemini completely hallucinates the formatting
                parsed_data = {"response": "I processed the data, but encountered an formatting error.", "chart_config": None, "box": []}
            final_text = parsed_data.get("response", "I could not analyze the image.")
            box_coords = parsed_data.get("box", [])
            
            return {"status": "success", "response": final_text, "box": box_coords}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    uvicorn.run("app:app", host="0.0.0.0", port=port)