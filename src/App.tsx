import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/blocks/app-sidebar/layout";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "@/pages/dashboard-page";
import { NotesPage } from "@/pages/notes-page";
import { TasksPage } from "@/pages/tasks-page";
import { MeetingsPage } from "@/pages/meetings-page";
import { ProjectsPage } from "@/pages/projects-page";
import { CompaniesPage } from "@/pages/companies-page";
import { PeoplePage } from "@/pages/people-page";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="people" element={<PeoplePage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
