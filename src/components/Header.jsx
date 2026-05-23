import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Header() {
  const [count, setCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const sync = async () => {
      try {
        const cartId = localStorage.getItem('wix_cart_id');
        if (!cartId) { setCount(0); return; }
        const visitorToken = localStorage.getItem('wix_visitor_token');
        const { base44 } = await import('@/api/base44Client');
        const res = await base44.functions.invoke('wixCart', { action: 'get', cartId, visitorToken });
        const items = res.data.cart?.lineItems || [];
        setCount(items.reduce((s, i) => s + (i.quantity || 0), 0));
      } catch { setCount(0); }
    };
    sync();
    window.addEventListener('cart-updated', sync);
    return () => { window.removeEventListener('cart-updated', sync); };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/50' : 'bg-transparent'}`}>
      <div className="flex items-center justify-between px-[6vw] md:px-[8vw] h-16 md:h-20">
        <Link to="/" className="font-display text-xl md:text-2xl tracking-tight text-foreground hover:text-primary transition-colors">
          Folio Ceramics
        </Link>
        <div className="flex items-center gap-5">
        {user ? (
          <span className="text-sm text-foreground/70 font-body hidden md:block">{user.full_name || user.email}</span>
        ) : (
          <button onClick={() => base44.auth.redirectToLogin()} className="text-xs font-mono tracking-widest uppercase text-foreground/70 hover:text-foreground transition-colors hidden md:block">Sign In</button>
        )}
        <Link to="/cart" className="relative group flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[10px] font-mono w-4.5 h-4.5 flex items-center justify-center rounded-full min-w-[18px] h-[18px]">
              {count}
            </span>
          )}
        </Link>
        </div>
      </div>
    </header>
  );
}