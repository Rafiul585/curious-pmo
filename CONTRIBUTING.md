# Contributing to ClickPM

Thank you for your interest in contributing to ClickPM! This document provides guidelines and steps for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](../../issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Screenshots if applicable
   - Your environment (OS, browser, Python/Node versions)

### Suggesting Features

1. Check existing issues for similar suggestions
2. Create a new issue with the "feature request" label
3. Describe the feature and its use case
4. Explain why this would be useful to most users

### Pull Requests

1. Fork the repository
2. Create a new branch from `master-merged`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Write or update tests as needed
5. Ensure all tests pass
6. Commit your changes with clear commit messages
7. Push to your fork and submit a pull request

## Development Setup

### Backend

```bash
cd clickpm
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Running Tests

```bash
# Backend tests
cd clickpm
python manage.py test

# Frontend tests
cd frontend
npm run test
```

## Coding Standards

### Python (Backend)

- Follow PEP 8 style guide
- Use meaningful variable and function names
- Add docstrings for functions and classes
- Keep functions small and focused

### TypeScript/React (Frontend)

- Follow the existing code style
- Use TypeScript types properly
- Use functional components with hooks
- Keep components small and reusable

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep the first line under 72 characters
- Reference issues when applicable

Example:
```
Add task dependency visualization

- Implement dependency graph component
- Add API endpoint for dependency data
- Update task detail view

Fixes #123
```

## Project Structure

When adding new features:

- **Backend models**: `clickpm/pm/models/`
- **Backend views**: `clickpm/pm/views/`
- **Backend serializers**: `clickpm/pm/serializers/`
- **Backend services**: `clickpm/pm/services/`
- **Frontend components**: `frontend/src/components/`
- **Frontend pages**: `frontend/src/pages/`
- **Frontend API calls**: `frontend/src/api/`

## Questions?

Feel free to open an issue for any questions about contributing.
