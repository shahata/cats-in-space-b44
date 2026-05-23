import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Check } from 'lucide-react';

export default function GiftCardWidget({ giftCard, onAddToCart, onBuyNow }) {
  const [selectedAmount, setSelectedAmount] = useState(giftCard.amounts?.[0] || 50);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const amount = isCustom ? parseFloat(customAmount) || 0 : selectedAmount;
  const symbol = giftCard.currency === 'ILS' ? '₪' : (giftCard.currency === 'USD' ? '$' : giftCard.currency);
  const selectedVariant = !isCustom && giftCard.variants?.find(v => v.value === selectedAmount);
  const displayImage = selectedVariant?.image || giftCard.image;

  const handleAdd = async () => {
    if (!amount || !recipientEmail) return;
    setAdding(true);
    try {
      await onAddToCart?.({
        amount,
        currency: giftCard.currency,
        recipientEmail,
        recipientName,
        message,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {}
    setAdding(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border p-6 md:p-8 mb-12"
    >
      <div className="grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl tracking-widest text-primary uppercase">{giftCard.name}</h2>
          </div>
          {displayImage ? (
            <img src={displayImage} alt="Gift Card" className="w-full aspect-video object-cover rounded mb-4 transition-opacity" />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-primary/30 to-primary/10 rounded mb-4 flex items-center justify-center">
              <Gift className="w-16 h-16 text-primary/60" />
            </div>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed">{giftCard.description}</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-3 block">
              Select Amount
            </label>
            <div className="grid grid-cols-3 gap-2">
              {giftCard.amounts?.map(amt => (
                <button
                  key={amt}
                  onClick={() => { setIsCustom(false); setSelectedAmount(amt); }}
                  className={`py-2.5 text-sm font-mono border transition-all ${
                    !isCustom && selectedAmount === amt
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {symbol}{amt.toFixed(2)}
                </button>
              ))}
              {giftCard.allowCustom && (
                <button
                  onClick={() => setIsCustom(true)}
                  className={`py-2.5 text-sm font-mono border transition-all ${
                    isCustom
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  Custom
                </button>
              )}
            </div>
            {isCustom && (
              <input
                type="number"
                min="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full mt-2 bg-background border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
            )}
          </div>

          <div>
            <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-2 block">
              Recipient Email *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-2 block">
              Recipient Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Captain Whiskers"
              className="w-full bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-mono tracking-widest uppercase text-muted-foreground mb-2 block">
              Personal Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="To the moon and back..."
              rows={3}
              className="w-full bg-background border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={!amount || !recipientEmail || adding}
              className="flex-1 bg-transparent border border-primary text-primary py-3 font-mono text-xs tracking-widest uppercase hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {added ? <><Check className="w-4 h-4" /> Added</> : adding ? 'Adding...' : 'Add to Cart'}
            </button>
            <button
              onClick={() => onBuyNow?.({ amount, currency: giftCard.currency, recipientEmail, recipientName, message })}
              disabled={!amount || !recipientEmail}
              className="flex-1 bg-primary text-primary-foreground py-3 font-mono text-xs tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}