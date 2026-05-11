import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/AuthProvider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Scripts } from '@/pages/Scripts'
import { AskVictor } from '@/pages/AskVictor'
import { Transcription } from '@/pages/Transcription'
import { AnalyzeContent } from '@/pages/AnalyzeContent'
import { RecreateContent } from '@/pages/RecreateContent'
import { ViralCalculator } from '@/pages/ViralCalculator'
import { EditorialCalendar } from '@/pages/EditorialCalendar'
import { Admin } from '@/pages/Admin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/ask-victor" element={<AskVictor />} />
            <Route path="/transcription" element={<Transcription />} />
            <Route path="/analyze" element={<AnalyzeContent />} />
            <Route path="/recreate" element={<RecreateContent />} />
            <Route path="/calculator" element={<ViralCalculator />} />
            <Route path="/calendar" element={<EditorialCalendar />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
