import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Header from '../components/Header';
import { motion } from 'framer-motion';

// Fallback campaign data from the Wix site (used if CMS query fails/empty)
const FALLBACK_CAMPAIGNS = [
  {
    id: '1', name: 'Feline Spacesuit Engineering',
    description: 'Engineering pressure suits for cats — tackling the unique challenges of paws, tails, and excessive fur in vacuum conditions.',
    image: 'https://static.wixstatic.com/media/4975b6_702f8e8daef444cf93cd0139bd86b7c5~mv2.png/v1/fill/w_800,h_440,al_c,q_85,enc_auto/4975b6_702f8e8daef444cf93cd0139bd86b7c5~mv2.png',
    raised: 20730.87, goal: 40000, donors: 4, currency: '₪',
    amounts: [
      { value: 30, label: 'Pressurized helmet fitting for one cadet' },
      { value: 75, label: 'Reinforced paw-glove set' },
      { value: 200, label: 'Thermal tail sleeve prototype' },
      { value: 500, label: 'Full micro-suit field deployment' },
    ],
  },
  {
    id: '2', name: 'Wormhole Whisker Navigation',
    description: 'Using whisker sensitivity to detect quantum fluctuations near wormhole entry points. Could revolutionize interstellar travel.',
    image: 'https://static.wixstatic.com/media/4975b6_5052983e59244a8fb78af29ae15f95c1~mv2.png/v1/fill/w_800,h_440,al_c,q_85,enc_auto/4975b6_5052983e59244a8fb78af29ae15f95c1~mv2.png',
    raised: 1300, goal: 60000, donors: 7, currency: '₪',
    amounts: [
      { value: 50, label: 'Quantum whisker calibration session' },
      { value: 150, label: 'Gravitational lensing simulation hour' },
      { value: 400, label: 'Sub-space compass prototype board' },
      { value: 1000, label: 'Fund a full exploratory jump test' },
    ],
  },
  {
    id: '3', name: 'Zero-G Litter Box Dynamics',
    description: 'Critical research into waste management in zero-gravity environments. Not glamorous, but absolutely essential.',
    image: 'https://static.wixstatic.com/media/4975b6_91dee57f487146958461f75b1abe13af~mv2.png/v1/fill/w_800,h_440,al_c,q_85,enc_auto/4975b6_91dee57f487146958461f75b1abe13af~mv2.png',
    raised: 0, goal: 25000, donors: 0, currency: '₪',
    amounts: [
      { value: 25, label: 'Buy one bag of anti-grav sand' },
      { value: 50, label: 'Fund one flux-capacitor scoop' },
      { value: 100, label: 'Sponsor a week of centrifuge trials' },
      { value: 250, label: 'Name a test chamber after your cat' },
    ],
  },
  {
    id: '4', name: 'Interstellar Catnip Cultivation',
    description: 'Developing varieties of catnip that can grow in alien soil conditions. Morale depends on it.',
    image: 'https://static.wixstatic.com/media/4975b6_a374d4d182b243b7b43e0355435ec267~mv2.png/v1/fill/w_800,h_440,al_c,q_85,enc_auto/4975b6_a374d4d182b243b7b43e0355435ec267~mv2.png',
    raised: 308.70, goal: 15000, donors: 1, currency: '₪',
    amounts: [
      { value: 15, label: 'One seed pod for the hydroponic bay' },
      { value: 40, label: 'Full-spectrum grow light upgrade' },
      { value: 120, label: 'Genetic sequencing of a strain' },
      { value: 300, label: 'Fund a month of crew field testing' },
    ],
  },
];

function CampaignCard({ campaign }) {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState('');
  const [freq, setFreq] = useState('one-time');

  const pct = campaign.goal > 0 ? Math.min(100, (campaign.raised / campaign.goal) * 100) : 0;

  const handleDonate = () => {
    alert(`Thank you for your interest in supporting ${campaign.name}! Donations are processed through our Wix store.`);
  };

  return (
    <div className="bg-card border border-border overflow-hidden">
      {campaign.image && <img src={campaign.image} alt={campaign.name} className="w-full h-52 object-cover" />}
      <div className="p-6">
        <h2 className="font-display text-2xl tracking-wider text-primary uppercase mb-2">{campaign.name}</h2>
        {campaign.description && <p className="text-muted-foreground text-sm mb-4">{campaign.description}</p>}

        {/* Progress */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span><span className="text-primary font-bold">{campaign.currency}{campaign.raised.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> raised of {campaign.currency}{campaign.goal.toLocaleString()}</span>
            {campaign.donors > 0 && <span className="text-muted-foreground">{campaign.donors} donors</span>}
          </div>
        </div>

        {/* Amounts */}
        <p className="text-xs font-mono text-muted-foreground uppercase mb-2 tracking-widest">Pick an amount</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {campaign.amounts.map(a => (
            <button key={a.value} onClick={() => { setSelected(a.value); setCustom(''); }}
              className={`text-left px-3 py-2 border text-xs transition-colors ${selected === a.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/50'}`}>
              <span className="font-mono font-bold">{campaign.currency}{a.value}</span>
              <br /><span className="text-muted-foreground">{a.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => { setSelected('other'); }}
          className={`w-full py-2 text-xs font-mono border transition-colors mb-4 ${selected === 'other' ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
          OTHER
        </button>
        {selected === 'other' && (
          <input type="number" placeholder="Enter amount..." value={custom} onChange={e => setCustom(e.target.value)}
            className="w-full bg-background border border-border px-3 py-2 text-sm font-mono mb-4 focus:outline-none focus:border-primary" />
        )}

        {/* Frequency */}
        <p className="text-xs font-mono text-muted-foreground uppercase mb-2 tracking-widest">Frequency</p>
        <div className="flex gap-2 mb-6">
          {['one-time', 'monthly', 'yearly'].map(f => (
            <button key={f} onClick={() => setFreq(f)}
              className={`text-xs font-mono px-3 py-1.5 border transition-colors capitalize ${freq === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              {f}
            </button>
          ))}
        </div>

        <button onClick={handleDonate}
          className="w-full py-3 bg-primary text-primary-foreground font-display text-lg tracking-widest uppercase hover:bg-primary/80 transition-colors">
          Donate
        </button>
      </div>
    </div>
  );
}

export default function Research() {
  const [campaigns, setCampaigns] = useState(FALLBACK_CAMPAIGNS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke('getWixCMSData', { collectionId: 'ResearchCampaigns' })
      .then(res => {
        const items = res.data.items || [];
        if (items.length > 0) setCampaigns(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      <Header />
      <div className="pt-28 px-[6vw] md:px-[8vw] pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
          <p className="font-mono text-xs tracking-widest uppercase text-primary mb-2">★ Fund The Science ★</p>
          <h1 className="font-display text-5xl md:text-7xl tracking-widest text-foreground uppercase mb-2">Research Funding</h1>
          <p className="text-muted-foreground">Fund the science that keeps nine lives burning bright across the cosmos</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {campaigns.map((campaign, i) => (
              <motion.div key={campaign.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <CampaignCard campaign={campaign} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}