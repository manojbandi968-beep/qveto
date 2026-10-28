import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext.tsx'
import { OrganizationProvider } from './features/organizations/context/OrganizationContext.tsx'
import { NotificationProvider } from './features/notifications/index.ts'
import { AppRoutes } from './routes/AppRoutes.tsx'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
