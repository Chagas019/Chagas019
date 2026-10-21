import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { RouteError } from '@/components/layout/RouteError';
import { AuthProvider } from '@/hooks/useAuth';
import { CollectionsProvider } from '@/hooks/useCollections';
import { ToastProvider } from '@/hooks/useToast';
import { MotionPrefProvider } from '@/hooks/useMotionPref';
import { RequireStaff } from '@/pages/admin/RequireStaff';

// Cada rota é um pedaço separado do código (carregado sob demanda)
const Home = lazy(() => import('@/pages/HomePage'));
const Catalog = lazy(() => import('@/pages/CatalogPage'));
const Detail = lazy(() => import('@/pages/PropertyPage'));
const Experience = lazy(() => import('@/pages/ExperiencePage'));
const Favorites = lazy(() => import('@/pages/FavoritesPage'));
const Compare = lazy(() => import('@/pages/ComparePage'));
const About = lazy(() => import('@/pages/AboutPage'));
const Contact = lazy(() => import('@/pages/ContactPage'));
const Legal = lazy(() => import('@/pages/LegalPage'));
const Login = lazy(() => import('@/pages/LoginPage'));
const NotFound = lazy(() => import('@/pages/NotFoundPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminProperties = lazy(() => import('@/pages/admin/AdminProperties'));
const AdminPropertyEdit = lazy(() => import('@/pages/admin/AdminPropertyEdit'));
const AdminLeads = lazy(() => import('@/pages/admin/AdminLeads'));
const AdminContent = lazy(() => import('@/pages/admin/AdminContent'));

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/imoveis', element: <Catalog /> },
      { path: '/imovel/:slug', element: <Detail /> },
      { path: '/experiencia-3d', element: <Experience /> },
      { path: '/favoritos', element: <Favorites /> },
      { path: '/comparar', element: <Compare /> },
      { path: '/sobre', element: <About /> },
      { path: '/contato', element: <Contact /> },
      { path: '/privacidade', element: <Legal doc="privacidade" /> },
      { path: '/termos', element: <Legal doc="termos" /> },
      { path: '/entrar', element: <Login /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/admin',
    errorElement: <RouteError />,
    element: <RequireStaff><AdminLayout /></RequireStaff>,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'imoveis', element: <AdminProperties /> },
      { path: 'imoveis/:id', element: <AdminPropertyEdit /> },
      { path: 'contatos', element: <AdminLeads /> },
      { path: 'conteudo', element: <AdminContent /> },
    ],
  },
]);

export default function App() {
  return (
    <MotionPrefProvider>
      <ToastProvider>
        <AuthProvider>
          <CollectionsProvider>
            <RouterProvider router={router} />
          </CollectionsProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionPrefProvider>
  );
}
