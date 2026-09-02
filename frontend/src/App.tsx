import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { NationalOverview } from './pages/NationalOverview';
import { HighRiskProjects } from './pages/HighRiskProjects';
import { StateView } from './pages/StateView';
import { ProjectDetail } from './pages/ProjectDetail';
import { AuditCase } from './pages/AuditCase';
import { SearchPage } from './pages/SearchPage';
import { HowItWorks } from './pages/HowItWorks';
import { LiveRefresh } from './pages/LiveRefresh';
import { OfficerIngestion } from './pages/OfficerIngestion';
import './index.css';

export function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<NationalOverview />} />
            <Route path="/high-risk" element={<HighRiskProjects />} />
            <Route path="/states" element={<StateView />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/audit-case/:id" element={<AuditCase />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/officer-portal" element={<OfficerIngestion />} />
            <Route path="/live-refresh" element={<LiveRefresh />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
