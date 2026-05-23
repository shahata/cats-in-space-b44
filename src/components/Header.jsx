import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronDown, ExternalLink, Package, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Header() {
  const [count, setCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [siteId, setSiteId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) {
        base44.auth.me().then(u => {
          setUser(u);
          base44.functions.invoke('getWixConfig', {})
            .then(res => setSiteId(res.data.siteId || ''))
            .catch(() => {});
        }).catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    const sync = async () => {
      try {
        const cartId = localStorage.getItem('wix_cart_id');
        if (!cartId) { setCount(0); return; }
        const visitorToken = localStorage.getItem('wix_visitor_token');
        const res = await base44.functions.invoke('wixCart', { action: 'get', cartId, visitorToken });
        const items = res.data.cart?.lineItems || [];
        setCount(items.reduce((s, i) => s + (i.quantity || 0), 0));
      } catch { setCount(0); }
    };
    sync();
    window.addEventListener('cart-updated', sync);
    return () => window.removeEventListener('cart-updated', sync);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const manageUrl = siteId
    ? `https://manage.wix.com/dashboard/${siteId}`
    : 'https://manage.wix.com/';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/50' : 'bg-transparent'}`}>
      <div className="flex items-center justify-between px-[6vw] md:px-[8vw] h-16 md:h-20">
        <Link to="/" className="font-display text-xl md:text-2xl tracking-tight text-foreground hover:text-primary transition-colors">
          Folio Ceramics
        </Link>

        <div className="flex items-center gap-5">
          {user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors font-body"
              >
                <span>{user.full_name || user.email}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-background border border-border shadow-lg z-50 py-1">
                  <Link
                    to="/orders"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-body hover:bg-muted transition-colors"
                  >
                    <Package className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    My Orders
                  </Link>

                  {user.role === 'admin' && (
                    <a
                      href={manageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-body hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      Manage Store
                    </a>
                  )}

                  <div className="border-t border-border my-1" />

                  <button
                    onClick={() => base44.auth.logout()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body hover:bg-muted transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="text-xs font-mono tracking-widest uppercase text-foreground/70 hover:text-foreground transition-colors hidden md:block"
            >
              Sign In
            </button>
          )}

          <Link to="/cart" className="relative flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[10px] font-mono min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}