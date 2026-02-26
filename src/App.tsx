import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/blocks/app-sidebar/layout";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "@/pages/dashboard-page";
import { NotesPage } from "@/pages/notes-page";
import { TasksPage } from "@/pages/tasks-page";
import { MeetingsPage } from "@/pages/meetings-page";
import { CalendarPage } from "@/pages/calendar-page";
import { ProjectsPage } from "@/pages/projects-page";
import { CompaniesPage } from "@/pages/companies-page";
import { PeoplePage } from "@/pages/people-page";
import { GraphPage } from "@/pages/graph-page";
import { AssistantPage } from "@/pages/assistant-page";
import { loadAppSettings } from "@/lib/app-settings";
import { runScheduledNoteLinkProcessingIfDue } from "@/lib/note-linking-queue";
import { useEffect, useRef } from "react";

function App() {
  const isRunningScheduledLinkRef = useRef(false);

  useEffect(() => {
    const runIfDue = () => {
      if (isRunningScheduledLinkRef.current) {
        return;
      }

      isRunningScheduledLinkRef.current = true;

      void runScheduledNoteLinkProcessingIfDue(loadAppSettings())
        .catch(() => {
          // Silent fail to avoid interrupting UX.
        })
        .finally(() => {
          isRunningScheduledLinkRef.current = false;
        });
    };

    runIfDue();
    const intervalId = window.setInterval(runIfDue, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="assistant" element={<AssistantPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
