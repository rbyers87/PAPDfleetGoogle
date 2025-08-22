import React, { useEffect } from 'react';
    import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
    import { useAuthStore } from './stores/authStore';
    import Layout from './components/Layout';
    import Login from './pages/Login';
    import Dashboard from './pages/Dashboard';
    import Vehicles from './pages/Vehicles';
    import WorkOrders from './pages/WorkOrders';
    import Settings from './pages/Settings';
    import NotFound from './pages/NotFound';
    import { supabase } from './lib/supabase';

    function PrivateRoute({ children }: { children: React.ReactNode }) {
      const { session } = useAuthStore();
      return session ? <>{children}</> : <Navigate to="/login" />;
    }

    function AdminRoute({ children }: { children: React.ReactNode }) {
      const { isAdmin } = useAuthStore();
      return isAdmin ? <>{children}</> : <Navigate to="/dashboard" />;
    }

    function App() {
      const { session, setProfile } = useAuthStore();

      useEffect(() => {
        async function fetchProfile() {
          if (session) {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select(`
                  id,
                  role,
                  full_name,
                  badge_number
                `)
                .eq('id', session.user.id)
                .single();

              if (error) throw error;
              setProfile(profileData);
            } catch (err) {
              console.error('Failed to fetch profile:', err);
            }
          }
        }

        fetchProfile();
      }, [session, setProfile]);

      return (
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="settings" element={
                <AdminRoute>
                  <Settings />
                </AdminRoute>
              } />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      );
    }

    export default App;
