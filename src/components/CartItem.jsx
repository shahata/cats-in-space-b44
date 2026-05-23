import { Minus, Plus, X } from 'lucide-react';

// item = Wix cart line item
export default function CartItem({ item, onUpdateQty, onRemove, disabled }) {
  const name = item.productName?.translated || item.productName?.original || '';
  const image = item.image?.url || '';
  const price = item.price?.formattedAmount || '';

  return (
    <div className="flex gap-4 py-5 border-b border-border/50">
      <div className="w-20 h-24 bg-muted/40 shrink-0 overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-display text-xl text-muted-foreground/30">
            {name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h4 className="font-display text-base tracking-tight truncate pr-2">{name}</h4>
          <button onClick={() => onRemove(item.id)} disabled={disabled} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-40">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} disabled={disabled} className="w-7 h-7 border border-border rounded-full flex items-center justify-center hover:border-foreground transition-colors disabled:opacity-40">
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-sm w-4 text-center">{item.quantity}</span>
            <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} disabled={disabled} className="w-7 h-7 border border-border rounded-full flex items-center justify-center hover:border-foreground transition-colors disabled:opacity-40">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="font-mono text-sm">{price}</span>
        </div>
      </div>
    </div>
  );
}