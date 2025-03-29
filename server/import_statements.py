from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import pandas as pd
from io import BytesIO
from fastapi.responses import Response
import firebase_admin
from firebase_admin import credentials, auth, firestore 
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from datetime import datetime
import json
import re
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from pydantic import BaseModel
import os
from google.cloud.firestore_v1.base_query import FieldFilter
from fastapi import FastAPI, UploadFile, File, HTTPException
import requests
import json
import re
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import re
import json
import httpx
import pdfplumber
from io import BytesIO
from typing import Optional, Dict, List
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import re
import json
import httpx
import pdfplumber
from io import BytesIO
from typing import Optional, Dict, List