import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGate from './components/auth/AuthGate';
import Layout from './components/layout/Layout';
import ContactsScreen from './components/screens/ContactsScreen';
import PipelineScreen from './components/screens/PipelineScreen';
import SettingsScreen from './components/screens/SettingsScreen';

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route
          path="/"
          element={
            <Layout title="Vajilla CRM">
              <ContactsScreen />
            </Layout>
          }
        />
        <Route
          path="/pipeline"
          element={
            <Layout title="Pipeline">
              <PipelineScreen />
            </Layout>
          }
        />
        <Route
          path="/settings"
          element={
            <Layout title="Configuración">
              <SettingsScreen />
            </Layout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  );
}
