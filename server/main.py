from import_statements import *

# Initialize Firebase
path_to_credentials = os.path.join(os.getcwd(), "dynamic-form-270-firebase-adminsdk-fbsvc-efae9b4231.json")
cred = credentials.Certificate(path_to_credentials)
firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI()
security = HTTPBearer()

# Configure CORS for specific origins
allowed_origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
    "https://form-pulse.web.app",
    "https://form-pulse.firebaseapp.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=600
)
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
# Firestore Collections
FORMS_COLLECTION = "forms"
SUBMISSIONS_COLLECTION = "submissions"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Models
class Question(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    marks: float

class FormDefinition(BaseModel):
    form_name: str
    questions: List[Question]
    created_at: datetime = datetime.now()
    creator_email: str

class QuestionCreate(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    marks: float

class FormCreateRequest(BaseModel):
    form_name: str
    questions: List[QuestionCreate]

class FormSubmission(BaseModel):
    form_name: str
    user_name: str
    user_email: str
    answers: Dict[str, str]
    total_marks: float = 0.0
    submitted_at: datetime = datetime.now()

class QuizResponse(BaseModel):
    success: bool
    quiz: Optional[List[Question]] = None
    error: Optional[str] = None
    


def get_form_ref(form_name: str):
    return db.collection(FORMS_COLLECTION).document(form_name)

def get_submissions_ref():
    return db.collection(SUBMISSIONS_COLLECTION)

@app.post("/upload-form")
async def upload_form(
    file: UploadFile = File(...),
    form_name: str = Form(...),
    user: dict = Depends(get_current_user)
):
    try:
        contents = await file.read()
        form_data = json.loads(contents)
        
        form_ref = get_form_ref(form_name)
        if form_ref.get().exists:
            raise HTTPException(status_code=400, detail="Form name already exists")

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
            questions.append(question.dict())
        
        form_ref.set({
            "form_name": form_name,
            "questions": questions,
            "created_at": datetime.now(),
            "creator_email": user['email']
        })
        
        return {"message": "Form saved successfully", "form_name": form_name}

    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON format")
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/create-form")
async def create_form(form_data: FormCreateRequest, user: dict = Depends(get_current_user)):
    form_ref = get_form_ref(form_data.form_name)
    if form_ref.get().exists:
        raise HTTPException(status_code=400, detail="Form name already exists")

    questions = []
    for q in form_data.questions:
        if q.correct_answer not in q.options:
            raise HTTPException(400, "Correct answer must be in options")
        questions.append(q.dict())

    form_ref.set({
        "form_name": form_data.form_name,
        "questions": questions,
        "created_at": datetime.now(),
        "creator_email": user['email']
    })
    
    return {"message": "Form created", "form_name": form_data.form_name}

@app.get("/submissions/{form_name}")
async def get_submissions(form_name: str, user: dict = Depends(get_current_user)):
    form_ref = get_form_ref(form_name)
    form = form_ref.get().to_dict()
    
    if not form or form['creator_email'] != user['email']:
        raise HTTPException(403, "Access denied")
    
    submissions = []
    docs = get_submissions_ref()\
        .where(filter=FieldFilter("form_name", "==", form_name))\
        .stream()
    
    for doc in docs:
        sub = doc.to_dict()
        sub["id"] = doc.id
        submissions.append(sub)
    
    return sorted(submissions, key=lambda x: x['total_marks'], reverse=True)

@app.get("/submissions/{form_name}/export")
async def export_submissions(form_name: str, user: dict = Depends(get_current_user)):
    form_ref = get_form_ref(form_name)
    form = form_ref.get().to_dict()
    
    if not form or form['creator_email'] != user['email']:
        raise HTTPException(403, "Access denied")
    
    submissions = []
    docs = get_submissions_ref()\
        .where(filter=FieldFilter("form_name", "==", form_name))\
        .stream()
    
    for doc in docs:
        submissions.append(doc.to_dict())
    
    df = pd.DataFrame(submissions)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False)
    
    headers = {'Content-Disposition': f'attachment; filename="{form_name}_submissions.xlsx"'}
    return Response(output.getvalue(), headers=headers, media_type="application/vnd.ms-excel")

@app.get("/my-forms")
async def get_user_forms(user: dict = Depends(get_current_user)):
    forms = []
    docs = db.collection(FORMS_COLLECTION)\
        .where(filter=FieldFilter("creator_email", "==", user['email']))\
        .stream()
    
    for doc in docs:
        form = doc.to_dict()
        form["id"] = doc.id
        forms.append(form)
    return {"forms": forms}

@app.get("/my-submissions")
async def get_user_submissions(user: dict = Depends(get_current_user)):
    submissions = []
    docs = get_submissions_ref()\
        .where(filter=FieldFilter("user_email", "==", user['email']))\
        .stream()
    
    for doc in docs:
        sub = doc.to_dict()
        form_ref = get_form_ref(sub['form_name'])
        form = form_ref.get().to_dict()
        
        total_possible = sum(q['marks'] for q in form['questions'])
        sub['total_possible_marks'] = total_possible
        sub['id'] = doc.id
        submissions.append(sub)
    
    return submissions

@app.get("/form/{form_name}")
async def get_form(form_name: str):
    form_ref = get_form_ref(form_name)
    form = form_ref.get()
    if not form.exists:
        raise HTTPException(404, "Form not found")
    return form.to_dict()

@app.get("/forms/")
async def list_forms():
    forms = []
    docs = db.collection(FORMS_COLLECTION).stream()
    for doc in docs:
        forms.append(doc.to_dict()['form_name'])
    return {"forms": forms}

@app.delete("/form/{form_name}")
async def delete_form(form_name: str):
    form_ref = get_form_ref(form_name)
    if not form_ref.get().exists:
        raise HTTPException(404, "Form not found")
    
    # Delete related submissions
    submissions = get_submissions_ref()\
        .where(filter=FieldFilter("form_name", "==", form_name))\
        .stream()
    
    batch = db.batch()
    for sub in submissions:
        batch.delete(sub.reference)
    batch.commit()
    
    form_ref.delete()
    return {"message": "Form and related submissions deleted successfully"}

@app.post("/submit")
async def submit_form(submission: FormSubmission):
    form_ref = get_form_ref(submission.form_name)
    form = form_ref.get()
    if not form.exists:
        raise HTTPException(404, "Form not found")
    
    form_data = form.to_dict()
    total_marks = 0.0
    
    # Check for existing submission
    existing = get_submissions_ref()\
        .where(filter=FieldFilter("form_name", "==", submission.form_name))\
        .where(filter=FieldFilter("user_email", "==", submission.user_email))\
        .limit(1).stream()
    
    if len(list(existing)) > 0:
        raise HTTPException(400, "You have already submitted this form")
    
    # Calculate marks
    for idx, question in enumerate(form_data['questions']):
        user_answer = submission.answers.get(str(idx))
        if user_answer == question['correct_answer']:
            total_marks += question['marks']
    
    # Create submission
    sub_data = submission.dict()
    sub_data['total_marks'] = total_marks
    sub_data['submitted_at'] = datetime.now()
    
    get_submissions_ref().add(sub_data)
    
    return {
        "message": "Submission saved",
        "total_marks": total_marks
    }
    
async def extract_text_from_pdf(file: UploadFile) -> str:
    """Extract text from PDF using pdfplumber"""
    try:
        # Read the uploaded file content
        contents = await file.read()
        
        # Use BytesIO to create a file-like object
        with pdfplumber.open(BytesIO(contents)) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
            
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"PDF text extraction failed: {str(e)}"
        )

