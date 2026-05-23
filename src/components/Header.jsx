import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag, ChevronDown, ExternalLink, Package, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Header() {
  const [count, setCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [siteId, setSiteId] = useState(null);
  const menuRef = useRef(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const exploreRef = useRef(null);
  const facilitiesRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) {
        base44.auth.me().then(u => setUser(u)).catch(() => {});
        base44.functions.invoke('getWixConfig', {}).then(res => setSiteId(res.data.siteId)).catch(() => {});
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
      if (exploreRef.current && !exploreRef.current.contains(e.target)) setOpenDropdown(null);
      if (facilitiesRef.current && !facilitiesRef.current.contains(e.target)) setOpenDropdown(null);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const manageUrl = siteId ? `https://manage.wix.com/dashboard/${siteId}` : '#';

  const navLinks = [
    { to: '/explore', label: 'Explore', dropdownType: 'explore' },
    { to: '/facilities', label: 'Facilities', dropdownType: 'facilities' },
    { to: '/blog', label: "Ship's Log" },
    { to: '/research', label: 'Research' },
    { to: '/plans', label: 'Plans' },
  ];

  const exploreLinks = [
    { to: '/planets', label: '🌍 Planets' },
    { to: '/crew', label: '🧑‍🚀 Crew' },
    { to: '/missions', label: '🚀 Missions' },
  ];

  const facilitiesLinks = [
    { to: '/', label: '🛒 Shop' },
    { to: '/medical-bay', label: '🏥 Medical Bay' },
    { to: '/cinema', label: '🎬 Cinema' },
    { to: '/restaurant', label: '🍽️ Restaurant' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/50' : 'bg-transparent'}`}>
      <div className="flex items-center justify-between px-[6vw] md:px-[8vw] h-16 md:h-20">
        <Link to="/" className="font-display text-2xl md:text-3xl tracking-widest text-primary hover:text-primary/80 transition-colors uppercase">
          Cats in Space
        </Link>

        {/* Main nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map(link => (
            link.dropdownType ? (
              <div key={link.to} className="relative" ref={link.dropdownType === 'explore' ? exploreRef : facilitiesRef}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === link.dropdownType ? null : link.dropdownType)}
                  className="flex items-center gap-1 text-xs font-mono tracking-widest uppercase text-foreground/70 hover:text-primary transition-colors">
                  {link.label}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === link.dropdownType ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === link.dropdownType && (
                  <div className="absolute top-full left-0 mt-2 w-44 bg-background border border-border shadow-lg z-50 py-1">
                    {link.dropdownType === 'explore' && (
                      <>
                        <Link to={link.to} onClick={() => setOpenDropdown(null)}
                          className="block px-4 py-2 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                          🚢 The Ship
                        </Link>
                        {exploreLinks.map(el => (
                          <Link key={el.to} to={el.to} onClick={() => setOpenDropdown(null)}
                            className="block px-4 py-2 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                            {el.label}
                          </Link>
                        ))}
                      </>
                    )}
                    {link.dropdownType === 'facilities' && (
                      facilitiesLinks.map(fl => (
                        <Link key={fl.to} to={fl.to} onClick={() => setOpenDropdown(null)}
                          className="block px-4 py-2 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                          {fl.label}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={link.to} to={link.to}
                className={({ isActive }) =>
                  `text-xs font-mono tracking-widest uppercase transition-colors ${
                    isActive ? 'text-primary' : 'text-foreground/70 hover:text-primary'
                  }`
                }>
                {link.label}
              </NavLink>
            )
          ))}
        </nav>

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

                  {user.role === 'admin' && siteId && (
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