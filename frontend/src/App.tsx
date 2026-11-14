import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import WasteScanner from './pages/WasteScanner';
import AuditResults from './pages/AuditResults';
import ReviewQueuePage from './pages/ReviewQueue';
import Analytics from './pages/Analytics';
import BinManagement from './pages/BinManagement';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan" element={<WasteScanner />} />
        <Route path="/audit/:id/results" element={<AuditResults />} />
        <Route path="/review" element={<ReviewQueuePage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/bins" element={<BinManagement />} />
      </Route>
    </Routes>
  );
}