def extract_json_from_response(content: str) -> Dict:
    """Extract JSON from API response content"""
    try:
        # Try to find JSON in markdown code blocks
        match = re.search(r'```(?:json)?\n(.*?)```', content, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
        else:
            # Fallback to raw JSON parsing
            json_str = content.strip()
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid JSON format: {str(e)}"
        )

async def generate_quiz(pdf_text: str) -> Dict:
    """Generate quiz using OpenRouter API"""
    openrouter_key = "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"

    prompt = f"""Generate a 10-question quiz in JSON format with:
    - 4 easy questions (1 mark each)
    - 3 medium questions (2 marks each)
    - 3 hard questions (3 marks each)
    Each question must have 4 options and a correct answer.
    
    Content:
    {pdf_text[:10000]}
    
    Respond ONLY with valid JSON in this format:
    {{
      "questions": [
        {{
          "question": "Question text",
          "options": ["<option_a_text>", "<option_b_text>", "<option_c_text>", "<option_d_text>"],
          "correct_answer": "<correct_option_text>",
          "marks": 1
        }}
      ]
    }}
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek/deepseek-chat-v3-0324:free",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 10000
                }
            )
            response.raise_for_status()
            
            content = response.json()["choices"][0]["message"]["content"]
            quiz_data = extract_json_from_response(content)
            
            # Validate quiz structure
            questions = quiz_data.get("questions", [])
            if len(questions) != 10:
                raise HTTPException(
                    status_code=422,
                    detail="Quiz must contain exactly 10 questions"
                )
                
            return quiz_data
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"OpenRouter API error: {e.response.text}"
        )

@app.post("/generate-quiz", response_model=QuizResponse)
async def create_quiz(file: UploadFile = File(..., max_size=MAX_FILE_SIZE)):
    """Main endpoint for quiz generation from PDF"""
    try:
        # Verify file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        await file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return JSONResponse(
                {"error": f"File size {file_size/1024/1024:.2f}MB exceeds 50MB limit"},
                status_code=413
            )
        # Step 1: Extract text from PDF
        pdf_text = await extract_text_from_pdf(file)
        if not pdf_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No text extracted from PDF"
            )

        # Step 2: Generate quiz
        quiz_data = await generate_quiz(pdf_text)
        print(quiz_data)
        return {
            "success": True,
            "quiz": quiz_data.get("questions", [])
        }
        
    except HTTPException as he:
        return {
            "success": False,
            "error": he.detail
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }
