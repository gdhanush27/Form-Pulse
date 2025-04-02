from import_statements import *
from together import Together
# uvicorn main:app --reload
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
    protected: bool = False
    show_answers: bool = True
    created_at: datetime = datetime.now()
    creator_email: str
    
# Update the QuestionCreate model
class QuestionCreate(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    marks: float

# Update the FormCreateRequest model
class FormCreateRequest(BaseModel):
    form_name: str
    questions: List[QuestionCreate]
    protected: bool = False
    show_answers: bool = True

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
    
class SubmissionResponse(BaseModel):
    id: str
    form_name: str
    user_name: str
    user_email: str
    answers: dict
    total_marks: float
    total_possible_marks: float
    submitted_at: str
    proctoring_metrics: Optional[dict] = None

def get_form_ref(form_name: str):
    return db.collection(FORMS_COLLECTION).document(form_name)

def get_submissions_ref():
    return db.collection(SUBMISSIONS_COLLECTION)

@app.post("/upload-form")
async def upload_form(
    file: UploadFile = File(...),
    form_name: str = Form(...),
    protected: bool = Form(False),
    show_answers: bool = Form(True),
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
            "protected": protected,
            "show_answers": show_answers,
            "created_at": datetime.now(),
            "creator_email": user['email']
        })
        
        return {"message": "Form saved successfully", "form_name": form_name}

    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON format")
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Internal server error: {str(e)}")

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
        "protected": form_data.protected,
        "show_answers": form_data.show_answers,
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
        submission = doc.to_dict()
        # Convert timezone-aware datetimes to naive UTC
        for key, value in submission.items():
            if isinstance(value, dt.datetime) and value.tzinfo is not None:
                submission[key] = value.astimezone(dt.timezone.utc).replace(tzinfo=None)
        submissions.append(submission)
    
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

