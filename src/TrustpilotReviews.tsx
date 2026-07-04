import { Star, CheckCircle, BadgeCheck } from 'lucide-react';

type Review = {
  name: string;
  initials: string;
  location: string;
  date: string;
  rating: number;
  title: string;
  text: string;
  reviews: number;
};

const REVIEWS: Review[] = [
  {
    name: 'Marc Dubois',
    initials: 'MD',
    location: 'Lausanne',
    date: '12 juin 2026',
    rating: 5,
    title: 'CarPlay activé en 30 minutes',
    text: "Activation de CarPlay sans fil sur ma Golf, tout s'est fait pendant que j'attendais. Service impeccable et prix très correct. Je recommande à 100%.",
    reviews: 3,
  },
  {
    name: 'Sophie Leroy',
    initials: 'SL',
    location: 'Genève',
    date: '3 juin 2026',
    rating: 5,
    title: 'Enfin Android Auto sur mon Audi',
    text: "App-Connect était bloqué d'usine sur mon A4. En quelques minutes tout fonctionnait. Communication claire et travail soigné, un grand merci.",
    reviews: 1,
  },
  {
    name: 'Julien Rochat',
    initials: 'JR',
    location: 'Fribourg',
    date: '28 mai 2026',
    rating: 5,
    title: 'Boîtier sans fil au top',
    text: "Commandé un boîtier CarPlay sans fil sur la boutique, livré rapidement en Suisse. Plug & play, il se connecte tout seul. Qualité au rendez-vous.",
    reviews: 7,
  },
  {
    name: 'Elena Moretti',
    initials: 'EM',
    location: 'Lugano',
    date: '19 mai 2026',
    rating: 5,
    title: 'Retrofit BMW parfait',
    text: "Intégration native CarPlay sur mon écran d'origine, on dirait que c'était monté en usine. Professionnel et de très bon conseil. Je reviendrai.",
    reviews: 2,
  },
  {
    name: 'Thomas Bianchi',
    initials: 'TB',
    location: 'Neuchâtel',
    date: '9 mai 2026',
    rating: 5,
    title: 'Rapide et honnête',
    text: "Rendez-vous facile à prendre, diagnostic offert et tarif annoncé respecté. Rare de trouver un service aussi transparent aujourd'hui.",
    reviews: 4,
  },
  {
    name: 'Nadia Keller',
    initials: 'NK',
    location: 'Berne',
    date: '2 mai 2026',
    rating: 5,
    title: 'Commande en gros nickel',
    text: "En tant que garage, j'ai commandé plusieurs boîtiers au tarif de gros. Prix dégressif appliqué automatiquement et suivi parfait. Partenaire fiable.",
    reviews: 11,
  },
];

const RATING = 4.9;
const TOTAL = 1247;

function TrustStars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`${box} flex items-center justify-center rounded-[3px]`}
          style={{ backgroundColor: i < rating ? '#00b67a' : '#dcdce6' }}
        >
          <Star className={`${icon} text-white`} fill="white" strokeWidth={0} />
        </span>
      ))}
    </div>
  );
}

function TrustpilotLogo() {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
      <Star className="w-5 h-5" fill="#00b67a" strokeWidth={0} />
      Trustpilot
    </span>
  );
}

export default function TrustpilotReviews() {
  return (
    <section className="py-24 md:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="section-label">
            <Star className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
            Avis clients
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Ils nous font confiance
          </h2>

          <div className="inline-flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-900">Excellent</span>
              <TrustStars rating={5} />
            </div>
            <p className="text-slate-600 text-sm">
              Note de <span className="font-bold text-slate-900">{RATING}/5</span> basée sur{' '}
              <span className="font-bold text-slate-900">{TOTAL.toLocaleString('fr-CH')}</span>{' '}
              avis vérifiés &middot; <TrustpilotLogo />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {REVIEWS.map((r) => (
            <article
              key={r.name}
              className="flex flex-col rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <TrustStars rating={r.rating} size="sm" />
                <span className="text-xs text-slate-400">{r.date}</span>
              </div>

              <h3 className="font-bold text-slate-900 mb-2">{r.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed flex-1">{r.text}</p>

              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-slate-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
                  {r.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 text-sm truncate">
                      {r.name}
                    </span>
                    <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#00b67a' }} />
                  </div>
                  <span className="text-xs text-slate-500">
                    {r.location} &middot; {r.reviews} avis
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: '#00b67a' }}>
                <CheckCircle className="w-3.5 h-3.5" />
                Profil vérifié &middot; Expérience authentique
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
