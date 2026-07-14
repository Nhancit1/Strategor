// ─────────────────────────────────────────────────────────────────────────────
// Taxonomie sectorielle à deux niveaux, dérivée de la NACE Rév. 2.
// Niveau 1 : les 12 libellés historiques (INCHANGÉS → rétro-compatibles avec
// `sectors`, les prompts agents et le récapitulatif). Niveau 2 : sous-secteurs
// issus des divisions NACE, adaptés en libellés métier lisibles.
// Le code section NACE est affiché à titre indicatif dans le panneau.
// ─────────────────────────────────────────────────────────────────────────────
export const SECTOR_TAXONOMY = {
  'Industrie': {
    nace: 'C',
    subs: [
      'Métallurgie & produits métalliques',
      'Fabrication de machines & équipements',
      'Chimie, plastiques & caoutchouc',
      'Électronique & équipements électriques',
      'Automobile & matériels de transport',
      'Textile, habillement & cuir',
      'Bois, papier & imprimerie',
      'Meubles & industries diverses',
    ],
  },
  'Bâtiment & Construction': {
    nace: 'F',
    subs: [
      'Construction de bâtiments (gros œuvre)',
      'Travaux publics & génie civil',
      'Menuiserie & fermetures (bois, alu, PVC)',
      'Électricité & plomberie (second œuvre technique)',
      'Finitions (peinture, plâtrerie, revêtements)',
      'Couverture, charpente & étanchéité',
      'Promotion immobilière',
      'Architecture & ingénierie du bâtiment',
    ],
  },
  'Tech / SaaS': {
    nace: 'J',
    subs: [
      'Édition de logiciels / SaaS',
      'Développement & conseil informatique',
      'Hébergement, cloud & infrastructure',
      'Cybersécurité',
      'Données & intelligence artificielle',
      'Télécommunications',
      'Plateformes & marketplaces',
      'Jeux vidéo & médias numériques',
    ],
  },
  'Retail': {
    nace: 'G',
    subs: [
      'Commerce de détail alimentaire',
      'Commerce de détail non alimentaire',
      'E-commerce & vente à distance',
      'Commerce de gros / négoce',
      'Distribution spécialisée',
      'Franchise & réseaux de points de vente',
      'Commerce & réparation automobile',
    ],
  },
  'Services B2B': {
    nace: 'M–N',
    subs: [
      'Conseil en management & stratégie',
      'Comptabilité, juridique & audit',
      'Marketing, communication & publicité',
      'Ingénierie & bureaux d\u2019études',
      'Intérim & recrutement',
      'Nettoyage, sécurité & facility management',
      'Location & leasing professionnel',
      'Logistique pour compte de tiers',
    ],
  },
  'Services B2C': {
    nace: 'I–S',
    subs: [
      'Restauration & cafés',
      'Hôtellerie & hébergement',
      'Coiffure, beauté & bien-être',
      'Sport, loisirs & culture',
      'Services à la personne & domicile',
      'Réparation & entretien',
      'Voyages & tourisme',
    ],
  },
  'Agroalimentaire': {
    nace: 'A / C10-11',
    subs: [
      'Production agricole & élevage',
      'Transformation alimentaire',
      'Boissons',
      'Boulangerie, pâtisserie & produits frais',
      'Viticulture & spiritueux',
      'Pêche & aquaculture',
      'Négoce agroalimentaire',
    ],
  },
  'Santé': {
    nace: 'Q / C21',
    subs: [
      'Établissements de soins & cliniques',
      'Cabinets médicaux & paramédicaux',
      'Pharmacie & parapharmacie',
      'Dispositifs médicaux',
      'Biotech & pharma',
      'E-santé & télémédecine',
      'Aide sociale & médico-social',
    ],
  },
  'Énergie': {
    nace: 'D / B / E',
    subs: [
      'Production d\u2019électricité & renouvelables',
      'Distribution d\u2019énergie & réseaux',
      'Pétrole, gaz & carburants',
      'Efficacité énergétique & services associés',
      'Eau, assainissement & déchets',
      'Nucléaire',
    ],
  },
  'Transport / Logistique': {
    nace: 'H',
    subs: [
      'Transport routier de marchandises',
      'Transport de voyageurs',
      'Logistique & entreposage',
      'Messagerie & livraison du dernier kilomètre',
      'Transport maritime & fluvial',
      'Transport aérien',
      'Ferroviaire',
    ],
  },
  'Finance / Assurance': {
    nace: 'K',
    subs: [
      'Banque & crédit',
      'Assurance & mutuelles',
      'Gestion d\u2019actifs & investissement',
      'Fintech & paiements',
      'Courtage & intermédiation',
      'Immobilier financier & foncières',
    ],
  },
  'Éducation & Formation': {
    nace: 'P',
    subs: [
      'Enseignement supérieur & business schools',
      'Écoles privées (maternelle, primaire, secondaire)',
      'Formation professionnelle continue',
      'EdTech & apprentissage en ligne',
      'Formation certifiante & langues',
      'Soutien scolaire & cours particuliers',
      'Écoles spécialisées (art, design, code…)',
    ],
  },
  'Autre': { nace: null, subs: [] },
};

export const SECTORS_L1 = Object.keys(SECTOR_TAXONOMY);

// Format canonique d'un sous-secteur persisté : "Secteur — Sous-secteur".
// Préfixer par le niveau 1 lève toute ambiguïté côté agents et permet de
// retirer proprement les sous-secteurs quand le secteur parent est désélectionné.
export const subSectorKey = (l1, sub) => `${l1} — ${sub}`;
export const belongsTo = (key, l1) => key.startsWith(`${l1} — `);
