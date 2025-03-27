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