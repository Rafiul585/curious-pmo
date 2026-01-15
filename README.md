# ClickPM - Project Management Tool

A full-featured, web-based project management platform for teams to manage projects, tasks, sprints, and milestones efficiently.

## Features

- **Multi-workspace support** - Organize teams and projects hierarchically
- **Project planning** - Milestones, sprints, and task management
- **Kanban boards** - Visual task tracking (To-do, In Progress, Review, Done)
- **Gantt charts** - Timeline visualization with drag-and-drop
- **Task dependencies** - Track blocking and related tasks
- **Real-time notifications** - Socket.io powered updates
- **Collaboration** - Comments, @mentions, and file attachments
- **Dashboard analytics** - Task statistics and progress tracking
- **Role-based access control** - Workspace and project level permissions

## Tech Stack

### Backend
- Django 4.2 with Django REST Framework
- PostgreSQL (production) / SQLite (development)
- JWT authentication (SimpleJWT)
- Gunicorn + WhiteNoise

### Frontend
- React 18 with TypeScript
- Vite build tool
- Material-UI (MUI)
- Redux Toolkit
- Tailwind CSS
- Socket.io for real-time updates

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (for production)

### Backend Setup

```bash
cd clickpm

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Docker Setup

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up
```

## Project Structure

```
├── clickpm/                 # Django Backend
│   ├── clickpm/config/     # Django settings
│   ├── pm/                 # Main application
│   │   ├── models/        # Database models
│   │   ├── views/         # API endpoints
│   │   ├── serializers/   # DRF serializers
│   │   └── services/      # Business logic
│   └── requirements.txt
│
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── store/        # Redux store
│   └── package.json
│
└── docker-compose.yml
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/auth/` | Authentication (login, register, refresh) |
| `/api/users/` | User management |
| `/api/workspaces/` | Workspace management |
| `/api/projects/` | Project management |
| `/api/milestones/` | Milestone management |
| `/api/sprints/` | Sprint management |
| `/api/tasks/` | Task management |
| `/api/comments/` | Comments |
| `/api/notifications/` | Notifications |
| `/api/dashboard/` | Dashboard analytics |

## Environment Variables

See `.env.example` files in `clickpm/` and `frontend/` directories for required environment variables.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Rafiul
