import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AttendeesScreen } from './features/attendees/AttendeesScreen'
import { LoginScreen } from './features/auth/LoginScreen'
import { ImportScreen } from './features/import/ImportScreen'
import RoomsScreen from './features/rooms/RoomsScreen'
import AllocationScreen from './features/allocations/AllocationScreen'
import MealsScreen from './features/meals/MealsScreen'

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
      <Route
        path="/attendees"
        element={
          <ProtectedRoute>
            <AttendeesScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute requireAdmin>
            <RoomsScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/allocations"
        element={
          <ProtectedRoute requireAdmin>
            <AllocationScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meals"
        element={
          <ProtectedRoute requireAdmin>
            <MealsScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/attendees" replace />} />
    </Routes>
  )
}
