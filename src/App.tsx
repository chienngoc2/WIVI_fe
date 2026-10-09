import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { Overview } from './pages/Overview';
import { Members } from './pages/Members';
import { Activity } from './pages/Activity';
import { Intelligence } from './pages/Intelligence';
import { Campaigns } from './pages/Campaigns';
import { Configuration } from './pages/Configuration';
import { Feedbacks } from './pages/Feedbacks';

const RequireAdmin = () => {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (session.identity.role !== 'Admin') {
    return <Navigate to="/login" replace state={{ denied: true }} />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/members" element={<Members />} />
            <Route path="/feedbacks" element={<Feedbacks />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
