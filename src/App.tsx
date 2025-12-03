import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NovoProtesto from './pages/NovoProtesto';
import AdminPainel from './pages/AdminPainel';
import ProtectedRoute from './components/ProtectedRoute';
import AdminUsers from './pages/AdminUsers';
import DriverProfile from './pages/DriverProfile';
import JudgmentDetail from './pages/JudgmentDetail';
import AdminRaceDetail from './pages/AdminRaceDetail';
import Regulamento from './pages/Regulamento';
import MainLayout from './layouts/MainLayout';



function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/regulamento" element={<Regulamento />} />
            <Route path="/novo-protesto" element={<NovoProtesto />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPainel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/julgamento/:id" element={
              <ProtectedRoute>
                <JudgmentDetail />
              </ProtectedRoute>
            } />
            <Route
              path="/admin/corrida/:id"
              element={
                <ProtectedRoute>
                  <AdminRaceDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/piloto/:id"
              element={
                <ProtectedRoute>
                  <DriverProfile />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
