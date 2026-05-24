import { Minus, Plus, X } from 'lucide-react';

// Wix media references look like
//   wix:image://v1/<file_id>/<filename>#originWidth=...&originHeight=...
// They need to be rewritten to the static media CDN to be renderable.
function resolveLineItemImage(img) {
  if (!img) return '';
  if (typeof img === 'string') {
    if (img.startsWith('http')) return img;
    const m = img.match(/wix:image:\/\/v\d+\/([^/#?]+)/);
    return m ? `https://static.wixstatic.com/media/${m[1]}` : '';
  }
  return img.url || img.src?.url || '';
}

// Extract chosen-option labels from a Wix line item's descriptionLines.
function getOptionLines(item) {
  return (item.descriptionLines || []).map(line => {
    const optName = line.name?.translated || line.name?.original || '';
    const val = line.plainText?.translated
      || line.plainText?.original
      || line.colorInfo?.translated
      || line.colorInfo?.original
      || '';
    if (!val) return null;
    return optName ? `${optName}: ${val}` : val;
  }).filter(Boolean);
}

// item = Wix cart line item
export default function CartItem({ item, onUpdateQty, onRemove, disabled }) {
  const lineId = item._id || item.id;
  const name = item.productName?.translated || item.productName?.original || '';
  const image = resolveLineItemImage(item.image);
  const price = item.price?.formattedAmount || '';
  const fullPriceAmt = parseFloat(item.fullPrice?.amount || item.priceBeforeDiscounts?.amount || 0);
  const priceAmt = parseFloat(item.price?.amount || 0);
  const hasDiscount = fullPriceAmt > 0 && priceAmt > 0 && fullPriceAmt > priceAmt;
  const fullPriceFormatted = item.fullPrice?.formattedAmount || item.priceBeforeDiscounts?.formattedAmount;
  const discountSavings = hasDiscount ? Math.round(((fullPriceAmt - priceAmt) / fullPriceAmt) * 100) : 0;
  const optionLines = getOptionLines(item);

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
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div>
          <div className="flex justify-between items-start">
            <h4 className="font-display text-base tracking-tight truncate pr-2">{name}</h4>
            <button onClick={() => onRemove(lineId)} disabled={disabled} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 disabled:opacity-40">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
          {optionLines.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {optionLines.map((line, i) => (
                <li key={i} className="text-xs text-muted-foreground font-mono">{line}</li>
              ))}
            </ul>
          )}
          {hasDiscount && (
            <p className="text-[10px] font-mono uppercase tracking-widest text-primary mt-1.5">
              Save {discountSavings}%
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => onUpdateQty(lineId, item.quantity - 1)} disabled={disabled} className="w-7 h-7 border border-border rounded-full flex items-center justify-center hover:border-foreground transition-colors disabled:opacity-40">
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-sm w-4 text-center">{item.quantity}</span>
            <button onClick={() => onUpdateQty(lineId, item.quantity + 1)} disabled={disabled} className="w-7 h-7 border border-border rounded-full flex items-center justify-center hover:border-foreground transition-colors disabled:opacity-40">
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            {hasDiscount && fullPriceFormatted && (
              <span className="font-mono text-xs text-muted-foreground line-through">{fullPriceFormatted}</span>
            )}
            <span className="font-mono text-sm">{price}</span>
          </div>
        </div>
      </div>
    </div>
  );
}