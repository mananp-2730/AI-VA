from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd
import os
from dotenv import load_dotenv
from google import genai

# Load environment variables from the .env file
load_dotenv()

# Initialize the modern Gemini Client
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

@app.get("/")
async def health_check():
    return {"status": "success", "message": "AI-VA Backend is live!"}

@app.post("/api/analyze")
async def analyze_data(
    transcript: str = Form(...),
    file: UploadFile = File(...)
):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API key not configured in .env")
        
    try:
        # 1. Parse the CSV file locally using Pandas to mitigate context-window risks
        df = pd.read_csv(file.file)
        csv_text = df.to_csv(index=False) 
        
        # 2. Strict Prompt Engineering (Version A: Basic factual data response)
        prompt = (
            "You are a strict data assistant. You must answer the user's question purely "
            "based on the factual data provided in the CSV below. Do not hallucinate or add outside information.\n\n"
            f"User Voice Command: {transcript}\n\n"
            f"CSV Data:\n{csv_text}"
        )
        
        # 3. Call the Gemini 2.5 Flash model for fast, cost-effective responses
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        return {"status": "success", "response": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)