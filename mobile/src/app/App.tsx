import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router";
import { BottomTabBar } from "./components/BottomTabBar";
import { LoginScreen } from "./components/screens/LoginScreen";
import { RegisterScreen } from "./components/screens/RegisterScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { LessonsScreen } from "./components/screens/LessonsScreen";
import { LessonDetailScreen } from "./components/screens/LessonDetailScreen";
import { DictionaryScreen } from "./components/screens/DictionaryScreen";
import { GesturePreviewScreen } from "./components/screens/GesturePreviewScreen";
import { PracticeScreen } from "./components/screens/PracticeScreen";
import { ProfileScreen } from "./components/screens/ProfileScreen";
import { AchievementsScreen } from "./components/screens/AchievementsScreen";
import { AuthProvider, useAuth } from "./context/AuthContext";

function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: "#f8faec", fontFamily: "'Libre Franklin', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "#2e9d3e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            🤟
          </div>
          <p style={{ color: "#717182", fontSize: 14 }}>Завантаження...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) return null;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return <Outlet />;
}

function AppLayout() {
  return (
    <div className="flex flex-col" style={{ height: "100%", background: "#f8faec" }}>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Outlet />
      </div>
      <BottomTabBar />
    </div>
  );
}

function AppRouter() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
      </Route>

      {/* Protected full-screen routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/achievements" element={<AchievementsScreen />} />
      </Route>

      {/* Protected routes with bottom tabs */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/lessons" element={<LessonsScreen />} />
          <Route path="/lessons/:id" element={<LessonDetailScreen />} />
          <Route path="/dictionary" element={<DictionaryScreen />} />
          <Route path="/dictionary/:id" element={<GesturePreviewScreen />} />
          <Route path="/practice/:id" element={<PracticeScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}
