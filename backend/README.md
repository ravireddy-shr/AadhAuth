# Backend - Aadhaar Verification System\n\n## Setup Instructions\n\n1. Install Python dependencies:\n\n```bash\npip install -r requirements.txt\n```\n\n2. Ensure MongoDB is running locally on mongodb://localhost:27017 or set the MONGO_URL env var.\n\n3. Run the backend service:\n\n```bash\npython app.py\n```\n\n4. API base URL: http://localhost:5000

## New endpoints

- POST /seed_gov_data (creates 10 demo government users)
- POST /rtc/scan (authorized conductor/admin only)
  - body: { aadhaar } or form-data with face image
  - returns matched customer and eligibility
- GET /users/gov?role=passenger (list mock government passenger records)
\n