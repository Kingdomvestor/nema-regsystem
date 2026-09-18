import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AttendeesScreen } from './features/attendees/AttendeesScreen'
import { LoginScreen } from './features/auth/LoginScreen'
import { ImportScreen } from './features/import/ImportScreen'
import RoomsScreen from './features/rooms/RoomsScreen'
import AllocationScreen from './features/allocations/AllocationScreen'
import DashboardScreen from './features/dashboard/DashboardScreen'
import CheckinScreen from './features/checkin/CheckinScreen'
import RegistrationScreen from './features/registration/RegistrationScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute requireAdmin>
            <ImportScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute requireAdmin>
            <RegistrationScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendees"
        element={
          <ProtectedRoute requireDesk>
            <AttendeesScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkin"
        element={
          <ProtectedRoute requireDesk>
            <CheckinScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute requireAccommodation>
            <RoomsScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/allocations"
        element={
          <ProtectedRoute requireAccommodation>
            <AllocationScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
