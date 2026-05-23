import { Minus, Plus, X } from 'lucide-react';

export default function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className="flex gap-4 py-5 border-b border-border/50">
      <div className="w-20 h-24 bg-muted/40 shrink-0 overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-xl text-muted-foreground/30">
            {item.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h4 className="font-display text-base tracking-tight truncate pr-2">{item.name}</h4>
          <button onClick={() => onRemove(item.product_id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => onUpdateQty(item.product_id, item.quantity - 1)} className="w-7 h-7 border border-border rounded-full flex items-center justify-center hover:border-foreground transition-colors">
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-sm w-4 text-center">{item.quantity}</span>
            <button onClick={() => onUpdateQty(item.product_id, item.quantity + 1)} className="w-7 h-7 border border-border rounded-full flex items-center justify-center hover:border-foreground transition-colors">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="font-mono text-sm">${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}