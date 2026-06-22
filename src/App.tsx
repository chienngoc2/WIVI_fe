import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { Overview } from './pages/Overview';
import { Members } from './pages/Members';
import { Activity } from './pages/Activity';
import { Intelligence } from './pages/Intelligence';
import { Campaigns } from './pages/Campaigns';
import { Configuration } from './pages/Configuration';

function App() {
  return (
    <BrowserRouter>
      {/* Full-width Layout Shell */}
      <div className="w-full h-screen flex bg-[#FAFBFD] overflow-hidden relative">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav />
          {/* Main Workspace Frame with 24px outer padding (p-6) */}
          <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-6 scrollbar-premium">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/members" element={<Members />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/intelligence" element={<Intelligence />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/configuration" element={<Configuration />} />
              </Routes>
            </main>
          </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