@app.get("/form/{form_name}")
async def get_form(form_name: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    form_ref = get_form_ref(form_name)
    form = form_ref.get()
    if not form.exists:
        raise HTTPException(404, "Form not found")
    
    form_data = form.to_dict()
    
    # # Check if form is protected
    # if form_data.get("protected", False):
    #     try:
    #         user = await get_current_user(credentials)
    #         # Optionally add additional checks here (e.g., if user has access)
    #     except Exception as e:
    #         raise HTTPException(403, "This is a protected form - authentication required")
    
    # # Remove answers if show_answers is False
    # if not form_data.get("show_answers", True):
    #     for question in form_data["questions"]:
    #         question.pop("correct_answer", None)
    
    return form_data

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

async def generate_quiz_with_together(pdf_text: str) -> Dict:
    """Generate quiz using Together API"""
    client = Together(api_key="5b7a2193bac4ff4aa1c037ba6c5acc359663713b2f7267417003a4c6e76cf269")

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
        response = client.chat.completions.create(
            model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content
        quiz_data = extract_json_from_response(content)

        # Validate quiz structure
        questions = quiz_data.get("questions", [])
        if len(questions) != 10:
            raise HTTPException(
                status_code=422,
                detail="Quiz must contain exactly 10 questions"
            )

        return quiz_data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Together API error: {str(e)}"
        )

@app.post("/generate-quiz", response_model=QuizResponse)
async def create_quiz_from_pdf(
    file: UploadFile = File(..., max_size=MAX_FILE_SIZE),
    form_name: str = Form(...),
    protected: bool = Form(False),
    show_answers: bool = Form(True),
    user: dict = Depends(get_current_user)
):
    """Endpoint to generate quiz from PDF and directly create form"""
    try:
        # Validate form name first
        if not form_name.isidentifier():
            raise HTTPException(400, "Form name must be alphanumeric with underscores")
            
        form_ref = get_form_ref(form_name)
        if form_ref.get().exists:
            raise HTTPException(400, "Form name already exists")

        # PDF processing
        pdf_text = await extract_text_from_pdf(file)
        quiz_data = await generate_quiz_with_together(pdf_text)

        # Convert to Pydantic model for validation
        form_request = FormCreateRequest(
            form_name=form_name,
            questions=[
                QuestionCreate(
                    question=q["question"],
                    options=q["options"],
                    correct_answer=q["correct_answer"],
                    marks=q["marks"]
                ) for q in quiz_data["questions"]
            ],
            protected=protected,
            show_answers=show_answers
        )

        # Validate questions
        for question in form_request.questions:
            if not question.question.strip():
                raise HTTPException(400, "All questions must have text")
                
            if len(question.options) < 2:
                raise HTTPException(400, "Each question must have at least 2 options")
                
            if question.correct_answer not in question.options:
                raise HTTPException(400, "Correct answer must be in options")

        # Create form in Firestore
        form_ref.set({
            "form_name": form_name,
            "questions": [q.dict() for q in form_request.questions],
            "protected": protected,
            "show_answers": show_answers,
            "created_at": datetime.now(),
            "creator_email": user['email']
        })

        return {
            "success": True,
            "message": f"Form '{form_name}' created successfully with {len(form_request.questions)} questions"
        }

    except HTTPException as he:
        return JSONResponse(
            status_code=he.status_code,
            content={"success": False, "error": he.detail}
        )
    except Exception as e:
        return {
            "success": False,
            "error": f"Form creation failed: {str(e)}"
        }
        
@app.get("/admin-stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    try:
        # Get all forms created by this user
        forms_query = db.collection(FORMS_COLLECTION)\
                        .where("creator_email", "==", user['email'])
        forms = [f.to_dict() for f in forms_query.stream()]
        
        # Calculate form statistics
        total_forms = len(forms)
        
        if total_forms == 0:
            return {
                "total_forms": 0,
                "protected_forms": 0,
                "total_submissions": 0
            }
            
        protected_forms = sum(1 for f in forms if f.get('protected', False))
        
        # Get all submissions for these forms
        form_names = [f['form_name'] for f in forms]
        submissions_query = db.collection(SUBMISSIONS_COLLECTION)\
                             .where("form_name", "in", form_names)
        total_submissions = sum(1 for _ in submissions_query.stream())

        return {
            "total_forms": total_forms,
            "protected_forms": protected_forms,
            "total_submissions": total_submissions
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving admin stats: {str(e)}"
        )
        
@app.get("/health")
async def health_check():
    return {"status": "ok"} 

@app.get("/my-submissions/stats")
async def get_user_submission_stats(user: dict = Depends(get_current_user)):
    try:
        # Get all submissions for this user
        submissions_ref = db.collection("submissions")
        submissions_query = submissions_ref.where(filter=FieldFilter("user_email", "==", user['email']))
        submissions = [s.to_dict() for s in submissions_query.stream()]
        
        if not submissions:
            return {
                "totalSubmissions": 0,
                "averageScore": 0,
                "bestScore": 0
            }
        total_submissions = len(submissions)
        # Get forms to check which submissions have visible scores
        form_names = list({s['form_name'] for s in submissions})
        forms_ref = db.collection("forms")
        forms_query = forms_ref.where(filter=FieldFilter("form_name", "in", form_names))
        forms = {f.id: f.to_dict() for f in forms_query.stream()}
        
        # Calculate scores only for forms where answers are visible
        scores = []
        for sub in submissions:
            form = forms.get(sub['form_name'], {})
            if form.get('show_answers', True):  # Default to True if not specified
                if 'total_marks' in sub and 'total_possible_marks' in sub:
                    if sub['total_possible_marks'] > 0:
                        percentage = (sub['total_marks'] / sub['total_possible_marks']) * 100
                        scores.append(percentage)
        
        # Calculate derived stats
        average_score = round(sum(scores) / len(scores), 2) if scores else 0
        best_score = round(max(scores), 2) if scores else 0
        
        return {
            "totalSubmissions": total_submissions,
            "averageScore": average_score,
            "bestScore": best_score
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating submission stats: {str(e)}"
        )

# @app.get("/submission/{submission_id}", response_model=SubmissionResponse)
# async def get_submission(
#     submission_id: str,
#     user: dict = Depends(get_current_user)
# ):
#     try:
#         # Get the submission document
#         submission_doc = get_submissions_ref().document(submission_id).get()
        
#         if not submission_doc.exists:
#             raise HTTPException(status_code=404, detail="Submission not found")
        
#         submission_data = submission_doc.to_dict()
        
#         # Verify the requesting user has access to this submission
#         if submission_data["user_email"] != user["email"]:
#             # Check if user is the form creator (admin view)
#             form_ref = get_form_ref(submission_data["form_name"])
#             form_doc = form_ref.get()
            
#             if not form_doc.exists or form_doc.to_dict().get("creator_email") != user["email"]:
#                 raise HTTPException(
#                     status_code=403,
#                     detail="You don't have permission to view this submission"
#                 )
        
#         # Get total possible marks from the form
#         form_ref = get_form_ref(submission_data["form_name"])
#         form_doc = form_ref.get()
        
#         if not form_doc.exists:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Associated form not found"
#             )
        
#         form_data = form_doc.to_dict()
#         questions = form_data.get("questions", [])
#         total_possible = sum(q.get("marks", 0) for q in questions)
        
#         # Handle timestamp conversion
#         submitted_at = ""
#         if isinstance(submission_data.get("submitted_at"), datetime):
#             submitted_at = submission_data["submitted_at"].isoformat()
#         else:
#             submitted_at = str(submission_data.get("submitted_at", ""))
        
#         response_data = {
#             "id": submission_doc.id,
#             "form_name": submission_data["form_name"],
#             "user_name": submission_data["user_name"],
#             "user_email": submission_data["user_email"],
#             "answers": submission_data["answers"],
#             "total_marks": float(submission_data.get("total_marks", 0)),
#             "total_possible_marks": float(total_possible),
#             "submitted_at": submitted_at,
#         }
        
#         # Include proctoring metrics if available
#         if "proctoring_metrics" in submission_data:
#             response_data["proctoring_metrics"] = submission_data["proctoring_metrics"]
        
#         return response_data
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error retrieving submission: {str(e)}"
#         )
