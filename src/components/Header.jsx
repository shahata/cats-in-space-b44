import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export default function Header() {
  const [count, setCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('atelier_cart')) || [];
        setCount(cart.reduce((s, i) => s + i.quantity, 0));
      } catch { setCount(0); }
    };
    sync();
    window.addEventListener('cart-updated', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('cart-updated', sync); window.removeEventListener('storage', sync); };
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
          Atelier Essence
        </Link>
        <Link to="/cart" className="relative group flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[10px] font-mono w-4.5 h-4.5 flex items-center justify-center rounded-full min-w-[18px] h-[18px]">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}