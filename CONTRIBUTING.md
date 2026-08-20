# Contributing to Glucoguard

Thank you for your interest in contributing to Glucoguard! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/glucoguard.git
   cd glucoguard
   ```
3. **Read the documentation**
   - START_HERE.md - Quick setup guide
   - README.md - Project overview
   - APP_STARTUP_GUIDE.md - Detailed setup

4. **Set up the development environment**
   ```bash
   # Backend setup
   cd backend
   npm install
   npm start
   
   # Frontend setup (new terminal)
   cd frontend
   python -m http.server 5500
   ```

5. **Verify it's working**
   - Open http://localhost:5500
   - Register and login to test

## Making Changes

### Branch Naming
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-description
# or
git checkout -b docs/documentation-improvement
```

### Code Style
- **Frontend**: Follow existing style in `frontend/app.js` and `frontend/style.css`
- **Backend**: Follow existing patterns in `backend/routes/` and `backend/models/`
- **Python/ML**: Follow PEP 8 style guide

### Testing Your Changes
1. Test locally before committing
2. Verify the app still runs: `http://localhost:5500`
3. Test the specific feature you changed
4. Check for console errors (browser DevTools)

### Commit Messages
```bash
git commit -m "feat: add new feature description"
git commit -m "fix: resolve bug in authentication"
git commit -m "docs: update README with new info"
git commit -m "style: format code"
git commit -m "test: add unit tests"
```

## Areas We Need Help

### High Priority
- [ ] Real CGM API integrations (Dexcom, Freestyle Libre)
- [ ] ML model improvements with real data
- [ ] Production deployment setup
- [ ] Security audit and hardening

### Medium Priority
- [ ] Frontend UI/UX improvements
- [ ] Mobile responsiveness
- [ ] Additional food database entries
- [ ] Doctor/provider integration

### Low Priority
- [ ] Documentation improvements
- [ ] Code cleanup
- [ ] Performance optimization
- [ ] Test coverage

## Pull Request Process

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub
   - Title: Clear, concise description
   - Description: What changed and why
   - Link any related issues

3. **Wait for review**
   - Address feedback
   - Make requested changes
   - Push updates to the same branch

4. **Merge** once approved

## Project Structure

```
glucoguard/
├── backend/
│   ├── routes/          # API endpoints
│   ├── models/          # Database models
│   ├── migrations/      # Database setup
│   ├── middleware/      # Authentication, etc.
│   └── server.js        # Main API server
├── frontend/
│   ├── index.html       # Main app UI
│   ├── login.html       # Login/signup page
│   ├── app.js           # App logic
│   └── style.css        # Dark theme styles
├── ml/
│   ├── dataset_generator.py
│   ├── feature_engineering.py
│   ├── model_training.py
│   └── model_inference_wrapper.py
└── docs/                # Documentation
```

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **ML**: Python, scikit-learn, XGBoost
- **Auth**: JWT, bcryptjs

## Important Notes

⚠️ **This is a research prototype**, not FDA-approved medical software
- For demonstration purposes only
- Always consult healthcare providers for medical decisions
- Never use for actual patient care without proper validation

## Questions?

- Read the docs in START_HERE.md
- Check existing issues on GitHub
- Open a new issue to ask questions

## License

By contributing, you agree your contributions are licensed under the same license as this project.

---

**Thank you for contributing to Glucoguard!** 🚀
