# Call Center QA Analysis - Development Plan

## Project Overview

Build a standalone Django app that ingests daily CSV files containing call center QA analysis data. The app will display aggregate statistics and per-agent scores to help identify issues and compare agent performance.

## Technical Stack

- **Backend**: Django 4.2+
- **Frontend**: Vue.js 3 (embedded in Django templates via CDN)
- **Styling**: Tailwind 4 (via CDN)
- **Architecture**: Single-page application, no separate frontend/backend
- **Data Storage**: Initially no persistence (in-memory processing only)

## Development Phases

### ✅ Phase 1: Django App Setup
**Status**: COMPLETED

- [x] Create Django project structure
- [x] Create `qa_analysis` app
- [x] Configure settings (INSTALLED_APPS, TEMPLATES)
- [x] Set up URL routing
- [x] Create basic view
- [x] Create templates directory structure

**Files Created**:
- `callcenter_qa/settings.py` - Django settings
- `callcenter_qa/urls.py` - URL routing
- `qa_analysis/views.py` - View functions
- `templates/qa_analysis/index.html` - Main template

---

### ✅ Phase 2: Basic Page with Styling
**Status**: COMPLETED

- [x] Create single-page HTML template
- [x] Integrate Tailwind 4 CDN
- [x] Integrate Vue.js 3 CDN
- [x] Set up basic page layout and styling
- [x] Create Vue.js app instance

**Files Modified**:
- `templates/qa_analysis/index.html` - Added Tailwind and Vue.js

---

### ✅ Phase 3: File Upload Functionality
**Status**: COMPLETED

- [x] Add file input field to template
- [x] Add file upload form with Vue.js handling
- [x] Implement file selection handler
- [x] Add upload button with validation
- [x] Style upload interface with Tailwind
 
**Files Modified**:
- `templates/qa_analysis/index.html` - Added file upload form

---

### ✅ Phase 4: File Upload Backend & Display
**Status**: COMPLETED

- [x] Update view to handle POST requests
- [x] Implement CSV file validation
- [x] Read and return file contents as JSON
- [x] Display raw file contents in frontend
- [x] Add error handling for file uploads
- [x] Implement CSRF token handling

**Files Modified**:
- `qa_analysis/views.py` - Added file upload handling
- `templates/qa_analysis/index.html` - Added file display section

---

### ✅ Phase 5: CSV Processing & Parsing
**Status**: COMPLETED

- [x] Parse CSV file structure
- [x] Identify columns (agent names, scores, metrics)
- [x] Handle different CSV formats/structures
- [x] Validate CSV data integrity
- [x] Return structured JSON data from backend
- [x] Store parsed data in Vue.js data model
- [x] Display parsed data in table format

**Files Modified**:
- `qa_analysis/views.py` - Added CSV parsing with csv.DictReader
- `templates/qa_analysis/index.html` - Updated to display parsed data in table

---

### ✅ Phase 6: Agent Statistics & Analysis
**Status**: COMPLETED

- [x] Calculate per-agent statistics
  - [x] Total calls per agent
  - [x] Average scores per agent
  - [x] Score breakdowns by metric
  - [x] Min/max scores
- [x] Calculate aggregate statistics
  - [x] Overall averages
  - [x] Total calls analyzed
  - [x] Score distributions
- [x] Display statistics in new section on page
  - [x] Aggregate statistics section with summary cards
  - [x] Overall metrics table
  - [x] Per-agent statistics with detailed breakdowns

**Files Modified**:
- `qa_analysis/views.py` - Added `_calculate_agent_statistics()` and `_calculate_aggregate_statistics()` functions
- `templates/qa_analysis/index.html` - Added Aggregate Statistics and Agent Statistics sections

---

### ✅ Phase 7: Data Visualization & Display
**Status**: COMPLETED

- [x] Create agent comparison table
  - [x] Sortable columns
  - [x] Agent names
  - [x] Key metrics
  - [x] Score summaries
- [x] Create aggregate statistics display
  - [x] Summary cards/metrics
  - [x] Overall statistics
- [x] Create detailed agent view
  - [x] Individual agent breakdown
  - [x] Metric-specific analysis
- [x] Add filtering and search
  - [x] Search functionality for agents
  - [x] Agent selection/highlighting

**Files Modified**:
- `templates/qa_analysis/index.html` - Added Agent Comparison table with sortable columns and search

---

### ⏳ Phase 8: UI/UX Enhancements
**Status**: PENDING

- [ ] Improve loading states
- [ ] Add success/error notifications
- [ ] Enhance table styling
- [ ] Add responsive design improvements
- [ ] Add data export functionality (optional)
- [ ] Add print-friendly views (optional)

**Dependencies**: Phase 7 must be completed first

---

## Future Considerations (Out of Scope for Initial Version)

- [ ] Database persistence (store historical data)
- [ ] Multi-file upload support
- [ ] Date range filtering
- [ ] Trend analysis over time
- [ ] User authentication
- [ ] Data export (CSV, PDF)
- [ ] Email reports
- [ ] Dashboard with charts/graphs

---

## File Structure

```
/Users/ezl/code/AI QA/
├── callcenter_qa/          # Django project
│   ├── settings.py
│   ├── urls.py
│   └── ...
├── qa_analysis/            # Django app
│   ├── views.py
│   ├── models.py (future)
│   └── ...
├── templates/
│   └── qa_analysis/
│       └── index.html
├── requirements.txt
├── manage.py
├── .gitignore
└── DEVELOPMENT_PLAN.md     # This file
```

---

## Running the Application

```bash
# Activate virtual environment
source venv/bin/activate

# Run development server
python manage.py runserver

# Visit http://127.0.0.1:8000/
```

---

## Notes

- No database models needed initially (in-memory processing)
- No file persistence (files processed on upload)
- CSRF protection enabled via Django middleware
- Tailwind 4 and Vue.js loaded via CDN (no npm/build process)

---

## Questions to Resolve

1. **CSV Structure**: What columns are in the CSV file?
   - Agent name/ID column
   - Score columns (what metrics are scored?)
   - Date/timestamp column?
   - Call ID column?

2. **Scoring System**: How are scores structured?
   - Numeric scores (0-100)?
   - Categorical scores?
   - Multiple metrics per call?

3. **Analysis Requirements**: What specific statistics are most important?
   - Average scores per agent?
   - Score distributions?
   - Specific metric comparisons?

---

## Progress Tracking

**Last Updated**: Initial setup complete
**Current Phase**: Phase 5 - CSV Processing & Parsing
**Next Milestone**: Parse CSV and return structured data

