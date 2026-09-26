import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SiteProvider } from './context/SiteContext';
import { CartProvider } from './context/CartContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartPopup, { MiniCartFab } from './components/CartPopup';
import AddToCartToast from './components/AddToCartToast';
import PopupBanner from './components/PopupBanner';

import Home from './pages/Home';
import Shop from './pages/Shop';
import AllCategories from './pages/AllCategories';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import AdminLogin from './pages/AdminLogin';
import PolicyPage from './pages/PolicyPage';

import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import ManageSettings from './admin/ManageSettings';
import ManageTitles from './admin/ManageTitles';
import ManageBanners from './admin/ManageBanners';
import ManageCategories from './admin/ManageCategories';
import ManageProducts from './admin/ManageProducts';
import ManageProductForm from './admin/ManageProductForm';
import ManageFooterLinks from './admin/ManageFooterLinks';
import ManageOrders from './admin/ManageOrders';
import ManageIncompleteOrders from './admin/ManageIncompleteOrders';
import ManagePolicies from './admin/ManagePolicies';
import ManageCoupons from './admin/ManageCoupons';
import ManageDeliveryCharges from './admin/ManageDeliveryCharges';

function StoreLayout({ children }) {
  const location = useLocation();
  const isCheckout = location.pathname === '/checkout';
  return (
    <>
      <Header />
      {children}
      <Footer />
      {!isCheckout && (
        <>
          <CartPopup />
          <MiniCartFab />
          <AddToCartToast />
        </>
      )}
      <PopupBanner />
    </>
  );
}

export default function App() {
  return (
    <SiteProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<StoreLayout><Home /></StoreLayout>} />
            <Route path="/shop" element={<StoreLayout><Shop /></StoreLayout>} />
            <Route path="/categories" element={<StoreLayout><AllCategories /></StoreLayout>} />
            <Route path="/product/:idOrSlug" element={<StoreLayout><ProductPage /></StoreLayout>} />
            <Route path="/cart" element={<StoreLayout><CartPage /></StoreLayout>} />
            <Route path="/checkout" element={<StoreLayout><Checkout /></StoreLayout>} />
            <Route path="/terms" element={<StoreLayout><PolicyPage page="terms" title="Terms & Conditions" layout="toc" /></StoreLayout>} />
            <Route path="/privacy" element={<StoreLayout><PolicyPage page="privacy" title="Privacy Policy" layout="stacked" /></StoreLayout>} />
            <Route path="/returns" element={<StoreLayout><PolicyPage page="returns" title="Returns & Refunds" layout="stacked" /></StoreLayout>} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="settings" element={<ManageSettings />} />
              <Route path="titles" element={<ManageTitles />} />
              <Route path="banners" element={<ManageBanners />} />
              <Route path="categories" element={<ManageCategories />} />
              <Route path="products" element={<ManageProducts />} />
              <Route path="products/:id" element={<ManageProductForm />} />
              <Route path="footer-links" element={<ManageFooterLinks />} />
              <Route path="policies" element={<ManagePolicies />} />
              <Route path="coupons" element={<ManageCoupons />} />
              <Route path="delivery-charges" element={<ManageDeliveryCharges />} />
              <Route path="orders" element={<ManageOrders />} />
              <Route path="incomplete-orders" element={<ManageIncompleteOrders />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </SiteProvider>
  );
}
