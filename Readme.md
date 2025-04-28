# 📋✨ Form Pulse

**Smart Form Builder with Real-Time Analytics**

[![License: GNU](https://img.shields.io/badge/License-GNU-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html#license-text)  
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-green.svg)](https://www.python.org/)  
[![React 18+](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)  
[![Docker](https://img.shields.io/badge/Docker-available-2496ED.svg)](https://hub.docker.com/r/gdhanush270/form-pulse-frontend)

Form Pulse is a modern form-building platform that combines intuitive form creation with powerful analytics. Built for educators, researchers, and businesses needing smart data collection solutions.

---

## 🚀 Features

- **🎨 Dual Form Creation Modes**
  - GUI builder for MCQ forms (drag-and-drop coming soon)
  - JSON upload for advanced users
  - Instant toggle between modes

- **🏆 Automated Scoring & Leaderboards**
  - Real-time scoring for MCQ forms
  - Top 5/10 performers leaderboard
  - Percentage calculated against total possible marks

- **📊 Comprehensive Analytics**
  - Submission tracking with timestamps
  - Visual performance metrics
  - Excel export with one click

- **🔗 Smart Sharing**
  - Copy form links with a single click
  - Responsive forms work on any device
  - Secure access controls

- **👤 User-Centric Design**
  - Submission history dashboard
  - Google profile integration
  - Mobile-responsive interface

---

## ⚙️ Installation

### Backend Setup (FastAPI)

```bash
# Clone repository
git clone https://github.com/gdhanush27/Form-Pulse.git
cd Form-Pulse/server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/MacOS
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```

### Frontend Setup (React)

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```

---

## 🐳 Docker Deployment

### Frontend Deployment

Frontend Docker image available on Docker Hub:

```bash
# Pull frontend image
docker pull gdhanush270/form-pulse-frontend:latest

# Run frontend container
docker run -d -p 80:3000 gdhanush270/form-pulse-frontend
```

### Backend Deployment

Backend Docker image available on Docker Hub:

```bash
# Pull backend image
docker pull gdhanush270/form-pulse-backend:latest

# Run backend container
docker run -d -p 8000:8000 --name form-pulse-backend-container gdhanush270/form-pulse-backend:latest
```

---

## 🖥️ Usage Guide

### Creating Forms
1. **GUI Mode**:
   - Add questions and options visually
   - Set correct answers and marks
   - Preview form before publishing

2. **JSON Mode**:
   ```json
   {
     "questions": [
       {
         "question": "Sample question",
         "options": ["Option 1", "Option 2"],
         "correct_answer": "Option 1",
         "marks": 1
       }
     ]
   }
   ```

### Managing Submissions
- View real-time leaderboards
- Export data to Excel
- Track respondent performance
- Copy shareable form links

---

## 📚 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create-form` | POST | Create form (GUI or JSON) |
| `/form/{name}` | GET | Get form template |
| `/submissions/{name}` | GET | Get form submissions |
| `/submissions/{name}/export` | GET | Export to Excel |
| `/my-forms` | GET | List user's forms |
| `/my-submissions` | GET | List user's responses |

---

## 🛠️ Tech Stack

**Backend**  
- FastAPI (Python) - High-performance API framework
- MongoDB - Flexible NoSQL database
- PyMongo - MongoDB Python driver
- Pandas - Data analysis and Excel export

**Frontend**  
- React 18 - Component-based UI
- Material-UI - Modern design system
- Firebase Auth - Secure authentication

**Deployment**  
- Docker - Containerization
- Docker Compose - Multi-container orchestration

---

## 📄 License

This project is licensed under the GNU GENERAL PUBLIC LICENSE - see [LICENSE](LICENSE) file for details.

---

**Form Pulse** © 2025 - Crafted with ❤️ by Dhanush  
[Report Bug](https://github.com/gdhanush27/Form-Pulse/issues) | [Request Feature](https://github.com/gdhanush27/Form-Pulse/issues) | [Docker Hub (Frontend)](https://hub.docker.com/r/gdhanush270/form-pulse-frontend) | [Docker Hub (Backend)](https://hub.docker.com/r/gdhanush270/form-pulse-backend)
