import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import TopBar from './TopBar';
import RotatingTitle from './RotatingTitle';

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const { settings } = useSite();
  const { itemCount, setIsOpen } = useCart();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [categories, setCategories] = useState([]);
  const blurTimeout = useRef(null);

  useEffect(() => {
    supabase.from('categories').select('*').eq('active', true).order('position').then(({ data }) => setCategories(data || []));
  }, []);

  function onSearch(e) {
    e.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(query)}`);
    setMenuOpen(false);
    setSearchActive(false);
  }

  function go(path) {
    setMenuOpen(false);
    navigate(path);
  }

  function onSearchFocus() {
    clearTimeout(blurTimeout.current);
    setSearchActive(true);
  }

  function onSearchBlur() {
    // Small delay so a tap on the search/submit button still registers
    // before the bar collapses back down.
    blurTimeout.current = setTimeout(() => setSearchActive(false), 150);
  }

  return (
    <>
      <TopBar />
      <div className={`navbar ${searchActive ? 'search-active' : ''}`}>
        <div className="container">
          <a href="/" className="brand-link" onClick={(e) => { e.preventDefault(); go('/'); }}>
            {settings.header_logo_url
              ? <img className="brand-logo" src={settings.header_logo_url} alt="" />
              : <span className="brand-logo-fallback">🛍️</span>}
            <span className="brand">{settings.logo_text_1}<br />{settings.logo_text_2}</span>
          </a>
          <form className="searchbar" onSubmit={onSearch}>
            <input
              type="text"
              placeholder="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
            />
            <button type="submit" className="btn btn-orange" aria-label="Search">
              <SearchIcon /><span className="label" style={{ marginLeft: 6 }}>Search</span>
            </button>
          </form>
          <nav className="nav-links">
            <a className="desktop-only-link" onClick={() => go('/shop')}><span className="label">Shop</span></a>
            <a className="cart-link" onClick={() => setIsOpen(true)}>
              🛒 <span className="label">My Cart</span>
              {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
            </a>
            <button className="admin-btn desktop-only-link" onClick={() => go('/admin/login')}>Admin Panel</button>
            <button className="hamburger-btn" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </nav>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            <a onClick={() => go('/')}>🏠 Home</a>
            <a onClick={() => go('/shop')}>🛍️ Shop</a>
            <a onClick={() => go('/cart')}>🛒 My Cart {itemCount > 0 && `(${itemCount})`}</a>
            <a onClick={() => go('/admin/login')}>🔐 Admin Panel</a>

            <h6>Categories</h6>
            <div className="mobile-menu-categories">
              {categories.map((c) => (
                <a key={c.id} onClick={() => go(`/shop?category=${c.id}`)}>{c.name}</a>
              ))}
              {categories.length === 0 && <span style={{ color: '#999', fontSize: 13, padding: '6px 0' }}>No categories yet</span>}
            </div>
          </div>
        )}
      </div>
      <RotatingTitle />
    </>
  );
}
