import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api, type Health } from './api';
import { HealthContext } from './health';
import { ToastProvider } from './components/Toast';
import { Banner } from './components/ui';
import { Icon } from './components/Icon';
import { errMsg } from './format';
import GeneratePage from './pages/GeneratePage';
import ReviewPage from './pages/ReviewPage';
import HistoryPage from './pages/HistoryPage';
import MockConfluencePage from './pages/MockConfluencePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e: unknown) => setHealthError(errMsg(e)));
  }, []);

  const demo = health?.mode === 'demo';

  return (
    <HealthContext.Provider value={health}>
      <ToastProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <div className="topbar-inner">
            <NavLink to="/" className="brand">
              <span className="brand-mark">
                <Icon name="shield" size={18} />
              </span>
              <span>
                Weekly Status Report <span className="brand-light">Generator</span>
              </span>
            </NavLink>
            <nav aria-label="Primary" className="nav">
              <NavLink to="/" end>
                Generate
              </NavLink>
              <NavLink to="/history">History</NavLink>
              {demo && <NavLink to="/mock-confluence">Mock Confluence</NavLink>}
              <NavLink to="/settings">Settings</NavLink>
            </nav>
            <div className="topbar-right">
              {demo && (
                <span className="demo-badge" title="Fixture data and a mock Confluence. No credentials are used.">
                  Demo mode
                </span>
              )}
              {health?.mode === 'live' && <span className="live-badge">Live</span>}
            </div>
          </div>
        </header>
        <main id="main" className="container">
          {healthError && (
            <div className="gap">
              <Banner kind="error" title="Backend unavailable">
                {healthError}
              </Banner>
            </div>
          )}
          <Routes>
            <Route path="/" element={<GeneratePage />} />
            <Route path="/reports/:id" element={<ReviewPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/mock-confluence" element={<MockConfluencePage />} />
            <Route path="/mock-confluence/:pageId" element={<MockConfluencePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </ToastProvider>
    </HealthContext.Provider>
  );
}
