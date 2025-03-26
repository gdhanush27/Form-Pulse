from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import pandas as pd
from io import BytesIO
from fastapi.responses import Response
import firebase_admin
from firebase_admin import credentials, auth
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from datetime import datetime
import json
import re
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from pydantic import BaseModel
import os
path_to_credentials = os.path.join(os.getcwd(), "dynamic-form-270-firebase-adminsdk-fbsvc-efae9b4231.json")
cred = credentials.Certificate(path_to_credentials)
firebase_admin.initialize_app(cred)

app = FastAPI()
security = HTTPBearer()
# MongoDB Configuration
MONGODB_URI = "mongodb://localhost:27017"
DB_NAME = "Forms"
FORM_COLLECTION = "FormDefinitions"
SUBMISSION_COLLECTION = "FormSubmissions"

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
forms_col = db[FORM_COLLECTION]
submissions_col = db[SUBMISSION_COLLECTION]

# Create indexes
forms_col.create_index("form_name", unique=True)
submissions_col.create_index([("form_name", 1), ("user_email", 1)], unique=True)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Models
# Updated FormDefinition model

class QuestionCreate(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    marks: float

class FormCreateRequest(BaseModel):
    form_name: str
    questions: List[QuestionCreate]
    
    
class Question(BaseModel):
    question: str
    options: List[str]
    correct_answer: str  # Add correct answer field
    marks: float         # Add marks field

class FormDefinition(BaseModel):
    form_name: str
    questions: List[Question]
    created_at: datetime = datetime.now()
    creator_email: str  # Add creator email field

class FormSubmission(BaseModel):
    form_name: str
    user_name: str
    user_email: str
    answers: Dict
    total_marks: float = 0.0  # Add total marks field
    submitted_at: datetime = datetime.now()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload-form")
async def upload_form(
    file: UploadFile = File(...),
    form_name: str = Form(...),
    user: dict = Depends(get_current_user)
):
    try:
        contents = await file.read()
        form_data = json.loads(contents)
        
        # Validate questions structure
        questions = []
        for q in form_data.get("questions", []):
            question = Question(
                question=q.get("question"),
                options=q.get("options", []),
                correct_answer=q.get("correct_answer"),
                marks=q.get("marks", 0)
            )
            if question.correct_answer not in question.options:
                raise ValueError(f"Correct answer '{question.correct_answer}' not in options")
            questions.append(question)
        
        form_def = FormDefinition(
            form_name=form_name,
            questions=questions,
            creator_email=user['email']  # Store creator email
        )
        
        result = forms_col.insert_one(form_def.dict())
        return {"message": "Form saved successfully", "form_id": str(result.inserted_id)}
        
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON format")
    except ValueError as e:
        raise HTTPException(400, str(e))
    except DuplicateKeyError:
        raise HTTPException(400, "Form name already exists")


@app.post("/create-form")
async def create_form(form_data: FormCreateRequest, user: dict = Depends(get_current_user)):
    try:
        # Convert to same format as JSON upload
        formatted_questions = []
        for q in form_data.questions:
            if q.correct_answer not in q.options:
                raise HTTPException(400, "Correct answer must be in options")
                
            formatted_questions.append({
                "question": q.question,
                "options": q.options,
                "correct_answer": q.correct_answer,
                "marks": q.marks
            })
        
        # Same logic as JSON upload endpoint
        form_def = FormDefinition(
            form_name=form_data.form_name,
            questions=formatted_questions,
            creator_email=user['email']
        )
        
        result = forms_col.insert_one(form_def.dict())
        return {"message": "Form created", "form_id": str(result.inserted_id)}
        
    except DuplicateKeyError:
        raise HTTPException(400, "Form name already exists")
    
    
@app.get("/submissions/{form_name}")
async def get_submissions(form_name: str, user: dict = Depends(get_current_user)):
    form = forms_col.find_one({"form_name": form_name})
    if not form or form['creator_email'] != user['email']:
        raise HTTPException(403, "Access denied")
    
    submissions = list(submissions_col.find(
        {"form_name": form_name},
        {"_id": 0, "user_name": 1, "user_email": 1, "answers": 1, "total_marks": 1, "submitted_at": 1}
    ).sort("total_marks", -1))  
    return submissions

# Export submissions to Excel
@app.get("/submissions/{form_name}/export")
async def export_submissions(form_name: str, user: dict = Depends(get_current_user)):
    form = forms_col.find_one({"form_name": form_name})
    if not form or form['creator_email'] != user['email']:
        raise HTTPException(403, "Access denied")
    
    submissions = list(submissions_col.find({"form_name": form_name}))
    df = pd.DataFrame(submissions)
    
    # Convert to Excel
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False)
    
    headers = {
        'Content-Disposition': f'attachment; filename="{form_name}_submissions.xlsx"'
    }
    return Response(output.getvalue(), headers=headers, media_type="application/vnd.ms-excel")

@app.get("/my-forms")
async def get_user_forms(user: dict = Depends(get_current_user)):
    forms = list(forms_col.find(
        {"creator_email": user['email']}, 
        {"_id": 0, "form_name": 1, "created_at": 1}
    ))
    return {"forms": forms}

@app.get("/my-submissions")
async def get_user_submissions(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_email": user['email']}},
        {"$lookup": {
            "from": "FormDefinitions",
            "localField": "form_name",
            "foreignField": "form_name",
            "as": "form_data"
        }},
        {"$unwind": "$form_data"},
        {"$project": {
            "_id": 0,
            "form_name": 1,
            "submitted_at": 1,
            "total_marks": 1,
            "total_possible_marks": {
                "$sum": "$form_data.questions.marks"
            }
        }}
    ]
    
    submissions = list(submissions_col.aggregate(pipeline))
    return submissions

@app.get("/form/{form_name}")
async def get_form(form_name: str):
    form = forms_col.find_one({"form_name": form_name}, {"_id": 0})
    if not form:
        raise HTTPException(404, "Form not found")
    return form

@app.get("/forms/")
async def list_forms():
    forms = list(forms_col.find({}, {"form_name": 1, "_id": 0}))
    return {"forms": [f["form_name"] for f in forms]}

@app.delete("/form/{form_name}")
async def delete_form(form_name: str):
    result = forms_col.delete_one({"form_name": form_name})
    if result.deleted_count == 0:
        raise HTTPException(404, "Form not found")
    return {"message": "Form deleted successfully"}

@app.post("/submit")
async def submit_form(submission: FormSubmission):
    try:
        # Get form definition
        form = forms_col.find_one({"form_name": submission.form_name})
        if not form:
            raise HTTPException(404, "Form not found")
        
        # Calculate total marks
        total_marks = 0.0
        for idx, question in enumerate(form["questions"]):
            user_answer = submission.answers.get(str(idx))
            if user_answer == question["correct_answer"]:
                total_marks += question["marks"]
        
        # Create submission document
        submission_dict = submission.dict()
        submission_dict["total_marks"] = total_marks
        
        # Insert into database
        result = submissions_col.insert_one(submission_dict)
        return {
            "message": "Submission saved",
            "submission_id": str(result.inserted_id),
            "total_marks": total_marks
        }
        
    except DuplicateKeyError:
        raise HTTPException(400, "You have already submitted this form")