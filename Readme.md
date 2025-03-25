# Form Pulse 📋✨

**Smart Form Builder with Real-Time Insights**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-green.svg)](https://www.python.org/)
[![React 18+](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)

Form Pulse is a modern form-building platform that combines intuitive form creation with powerful analytics. Built for educators, researchers, and businesses needing smart data collection solutions.

## Features 🚀

- **📝 Smart Form Builder**  
  Create forms with multiple question types and automatic scoring
- **🔗 Shareable Links**  
  Generate unique URLs with one-click copy functionality
- **📊 Real-Time Analytics**  
  Visualize submissions with interactive charts and metrics
- **🔒 Secure Authentication**  
  Google OAuth integration with Firebase
- **📥 Excel Export**  
  Download submissions as formatted spreadsheets
- **👩💻 Admin Dashboard**  
  Manage forms and view detailed submission insights
- **📱 Responsive Design**  
  Works flawlessly on all devices

## Installation ⚙️

### Backend Setup (FastAPI)

```bash
# Clone repository
git clone https://github.com/yourusername/formpulse.git
cd formpulse/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/MacOS
venv\Scripts\activate  # Windows

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

## Usage 🖥️

1. **Access the App**  
   Visit `http://localhost:3000` in your browser

2. **Create Forms**  
   - Click "Create New Form" in the Admin Dashboard
   - Upload JSON form template 

3. **Share Forms**  
   - Copy unique form link from Admin Dashboard
   - Distribute to respondents

4. **Submit Responses**  
   - Users can submit via shared links
   - Real-time validation and scoring

5. **Analyze Data**  
   - View submissions in Admin Dashboard
   - Export data to Excel with one click

## Tech Stack 🛠️

**Backend**  
- FastAPI (Python)
- MongoDB (Database)
- PyMongo (ODM)
- Pandas (Data Export)

**Frontend**  
- React 18
- Material-UI (Design System)
- Axios (API Client)
- Firebase (Authentication)

**DevOps**  
- Docker (Containerization)
- Nginx (Reverse Proxy)
- GitHub Actions (CI/CD)

## API Reference 📚

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload/` | POST | Create new form |
| `/form/{name}` | GET | Get form template |
| `/submit` | POST | Submit form responses |
| `/submissions/{name}/export` | GET | Export submissions as Excel |
| `/my-forms` | GET | List user's forms |

## Contributing 🤝

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License 📄

This project is licensed under the GNU GENERAL PUBLIC LICENSE - see [LICENSE](LICENSE) file for details.

---

**Form Pulse** © 2025 - Crafted with ❤️ by Dhanush  
[Report Bug](https://github.com/gdhanush27/Form-Pulse/issues) | [Request Feature](https://github.com/gdhanush27/Form-Pulse/issues)
