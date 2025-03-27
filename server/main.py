from import_statements import *

# Initialize Firebase
path_to_credentials = os.path.join(os.getcwd(), "dynamic-form-270-firebase-adminsdk-fbsvc-efae9b4231.json")
cred = credentials.Certificate(path_to_credentials)
firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI()
security = HTTPBearer()

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

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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