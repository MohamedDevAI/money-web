import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import MoneyHub from './pages/MoneyHub';
import { MoneyPrivacyProvider } from './context/MoneyPrivacyContext';
import { useTheme } from './hooks/useTheme';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useLiveMarketFeed } from './hooks/useLiveMarketFeed';
import './App.css';

/**
 * App is the root component of the standalone Money OS Institutional Wealth & Trading Terminal.
 */
export default function App() {
  useTheme();
  const backendStatus = useBackendHealth();
  const marketFeed = useLiveMarketFeed(2400);

  useEffect(() => {
    document.documentElement.setAttribute('data-app', 'money');
    document.body.setAttribute('data-app', 'money');
  }, []);

  return (
    <MoneyPrivacyProvider>
      <div className="app-wrapper" data-app="money">
        <Navbar
          backendStatus={backendStatus}
          watchlist={marketFeed.watchlist}
          isLiveStreaming={marketFeed.isLiveStreaming}
          onToggleLiveStreaming={marketFeed.toggleLiveStreaming}
        />

        <main className="app-main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/money" replace />} />
            <Route
              path="/money/*"
              element={<MoneyHub marketFeed={marketFeed} />}
            />
            <Route path="*" element={<Navigate to="/money" replace />} />
          </Routes>
        </main>
      </div>
    </MoneyPrivacyProvider>
  );
}
