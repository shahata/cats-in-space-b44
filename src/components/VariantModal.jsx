import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VariantModal({ product, onAdd, onClose }) {
  const [selections, setSelections] = useState({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const options = product.productOptions || [];
  const optKey = o => o.id || o.name;

  const allSelected = options.every(o => selections[optKey(o)]);

  const getMatchingVariant = () => {
    if (!product.variants?.length) return null;
    return product.variants.find(v =>
      options.every(o => v.choices?.[optKey(o)] === selections[optKey(o)])
    );
  };

  const handleAdd = async () => {
    if (!allSelected) {
      setError('Please select all options.');
      return;
    }
    const variant = getMatchingVariant();
    if (!variant) {
      setError('This combination is unavailable.');
      return;
    }
    if (!variant.stock) {
      setError('This variant is out of stock.');
      return;
    }
    setAdding(true);
    setError('');
    await onAdd(product.wixId || product.id, variant.id);
    setAdding(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 bg-background w-full max-w-md mx-4 md:mx-0 p-8 rounded-t-2xl md:rounded-2xl shadow-2xl"
        >
          <button onClick={onClose} className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="flex gap-4 mb-6">
            {product.image && (
              <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
            )}
            <div>
              <h3 className="font-display text-xl tracking-tight">{product.name}</h3>
              <p className="font-mono text-sm text-muted-foreground mt-0.5">{product.formattedPrice || product.price?.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-5">
            {options.map(option => {
              const okey = optKey(option);
              return (
              <div key={okey}>
                <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2 font-mono">{option.name}</p>
                <div className="flex flex-wrap gap-2">
                  {option.choices.map(choice => {
                    const cid = typeof choice === 'object' ? (choice.id || choice.value) : choice;
                    const val = typeof choice === 'object' ? choice.value : choice;
                    const available = typeof choice === 'object' ? choice.inStock !== false : true;
                    return (
                      <button
                        key={cid}
                        disabled={!available}
                        onClick={() => available && setSelections(s => ({ ...s, [okey]: cid }))}
                        className={`px-4 py-2 text-sm border transition-all relative ${
                          selections[okey] === cid
                            ? 'bg-primary text-primary-foreground border-primary'
                            : available
                              ? 'bg-transparent text-foreground border-border hover:border-foreground'
                              : 'bg-transparent text-muted-foreground border-border opacity-50 cursor-not-allowed line-through'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>

          {error && <p className="text-destructive text-sm mt-4">{error}</p>}

          <button
            onClick={handleAdd}
            disabled={adding}
            className="w-full mt-8 py-4 bg-primary text-primary-foreground text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {adding ? 'Adding…' : 'Add to Bag'}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}