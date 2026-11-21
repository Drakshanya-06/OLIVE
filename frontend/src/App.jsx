import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
import { AdminRoute, ProtectedRoute } from './routes/Guards'
import Home from './pages/Home'
import Awareness from './pages/Awareness'
const Facilities = lazy(() => import('./pages/Facilities'))
import DeviceAnalyzer from './pages/DeviceAnalyzer'
import Recycling from './pages/Recycling'
import Rewards from './pages/Rewards'
import Learning from './pages/Learning'
const Dashboard = lazy(() => import('./pages/Dashboard'))
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyOtp from './pages/auth/VerifyOtp'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminFacilities = lazy(() => import('./pages/admin/AdminManagers').then((m) => ({ default: m.AdminFacilities })))
const AdminDevices = lazy(() => import('./pages/admin/AdminManagers').then((m) => ({ default: m.AdminDevices })))
const AdminLearning = lazy(() => import('./pages/admin/AdminManagers').then((m) => ({ default: m.AdminLearning })))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'))
const AdminRewards = lazy(() => import('./pages/admin/AdminRewards'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
import { EmptyState, PageLoader } from './components/ui'
import { Link } from 'react-router-dom'

const NotFound = () => <div className="mx-auto max-w-xl px-4 py-24"><EmptyState title="Page not found" text="That address does not exist." action={<Link to="/" className="btn btn-primary">Go home</Link>} /></div>

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/awareness" element={<Awareness />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/device-analyzer" element={<DeviceAnalyzer />} />
        <Route path="/learning" element={<Learning />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/recycling" element={<Recycling />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<AuthLayout admin />}><Route path="/admin/login" element={<Login admin />} /></Route>
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/facilities" element={<AdminFacilities />} />
          <Route path="/admin/devices" element={<AdminDevices />} />
          <Route path="/admin/recycling-requests" element={<AdminRequests />} />
          <Route path="/admin/rewards" element={<AdminRewards />} />
          <Route path="/admin/learning" element={<AdminLearning />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  )
}
