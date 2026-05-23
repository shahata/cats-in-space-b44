import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import Planets from './pages/Planets';
import PlanetDetail from './pages/PlanetDetail';
import Crew from './pages/Crew';
import CrewDetail from './pages/CrewDetail';
import Missions from './pages/Missions';
import MissionDetail from './pages/MissionDetail';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Plans from './pages/Plans';
import Explore from './pages/Explore';
import Research from './pages/Research';
import MedicalBay from './pages/MedicalBay';
import Restaurant from './pages/Restaurant';
import Cinema from './pages/Cinema';
import Shop from './pages/Shop';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.functions.invoke('syncWixMember', {}).catch(() => {});
    });
  }, []);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required: allow visitors to browse without login
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation" element={<OrderConfirmation />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/planets" element={<Planets />} />
      <Route path="/planets/:slug" element={<PlanetDetail />} />
      <Route path="/crew" element={<Crew />} />
      <Route path="/crew/:slug" element={<CrewDetail />} />
      <Route path="/missions" element={<Missions />} />
      <Route path="/missions/:slug" element={<MissionDetail />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/research" element={<Research />} />
      <Route path="/medical-bay" element={<MedicalBay />} />
      <Route path="/restaurant" element={<Restaurant />} />
      <Route path="/cinema" element={<Cinema />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App