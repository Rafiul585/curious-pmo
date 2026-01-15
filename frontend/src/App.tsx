import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from './components/layout/AuthLayout';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TasksPage } from './pages/TasksPage';
import { RegisterPage } from './pages/RegisterPage';
import { GanttPage } from './pages/GanttPage';
import { KanbanPage } from './pages/KanbanPage';
import { SearchPage } from './pages/SearchPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { WorkspaceDetailPage } from './pages/WorkspaceDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProtectedRoute } from './components/routing/ProtectedRoute';

const App = () => (
  <Routes>
    {/* Auth Routes */}
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    </Route>

    {/* Protected App Routes */}
    <Route
      element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }
    >
      {/* Dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* Workspaces */}
      <Route path="/workspaces" element={<WorkspacesPage />} />
      <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />

      {/* Projects */}
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />

      {/* Tasks */}
      <Route path="/tasks" element={<TasksPage />} />

      {/* Views */}
      <Route path="/gantt" element={<GanttPage />} />
      <Route path="/kanban" element={<KanbanPage />} />

      {/* Search */}
      <Route path="/search" element={<SearchPage />} />

      {/* User */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />

      {/* Notifications */}
      <Route path="/notifications" element={<NotificationsPage />} />
    </Route>

    {/* 404 */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default App;
