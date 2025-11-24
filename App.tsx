import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './src/lib/supabase';
import { ThemeProvider } from './src/context/ThemeContext';
import Layout from './src/components/Layout';
import Login from './src/pages/Login';
import Register from './src/pages/Register';
import ServicesList from './src/pages/ServicesList';
import CreateService from './src/pages/CreateService';
import ServiceDetails from './src/pages/ServiceDetails';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch((error) => {
      console.error("Supabase connection error:", error);
      // Stop loading so the user can at least see the login screen
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!session ? <Register /> : <Navigate to="/" />} />

          {/* Protected Routes */}
          <Route element={session ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/" element={<ServicesList />} />
            <Route path="/services/new" element={<CreateService />} />
            <Route path="/services/:id" element={<ServiceDetails />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;