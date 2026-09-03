import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { LoginScreen } from './features/auth/LoginScreen'
import { ImportScreen } from './features/import/ImportScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/import"
        element={
          <ProtectedRoute requireAdmin>
            <ImportScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/import" replace />} />
    </Routes>
  )
}
