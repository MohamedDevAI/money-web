import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import MoneyHub from './pages/MoneyHub';
import { MoneyPrivacyProvider } from './context/MoneyPrivacyContext';
import { useTheme } from './hooks/useTheme';
import { useBackendHealth } from './hooks/useBackendHealth';
import './App.css';

/**
 * App is the root component of the standalone Money OS application.
 *
 * It provides:
 * - MoneyPrivacyProvider (global privacy toggle for masking balances)
 * - Persistent Money OS Header (Navbar)
 * - Wealth Hub, Investments, Trading, Financial Health & FIRE (/money)
 */
export default function App() {
  useTheme();
  const backendStatus = useBackendHealth();

  useEffect(() => {
    document.documentElement.setAttribute('data-app', 'money');
    document.body.setAttribute('data-app', 'money');
  }, []);

  return (
    <MoneyPrivacyProvider>
      <div className="app-wrapper" data-app="money">
        <Navbar backendStatus={backendStatus} />

        <main className="app-main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/money" replace />} />
            <Route path="/money/*" element={<MoneyHub />} />
            <Route path="*" element={<Navigate to="/money" replace />} />
          </Routes>
        </main>
      </div>
    </MoneyPrivacyProvider>
  );
}
