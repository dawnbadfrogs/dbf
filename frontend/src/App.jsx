import { useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import SmoothScroll from './components/SmoothScroll';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import { applyDocumentBranding } from './lib/config';

function App() {
  useEffect(() => {
    applyDocumentBranding();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SmoothScroll>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pond" element={<LandingPage />} />
            <Route path="/leaderboard" element={<LandingPage />} />
            <Route path="/portfolio" element={<LandingPage />} />
            <Route path="/tracker" element={<LandingPage />} />
            <Route path="/treasury" element={<LandingPage />} />
            <Route path="/nft" element={<LandingPage />} />
            <Route path="/about" element={<LandingPage />} />
            <Route path="/faq" element={<LandingPage />} />
            <Route path="/docs" element={<LandingPage />} />
            <Route path="/app" element={<Navigate to="/pond" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SmoothScroll>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
