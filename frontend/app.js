/**
 * App'lika — Carnet de Santé Animal
 * Application web : gestion du profil animal, vaccins, déparasitage, photos, alertes.
 * Données persistées dans localStorage.
 */

(function () {
  'use strict';

  // ——— SVG Icon System (Pawly / Feather style) ———————————————
  var _ic = function (d, s) { s = s || 20; return '<svg class="icon" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  var ICO = {
    paw:       _ic('<path d="M12 21c-1.5 0-3-.5-4-1.5C6 18 5.5 16 6 14c.5-2 2-4 4-5s4-1 5.5 0 2.5 3 2.5 5-.5 4-2 5.5S13.5 21 12 21z"/><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>'),
    vaccine:   _ic('<path d="M18 2l4 4"/><path d="M17.4 6.6l-3.4-3.4"/><path d="M20.6 3.4L14 10l-4-4-6 6 8 8 6-6-4-4 6.6-6.6z"/><path d="M2 22l4-4"/>'),
    pill:      _ic('<path d="M10.5 1.5l-8 8a4.95 4.95 0 007 7l8-8a4.95 4.95 0 00-7-7z"/><path d="M8.5 8.5l7 7"/>'),
    hospital:  _ic('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/>'),
    flask:     _ic('<path d="M10 2v7.527a2 2 0 01-.211.896L4.72 20.18A1 1 0 005.596 22h12.808a1 1 0 00.877-1.82l-5.07-9.757A2 2 0 0114 9.527V2"/><path d="M8.5 2h7"/>'),
    edit:      _ic('<path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>'),
    trash:     _ic('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>'),
    check:     _ic('<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
    x:         _ic('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'),
    share:     _ic('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>'),
    clipboard: _ic('<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>'),
    fileText:  _ic('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
    mapPin:    _ic('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>'),
    phone:     _ic('<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>'),
    globe:     _ic('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/>'),
    bell:      _ic('<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>'),
    star:      _ic('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    starOff:   _ic('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none"/>'),
    sparkle:   _ic('<path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/>'),
    zap:       _ic('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    eye:       _ic('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
    trophy:    _ic('<path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/>'),
    search:    _ic('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
    calendar:  _ic('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    clock:     _ic('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    warning:   _ic('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    camera:    _ic('<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>'),
    droplet:   _ic('<path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>'),
    thermom:   _ic('<path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>'),
    activity:  _ic('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
    utensils:  _ic('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>'),
    scale:     _ic('<path d="M16 3L8 3"/><path d="M12 3v18"/><path d="M19 7l-3.5 9h-1L19 7z"/><path d="M5 7l3.5 9h1L5 7z"/><circle cx="12" cy="21" r="1"/>'),
    stethoscope: _ic('<path d="M4.8 2.655A.5.5 0 005 3v2a5 5 0 005 5 5 5 0 005-5V3a.5.5 0 01.5-.5"/><path d="M2 4h4"/><path d="M18 4h4"/><path d="M12 10v8a4 4 0 004 4h0a4 4 0 004-4v-3"/><circle cx="20" cy="15" r="2"/>'),
    user:      _ic('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4-4v2"/><circle cx="12" cy="7" r="4"/>'),
    dog:       _ic('<path d="M10 5.172C10 3.782 8.884 2.5 7.5 2.5c-1.384 0-2.5 1.282-2.5 2.672 0 1.39-.392 3.328-1.5 4.828h17c-1.108-1.5-1.5-3.438-1.5-4.828 0-1.39-1.116-2.672-2.5-2.672S14 3.782 14 5.172"/><path d="M2 10v2a5 5 0 005 5 5 5 0 005-5v0a5 5 0 005 5 5 5 0 005-5v-2"/><path d="M7 17v5"/><path d="M17 17v5"/>'),
    cat:       _ic('<path d="M12 5c-2.8-2-7 0-7 4v8c0 2 1 4 3 4h8c2 0 3-2 3-4V9c0-4-4.2-6-7-4"/><path d="M5 9L2 4"/><path d="M19 9l3-5"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>'),
    cake:      _ic('<path d="M20 21v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>'),
    print:     _ic('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
    download:  _ic('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
    qr:        _ic('<rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4" rx="0.5"/><path d="M22 14h-4v4"/><path d="M22 22h-8v-4"/>'),
    plus:      _ic('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
    heart:     _ic('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>'),
    info:      _ic('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    lightbulb: _ic('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/>')
  };
  function ico(name, size) { return ICO[name] ? (size ? ICO[name].replace(/width="\d+"/, 'width="' + size + '"').replace(/height="\d+"/, 'height="' + size + '"') : ICO[name]) : ''; }

  // ——— i18n ———————————————————————————————————————————————————
  var locales = {};
  locales.fr = {
    appName: 'App\'lika',
    home: 'Mes animaux',
    profile: 'Profil',
    vaccines: 'Vaccins',
    deworming: 'Déparasitage',
    photos: 'Photos',
    alerts: 'Alertes',
    history: 'Historique',
    consultations: 'Consultations',
    journal: 'Journal',
    medications: 'Médicaments',
    calendar: 'Calendrier',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    search: 'Recherche',
    noData: 'Aucune donnée',
    overdue: 'En retard',
    soon: 'Bientôt',
    upToDate: 'À jour',
    today: "Aujourd'hui",
    daysAgo: 'il y a {0} jour(s)',
    daysFromNow: 'dans {0} jour(s)',
    weeksFromNow: 'dans {0} semaine(s)',
    monthsFromNow: 'dans {0} mois',
    birthday: 'Joyeux anniversaire {0} !',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ?',
    lastAnimal: 'Impossible de supprimer le dernier animal.',
    welcome: 'Bienvenue sur App\'lika !',
    onboardingDesc: 'App\'lika est votre carnet de santé animal numérique.',
    printTitle: 'Carnet de santé — {0}',
    shareTitle: 'Carnet de santé de {0}',
    noVaccines: 'Aucun vaccin enregistré pour {0}',
    noDewormings: 'Aucun déparasitage enregistré pour {0}',
    noPhotos: 'Aucune photo enregistrée pour {0}',
    noConsultations: 'Aucune consultation enregistrée pour {0}',
    noNotes: 'Aucune note enregistrée pour {0}',
    noMedications: 'Aucun médicament enregistré pour {0}',
    profileComplete: '{0}% complété',
    completeFiche: 'Complétez votre fiche !'
  };

  var currentLocale = 'fr';

  function t(key) {
    var str = (locales[currentLocale] && locales[currentLocale][key]) || key;
    for (var i = 1; i < arguments.length; i++) {
      str = str.replace('{' + (i - 1) + '}', arguments[i]);
    }
    return str;
  }

  // ——— Constants ——————————————————————————————————————————————
  var STORAGE_KEY = 'vetbook_data';
  var THEME_KEY = 'vetbook_theme';
  var NOTIF_CHECK_KEY = 'vetbook_notif_last_check';
  var ONBOARDING_KEY = 'vetbook_onboarding_done';
  var MONTHLY_SUMMARY_SEEN_KEY = 'vetbook_monthly_summary_seen';
  var DOG_EVENTS_NOTIF_KEY = 'vetbook_dog_events_notif_last_month';
  var DOG_EVENTS_REMINDER_PREF_KEY = 'vetbook_dog_events_reminder_enabled';
  var ROUTE_KEY = 'vetbook_last_route';

  var DEFAULT_ANIMAL = {
    id: 1,
    animal: {
      name: '',
      species: 'Canine',
      race: '',
      sex: 'Mâle',
      dob: '',
      weight: null,
      weightHistory: [],
      height: null,
      heightHistory: [],
      color: '',
      chip: '',
      sterilise: 'Non',
      notes: '',
      avatar: null,
      themeColor: ''
    },
    owner: {
      name: '',
      phone: '',
      email: '',
      clinic: '',
      address: ''
    },
    photos: [],
    vaccines: [],
    dewormings: [],
    consultations: [],
    medications: [],
    notes: [],
    hygiene: [],
    heatCycles: [],
    activities: [],
    matings: [],
    nutrition: { meals: [], dailyPlan: { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' } },
    pedigree: { registry: 'Non inscrit', registryNumber: '', chipNumber: '', healthNotes: '', sire: { name: '', registry: '' }, dam: { name: '', registry: '' }, grandparents: { paternalGrandsire: '', paternalGranddam: '', maternalGrandsire: '', maternalGranddam: '', paternalGrandsireRegistry: '', paternalGranddamRegistry: '', maternalGrandsireRegistry: '', maternalGranddamRegistry: '' } },
    notifications: {
      vaccineReminder: true,
      dewormingReminder: true,
      hygieneReminder: true,
      birthdayReminder: true,
      medicationReminder: true,
      matingReminder: true,
      monthlySummary: false
    }
  };

  var VET_DIRECTORY_KEY = 'vetbook_vet_directory';
  var COMMUNITY_KEY = 'vetbook_community';

  // ——— Community: default events & tips ———
  var DEFAULT_DOG_EVENTS = [
    { id: 1, title: 'Salon International de l\'Agriculture', month: 2, day: 22, description: 'Concours canins et présentation de races au SIA, Paris.', recurring: true },
    { id: 2, title: 'Exposition Canine de Paris', month: 3, day: 8, description: 'Exposition internationale organisée par la SCC.', recurring: true },
    { id: 3, title: 'Journée mondiale du chien de sauvetage', month: 4, day: 28, description: 'Célébration des chiens de recherche et sauvetage.', recurring: true },
    { id: 4, title: 'Journée mondiale des animaux de compagnie', month: 4, day: 11, description: 'Journée dédiée à nos compagnons.', recurring: true },
    { id: 5, title: 'Fête de la Nature', month: 5, day: 22, description: 'Sorties canines en pleine nature dans toute la France.', recurring: true },
    { id: 6, title: 'Game Fair', month: 6, day: 14, description: 'Grand rassemblement autour de la chasse et des chiens de travail.', recurring: true },
    { id: 7, title: 'Journée mondiale du chien', month: 8, day: 26, description: 'La journée internationale dédiée à nos meilleurs amis !', recurring: true },
    { id: 8, title: 'Septembre : mois de l\'adoption', month: 9, day: 1, description: 'Campagnes d\'adoption dans les refuges partout en France.', recurring: true },
    { id: 9, title: 'Journée mondiale des animaux', month: 10, day: 4, description: 'Sensibilisation au bien-être animal dans le monde.', recurring: true },
    { id: 10, title: 'Exposition Canine d\'Automne', month: 10, day: 19, description: 'Exposition nationale d\'automne, Paris-Villepinte.', recurring: true },
    { id: 11, title: 'Semaine Vétérinaire', month: 11, day: 18, description: 'Semaine de sensibilisation à la santé animale.', recurring: true },
    { id: 12, title: 'Journée du bénévolat animalier', month: 12, day: 5, description: 'Bénévolat dans les refuges et associations.', recurring: true },
    { id: 13, title: 'Noël des animaux', month: 12, day: 24, description: 'Collectes et dons pour les animaux des refuges.', recurring: true }
  ];

  var DEFAULT_TIPS = [
    { id: 1, title: 'Vérifiez les gencives régulièrement', content: 'Des gencives roses et humides sont signe de bonne santé. Des gencives pâles, bleues ou jaunes nécessitent une visite vétérinaire.', category: 'sante', author: 'App\'lika' },
    { id: 2, title: 'Rappels de vaccins annuels', content: 'N\'oubliez pas les rappels annuels (DHPPi, Leptospirose, Rage). Consultez votre vétérinaire pour le protocole adapté.', category: 'sante', author: 'App\'lika' },
    { id: 3, title: 'Évitez les aliments toxiques', content: 'Chocolat, raisins, oignons, ail, xylitol et noix de macadamia sont toxiques pour les chiens. Gardez-les hors de portée.', category: 'alimentation', author: 'App\'lika' },
    { id: 4, title: 'Transition alimentaire progressive', content: 'Changez la nourriture sur 7 à 10 jours en mélangeant progressivement l\'ancien et le nouveau aliment.', category: 'alimentation', author: 'App\'lika' },
    { id: 5, title: 'Eau fraîche toujours disponible', content: 'Un chien doit boire environ 50-70 ml d\'eau par kg de poids par jour. Renouvelez l\'eau régulièrement.', category: 'alimentation', author: 'App\'lika' },
    { id: 6, title: 'Socialisation avant 4 mois', content: 'La période critique de socialisation est entre 3 et 14 semaines. Exposez votre chiot à différentes personnes, animaux et environnements.', category: 'education', author: 'App\'lika' },
    { id: 7, title: 'Renforcement positif', content: 'Récompensez les bons comportements plutôt que de punir les mauvais. Friandises, caresses et jeu sont vos meilleurs outils.', category: 'education', author: 'App\'lika' },
    { id: 8, title: 'Brossage dentaire 2-3 fois/semaine', content: 'Le tartre s\'accumule vite. Utilisez un dentifrice spécial chien (jamais de dentifrice humain) et une brosse adaptée.', category: 'hygiene', author: 'App\'lika' },
    { id: 9, title: 'Coupe des griffes régulière', content: 'Coupez les griffes toutes les 2-4 semaines. Si vous entendez les griffes cliquer sur le sol, elles sont trop longues.', category: 'hygiene', author: 'App\'lika' },
    { id: 10, title: 'Nettoyage des oreilles', content: 'Nettoyez les oreilles toutes les semaines, surtout pour les races à oreilles tombantes. Utilisez un produit auriculaire vétérinaire.', category: 'hygiene', author: 'App\'lika' },
    { id: 11, title: 'Signes de stress à surveiller', content: 'Bâillements fréquents, léchage des babines, queue entre les pattes, oreilles plaquées : votre chien peut être stressé.', category: 'comportement', author: 'App\'lika' },
    { id: 12, title: 'Exercice quotidien adapté', content: 'Un chien adulte a besoin de 30 min à 2h d\'exercice par jour selon sa race. Variez les activités : marche, jeu, nage.', category: 'comportement', author: 'App\'lika' },
    { id: 13, title: 'Protection anti-parasitaire toute l\'année', content: 'Les puces et tiques sont actives même en hiver. Maintenez un traitement antiparasitaire régulier toute l\'année.', category: 'sante', author: 'App\'lika' },
    { id: 14, title: 'Attention au coup de chaleur', content: 'Ne laissez jamais un chien dans une voiture fermée. Signes : halètement excessif, bave, titubation. Refroidissez progressivement.', category: 'sante', author: 'App\'lika' },
    { id: 15, title: 'Enrichissement mental', content: 'Jouets distributeurs, jeux de flair, tricks : un chien mentalement stimulé est un chien équilibré et heureux.', category: 'comportement', author: 'App\'lika' }
  ];

  // ——— LOF/LOMAD validation patterns ———
  var LOF_PATTERN = /^\d{1,3}\s?\d{3}\/\d{4,5}$/;
  var LOMAD_PATTERN = /^\d{6,15}$/;

  // Vaccine suggestions by species
  var VACCINE_DB = {
    Canine: [
      'Nobivac DHPPi', 'Nobivac Rabies', 'Nobivac L4', 'Nobivac KC',
      'Eurican DHPPi2-LR', 'Eurican DHPPi2-L', 'Eurican Herpes',
      'Canigen DHPPi/L', 'Canigen R', 'Vanguard Plus 5',
      'Rabisin', 'Versican Plus DHPPi/L4R'
    ],
    'Féline': [
      'Purevax RCPCh', 'Purevax RCP', 'Purevax FeLV',
      'Nobivac Tricat Trio', 'Nobivac Rabies',
      'Felocell CVR', 'Leucofeligen FeLV/RCP',
      'Rabisin', 'Versifel CVR'
    ],
    Autre: []
  };

  // Curated breed reference (adult weight range in kg) for weight guidance.
  // Approximate values based on FCI/SCC breed standards — informational only,
  // not a substitute for veterinary advice.
  var BREED_DB = {
    Canine: [
      { name: 'Labrador Retriever', weightMin: 25, weightMax: 36 },
      { name: 'Golden Retriever', weightMin: 25, weightMax: 34 },
      { name: 'Berger Allemand', weightMin: 22, weightMax: 40 },
      { name: 'Berger Australien', weightMin: 16, weightMax: 32 },
      { name: 'Border Collie', weightMin: 12, weightMax: 20 },
      { name: 'Bouledogue Français', weightMin: 8, weightMax: 14 },
      { name: 'Bouledogue Anglais', weightMin: 18, weightMax: 25 },
      { name: 'Cavalier King Charles', weightMin: 5, weightMax: 8 },
      { name: 'Chihuahua', weightMin: 1.5, weightMax: 3 },
      { name: 'Cocker Spaniel', weightMin: 12, weightMax: 16 },
      { name: 'Beagle', weightMin: 9, weightMax: 13 },
      { name: 'Jack Russell Terrier', weightMin: 5, weightMax: 8 },
      { name: 'Yorkshire Terrier', weightMin: 2, weightMax: 3.5 },
      { name: 'Shih Tzu', weightMin: 4, weightMax: 7.5 },
      { name: 'Caniche (Toy)', weightMin: 3, weightMax: 4 },
      { name: 'Caniche (Moyen)', weightMin: 8, weightMax: 15 },
      { name: 'Caniche (Standard)', weightMin: 20, weightMax: 32 },
      { name: 'Rottweiler', weightMin: 35, weightMax: 60 },
      { name: 'Boxer', weightMin: 25, weightMax: 32 },
      { name: 'Dogue Allemand', weightMin: 50, weightMax: 90 },
      { name: 'Saint-Bernard', weightMin: 55, weightMax: 90 },
      { name: 'Husky Sibérien', weightMin: 16, weightMax: 27 },
      { name: 'Malamute d\'Alaska', weightMin: 34, weightMax: 43 },
      { name: 'Dalmatien', weightMin: 20, weightMax: 32 },
      { name: 'Shar Pei', weightMin: 18, weightMax: 30 },
      { name: 'Akita Inu', weightMin: 30, weightMax: 45 },
      { name: 'Bichon Frisé', weightMin: 3, weightMax: 6 },
      { name: 'Teckel (Standard)', weightMin: 7, weightMax: 15 },
      { name: 'Teckel (Nain)', weightMin: 3.5, weightMax: 6.5 },
      { name: 'Setter Anglais', weightMin: 20, weightMax: 32 },
      { name: 'Épagneul Breton', weightMin: 13, weightMax: 20 },
      { name: 'Braque Allemand', weightMin: 20, weightMax: 32 },
      { name: 'Berger Belge Malinois', weightMin: 20, weightMax: 30 },
      { name: 'Terre-Neuve', weightMin: 45, weightMax: 68 },
      { name: 'Bull Terrier', weightMin: 20, weightMax: 32 },
      { name: 'Staffordshire Bull Terrier', weightMin: 11, weightMax: 17 },
      { name: 'American Staffordshire Terrier', weightMin: 25, weightMax: 40 },
      { name: 'Pug (Carlin)', weightMin: 6, weightMax: 8 },
      { name: 'Pékinois', weightMin: 3, weightMax: 6 },
      { name: 'Whippet', weightMin: 9, weightMax: 19 },
      { name: 'Lévrier Afghan', weightMin: 22, weightMax: 27 },
      { name: 'Bichon Maltais', weightMin: 2, weightMax: 4 },
      { name: 'Spitz Nain (Poméranien)', weightMin: 1.5, weightMax: 3 },
      { name: 'Colley', weightMin: 18, weightMax: 30 },
      { name: 'Fox Terrier', weightMin: 7, weightMax: 9 },
      { name: 'Épagneul Cavalier', weightMin: 5, weightMax: 8 }
    ],
    'Féline': [
      { name: 'Européen', weightMin: 3, weightMax: 6 },
      { name: 'Maine Coon', weightMin: 4.5, weightMax: 11 },
      { name: 'Persan', weightMin: 3, weightMax: 6 },
      { name: 'Siamois', weightMin: 2.5, weightMax: 5 },
      { name: 'Bengal', weightMin: 3.5, weightMax: 7 },
      { name: 'British Shorthair', weightMin: 3.5, weightMax: 8 },
      { name: 'Ragdoll', weightMin: 4.5, weightMax: 9 },
      { name: 'Sacré de Birmanie', weightMin: 3, weightMax: 6 },
      { name: 'Sphynx', weightMin: 2.5, weightMax: 5.5 },
      { name: 'Abyssin', weightMin: 3, weightMax: 5 },
      { name: 'Norvégien', weightMin: 3.5, weightMax: 9 },
      { name: 'Chartreux', weightMin: 3, weightMax: 7 }
    ],
    Autre: []
  };
  // Table nom-de-race normalisé -> slug de la page race sur centrale-canine.fr
  // (générée depuis /toutes-nos-races-de-chiens le 2026-09-25, 390 races LOF/FCI).
  // Chaque page race a son propre lien "Télécharger le Standard (PDF)" — le numéro
  // FCI (nécessaire pour construire l'URL du PDF directement) n'est pas dans cette liste,
  // d'où le lien vers la page plutôt que le PDF lui-même.
  var CENTRALE_CANINE_BREED_SLUGS = {
    "affenpinscher":"affenpinscher",
    "airedaleterrier":"airedale-terrier",
    "akita":"akita",
    "akitaamericain":"akita-americain",
    "alanoespagnol":"alano-espagnol",
    "anglofrancaisdepetitevenerie":"anglo-francais-de-petite-venerie",
    "ariegeois":"ariegeois",
    "azawakh":"azawakh",
    "bangkaewdethailande":"bangkaew-de-thailande",
    "barbadodeterceira":"barbado-de-terceira",
    "barbet":"barbet",
    "barbutcheque":"barbu-tcheque",
    "barzoi":"barzoi",
    "basenji":"basenji",
    "bassetartesiennormand":"basset-artesien-normand",
    "bassetbleudegascogne":"basset-bleu-de-gascogne",
    "bassetdesalpes":"basset-des-alpes",
    "bassetdewestphalie":"basset-de-westphalie",
    "bassetfauvedebretagne":"basset-fauve-de-bretagne",
    "bassethound":"basset-hound",
    "bassetsuedois":"basset-suedois",
    "beagle":"beagle",
    "beagleharrier":"beagle-harrier",
    "beardedcollie":"bearded-collie",
    "bedlingtonterrier":"bedlington-terrier",
    "bergerallemand":"berger-allemand",
    "bergeramericainminiature":"berger-americain-miniature",
    "bergeraustralien":"berger-australien",
    "bergerbergamasque":"berger-bergamasque",
    "bergerblancsuisse":"berger-blanc-suisse",
    "bergerdasiecentrale":"berger-dasie-centrale",
    "bergerdebeauce":"berger-de-beauce",
    "bergerdeboheme":"berger-de-boheme",
    "bergerdebosnieherzegovineetdecroatie":"berger-de-bosnie-herzegovine-et-de-croatie",
    "bergerdebrie":"berger-de-brie",
    "bergerdelamaremmeetdesabruzzes":"berger-de-la-maremme-et-des-abruzzes",
    "bergerdelaserradeaires":"berger-de-la-serra-de-aires",
    "bergerdepicardie":"berger-de-picardie",
    "bergerderussiemeridionale":"berger-de-russie-meridionale",
    "bergerdesalpesetdesavoie":"berger-des-alpes-et-de-savoie",
    "bergerdespyreneesafacerase":"berger-des-pyrenees-face-rase",
    "bergerdespyreneesapoillong":"berger-des-pyrenees-poil-long",
    "bergerducaucase":"berger-du-caucase",
    "bergerdukarst":"berger-du-karst",
    "bergerfinnoisdelaponie":"berger-finnois-de-laponie",
    "bergerhollandais":"berger-hollandais",
    "bergerpolonaisdeplaine":"berger-polonais-de-plaine",
    "bichonapoilfrise":"bichon-poil-frise",
    "bichonbolonais":"bichon-bolonais",
    "bichonhavanais":"bichon-havanais",
    "bichonmaltais":"bichon-maltais",
    "biewerterrier":"biewer-terrier",
    "billy":"billy",
    "bolonkarussecolore":"bolonka-russe-colore",
    "bordercollie":"border-collie",
    "borderterrier":"border-terrier",
    "bouledoguefrancais":"bouledogue-francais",
    "bouvieraustralien":"bouvier-australien",
    "bouvieraustraliencourtequeue":"bouvier-australien-courte-queue",
    "bouvierbernois":"bouvier-bernois",
    "bouvierdelappenzell":"bouvier-de-lappenzell",
    "bouvierdelentlebuch":"bouvier-de-lentlebuch",
    "bouvierdesardennes":"bouvier-des-ardennes",
    "bouvierdesflandres":"bouvier-des-flandres",
    "boxer":"boxer",
    "brachetallemand":"brachet-allemand",
    "brachetdestyrieapoildur":"brachet-de-styrie-poil-dur",
    "brachetnoiretfeu":"brachet-noir-et-feu",
    "brachetpolonais":"brachet-polonais",
    "brachettyrolien":"brachet-tyrolien",
    "braqueallemandapoilcourt":"braque-allemand-poil-court",
    "braquedauvergne":"braque-d-auvergne",
    "braquedeburgos":"braque-de-burgos",
    "braquedelariege":"braque-de-l-ariege",
    "braquedeweimar":"braque-de-weimar",
    "braquedubourbonnais":"braque-du-bourbonnais",
    "braquefrancaistypegascogne":"braque-francais-type-gascogne",
    "braquefrancaistypepyrenees":"braque-francais-type-pyrenees",
    "braquehongroisapoilcourt":"braque-hongrois-poil-court",
    "braquehongroisapoildur":"braque-hongrois-poil-dur",
    "braqueitalien":"braque-italien",
    "braquesaintgermain":"braque-saint-germain",
    "braqueslovaqueapoildur":"braque-slovaque-poil-dur",
    "briquetdeprovence":"briquet-de-provence",
    "briquetgriffonvendeen":"briquet-griffon-vendeen",
    "broholmer":"broholmer",
    "brunosainthubertfrancais":"bruno-saint-hubert-francais",
    "buhundnorvegien":"buhund-norvegien",
    "bulldog":"bulldog",
    "bulldogcampeirobresilien":"bulldog-campeiro-bresilien",
    "bulldogcontinental":"bulldog-continental",
    "bullmastiff":"bullmastiff",
    "bullterrier":"bull-terrier",
    "bullterrierminiature":"bull-terrier-miniature",
    "cairnterrier":"cairn-terrier",
    "canedapastoredellasila":"cane-da-pastore-della-sila",
    "canedapastoredioropa":"cane-da-pastore-di-oropa",
    "canedimannara":"cane-di-mannara",
    "caniche":"caniche",
    "caodegadotransmontano":"cao-de-gado-transmontano",
    "carlin":"carlin",
    "cavalierkingcharles":"cavalier-king-charles",
    "chienaloutre":"chien-loutre",
    "chienchinoisacrete":"chien-chinois-crete",
    "chiencourantdebosnieapoildur":"chien-courant-de-bosnie-poil-dur",
    "chiencourantdehalden":"chien-courant-de-halden",
    "chiencourantdehamilton":"chien-courant-de-hamilton-0",
    "chiencourantdehygen":"chien-courant-de-hygen",
    "chiencourantdelavalleedelasave":"chien-courant-de-la-vallee-de-la-save",
    "chiencourantdemontagnedumontenegro":"chien-courant-de-montagne-du-montenegro",
    "chiencourantdesapennins":"chien-courant-des-apennins",
    "chiencourantdeschiller":"chien-courant-de-schiller",
    "chiencourantdestatras":"chien-courant-des-tatras",
    "chiencourantdestonie":"chien-courant-destonie",
    "chiencourantdetransylvanie":"chien-courant-de-transylvanie",
    "chiencourantdistrieapoildur":"chien-courant-distrie-poil-dur",
    "chiencourantdistrieapoilras":"chien-courant-distrie-poil-ras",
    "chiencourantdusmaland":"chien-courant-du-smaland",
    "chiencourantespagnol":"chien-courant-espagnol",
    "chiencourantfinlandais":"chien-courant-finlandais",
    "chiencourantgrec":"chien-courant-grec",
    "chiencourantitalienapoildur":"chien-courant-italien-poil-dur",
    "chiencourantitalienapoilras":"chien-courant-italien-poil-ras",
    "chiencourantnorvegien":"chien-courant-norvegien",
    "chiencourantpolonais":"chien-courant-polonais",
    "chiencourantserbe":"chien-courant-serbe",
    "chiencourantslovaque":"chien-courant-slovaque",
    "chiencourantsuisse":"chien-courant-suisse",
    "chiencouranttricoloreserbe":"chien-courant-tricolore-serbe",
    "chiendarretallemandapoildur":"chien-darret-allemand-poil-dur",
    "chiendarretallemandapoillong":"chien-darret-allemand-poil-long",
    "chiendarretallemandapoilraide":"chien-darret-allemand-poil-raide",
    "chiendarretdanoisancestral":"chien-darret-danois-ancestral",
    "chiendarretfrison":"chien-darret-frison",
    "chiendarretportugais":"chien-darret-portugais",
    "chiendartois":"chien-dartois",
    "chiendeauamericain":"chien-deau-americain",
    "chiendeauespagnol":"chien-deau-espagnol",
    "chiendeaufrison":"chien-deau-frison",
    "chiendeauportugais":"chien-deau-portugais",
    "chiendeauromagnol":"chien-deau-romagnol",
    "chiendebali":"chien-de-bali",
    "chiendebergeranglaisancestral":"chien-de-berger-anglais-ancestral",
    "chiendebergerbelge":"chien-de-berger-belge",
    "chiendebergercatalan":"chien-de-berger-catalan",
    "chiendebergercroate":"chien-de-berger-croate",
    "chiendebergerdemajorque":"chien-de-berger-de-majorque",
    "chiendebergerdesshetland":"chien-de-berger-des-shetland",
    "chiendebergerdestatras":"chien-de-berger-des-tatras",
    "chiendebergerislandais":"chien-de-berger-islandais",
    "chiendebergerkangal":"chien-de-berger-kangal",
    "chiendebergermacedonienkaraman":"chien-de-berger-macedonien-karaman",
    "chiendebergerroumaincorb":"chien-de-berger-roumain-corb",
    "chiendebergerroumaindebucovine":"chien-de-berger-roumain-de-bucovine",
    "chiendebergerroumaindemioritza":"chien-de-berger-roumain-de-mioritza",
    "chiendebergerroumaindescarpathes":"chien-de-berger-roumain-des-carpathes",
    "chiendebergeryougoslavedecharplanina":"chien-de-berger-yougoslave-de-charplanina",
    "chiendecanaan":"chien-de-canaan",
    "chiendecastrolaboreiro":"chien-de-castro-laboreiro",
    "chiendecouritalien":"chien-de-cour-italien",
    "chiendefermedanosuedois":"chien-de-ferme-dano-suedois",
    "chiendegarennedescanaries":"chien-de-garenne-des-canaries",
    "chiendegarenneportugais":"chien-de-garenne-portugais",
    "chiendelannorvegiengris":"chien-delan-norvegien-gris",
    "chiendelannorvegiennoir":"chien-delan-norvegien-noir",
    "chiendelansuedoisjamthund":"chien-delan-suedois-jamthund",
    "chiendelaserradaestrela":"chien-de-la-serra-da-estrela",
    "chiendeleonberg":"chien-de-leonberg",
    "chiendemontagnedelatlas":"chien-de-montagne-de-latlas",
    "chiendemontagnedespyrenees":"chien-de-montagne-des-pyrenees",
    "chiendeperdrixdedrente":"chien-de-perdrix-de-drente",
    "chienderhodesieacretedorsale":"chien-de-rhodesie-crete-dorsale",
    "chienderougedebaviere":"chien-de-rouge-de-baviere",
    "chienderougedehanovre":"chien-de-rouge-de-hanovre",
    "chiendesainthubert":"chien-de-saint-hubert",
    "chiendetaiwan":"chien-de-taiwan",
    "chiendoursdecarelie":"chien-dours-de-carelie",
    "chiendoyselallemand":"chien-doysel-allemand",
    "chiendugroenland":"chien-du-groenland",
    "chiendupharaon":"chien-du-pharaon",
    "chienfinnoisdelaponie":"chien-finnois-de-laponie",
    "chienfonnese":"chien-fonnese",
    "chienloupdesaarloos":"chien-loup-de-saarloos",
    "chienlouptchecoslovaque":"chien-loup-tchecoslovaque",
    "chiennetfpourlachasseauraton":"chien-n-et-f-pour-la-chasse-au-raton",
    "chiennorvegiendemacareux":"chien-norvegien-de-macareux",
    "chiennudumexique":"chien-nu-du-mexique",
    "chiennuduperou":"chien-nu-du-perou",
    "chienthailandaisacretedorsale":"chien-thailandais-crete-dorsale",
    "chihuahua":"chihuahua",
    "chowchow":"chow-chow",
    "cimarronuruguayen":"cimarron-uruguayen",
    "cirnecodeletna":"cirneco-de-l-etna",
    "clumberspaniel":"clumber-spaniel",
    "cockerspanielamericain":"cocker-spaniel-americain",
    "cockerspanielanglais":"cocker-spaniel-anglais",
    "collieapoilcourt":"collie-poil-court",
    "collieapoillong":"collie-poil-long",
    "cotondetulear":"coton-de-tulear",
    "croise":"croise",
    "cursinu":"cursinu",
    "dalmatien":"dalmatien",
    "dandiedinmontterrier":"dandie-dinmont-terrier",
    "dobermann":"dobermann",
    "dogueallemand":"dogue-allemand",
    "dogueargentin":"dogue-argentin",
    "doguedebordeaux":"dogue-de-bordeaux",
    "doguedemajorque":"dogue-de-majorque",
    "doguedutibet":"dogue-du-tibet",
    "englishspringerspaniel":"english-springer-spaniel",
    "epagneulbleudepicardie":"epagneul-bleu-de-picardie",
    "epagneulbreton":"epagneul-breton",
    "epagneuldeauirlandais":"epagneul-deau-irlandais",
    "epagneuldepontaudemer":"epagneul-de-pont-audemer",
    "epagneuldesaintusuge":"epagneul-de-saint-usuge",
    "epagneulfrancais":"epagneul-francais",
    "epagneuljaponais":"epagneul-japonais",
    "epagneulkingcharles":"epagneul-king-charles",
    "epagneulnaincontinental":"epagneul-nain-continental",
    "epagneulpekinois":"epagneul-pekinois",
    "epagneulpicard":"epagneul-picard",
    "epagneultibetain":"epagneul-tibetain",
    "esquimauducanada":"esquimau-du-canada",
    "eurasier":"eurasier",
    "euskalartzaintxakurra":"euskal-artzain-txakurra",
    "fieldspaniel":"field-spaniel",
    "filabrasileiro":"fila-brasileiro",
    "filadesaintmiguel":"fila-de-saint-miguel",
    "foxhoundamericain":"foxhound-americain",
    "foxhoundanglais":"fox-hound-anglais",
    "foxterrierpoildur":"fox-terrier-poil-dur",
    "foxterrierpoillisse":"fox-terrier-poil-lisse",
    "francaisblancetnoir":"francais-blanc-et-noir",
    "francaisblancetorange":"francais-blanc-et-orange",
    "francaistricolore":"francais-tricolore",
    "gasconsaintongeois":"gascon-saintongeois",
    "goldenretriever":"golden-retriever",
    "grandanglofrancaisblancetnoir":"grand-anglo-francais-blanc-et-noir",
    "grandanglofrancaisblancetorange":"grand-anglo-francais-blanc-et-orange",
    "grandanglofrancaistricolore":"grand-anglo-francais-tricolore",
    "grandbassetgriffonvendeen":"grand-basset-griffon-vendeen",
    "grandbleudegascogne":"grand-bleu-de-gascogne",
    "grandbouviersuisse":"grand-bouvier-suisse",
    "grandepagneuldemunster":"grand-epagneul-de-munster",
    "grandgriffonvendeen":"grand-griffon-vendeen",
    "greyhound":"greyhound",
    "griffonapoildurkorthals":"griffon-poil-dur-korthals",
    "griffonbelge":"griffon-belge",
    "griffonbleudegascogne":"griffon-bleu-de-gascogne",
    "griffonbruxellois":"griffon-bruxellois",
    "griffonfauvedebretagne":"griffon-fauve-de-bretagne",
    "griffonnivernais":"griffon-nivernais",
    "harrier":"harrier",
    "hokkaido":"hokkaido",
    "hovawart":"hovawart",
    "huskydesiberie":"husky-de-siberie",
    "jindocoreen":"jindo-coreen",
    "kai":"kai",
    "kazakhtazy":"kazakh-tazy",
    "kelpieaustralien":"kelpie-australien",
    "kishu":"kishu",
    "komondor":"komondor",
    "kromfohrlander":"kromfohrlander",
    "kuvasz":"kuvasz",
    "laikadeiakoutie":"laika-de-iakoutie",
    "laikadesiberieoccidentale":"laika-de-siberie-occidentale",
    "laikadesiberieorientale":"laika-de-siberie-orientale",
    "laikarussoeuropeen":"laika-russo-europeen",
    "lakelandterrier":"lakeland-terrier",
    "lancashireheeler":"lancashire-heeler",
    "landseer":"landseer",
    "lapphundsuedois":"lapphund-suedois",
    "levrierafghan":"levrier-afghan",
    "levrierecossais":"levrier-ecossais",
    "levrierespagnol":"levrier-espagnol",
    "levrierhongrois":"levrier-hongrois",
    "levrierirlandais":"levrier-irlandais",
    "levrierpolonais":"levrier-polonais",
    "lhassaapso":"lhassa-apso",
    "majorero":"majorero",
    "malamutedelalaska":"malamute-de-lalaska",
    "manchesterterrier":"manchester-terrier",
    "maneto":"maneto",
    "mastiff":"mastiff",
    "matindelalentejo":"matin-de-lalentejo",
    "matindespyrenees":"matin-des-pyrenees",
    "matinespagnol":"matin-espagnol",
    "matinnapolitain":"matin-napolitain",
    "mudi":"mudi",
    "norfolkterrier":"norfolk-terrier",
    "norwichterrier":"norwich-terrier",
    "pachonnavarro":"pachon-navarro",
    "perrodepastorgarafiano":"perro-de-pastor-garafiano",
    "perroleonesdepastor":"perro-leones-de-pastor",
    "petitbassetgriffonvendeen":"petit-basset-griffon-vendeen",
    "petitbleudegascogne":"petit-bleu-de-gascogne",
    "petitbrabancon":"petit-brabancon",
    "petitchiencourantsuisse":"petit-chien-courant-suisse",
    "petitchienhollandaisdechasseaugibierdeau":"petit-chien-hollandais-de-chasse-au-gibier-deau",
    "petitchienlion":"petit-chien-lion",
    "petitchienrusse":"petit-chien-russe",
    "petitepagneuldemunster":"petit-epagneul-de-munster",
    "petitlevrieritalien":"petit-levrier-italien",
    "pinscherallemand":"pinscher-allemand",
    "pinscherautrichien":"pinscher-autrichien",
    "pinschernain":"pinscher-nain",
    "pisteurbresilien":"pisteur-bresilien",
    "podencoandaluz":"podenco-andaluz",
    "podencodibiza":"podenco-dibiza",
    "pointeranglais":"pointer-anglais",
    "poitevin":"poitevin",
    "porcelaine":"porcelaine",
    "presacanario":"presa-canario",
    "pudelpointer":"pudelpointer",
    "puli":"puli",
    "pumi":"pumi",
    "ratierdeprague":"ratier-de-prague",
    "ratiervalencien":"ratier-valencien",
    "ratonerobodegueroandaluz":"ratonero-bodeguero-andaluz",
    "retrieverapoilboucle":"retriever-poil-boucle",
    "retrieverapoilplat":"retriever-poil-plat",
    "retrieverdelabaiedechesapeake":"retriever-de-la-baie-de-chesapeake",
    "retrieverdelanouvelleecosse":"retriever-de-la-nouvelle-ecosse",
    "retrieverdulabrador":"retriever-du-labrador",
    "rottweiler":"rottweiler",
    "sabuesofinocolombiano":"sabueso-fino-colombiano",
    "saintbernard":"saint-bernard",
    "saluki":"saluki",
    "samoyede":"samoyede",
    "schapendoesneerlandais":"schapendoes-neerlandais",
    "schipperke":"schipperke",
    "schnauzergeant":"schnauzer-geant",
    "schnauzermoyen":"schnauzer-moyen",
    "schnauzernain":"schnauzer-nain",
    "sealyhamterrier":"sealyham-terrier",
    "segugiomaremmano":"segugio-maremmano",
    "setteranglais":"setter-anglais",
    "settergordon":"setter-gordon",
    "setterirlandaisrouge":"setter-irlandais-rouge",
    "setterirlandaisrougeblanc":"setter-irlandais-rouge-blanc",
    "sharpei":"shar-pei",
    "shiba":"shiba",
    "shihtzu":"shih-tzu",
    "shikoku":"shikoku",
    "skyeterrier":"skye-terrier",
    "sloughi":"sloughi",
    "smousdespaysbas":"smous-des-pays-bas",
    "spinodegliiblei":"spino-degli-iblei",
    "spinone":"spinone",
    "spitzallemand":"spitz-allemand",
    "spitzdenorrbotten":"spitz-de-norrbotten",
    "spitzdesvisigoths":"spitz-des-visigoths",
    "spitzfinlandais":"spitz-finlandais",
    "spitzjaponais":"spitz-japonais",
    "staffordshirebullterrier":"staffordshire-bull-terrier",
    "staffordshireterrieramericain":"staffordshire-terrier-americain",
    "sussexspaniel":"sussex-spaniel",
    "taigan":"taigan",
    "tchouvatchslovaque":"tchouvatch-slovaque",
    "teckel":"teckel",
    "terreneuve":"terre-neuve",
    "terrierandalou":"terrier-andalou",
    "terrieraustralien":"terrier-australien",
    "terrieraustralienapoilsoyeux":"terrier-australien-poil-soyeux",
    "terrierbresilien":"terrier-bresilien",
    "terrierdagrementanglaisnoiretfeu":"terrier-dagrement-anglais-noir-et-feu",
    "terrierdeboston":"terrier-de-boston",
    "terrierdechasseallemand":"terrier-de-chasse-allemand",
    "terrierdureverendrussell":"terrier-du-reverend-russell",
    "terrierecossais":"terrier-ecossais",
    "terrierirlandais":"terrier-irlandais",
    "terrierirlandaisapoildoux":"terrier-irlandais-poil-doux",
    "terrierirlandaisglenofimaal":"terrier-irlandais-glen-imaal",
    "terrierjackrussell":"terrier-jack-russell",
    "terrierjaponais":"terrier-japonais",
    "terrierkerryblue":"terrier-kerry-blue",
    "terriernoirrusse":"terrier-noir-russe",
    "terriernuamericain":"terrier-nu-americain",
    "terriertcheque":"terrier-tcheque",
    "terriertibetain":"terrier-tibetain",
    "tosa":"tosa",
    "volpinoitalien":"volpino-italien",
    "welshcorgicardigan":"welsh-corgi-cardigan",
    "welshcorgipembroke":"welsh-corgi-pembroke",
    "welshspringerspaniel":"welsh-springer-spaniel",
    "welshterrier":"welsh-terrier",
    "westhighlandwhiteterrier":"west-highland-white-terrier",
    "whippet":"whippet",
    "xarnegopodencovalenciano":"xarnego-podenco-valenciano",
    "yorkshireterrier":"yorkshire-terrier"
  };

  // Lien vers la fiche de race officielle (Société Centrale Canine) — contient
  // toujours le standard FCI en PDF ("Télécharger le Standard") quand il existe,
  // le club de race et les caractéristiques. On ne connaît pas le numéro FCI
  // depuis ce nom de race seul, donc pas de lien direct vers le PDF — celui-ci
  // reste à un clic sur la page. Correspondance insensible aux accents/casse.
  function centraleCanineBreedUrl(race) {
    if (!race) return null;
    var slug = CENTRALE_CANINE_BREED_SLUGS[protectionKey(race)];
    return slug ? 'https://www.centrale-canine.fr/le-chien-de-race/' + slug : null;
  }

  // Common symptom types suggested in the health journal
  var SYMPTOM_TYPES = [
    'Vomissements', 'Diarrhée', 'Perte d\'appétit', 'Léthargie / fatigue',
    'Toux', 'Éternuements', 'Boiterie', 'Démangeaisons', 'Perte de poils',
    'Soif excessive', 'Difficulté à uriner', 'Halètement excessif',
    'Gonflement', 'Douleur apparente', 'Changement de comportement', 'Autre'
  ];

  var state = {
    animals: [],
    nextId: 20,
    currentAnimalId: null,
    viewMode: 'home',
    // Profil propriétaire : un seul compte = une seule identité, partagée
    // par tous les animaux (pas un sous-objet par animal, voir getOwner()).
    owner: { name: '', phone: '', email: '', clinic: '', address: '' }
  };

  var uiState = {
    editVaccineId: null,
    editDewormingId: null,
    editWeightEntryId: null,
    editHeightEntryId: null,
    editConsultId: null,
    editMedicationId: null,
    editNoteId: null,
    editCaptionPhotoId: null,
    editHygieneId: null,
    editHeatCycleId: null,
    editMatingId: null,
    editActivityId: null,
    editMealId: null,
    editVetContactId: null,
    userLat: null,
    userLng: null,
    geoSortActive: false,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    calendarDay: '',
    agendaPet: 'all',
    petTaskFilter: 'all',
    petChartMode: 'weight'
  };

  // ——— Helpers —————————————————————————————————————————————
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    if (!d) return '—';
    if (window.applikaPrefs) return window.applikaPrefs.formatDate(d);
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Poids et tailles sont stockés en kg / cm ; les préférences (profil > Affichage) ne changent que l'affichage.
  function wUnit() { return window.applikaPrefs && window.applikaPrefs.get().units.weight === 'lb' ? 'lb' : 'kg'; }
  function hUnit() { return window.applikaPrefs && window.applikaPrefs.get().units.height === 'in' ? 'in' : 'cm'; }
  function uW(kg) { return window.applikaPrefs ? window.applikaPrefs.fmtWeight(kg) : String(kg).replace('.', ',') + ' kg'; }
  function uH(cm) { return window.applikaPrefs ? window.applikaPrefs.fmtHeight(cm) : String(cm).replace('.', ',') + ' cm'; }
  function wNum(kg, d) { return window.applikaPrefs ? window.applikaPrefs.fmtWeight(kg, d == null ? 1 : d).replace(/ (kg|lb)$/, '') : Number(kg).toFixed(d == null ? 1 : d); }
  function hNum(cm) { return uH(cm).replace(/ (cm|in)$/, ''); }
  function wDelta(deltaKg) { return window.applikaPrefs ? window.applikaPrefs.weightDelta(deltaKg) : (deltaKg >= 0 ? '+' : '−') + Math.abs(deltaKg).toFixed(1).replace('.', ',') + ' kg'; }
  function hDelta(deltaCm) {
    var v = hUnit() === 'in' ? deltaCm * 0.3937007874 : deltaCm;
    return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') + ' ' + hUnit();
  }

  function fmtCost(n) {
    return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function relativeDate(isoDate) {
    if (!isoDate) return '';
    var dt = isoToLocalDate(isoDate);
    if (!dt) return '';
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diff = Math.round((dt - todayMid) / 864e5);
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return 'demain';
    if (diff === -1) return 'hier';
    if (diff > 0 && diff <= 7) return 'dans ' + diff + 'j';
    if (diff > 7 && diff <= 30) return 'dans ' + Math.round(diff / 7) + ' sem.';
    if (diff > 30) return 'dans ' + Math.round(diff / 30) + ' mois';
    if (diff < 0 && diff >= -30) return 'il y a ' + Math.abs(diff) + 'j';
    if (diff < -30) return 'il y a ' + Math.round(Math.abs(diff) / 30) + ' mois';
    return '';
  }

  function addDaysISO(dateStr, days) {
    if (!dateStr) return '';
    var n = parseInt(days, 10);
    if (isNaN(n)) return '';
    var d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function getStatus(nextDate) {
    if (!nextDate) return null;
    var dt = isoToLocalDate(nextDate);
    if (!dt) return null;
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diff = (dt - todayMid) / 864e5;
    if (diff < 0) return { cls: 'status-overdue', lbl: t('overdue') };
    if (diff <= 30) return { cls: 'status-soon', lbl: t('soon') };
    return { cls: 'status-ok', lbl: t('upToDate') };
  }

  function isoToLocalDate(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return null;
    var parts = isoDate.split('-').map(function (x) { return parseInt(x, 10); });
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function calculateAgeMonths(dob) {
    if (!dob) return null;
    var d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    return Math.floor((new Date() - d) / (864e5 * 30.44));
  }

  // ——— Toast system ————————————————————————————————————————
  function showToast(message, type, duration) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () { toast.remove(); }, 300);
    }, duration || 3500);
  }

  // Toast de succès avec action "Annuler" (restaure un élément qu'on vient
  // de supprimer). restoreFn doit remettre l'état local + sauvegarder +
  // re-render, exactement comme si la suppression n'avait pas eu lieu.
  function showUndoToast(message, restoreFn) {
    var container = document.getElementById('toast-container');
    if (!container) { showToast(message, 'success'); return; }
    var toast = document.createElement('div');
    toast.className = 'toast toast-success toast-undo';
    var textEl = document.createElement('span');
    textEl.textContent = message;
    var undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Annuler';
    undoBtn.addEventListener('click', function () {
      restoreFn();
      toast.remove();
    });
    toast.appendChild(textEl);
    toast.appendChild(undoBtn);
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () { toast.remove(); }, 300);
    }, 6000);
  }

  // ——— Confirmation de suppression (remplace confirm() natif) ————————
  // Affiche la modale #modal-confirmDelete, appelle onConfirm() si
  // l'utilisateur clique "Supprimer". Repli sur confirm() natif si la
  // modale est absente du DOM (ne devrait pas arriver).
  function confirmDelete(message, onConfirm) {
    var overlay = document.getElementById('modal-confirmDelete');
    var msgEl = document.getElementById('confirm-delete-message');
    var btn = document.getElementById('confirm-delete-btn');
    if (!overlay || !msgEl || !btn) {
      if (window.confirm(message)) onConfirm();
      return;
    }
    msgEl.textContent = message;
    openModal('confirmDelete');
    function handler() {
      btn.removeEventListener('click', handler);
      closeModal('confirmDelete');
      onConfirm();
    }
    btn.addEventListener('click', handler);
  }

  // Suppression d'un animal : demande la raison (facultatif) pour adapter
  // le ton du message plutôt que de traiter ça comme une suppression de
  // ligne de tableau comme les autres. onConfirm(reason) reçoit
  // 'deceased' | 'rehomed' | 'other' | '' (non précisé).
  function confirmDeleteAnimal(animalName, onConfirm) {
    var overlay = document.getElementById('modal-deleteAnimal');
    var nameEl = document.getElementById('delete-animal-name');
    var btn = document.getElementById('confirm-delete-animal-btn');
    if (!overlay || !btn) {
      if (window.confirm('Supprimer ' + animalName + ' et toutes ses données ?')) onConfirm('');
      return;
    }
    if (nameEl) nameEl.textContent = animalName;
    var form = document.getElementById('form-delete-animal-reason');
    if (form) form.reset();
    openModal('deleteAnimal');
    function handler() {
      btn.removeEventListener('click', handler);
      var checked = form ? form.querySelector('input[name="delete-animal-reason"]:checked') : null;
      closeModal('deleteAnimal');
      onConfirm(checked ? checked.value : '');
    }
    btn.addEventListener('click', handler);
  }

  var DELETE_ANIMAL_MESSAGES = {
    deceased: function (name) { return name + ' restera à jamais dans son carnet. Toutes nos condoléances. 🕊️'; },
    rehomed: function (name) { return 'Bonne route à ' + name + ' dans sa nouvelle famille.'; },
    other: function () { return 'Animal supprimé.'; },
    '': function () { return 'Animal supprimé.'; },
  };

  // ——— State management ————————————————————————————————————
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state.animals = parsed.animals || [];
        state.nextId = Math.max(state.nextId, parsed.nextId || 20);
        state.currentAnimalId = parsed.currentAnimalId != null ? parsed.currentAnimalId : (state.animals[0]?.id ?? null);
        // Le profil propriétaire est global au compte, indépendant du nombre
        // d'animaux — anciennes sauvegardes : reprendre l'owner du premier
        // animal (ancien modèle, dupliqué par animal) à défaut.
        state.owner = Object.assign(
          { name: '', phone: '', email: '', clinic: '', address: '' },
          parsed.owner || (state.animals[0] && state.animals[0].owner) || {}
        );
      }
      if (state.animals.length === 0) {
        return false; // Signal that we need onboarding
      }
      if (!state.animals.some(function (a) { return a.id === state.currentAnimalId; })) {
        state.currentAnimalId = state.animals[0].id;
      }
      // Backward compatibility
      state.animals.forEach(function (a) {
        if (!a || !a.animal) return;
        if (!Array.isArray(a.photos)) a.photos = [];
        if (!Array.isArray(a.animal.weightHistory)) a.animal.weightHistory = [];
        if (!Array.isArray(a.animal.heightHistory)) a.animal.heightHistory = [];
        if (!Array.isArray(a.consultations)) a.consultations = [];
        if (!Array.isArray(a.medications)) a.medications = [];
        if (!Array.isArray(a.notes)) a.notes = [];
        if (!Array.isArray(a.hygiene)) a.hygiene = [];
        if (!Array.isArray(a.heatCycles)) a.heatCycles = [];
        if (!Array.isArray(a.activities)) a.activities = [];
        if (!Array.isArray(a.matings)) a.matings = [];
        if (!a.nutrition) a.nutrition = { meals: [], dailyPlan: { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' } };
        if (!Array.isArray(a.nutrition.meals)) a.nutrition.meals = [];
        if (!a.nutrition.dailyPlan) a.nutrition.dailyPlan = { targetCalories: '', mealsPerDay: '', foodBrand: '', portionSize: '' };
        if (!a.pedigree) a.pedigree = { registry: 'Non inscrit', registryNumber: '', chipNumber: '', healthNotes: '', sire: { name: '', registry: '' }, dam: { name: '', registry: '' }, grandparents: { paternalGrandsire: '', paternalGranddam: '', maternalGrandsire: '', maternalGranddam: '', paternalGrandsireRegistry: '', paternalGranddamRegistry: '', maternalGrandsireRegistry: '', maternalGranddamRegistry: '' } };
        if (a.pedigree.healthNotes === undefined) a.pedigree.healthNotes = '';
        if (!a.pedigree.grandparents) a.pedigree.grandparents = {};
        ['paternalGrandsireRegistry', 'paternalGranddamRegistry', 'maternalGrandsireRegistry', 'maternalGranddamRegistry'].forEach(function (k) {
          if (a.pedigree.grandparents[k] === undefined) a.pedigree.grandparents[k] = '';
        });
        if (!a.animal.themeColor) a.animal.themeColor = '';
        if (a.animal.height === undefined) a.animal.height = null;
        if (!a.notifications) a.notifications = {};
        if (a.notifications.hygieneReminder === undefined) a.notifications.hygieneReminder = true;
        if (a.notifications.medicationReminder === undefined) a.notifications.medicationReminder = true;
        if (a.notifications.matingReminder === undefined) a.notifications.matingReminder = true;
      });
      return true;
    } catch (e) {
      console.warn('App\'lika: erreur lecture localStorage', e);
      return false;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        animals: state.animals,
        nextId: state.nextId,
        currentAnimalId: state.currentAnimalId,
        owner: state.owner
      }));
    } catch (e) {
      console.warn('App\'lika: erreur écriture localStorage', e);
    }
  }

  // Retient la dernière page affichée pour la restaurer après un rechargement
  // (F5 / réouverture PWA) au lieu de revenir systématiquement à l'accueil.
  function saveRoute(route) {
    try { localStorage.setItem(ROUTE_KEY, JSON.stringify(route)); } catch (e) {}
  }

  function loadRoute() {
    try {
      var raw = localStorage.getItem(ROUTE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Rejoue la dernière page connue au démarrage. Retombe sur l'accueil si
  // rien n'est mémorisé ou si l'animal visé a été supprimé entretemps.
  function restoreRoute() {
    var route = loadRoute();
    if (!route) { showHome(); return; }
    if (route.view === 'detail') {
      var exists = state.animals.some(function (a) { return a.id === route.animalId; });
      if (exists) {
        state.currentAnimalId = route.animalId;
        showDetail({ tab: route.tab });
        return;
      }
    } else if (route.view === 'agenda') {
      showAgenda();
      return;
    } else if (route.view === 'directory') {
      showDirectory();
      return;
    } else if (route.view === 'community') {
      showCommunity(route.panel);
      return;
    } else if (route.view === 'profile') {
      showUserProfile();
      return;
    } else if (route.view === 'favorites') {
      showFavorites();
      return;
    } else if (route.view === 'help') {
      showHelp();
      return;
    }
    showHome();
  }

  function getCurrent() {
    return state.animals.find(function (a) { return a.id === state.currentAnimalId; }) || state.animals[0];
  }

  // Profil propriétaire global au compte (voir state.owner) — indépendant
  // de la présence ou non d'un animal.
  function getOwner() {
    if (!state.owner) state.owner = { name: '', phone: '', email: '', clinic: '', address: '' };
    return state.owner;
  }

  // Complète le profil propriétaire avec les infos du compte cloud connecté
  // (Google ou lien magique) quand elles manquent en local — jamais l'inverse
  // (une saisie locale existante n'est jamais écrasée). Google Identity
  // Services ne fournit que nom/email/photo, jamais téléphone ni adresse :
  // ces deux champs restent toujours à saisir manuellement.
  function fillOwnerFromCloudSession(session) {
    if (!session || !session.user) return;
    var o = getOwner();
    var changed = false;
    if (!o.name && session.user.name) { o.name = session.user.name; changed = true; }
    if (!o.email && session.user.email) { o.email = session.user.email; changed = true; }
    if (!changed) return;
    saveState();
    renderProfile();
    var nameEl = document.getElementById('user-profile-name');
    var emailEl = document.getElementById('user-profile-email');
    if (nameEl) nameEl.textContent = o.name || 'Utilisateur';
    if (emailEl) emailEl.textContent = o.email || '';
  }

  // ——— Photos : IndexedDB ——————————————————————————————
  var PHOTO_DB_NAME = 'vetbook_photo_db_v1';
  var PHOTO_STORE_NAME = 'photos';
  var photoDbOpenPromise = null;
  var photoUrlCache = new Map();

  function openPhotoDb() {
    if (photoDbOpenPromise) return photoDbOpenPromise;
    photoDbOpenPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponible')); return; }
      var req = indexedDB.open(PHOTO_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
          db.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Erreur IndexedDB')); };
    });
    return photoDbOpenPromise;
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(function (res) { return res.blob(); });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error || new Error('blobToDataUrl')); };
      reader.readAsDataURL(blob);
    });
  }

  function resizeImageToBlob(file, maxDim, mimeType, quality) {
    return new Promise(function (resolve, reject) {
      try {
        var objectUrl = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            var scale = Math.min(1, maxDim / Math.max(w, h));
            var tw = Math.max(1, Math.round(w * scale));
            var th = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = tw; canvas.height = th;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, tw, th);
            canvas.toBlob(function (blob) {
              URL.revokeObjectURL(objectUrl);
              resolve(blob || file);
            }, mimeType, quality);
          } catch (err) { URL.revokeObjectURL(objectUrl); reject(err); }
        };
        img.onerror = function () { URL.revokeObjectURL(objectUrl); reject(new Error('Image invalide')); };
        img.src = objectUrl;
      } catch (err) { reject(err); }
    });
  }

  async function putPhotoBlob(photoId, blob, mimeType) {
    var db = await openPhotoDb();
    await new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('putPhotoBlob')); };
      tx.objectStore(PHOTO_STORE_NAME).put({ id: photoId, blob: blob, mimeType: mimeType || blob.type || '' });
    });
    // Miroir MinIO si connecté : sync d'abord pour que le pet existe en base.
    try {
      if (window.cloudSync && window.cloudSync.isConfigured() && window.cloudSync.uploadPhoto) {
        var sess = await window.cloudSync.getSession();
        if (sess && sess.user) {
          await window.cloudSync.pushAllToCloud().catch(function () { return null; });
          var petLocalId = state.currentAnimalId != null ? state.currentAnimalId : (state.animals[0] && state.animals[0].id);
          if (petLocalId != null) {
            var uploaded = await window.cloudSync.uploadPhoto(petLocalId, photoId, blob, {});
            if (uploaded && uploaded.id) {
              var wrap = state.animals.find(function (a) { return a.id === petLocalId; });
              if (wrap && Array.isArray(wrap.photos)) {
                var photoMeta = wrap.photos.find(function (p) { return p && p.id === photoId; });
                if (photoMeta) photoMeta.serverId = uploaded.id;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('App\'lika: upload MinIO différé', err);
    }
  }

  async function getPhotoRecord(photoId) {
    var db = await openPhotoDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readonly');
      var req = tx.objectStore(PHOTO_STORE_NAME).get(photoId);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error || new Error('getPhotoRecord')); };
    });
  }

  async function deletePhotoBlob(photoId) {
    var db = await openPhotoDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('deletePhotoBlob')); };
      tx.objectStore(PHOTO_STORE_NAME).delete(photoId);
    });
  }

  async function clearPhotoStore() {
    var db = await openPhotoDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(PHOTO_STORE_NAME, 'readwrite');
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('clearPhotoStore')); };
      tx.objectStore(PHOTO_STORE_NAME).clear();
    });
  }

  async function getPhotoObjectUrl(photoId) {
    if (photoUrlCache.has(photoId)) return photoUrlCache.get(photoId);
    // Préfère l'URL serveur (MinIO via API) si un serverId est connu.
    try {
      var wrap = state.animals.find(function (a) {
        return Array.isArray(a.photos) && a.photos.some(function (p) { return p && p.id === photoId; });
      });
      var meta = wrap && wrap.photos.find(function (p) { return p && p.id === photoId; });
      if (meta && meta.serverId && window.cloudSync && window.cloudSync.getPhotoUrl) {
        var remote = window.cloudSync.getPhotoUrl(meta.serverId);
        photoUrlCache.set(photoId, remote);
        return remote;
      }
    } catch (e) { /* fallback IndexedDB */ }
    var rec = await getPhotoRecord(photoId);
    if (!rec || !rec.blob) return '';
    var url = URL.createObjectURL(rec.blob);
    photoUrlCache.set(photoId, url);
    return url;
  }

  async function getPhotoDataUrl(photoId) {
    var rec = await getPhotoRecord(photoId);
    if (!rec || !rec.blob) return '';
    return blobToDataUrl(rec.blob);
  }

  async function migrateLegacyImagesToIndexedDB() {
    var needsMigration = false;
    state.animals.forEach(function (wrap) {
      var a = wrap?.animal;
      if (!a) return;
      if (typeof a.avatar === 'string' && a.avatar.startsWith('data:')) needsMigration = true;
      if (Array.isArray(wrap.photos)) {
        wrap.photos.forEach(function (p) {
          if (p && typeof p.src === 'string' && p.src.startsWith('data:')) needsMigration = true;
        });
      }
    });
    if (!needsMigration) return;

    for (var wrap of state.animals) {
      var a = wrap?.animal;
      if (!a) continue;
      if (typeof a.avatar === 'string' && a.avatar.startsWith('data:')) {
        try {
          var blob = await dataUrlToBlob(a.avatar);
          var avatarKey = state.nextId++;
          await putPhotoBlob(avatarKey, blob, blob.type);
          a.avatar = avatarKey;
        } catch (err) { console.warn('App\'lika: migration avatar échouée', err); }
      }
      if (Array.isArray(wrap.photos)) {
        for (var p of wrap.photos) {
          if (!p || typeof p.src !== 'string' || !p.src.startsWith('data:')) continue;
          try {
            var blob2 = await dataUrlToBlob(p.src);
            var key = p.id != null ? p.id : (state.nextId++);
            p.id = key;
            await putPhotoBlob(key, blob2, blob2.type);
            delete p.src;
          } catch (err) { console.warn('App\'lika: migration photo échouée', err); }
        }
      }
    }
    saveState();
  }

  // ——— Delete animal ————————————————————————————————————————
  async function deleteAnimal(id) {
    if (state.animals.length <= 1) {
      showToast(t('lastAnimal'), 'error');
      return;
    }
    var animalToDelete = state.animals.find(function (a) { return a.id === id; });
    if (!animalToDelete) return;
    var animalName = (animalToDelete.animal && animalToDelete.animal.name) || 'cet animal';

    confirmDeleteAnimal(animalName, function (reason) {
      var animal = state.animals.find(function (a) { return a.id === id; });
      if (!animal) return;

      // Clean up IndexedDB photos
      if (Array.isArray(animal.photos)) {
        for (var p of animal.photos) {
          if (p && p.id != null) {
            deletePhotoBlob(p.id).catch(function () {});
          }
        }
      }
      if (animal.animal && typeof animal.animal.avatar === 'number') {
        deletePhotoBlob(animal.animal.avatar).catch(function () {});
      }

      state.animals = state.animals.filter(function (a) { return a.id !== id; });
      if (state.currentAnimalId === id) {
        state.currentAnimalId = state.animals[0]?.id ?? null;
      }
      saveState();
      var msgFn = DELETE_ANIMAL_MESSAGES[reason] || DELETE_ANIMAL_MESSAGES[''];
      showToast(msgFn(animalName), 'success', reason === 'deceased' ? 5500 : 3500);
      if (state.viewMode === 'home') renderHome();
      else showHome();
    });
  }

  // ——— Dashboard ———————————————————————————————————————
  // ——— Home ————————————————————————————————————————————
  // Statut santé agrégé d'un animal : proportion à jour / bientôt / en
  // retard parmi ses vaccins, déparasitages et soins d'hygiène planifiés.
  // Sert de base à l'anneau affiché sur sa carte d'accueil.
  function computeHealthStatus(data) {
    var items = [].concat(data.vaccines || [], data.dewormings || [], data.hygiene || []);
    var trackable = items.filter(function (x) { return !!x.next; });
    var activeMeds = (data.medications || []).filter(function (m) { return m.active !== false && !!m.endDate; });
    trackable = trackable.concat(activeMeds.map(function (m) { return { next: m.endDate }; }));
    var overdue = 0, soon = 0;
    trackable.forEach(function (x) {
      var st = getStatus(x.next);
      if (!st) return;
      if (st.cls === 'status-overdue') overdue++;
      else if (st.cls === 'status-soon') soon++;
    });
    return { total: trackable.length, overdue: overdue, soon: soon, ok: trackable.length - overdue - soon };
  }

  // L'élément le plus urgent à afficher sous l'anneau : le plus en retard
  // s'il y en a, sinon le plus proche à venir.
  function getNextDueItem(data) {
    var items = [].concat(
      (data.vaccines || []).map(function (v) { return { name: v.name, next: v.next, kind: 'Vaccin' }; }),
      (data.dewormings || []).map(function (d) { return { name: d.name, next: d.next, kind: 'Déparasitage' }; }),
      (data.hygiene || []).map(function (h) { return { name: h.type, next: h.next, kind: 'Soin' }; }),
      (data.medications || []).filter(function (m) { return m.active !== false; }).map(function (m) { return { name: m.name, next: m.endDate, kind: 'Médicament' }; })
    ).filter(function (x) { return !!x.next; });
    if (!items.length) return null;
    items.sort(function (a, b) { return isoToLocalDate(a.next) - isoToLocalDate(b.next); });
    var next = items[0];
    var st = getStatus(next.next);
    return { label: (next.name || next.kind), date: next.next, status: st };
  }


  function daysUntil(isoDate) {
    var dt = isoToLocalDate(isoDate);
    if (!dt) return null;
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((dt - todayMid) / 864e5);
  }

  function formatJDelay(isoDate) {
    var d = daysUntil(isoDate);
    if (d == null) return '—';
    if (d < 0) return 'J+' + Math.abs(d);
    if (d > 0) return 'J−' + d;
    return "aujourd'hui";
  }

  function delayTone(isoDate) {
    var d = daysUntil(isoDate);
    if (d == null) return 'ok';
    if (d < 0) return 'late';
    if (d <= 30) return 'soon';
    return 'ok';
  }

  function collectDueItemsForAnimal(data) {
    var animalName = (data.animal && data.animal.name) || 'Animal';
    var items = [];
    (data.vaccines || []).forEach(function (v) {
      if (!v.next) return;
      items.push({ animalId: data.id, animalName: animalName, kind: 'vaccine', collection: 'vaccines', id: v.id, name: v.name || 'Vaccin', next: v.next, date: v.date, vet: v.vet, frequencyDays: v.frequencyDays });
    });
    (data.dewormings || []).forEach(function (d) {
      if (!d.next) return;
      items.push({ animalId: data.id, animalName: animalName, kind: 'deworming', collection: 'dewormings', id: d.id, name: d.name || 'Déparasitage', next: d.next, date: d.date, frequencyDays: d.frequencyDays });
    });
    (data.hygiene || []).forEach(function (h) {
      if (!h.next) return;
      items.push({ animalId: data.id, animalName: animalName, kind: 'hygiene', collection: 'hygiene', id: h.id, name: h.type || 'Hygiène', next: h.next, date: h.date, frequencyDays: h.frequencyDays });
    });
    (data.medications || []).filter(function (m) { return m.active !== false && m.endDate; }).forEach(function (m) {
      items.push({ animalId: data.id, animalName: animalName, kind: 'medication', collection: 'medications', id: m.id, name: m.name || 'Médicament', next: m.endDate, date: m.startDate || m.date, endDate: m.endDate });
    });
    (data.matings || []).forEach(function (m) {
      var due = matingNextDeadline(m);
      if (!due) return;
      items.push({ animalId: data.id, animalName: animalName, kind: 'mating', collection: 'matings', id: m.id, name: due.label, next: due.date, date: m.date, deadlineField: due.field });
    });
    return items;
  }

  function collectAllDueItems() {
    var all = [];
    state.animals.forEach(function (data) {
      all = all.concat(collectDueItemsForAnimal(data));
    });
    all.sort(function (a, b) { return isoToLocalDate(a.next) - isoToLocalDate(b.next); });
    return all;
  }

  function getMostUrgentItem() {
    var all = collectAllDueItems();
    if (!all.length) return null;
    var overdue = all.filter(function (x) { return daysUntil(x.next) < 0; });
    if (overdue.length) {
      overdue.sort(function (a, b) { return daysUntil(a.next) - daysUntil(b.next); });
      return overdue[0];
    }
    return all[0];
  }

  function getPrimaryClinicPhone() {
    var dir = loadVetDirectory();
    var entries = (dir && dir.entries) || [];
    var fav = entries.find(function (e) { return e.favorite && e.phone; });
    if (fav) return { phone: fav.phone, name: fav.name || fav.clinic || 'la clinique' };
    var first = entries.find(function (e) { return e.phone && !e.emergency; });
    if (first) return { phone: first.phone, name: first.name || first.clinic || 'la clinique' };
    var any = entries.find(function (e) { return e.phone; });
    if (any) return { phone: any.phone, name: any.name || 'la clinique' };
    var o = getOwner();
    if (o && o.phone) return { phone: o.phone, name: o.clinic || 'votre clinique' };
    return null;
  }

  function findAnimalData(animalId) {
    return state.animals.find(function (a) { return a.id === animalId; }) || null;
  }

  function completeDueItem(item) {
    var data = findAnimalData(item.animalId);
    if (!data) return false;
    var list = data[item.collection];
    if (!Array.isArray(list)) return false;
    var entry = list.find(function (x) { return x.id === item.id; });
    if (!entry) return false;
    var today = todayISO();
    if (item.collection === 'matings') {
      if (item.deadlineField) entry[item.deadlineField] = today;
    } else if (item.collection === 'medications') {
      entry.endDate = today;
      entry.active = false;
    } else {
      entry.date = today;
      var freq = parseInt(entry.frequencyDays, 10);
      if (!freq || freq <= 0) freq = item.collection === 'vaccines' ? 365 : 90;
      entry.next = addDaysISO(today, freq);
      entry.frequencyDays = freq;
    }
    saveState();
    return true;
  }

  function dueEntry(item) {
    var data = findAnimalData(item.animalId);
    var list = data && data[item.collection];
    if (!Array.isArray(list)) return null;
    return list.find(function (x) { return x.id === item.id; }) || null;
  }

  // Nouvelle date après un report : à partir d'aujourd'hui si le soin est déjà
  // en retard (sinon « +7 jours » d'un soin échu depuis 30 jours resterait en retard),
  // à partir de l'échéance si elle est encore à venir.
  function snoozeTarget(item, days) {
    var entry = dueEntry(item);
    if (!entry) return '';
    var current = item.collection === 'medications' ? entry.endDate : entry.next;
    var today = todayISO();
    return addDaysISO(current && current > today ? current : today, days || 7);
  }

  function snoozeDueItem(item, days) {
    if (item.collection === 'matings') return false; // délai légal : pas de report, seulement "fait".
    var entry = dueEntry(item);
    if (!entry) return false;
    var next = snoozeTarget(item, days);
    if (item.collection === 'medications') entry.endDate = next;
    else entry.next = next;
    saveState();
    return true;
  }

  function refreshAfterReminder() {
    if (state.viewMode === 'home') renderHome();
    else refreshAll();
  }

  // Fait / Reporter : applique l'action, confirme par un toast « Annuler » qui
  // restaure l'enregistrement tel qu'il était avant.
  function applyReminder(item, kind, days) {
    var entry = dueEntry(item);
    if (!entry) return false;
    var before = JSON.parse(JSON.stringify(entry));
    var ok = kind === 'done' ? completeDueItem(item) : snoozeDueItem(item, days);
    if (!ok) return false;
    var after = dueEntry(item);
    var label = (item.name || 'Rappel') + ' de ' + item.animalName;
    var message;
    if (kind === 'later') message = label + ' reporté au ' + fmtDate(item.collection === 'medications' ? after.endDate : after.next) + '.';
    else if (item.collection === 'medications') message = 'Traitement ' + (item.name || '') + ' de ' + item.animalName + ' terminé.';
    else if (item.collection === 'matings') message = (item.name || 'Démarche') + ' de ' + item.animalName + ' marquée comme faite.';
    else message = label + ' : fait. Prochain rappel le ' + fmtDate(after.next) + '.';
    showUndoToast(message, function () {
      var data = findAnimalData(item.animalId);
      var list = data && data[item.collection];
      var idx = Array.isArray(list) ? list.findIndex(function (x) { return x.id === item.id; }) : -1;
      if (idx === -1) return;
      list[idx] = before;
      saveState();
      refreshAfterReminder();
    });
    refreshAfterReminder();
    return true;
  }

  // Sélecteur de report : popover ancré au bouton (desktop) ou feuille du bas (mobile).
  var snoozeUi = { trigger: null };
  function closeSnoozePicker(restoreFocus) {
    var el = document.getElementById('snooze-picker');
    if (!el || el.hidden) return;
    el.hidden = true;
    if (restoreFocus !== false && snoozeUi.trigger && document.body.contains(snoozeUi.trigger)) snoozeUi.trigger.focus({ preventScroll: true });
    snoozeUi.trigger = null;
  }
  function openSnoozePicker(item, trigger) {
    var el = document.getElementById('snooze-picker');
    if (!el) { applyReminder(item, 'later', 7); return; }
    snoozeUi.trigger = trigger;
    document.getElementById('sn-title').textContent = 'Reporter « ' + (item.name || 'ce rappel') + ' »';
    var options = [[1, 'Demain'], [3, 'Dans 3 jours'], [7, 'Dans 1 semaine'], [30, 'Dans 1 mois']];
    var list = document.getElementById('sn-options');
    list.innerHTML = options.map(function (o) {
      var target = snoozeTarget(item, o[0]);
      var when = isoToLocalDate(target).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      return '<button type="button" class="sn__option" data-days="' + o[0] + '"><span>' + o[1] + '</span><small>' + escapeHtml(when) + '</small></button>';
    }).join('');
    list.querySelectorAll('.sn__option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var days = parseInt(btn.getAttribute('data-days'), 10);
        closeSnoozePicker(false);
        applyReminder(item, 'later', days);
      });
    });
    var panel = el.querySelector('.qa__panel');
    panel.style.top = panel.style.left = '';
    el.hidden = false;
    if (trigger && window.matchMedia('(min-width: 1024px)').matches) {
      // Popover : sous le bouton, aligné à son bord droit, remonté s'il dépasse de l'écran.
      var r = trigger.getBoundingClientRect();
      var w = panel.offsetWidth, h = panel.offsetHeight;
      var top = r.bottom + 8;
      if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
      panel.style.top = top + 'px';
      panel.style.left = Math.max(12, Math.min(r.right - w, window.innerWidth - w - 12)) + 'px';
    }
    list.querySelector('.sn__option').focus({ preventScroll: true });
  }
  function setupSnoozePicker() {
    var el = document.getElementById('snooze-picker');
    if (!el) return;
    el.querySelectorAll('[data-sn-close]').forEach(function (b) { b.addEventListener('click', function () { closeSnoozePicker(); }); });
    document.addEventListener('keydown', function (e) {
      if (el.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSnoozePicker(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.slice.call(el.querySelectorAll('button')).filter(function (b) { return b.offsetParent !== null; });
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
    });
    window.addEventListener('resize', function () { closeSnoozePicker(false); });
    // Le popover est ancré à un bouton : s'il défile, il ne le suivrait plus.
    window.addEventListener('scroll', function (e) { if (!el.hidden && !el.contains(e.target)) closeSnoozePicker(false); }, true);
  }

  function reminderButtons(item) {
    if (item.collection === 'matings') {
      return '<button type="button" class="rem-btn rem-btn--done" data-rem="done">Déclaré</button>';
    }
    var doneLabel = item.collection === 'medications' ? 'Terminé' : 'Fait';
    return '<button type="button" class="rem-btn rem-btn--done" data-rem="done">' + doneLabel + '</button>' +
      '<button type="button" class="rem-btn rem-btn--later" data-rem="later" aria-haspopup="dialog">Reporter</button>';
  }
  function bindReminderButtons(scope, item) {
    var done = scope.querySelector('[data-rem="done"]');
    var later = scope.querySelector('[data-rem="later"]');
    if (done) done.addEventListener('click', function (e) { e.stopPropagation(); applyReminder(item, 'done'); });
    if (later) later.addEventListener('click', function (e) { e.stopPropagation(); openSnoozePicker(item, later); });
  }

  function animalIssueLine(data) {
    var next = getNextDueItem(data);
    if (!next) return '';
    var st = next.status;
    if (!st || st.cls === 'status-ok') return '';
    var d = daysUntil(next.date);
    if (d < 0) return (next.label || '') + ' · ' + Math.abs(d) + ' j de retard';
    return (next.label || '') + ' · bientôt';
  }

  function healthTone(data) {
    var h = computeHealthStatus(data);
    if (h.overdue > 0) return 'late';
    if (h.soon > 0) return 'soon';
    return 'ok';
  }

  function summarizeDomain(items, nameKey, dateKey) {
    dateKey = dateKey || 'next';
    nameKey = nameKey || 'name';
    var withNext = (items || []).filter(function (x) { return x[dateKey]; });
    if (!withNext.length) return { status: 'ok', statusLabel: '—', body: 'Aucun suivi renseigné.' };
    withNext.sort(function (a, b) { return isoToLocalDate(a[dateKey]) - isoToLocalDate(b[dateKey]); });
    var overdue = withNext.filter(function (x) { return daysUntil(x[dateKey]) < 0; });
    if (overdue.length) {
      var names = overdue.map(function (x) { return x[nameKey] || x.type; }).slice(0, 2).join(' et ');
      return { status: 'late', statusLabel: overdue.length + ' retard' + (overdue.length > 1 ? 's' : ''), body: names + ' échu' + (overdue.length > 1 ? 's' : '') + '.' };
    }
    var soon = withNext.filter(function (x) { var d = daysUntil(x[dateKey]); return d != null && d <= 0 && d >= -30; });
    if (soon.length) {
      var s = soon[0];
      return { status: 'soon', statusLabel: formatJDelay(s[dateKey]), body: (s[nameKey] || s.type) + ' le ' + fmtDate(s[dateKey]) + '.' };
    }
    var next = withNext[withNext.length - 1];
    // pick furthest? better pick nearest future
    withNext.sort(function (a, b) { return isoToLocalDate(a[dateKey]) - isoToLocalDate(b[dateKey]); });
    next = withNext[0];
    return { status: 'ok', statusLabel: 'à jour', body: (next[nameKey] || next.type || 'Prochain') + ' le ' + fmtDate(next[dateKey]) + '.' };
  }

  function protectionKey(name) {
    return String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  }

  function buildProtections(data) {
    var groups = {};
    function add(collection, item, label) {
      var key = collection + ':' + protectionKey(label);
      if (!groups[key]) groups[key] = { key: key, collection: collection, name: label, items: [] };
      groups[key].items.push(item);
    }
    (data.vaccines || []).forEach(function (v) { add('vaccines', v, v.name || 'Vaccin'); });
    (data.dewormings || []).forEach(function (d) { add('dewormings', d, d.name || 'Déparasitage'); });
    (data.hygiene || []).forEach(function (h) { add('hygiene', h, h.type || 'Hygiène'); });
    (data.medications || []).filter(function (m) { return m.active !== false; }).forEach(function (m) {
      add('medications', m, m.name || 'Traitement');
    });
    return Object.keys(groups).map(function (k) {
      var g = groups[k];
      var items = g.items.slice().sort(function (a, b) {
        var da = isoToLocalDate(a.date || a.startDate || '1970-01-01');
        var db = isoToLocalDate(b.date || b.startDate || '1970-01-01');
        return (db || 0) - (da || 0);
      });
      var latest = items[0];
      var next = g.collection === 'medications' ? latest.endDate : latest.next;
      var from = latest.date || latest.startDate || '';
      var tone = next ? delayTone(next) : 'ok';
      var statusLabel = !next ? '—' : (tone === 'late' ? ('échu ' + formatJDelay(next).replace('J+', '')) : (tone === 'soon' ? 'à surveiller' : 'à jour'));
      // coverage bar: from date to next
      var pct = 100;
      if (from && next) {
        var a = isoToLocalDate(from);
        var b = isoToLocalDate(next);
        var now = new Date();
        var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (a && b && b > a) {
          pct = Math.max(0, Math.min(110, ((todayMid - a) / (b - a)) * 100));
        }
      }
      return {
        key: g.key,
        collection: g.collection,
        name: g.name,
        sub: (latest.vet ? latest.vet + ' · ' : '') + (latest.frequencyDays ? ('tous les ' + latest.frequencyDays + ' j') : ''),
        from: from,
        to: next,
        tone: tone,
        statusLabel: statusLabel,
        pct: pct,
        history: items,
        latest: latest
      };
    }).sort(function (a, b) {
      var rank = { late: 0, soon: 1, ok: 2 };
      return (rank[a.tone] - rank[b.tone]) || ((a.to || '').localeCompare(b.to || ''));
    });
  }

  function findDuplicates(data) {
    var dups = [];
    ['vaccines', 'dewormings', 'hygiene'].forEach(function (col) {
      var list = data[col] || [];
      var seen = {};
      list.forEach(function (item) {
        var label = item.name || item.type || '';
        var key = protectionKey(label) + '|' + (item.date || '');
        if (!item.date) return;
        if (seen[key]) dups.push({ collection: col, a: seen[key], b: item, label: label, date: item.date });
        else seen[key] = item;
      });
    });
    return dups;
  }

  function isRageName(n) { return /rage|rabies/i.test(n || ''); }
  function isChppiName(n) { return /chppi|chpp|dhppi|carr[eé]/i.test(n || ''); }


  // Anneau de progression SVG : porte le statut de santé d'un animal
  // (élément signature de l'accueil, pas décoratif — l'arc encode la
  // proportion réellement à jour, sa couleur le pire statut présent).
  function buildHealthRing(status) {
    var r = 42, c = 2 * Math.PI * r;
    if (status.total === 0) {
      return '<svg class="pet-ring" viewBox="0 0 96 96" width="96" height="96">' +
        '<circle class="pet-ring__track" cx="48" cy="48" r="' + r + '" stroke-dasharray="4 6"/>' +
        '</svg>';
    }
    // L'arc grandit avec ce qui réclame de l'attention (pas l'inverse) :
    // un animal entièrement à jour montre un anneau plein et rassurant,
    // un animal entièrement en retard montre un anneau plein et alarmant.
    var tone = status.overdue > 0 ? 'overdue' : (status.soon > 0 ? 'soon' : 'ok');
    var ratio = tone === 'ok' ? 1 : (status.overdue + status.soon) / status.total;
    var offset = c * (1 - ratio);
    return '<svg class="pet-ring pet-ring--' + tone + '" viewBox="0 0 96 96" width="96" height="96">' +
      '<circle class="pet-ring__track" cx="48" cy="48" r="' + r + '"/>' +
      '<circle class="pet-ring__progress" cx="48" cy="48" r="' + r + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '"/>' +
      '</svg>';
  }

  function renderDetailPetsRow() {
    var row = document.getElementById('detail-pets-row');
    if (!row) return;
    row.hidden = state.animals.length <= 1;
    if (state.animals.length === 0) { row.innerHTML = ''; return; }

    row.innerHTML = state.animals.map(function (data) {
      var a = data.animal;
      var name = escapeHtml(a.name || 'Sans nom');
      var isActive = data.id === state.currentAnimalId;
      var avatarInner = a.avatar
        ? (typeof a.avatar === 'number'
            ? '<img data-avatar-key="' + a.avatar + '" alt="">'
            : '<img src="' + escapeHtml(a.avatar) + '" alt="">')
        : ico(a.species === 'Féline' ? 'cat' : 'paw', 28);
      return '<div class="home-pet-bubble' + (isActive ? ' active' : '') + '" data-pet-id="' + data.id + '">' +
        '<div class="home-pet-bubble__avatar">' + avatarInner + '</div>' +
        '<span class="home-pet-bubble__name">' + name + '</span>' +
        '</div>';
    }).join('') +
    '<div class="home-pet-bubble" id="detail-add-pet-bubble">' +
      '<div class="home-pet-bubble__avatar" style="border-style:dashed;font-size:22px;color:var(--text-muted)">+</div>' +
      '<span class="home-pet-bubble__name">Ajouter</span>' +
    '</div>';

    row.querySelectorAll('.home-pet-bubble[data-pet-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = parseInt(el.getAttribute('data-pet-id'), 10);
        state.currentAnimalId = id;
        uiState.petChartMode = 'weight';
        uiState.petTaskFilter = 'all';
        saveState();
        renderAnimalSelect();
        refreshAll();
      });
    });

    var addBubble = document.getElementById('detail-add-pet-bubble');
    if (addBubble) addBubble.addEventListener('click', function () { openModal('addAnimal'); });

    row.querySelectorAll('img[data-avatar-key]').forEach(function (img) {
      var key = parseInt(img.getAttribute('data-avatar-key'), 10);
      if (!isNaN(key)) getPhotoObjectUrl(key).then(function (url) { if (url) img.src = url; }).catch(function () {});
    });
  }

  function getVaccinationStripState(data) {
    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var hasRecords = ((data.vaccines || []).length + (data.dewormings || []).length) > 0;
    if (!hasRecords) {
      return { className: 'pet-vaccination-strip__badge--muted', text: 'Suivi : non renseigné' };
    }
    var overdue = false;
    function checkNext(next) {
      if (!next) return;
      var dt = isoToLocalDate(next);
      if (dt && dt < todayMid) overdue = true;
    }
    (data.vaccines || []).forEach(function (v) { checkNext(v.next); });
    (data.dewormings || []).forEach(function (d) { checkNext(d.next); });
    (data.hygiene || []).forEach(function (h) { checkNext(h.next); });
    if (overdue) return { className: 'pet-vaccination-strip__badge--warn', text: 'Vaccins / soins : à mettre à jour' };
    return { className: 'pet-vaccination-strip__badge--ok', text: 'Vaccination : à jour' };
  }

  function getLastConsultDate(data) {
    var consults = Array.isArray(data.consultations) ? data.consultations : [];
    var dates = consults.map(function (c) { return c.date; }).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  }

  function formatReproLabel(a) {
    if (a.sterilise === 'Oui') return a.sex === 'Femelle' ? 'Stérilisée' : 'Castré(e)';
    return 'Non stérilisé' + (a.sex === 'Femelle' ? 'e' : '');
  }

  function collectProfileTasks(data) {
    var out = [];
    var now = new Date();
    var horizon = new Date();
    horizon.setDate(horizon.getDate() + 21);
    var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Un animal suivi depuis longtemps accumule des rappels passés (`next`)
    // sur chaque ancien vaccin/déparasitage, supplantés depuis par une dose
    // plus récente. Sans borne basse, ces rappels obsolètes (parfois vieux
    // de plusieurs années) noient ceux réellement d'actualité — même fenêtre
    // de grâce que renderAlerts (30 jours) pour rester cohérent.
    var pastLimit = new Date(todayMid);
    pastLimit.setDate(pastLimit.getDate() - 30);

    (data.vaccines || []).forEach(function (v) {
      if (!v.next) return;
      var d = isoToLocalDate(v.next);
      if (!d || d > horizon || d < pastLimit) return;
      out.push({ kind: 'vaccine', title: v.name || 'Vaccin', sub: v.next ? 'Rappel le ' + fmtDate(v.next) : '', dateObj: d, filter: 'vaccine' });
    });
    (data.dewormings || []).forEach(function (d0) {
      if (!d0.next) return;
      var d = isoToLocalDate(d0.next);
      if (!d || d > horizon || d < pastLimit) return;
      out.push({ kind: 'deworm', title: d0.name || 'Déparasitage', sub: d0.next ? 'Rappel le ' + fmtDate(d0.next) : '', dateObj: d, filter: 'deworm' });
    });
    (data.medications || []).forEach(function (m) {
      if (m.active === false) return;
      if (m.endDate && isoToLocalDate(m.endDate) < todayMid) return;
      var kind = 'med';
      var filter = 'med';
      // Classify medications by form/type for filtering
      var form = (m.form || m.type || '').toLowerCase();
      if (form.indexOf('goutte') >= 0) { filter = 'drops'; }
      else if (form.indexOf('vitamine') >= 0 || form.indexOf('vitamin') >= 0) { filter = 'vitamin'; }
      else if (form.indexOf('repas') >= 0 || form.indexOf('nourriture') >= 0 || form.indexOf('aliment') >= 0 || form.indexOf('croquette') >= 0) { filter = 'meal'; kind = 'meal'; }
      out.push({ kind: kind, title: m.name || 'Médicament', sub: m.dosage || 'Traitement en cours', dateObj: todayMid, filter: filter });
    });

    // Also include nutrition items as meals — un journal alimentaire garde
    // plusieurs jours d'historique, donc ne remonter ici que ceux du jour
    // (sans quoi chaque repas des derniers jours se répète comme "à faire").
    if (data.nutrition) {
      (data.nutrition.meals || []).forEach(function (meal) {
        if (meal.date !== todayISO()) return;
        out.push({ kind: 'meal', title: meal.name || meal.brand || 'Repas', sub: meal.quantity || meal.dosage || '', dateObj: todayMid, filter: 'meal' });
      });
    }

    out.sort(function (a, b) { return a.dateObj - b.dateObj; });
    return out;
  }

  function renderPetProfileTasks(data) {
    var list = document.getElementById('pet-profile-tasks-list');
    if (!list) return;
    if (!data) { list.innerHTML = ''; return; }

    var all = collectProfileTasks(data);
    var filt = uiState.petTaskFilter || 'all';
    var filtered = filt === 'all' ? all : all.filter(function (t) { return t.filter === filt; });

    // Update filter badge counts
    ['med', 'drops'].forEach(function (key) {
      var badge = document.querySelector('.pet-task-filter__count[data-filter-count="' + key + '"]');
      if (!badge) return;
      var count = all.filter(function (t) { return t.filter === key; }).length;
      if (count > 0) {
        badge.hidden = false;
        badge.textContent = String(count);
      } else {
        badge.hidden = true;
      }
    });

    var times = ['09:45', '11:30', '16:40', '18:00', '20:00'];

    if (filtered.length === 0) {
      list.innerHTML = '<p class="pet-weight-chart-empty" style="padding:12px 0">Aucune tâche à venir pour cet animal.</p>';
      return;
    }

    var html = '';
    var lastPeriod = '';
    filtered.slice(0, 8).forEach(function (t, idx) {
      var time = times[idx % times.length];
      var hours = parseInt(time.split(':')[0], 10);
      var period = hours < 12 ? 'morning' : 'afternoon';

      if (period !== lastPeriod) {
        var greeting = period === 'morning' ? 'Matin' : 'Après-midi';
        html += '<div class="pet-task-separator">' +
          '<span class="pet-task-separator__dot"></span>' +
          '<span class="pet-task-separator__text">' + greeting + '</span>' +
          '</div>';
        lastPeriod = period;
      }

      var icon = t.kind === 'vaccine' ? ico('vaccine', 18) : (t.kind === 'meal' ? ico('utensils', 18) : ico('pill', 18));
      var cls = t.kind === 'vaccine' ? 'vaccine' : (t.kind === 'deworm' ? 'deworm' : (t.kind === 'meal' ? 'meal' : 'med'));
      html += '<div class="pet-task-row">' +
        '<span class="pet-task-time">' + time + '</span>' +
        '<div class="pet-task-card pet-task-card--' + cls + '">' +
        '<span class="pet-task-card__icon pet-task-card__icon--' + cls + '">' + icon + '</span>' +
        '<div class="pet-task-card__body">' +
        '<div class="pet-task-card__title">' + escapeHtml(t.title) + '</div>' +
        '<div class="pet-task-card__sub">' + escapeHtml(t.sub) + '</div>' +
        '</div>' +
        '<label class="pet-task-check"><input type="checkbox"><span class="pet-task-check__box"></span></label>' +
        '</div></div>';
    });

    list.innerHTML = html;
  }

  // ——— Today's reminders (Pawly style) ————————————————————————
  function renderHomeReminders(filterMode) {
    var list = document.getElementById('home-reminders-list');
    if (!list) return;

    var now = new Date();
    var reminders = [];
    var rangeEnd = new Date(now);
    if (filterMode === 'week') rangeEnd.setDate(rangeEnd.getDate() + 7);
    else if (filterMode === 'month') rangeEnd.setDate(rangeEnd.getDate() + 30);
    else rangeEnd.setDate(rangeEnd.getDate() + 7); // default: next 7 days
    // Voir le commentaire dans collectProfileTasks : sans borne basse, un
    // animal avec un long historique remonte ici des rappels obsolètes
    // (vieux de plusieurs années) au lieu des rappels actuels.
    var rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 30);

    state.animals.forEach(function (data) {
      var petName = data.animal.name || 'Animal';
      ['vaccines', 'dewormings'].forEach(function (type) {
        (data[type] || []).forEach(function (item) {
          if (!item.next) return;
          var nd = isoToLocalDate(item.next);
          if (nd <= rangeEnd && nd >= rangeStart) {
            reminders.push({
              type: type === 'vaccines' ? 'vaccine' : 'deworming',
              name: item.name || item.treatment || '—',
              pet: petName,
              date: item.next,
              dateObj: nd,
              overdue: nd < now
            });
          }
        });
      });

      (data.medications || []).forEach(function (m) {
        if (m.active === false || !m.endDate) return;
        var nd = isoToLocalDate(m.endDate);
        if (nd && nd <= rangeEnd) {
          reminders.push({
            type: 'medication',
            name: m.name || '—',
            pet: petName,
            date: m.endDate,
            dateObj: nd,
            overdue: nd < now
          });
        }
      });
    });

    reminders.sort(function (a, b) { return a.dateObj - b.dateObj; });

    var reminderTabs = document.querySelector('.home-reminders__tabs');
    var seeAllReminders = document.getElementById('btn-see-all-reminders');
    if (reminderTabs) reminderTabs.hidden = reminders.length === 0;
    if (seeAllReminders) seeAllReminders.hidden = reminders.length === 0;

    if (reminders.length === 0) {
      var hasAnimals = state.animals.length > 0;
      var emptyCopy = !hasAnimals
        ? 'Les prochains soins et rendez-vous apparaîtront ici une fois son carnet créé.'
        : filterMode === 'week'
          ? 'Aucun rappel prévu cette semaine.'
          : filterMode === 'month'
            ? 'Aucun rappel prévu ce mois-ci.'
            : 'Aucun rappel à venir. Tout est à jour.';
      var emptyAction = hasAnimals
        ? '<button type="button" class="action-pill action-pill--primary" id="btn-add-reminder-empty">Créer un rappel</button>'
        : '';
      list.innerHTML = '<div class="home-reminders__empty">' +
        '<div class="home-reminders__empty-icon">' + ico('clipboard', 18) + '</div>' +
        '<p class="home-reminders__empty-text">' + emptyCopy + '</p>' +
        emptyAction +
        '</div>';
      var addBtn = document.getElementById('btn-add-reminder-empty');
      if (addBtn) addBtn.addEventListener('click', function () {
        showDetail();
        switchTab('alertes');
      });
      return;
    }

    list.innerHTML = reminders.slice(0, 5).map(function (r) {
      var icon = r.type === 'vaccine' ? ico('vaccine', 18) : ico('pill', 18);
      var iconClass = r.type === 'vaccine' ? 'vaccine' : 'deworming';
      if (r.type === 'medication') { icon = ico('pill', 18); iconClass = 'deworming'; }
      var dateStr = fmtDate(r.date);
      return '<div class="home-reminder-card">' +
        '<div class="home-reminder-card__icon home-reminder-card__icon--' + iconClass + '">' + icon + '</div>' +
        '<div class="home-reminder-card__content">' +
        '<div class="home-reminder-card__title">' + escapeHtml(r.name) + '</div>' +
        '<div class="home-reminder-card__meta">' + escapeHtml(r.pet) + ' · ' + dateStr + (r.overdue ? ' <span style="color:var(--color-error);font-weight:600">En retard</span>' : '') + '</div>' +
        '</div></div>';
    }).join('');
  }

  // ——— Recommended vets & tips (Pawly style) ————————————————
  function renderHomeVetsAndTips() {
    var vetsScroll = document.getElementById('home-vets-scroll');
    var tipsScroll = document.getElementById('home-tips-scroll');

    if (vetsScroll) {
      var vets = loadVetDirectory().entries.slice(0, 5);
      if (vets.length === 0) {
        vetsScroll.innerHTML = '<button type="button" class="home-vet-card home-vet-card--empty" id="home-add-vet-cta">' +
          '<div class="home-vet-card__img">' + ico('hospital', 24) + '</div>' +
          '<div class="home-vet-card__body"><div class="home-vet-card__name">Ajoutez votre vétérinaire</div>' +
          '<div class="home-vet-card__specialty">Coordonnées à portée de main en cas de besoin</div></div></button>';
        var addVetBtn = document.getElementById('home-add-vet-cta');
        if (addVetBtn) addVetBtn.addEventListener('click', function () {
          if (state.animals.length > 0) showDetail({ tab: 'annuaire' });
        });
      } else {
        vetsScroll.innerHTML = vets.map(function (v) {
          return '<div class="home-vet-card"><div class="home-vet-card__img">' + ico('hospital', 24) + '</div>' +
            '<div class="home-vet-card__body"><div class="home-vet-card__name">' + escapeHtml(v.name || '—') + '</div>' +
            '<div class="home-vet-card__specialty">' + escapeHtml(v.clinic || 'Clinique vétérinaire') + '</div></div></div>';
        }).join('');
      }
    }

    if (tipsScroll) {
      tipsScroll.innerHTML = DEFAULT_TIPS.slice(0, 4).map(function (tip) {
        return '<div class="home-tip-card"><div class="home-tip-card__img">' + ico('activity', 18) + '</div>' +
          '<div class="home-tip-card__body"><div class="home-tip-card__title">' + escapeHtml(tip.title) + '</div></div></div>';
      }).join('');
    }
  }

  // Serene Pet Care shell — shares the existing routes and persisted records.
  var careLinks = [
    ['Vue d’ensemble', [['home', 'Tableau de bord', 'clipboard'], ['calendar', 'Agenda & rappels', 'calendar'], ['directory', 'Annuaire & urgences', 'hospital']]],
    ['Carnet de santé', [['historique', 'Frise du carnet', 'clipboard'], ['profil', 'Fiche & passeport', 'paw'], ['vaccins', 'Vaccins', 'vaccine'], ['medications', 'Traitements', 'pill'], ['deworming', 'Déparasitage', 'pill'], ['hygiene', 'Hygiène & soins', 'droplet'], ['consultations', 'Consultations & budget', 'stethoscope'], ['photos', 'Album photos', 'camera']]],
    ['Suivi quotidien', [['poids', 'Courbe de poids', 'scale'], ['nutrition', 'Nutrition & repas', 'utensils'], ['activites', 'Activités & balades', 'activity'], ['chaleurs', 'Chaleurs & cycles', 'heart'], ['reproduction', 'Reproduction', 'heart'], ['suivi', 'Journal quotidien', 'fileText'], ['checkup', 'Check-up', 'check']]],
    ['À vos côtés', [['events', 'Événements', 'calendar'], ['tips', 'Astuces & conseils', 'lightbulb'], ['help', 'Centre d’aide', 'info'], ['account', 'Compte & paramètres', 'user']]]
  ];
  function careButton(route, label, icon, primary) {
    return '<button type="button" class="care-action' + (primary ? ' care-action--primary' : '') + '" data-care-route="' + route + '">' + ico(icon, 18) + '<span>' + label + '</span></button>';
  }
  function renderCareSidebar() {
    var el = document.getElementById('care-sidebar');
    if (!el) return;
    el.innerHTML = '<div class="care-brand">' + ico('heart', 28) + '<div>App’lika<small>Santé & bien-être animal</small></div></div>' +
      '<label class="care-pet-select">Mon compagnon<select id="care-pet-select" aria-label="Animal actif">' +
      (state.animals.length ? state.animals.map(function (d) { return '<option value="' + d.id + '"' + (getCurrent().id === d.id ? ' selected' : '') + '>' + escapeHtml(d.animal.name || 'Sans nom') + '</option>'; }).join('') : '<option>Ajouter un animal</option>') + '</select></label>' +
      careLinks.map(function (group) { return '<div class="care-nav-group"><p>' + group[0] + '</p>' + group[1].map(function (link) { return careButton(link[0], link[1], link[2]); }).join('') + '</div>'; }).join('') + '<div class="care-sidebar-foot">Un carnet, toute leur vie.' + careButton('addAnimal', 'Ajouter un animal', 'plus') + '</div>';
    var mobileMenu = document.getElementById('care-mobile-route');
    mobileMenu.innerHTML = '<option value="">Toutes les rubriques</option>' + careLinks.map(function (group) { return '<optgroup label="' + group[0] + '">' + group[1].map(function (link) { return '<option value="' + link[0] + '">' + link[1] + '</option>'; }).join('') + '</optgroup>'; }).join('');
    mobileMenu.onchange = function () { var target = el.querySelector('[data-care-route="' + mobileMenu.value + '"]'); if (target) target.click(); };
    document.getElementById('care-pet-select').addEventListener('change', function (e) {
      state.currentAnimalId = Number(e.target.value); saveState(); refreshAll();
      if (state.viewMode === 'home') renderHome(); else showDetail({ tab: 'profil', nav: 'pets' });
    });
  }
  function markCareRoute(route) {
    document.querySelectorAll('.stitch-community-nav [data-care-route]').forEach(function (button) {
      var active = button.dataset.careRoute === route;
      button.classList.toggle('care-action--primary', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    var menu = document.getElementById('care-mobile-route');
    if (menu) menu.value = route;
    document.querySelectorAll('.care-sidebar [data-care-route]').forEach(function (b) {
      var active = b.dataset.careRoute === route;
      b.classList.toggle('is-active', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  function renderCareDashboard() {
    var el = document.getElementById('care-dashboard');
    if (!el) return;
    var data = getCurrent();
    var owner = getOwner();
    var greeting = 'Bonjour' + (owner.name ? ' ' + owner.name.split(' ')[0] : '') + ' !';
    var a = data ? data.animal : {};
    var portrait = data ? '<div class="care-portrait">' + ico(a.species === 'Féline' ? 'cat' : 'paw', 38) + '</div>' : '';
    var actions = careButton('addVaccin', 'Enregistrer un soin', 'plus', true) + careButton('addWeight', 'Pesée', 'scale') + careButton('addMeal', 'Repas', 'utensils');
    var dueNow = data ? collectDueItemsForAnimal(data) : [];
    var lateNow = dueNow.filter(function (x) { return daysUntil(x.next) < 0; }).length;
    var soonNow = dueNow.filter(function (x) { var d = daysUntil(x.next); return d >= 0 && d <= 30; }).length;
    var statusChip = '';
    if (data) {
      var chipKind = lateNow ? 'late' : soonNow ? 'soon' : 'ok';
      var chipText = lateNow ? lateNow + ' soin' + (lateNow > 1 ? 's' : '') + ' en retard' : soonNow ? soonNow + ' soin' + (soonNow > 1 ? 's' : '') + ' à prévoir ce mois-ci' : 'Carnet à jour';
      statusChip = '<span class="care-status care-status--' + chipKind + '">' + escapeHtml(chipText) + '</span>';
    }
    var today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    today = today.charAt(0).toUpperCase() + today.slice(1);
    el.innerHTML = '<div class="care-welcome">' + portrait + '<div class="care-welcome-copy"><h1>' + escapeHtml(greeting) + '</h1><p>' + escapeHtml(today) + '. ' + (data ? 'Retrouvez le carnet de ' + escapeHtml(a.name || 'votre compagnon') + ' et ses prochains soins.' : 'Un petit geste aujourd’hui, une belle vie à leurs côtés.') + '</p>' + statusChip + '</div><div class="care-actions">' + (data ? actions : careButton('addAnimal', 'Ajouter mon animal', 'plus', true)) + '</div></div>';
    if (!data) {
      el.innerHTML += '<section class="care-preview" aria-label="Aperçu du carnet, exemple"><div class="care-preview__head"><span class="care-eyebrow">Exemple de carnet</span><span class="care-preview__tag">Données fictives</span></div><div class="care-preview__body"><div class="care-preview__pet"><svg class="care-ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="32" fill="none" stroke="var(--mint-soft)" stroke-width="8"/><circle cx="40" cy="40" r="32" fill="none" stroke="var(--brand-mid)" stroke-width="8" stroke-linecap="round" stroke-dasharray="165 201" transform="rotate(-90 40 40)"/><text x="40" y="45" text-anchor="middle">82%</text></svg><div><strong>Nala</strong><small>Labrador · 3 ans · 24,6 kg</small><span class="care-status care-status--soon">2 soins à prévoir</span></div></div><ul class="care-preview__list"><li class="is-late"><span class="care-preview__icon">' + ico('vaccine',18) + '</span><span><b>Rappel vaccin annuel</b><small>En retard de 3 jours</small></span></li><li><span class="care-preview__icon">' + ico('pill',18) + '</span><span><b>Vermifuge</b><small>Dans 6 jours</small></span></li><li><span class="care-preview__icon">' + ico('scale',18) + '</span><span><b>Pesée · 24,6 kg</b><small>Il y a 2 jours, +0,2 kg</small></span></li></ul></div><p class="care-preview__foot">Votre carnet ressemblera à ceci dès le premier animal ajouté.</p></section>';
      return;
    }
    var due = collectDueItemsForAnimal(data);
    var late = due.filter(function (x) { return daysUntil(x.next) < 0; }).length;
    var weight = a.weight != null && a.weight !== '' ? uW(a.weight) : 'À renseigner';
    var meals = ((data.nutrition || {}).meals || []).filter(function (m) { return m.date === todayISO(); });
    var since = new Date(); since.setFullYear(since.getFullYear() - 1);
    var visits = (data.consultations || []).filter(function (c) { return c.date && isoToLocalDate(c.date) >= since; });
    var spent = visits.reduce(function (sum,c) { return sum + (Number(c.cost) || 0); }, 0);
    var metrics = [
      ['vaccine','Suivi des rappels', late ? late + ' en retard' : due.length ? 'À jour' : 'À compléter', due.length + ' échéance(s) enregistrée(s)', 'vaccins'],
      ['scale','Poids actuel',weight, a.race || 'Suivi de la croissance', 'poids'],
      ['utensils','Repas du jour',String(meals.length), 'Repas consignés aujourd’hui', 'nutrition'],
      ['stethoscope','Budget santé · 12 mois',spent.toLocaleString('fr-FR') + ' €',visits.length + ' consultation(s)', 'consultations']
    ];
    el.innerHTML += '<div class="care-metrics">' + metrics.map(function (m) { return '<button type="button" class="care-card care-metric" data-care-route="' + m[4] + '"><span class="care-metric-icon">' + ico(m[0],22) + '</span><span class="care-eyebrow">' + m[1] + '</span><strong>' + escapeHtml(m[2]) + '</strong><small>' + escapeHtml(m[3]) + '</small></button>'; }).join('') + '</div>';
    var history = (a.weightHistory || []).filter(function (w) { return Number(w.weight) > 0 && w.date; }).sort(function (x,y) { return x.date.localeCompare(y.date); }).slice(-12);
    var chart = '<div class="care-chart-empty">' + ico('activity',36) + '<p>Les pesées dessineront ici sa courbe de croissance.</p>' + careButton('addWeight','Ajouter une pesée','plus') + '</div>';
    if (history.length) {
      var values = history.map(function (w) { return Number(w.weight); });
      var lo = Math.min.apply(null,values) - 1, hi = Math.max.apply(null,values) + 1;
      var points = values.map(function (v,i) { return [35 + i * 530 / Math.max(1,values.length-1), 155 - (v-lo)/(hi-lo)*120]; });
      chart = '<svg class="care-chart" viewBox="0 0 600 200" role="img" aria-label="Évolution des ' + history.length + ' dernières pesées"><path d="M35 35H565 M35 95H565 M35 155H565" fill="none" stroke="var(--border)" stroke-dasharray="4 4"/><polyline points="' + points.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="var(--brand)" stroke-width="3"/>' + points.map(function (p,i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="var(--card-bg)" stroke="var(--brand)" stroke-width="2"><title>' + escapeHtml(fmtDate(history[i].date) + ' : ' + values[i] + ' kg') + '</title></circle>'; }).join('') + '<text x="35" y="185">' + escapeHtml(fmtDate(history[0].date)) + '</text><text x="565" y="185" text-anchor="end">' + escapeHtml(fmtDate(history[history.length-1].date)) + '</text></svg>';
    }
    el.innerHTML += '<div class="care-overview"><article class="care-card"><div class="care-card-head"><h2>Courbe de poids & croissance</h2>' + careButton('addWeight','Ajouter','plus') + '</div><p>Chaque mesure compte pour son bien-être.</p>' + chart + '</article><article class="care-card care-companion"><span class="care-eyebrow">Le carnet de votre compagnon</span><h2>' + escapeHtml(a.name || 'Mon animal') + '</h2><p>' + escapeHtml([a.species,a.race].filter(Boolean).join(' · ')) + '</p>' + careButton('profil','Identité & passeport','paw') + careButton('photos','Photos & souvenirs','camera') + careButton('calendar','Prochains rendez-vous','calendar') + '</article></div>';
    el.innerHTML += '<div class="stitch-home-links"><article class="stitch-card"><h2>Astuces & conseils</h2><p>Retrouvez les conseils pour accompagner son quotidien.</p>' + careButton('tips', 'Explorer les conseils', 'lightbulb') + '</article><article class="stitch-card"><h2>Événements canins</h2><p>Adoption, rencontres et sensibilisation : explorez le calendrier.</p>' + careButton('events', 'Voir les événements', 'calendar') + '</article></div>';
    if (a.avatar) {
      var portraitEl = el.querySelector('.care-portrait');
      var portraitImg = document.createElement('img');
      portraitImg.alt = a.name || 'Votre compagnon';
      portraitEl.replaceChildren(portraitImg);
      if (typeof a.avatar === 'number') getPhotoObjectUrl(a.avatar).then(function (url) { if (url) portraitImg.src = url; }).catch(function () {});
      else portraitImg.src = a.avatar;
    }

  }

  function renderHome() {
    renderCareDashboard();
    var urgencyEl = document.getElementById('home-urgency');
    var ensuiteWrap = document.getElementById('home-ensuite-wrap');
    var ensuiteList = document.getElementById('home-ensuite-list');
    var ensuiteCount = document.getElementById('home-ensuite-count');
    var petsWrap = document.getElementById('home-pets-wrap');
    var petsStrip = document.getElementById('home-pets-strip');
    if (!urgencyEl) return;

    if (state.animals.length === 0) {
      urgencyEl.hidden = true;
      if (ensuiteWrap) ensuiteWrap.hidden = true;
      if (petsWrap) petsWrap.hidden = true;
      return;
    }
    var all = collectAllDueItems();
    var urgent = getMostUrgentItem();
    var clinic = getPrimaryClinicPhone();

    if (!urgent) {
      var nextFuture = all[0];
      urgencyEl.hidden = false;
      urgencyEl.className = 'home-urgency home-urgency--ok';
      var nextCopy = nextFuture
        ? ('Prochaine échéance le ' + fmtDate(nextFuture.next) + ' — ' + (nextFuture.name || '') + ' pour ' + nextFuture.animalName + '.')
        : 'Ajoutez un vaccin ou un rappel pour démarrer le suivi.';
      urgencyEl.innerHTML =
        '<div class="home-urgency__eyebrow">À faire maintenant</div>' +
        '<div class="home-urgency__title">Tout est à jour.</div>' +
        '<div class="home-urgency__sub">' + escapeHtml(nextCopy) + '</div>';
    } else {
      var daysLate = daysUntil(urgent.next);
      var title;
      if (daysLate < 0) {
        title = urgent.animalName + ' attend son ' + (urgent.name || 'rappel') + ' depuis ' + Math.abs(daysLate) + ' jour' + (Math.abs(daysLate) > 1 ? 's' : '') + '.';
      } else if (daysLate === 0) {
        title = urgent.animalName + ' — ' + (urgent.name || 'rappel') + " aujourd'hui.";
      } else {
        title = urgent.animalName + ' — ' + (urgent.name || 'rappel') + ' dans ' + daysLate + ' jour' + (daysLate > 1 ? 's' : '') + '.';
      }
      var isMatingUrgent = urgent.collection === 'matings';
      var sameAnimal = all.filter(function (x) {
        return x.animalId === urgent.animalId && daysUntil(x.next) < 0 &&
          !(x.collection === urgent.collection && x.id === urgent.id) &&
          String(x.name || '').toLowerCase() !== String(urgent.name || '').toLowerCase();
      });
      var sub = isMatingUrgent
        ? 'Démarche administrative à effectuer auprès du registre (LOF/LOMAD).'
        : sameAnimal.length
          ? (sameAnimal[0].name + ' est échu aussi.' + (clinic ? ' Les deux se font en une visite chez ' + clinic.name + '.' : ''))
          : (clinic ? ('Chez ' + clinic.name + '.') : 'Planifiez la visite dès que possible.');
      var callLabel = isMatingUrgent ? 'Voir la fiche' : (clinic ? 'Appeler la clinique' : 'Voir l’annuaire');
      var doneLabel = urgent.collection === 'medications' ? 'Terminé' : (isMatingUrgent ? 'Déclaré' : 'Fait');
      urgencyEl.hidden = false;
      urgencyEl.className = 'home-urgency';
      urgencyEl.innerHTML =
        '<div class="home-urgency__eyebrow">À faire maintenant</div>' +
        '<div class="home-urgency__title">' + escapeHtml(title) + '</div>' +
        '<div class="home-urgency__sub">' + escapeHtml(sub) + '</div>' +
        '<div class="home-urgency__actions">' +
        '<button type="button" class="home-urgency__btn home-urgency__btn--primary" id="home-urgency-call">' + escapeHtml(callLabel) + '</button>' +
        '<button type="button" class="home-urgency__btn home-urgency__btn--ghost" id="home-urgency-done">' + escapeHtml(doneLabel) + '</button>' +
        (isMatingUrgent ? '' : '<button type="button" class="home-urgency__btn home-urgency__btn--ghost" id="home-urgency-later" aria-haspopup="dialog">Reporter</button>') +
        '</div>';
      urgencyEl._urgentItem = urgent;

      var callBtn = document.getElementById('home-urgency-call');
      if (callBtn) callBtn.addEventListener('click', function () {
        if (isMatingUrgent) { state.currentAnimalId = urgent.animalId; saveState(); showDetail({ tab: 'reproduction', nav: 'pets' }); }
        else if (clinic && clinic.phone) window.location.href = 'tel:' + clinic.phone.replace(/\s+/g, '');
        else showDirectory();
      });
      var doneBtn = document.getElementById('home-urgency-done');
      if (doneBtn) doneBtn.addEventListener('click', function () { applyReminder(urgent, 'done'); });
      var laterBtn = document.getElementById('home-urgency-later');
      if (laterBtn) laterBtn.addEventListener('click', function () { openSnoozePicker(urgent, laterBtn); });
    }

    var queue = all.filter(function (x) { return !urgent || x.id !== urgent.id || x.animalId !== urgent.animalId || x.collection !== urgent.collection; });
    // Also exclude exact same urgent item
    if (urgent) {
      queue = all.filter(function (x) {
        return !(x.animalId === urgent.animalId && x.collection === urgent.collection && x.id === urgent.id);
      });
    }
    queue = queue.slice(0, 5);
    if (ensuiteWrap && ensuiteList) {
      if (!queue.length) {
        ensuiteWrap.hidden = true;
      } else {
        ensuiteWrap.hidden = false;
        if (ensuiteCount) ensuiteCount.textContent = queue.length + ' élément' + (queue.length > 1 ? 's' : '');
        ensuiteList.innerHTML = queue.map(function (item) {
          var tone = delayTone(item.next);
          var actionLabel = tone === 'late' || tone === 'soon' ? 'Valider' : 'Ouvrir';
          return '<div class="home-queue__row" data-animal-id="' + item.animalId + '" data-collection="' + item.collection + '" data-id="' + item.id + '">' +
            '<span class="home-queue__delay home-queue__delay--' + tone + '">' + escapeHtml(formatJDelay(item.next)) + '</span>' +
            '<span class="home-queue__label">' + escapeHtml((item.name || '') + ' — ' + item.animalName) + '</span>' +
            '<span class="home-queue__actions">' + (actionLabel === 'Valider' ? reminderButtons(item) : '<button type="button" class="home-queue__action" data-action="open">Ouvrir</button>') + '</span>' +
            '</div>';
        }).join('');
        ensuiteList.querySelectorAll('.home-queue__row').forEach(function (row) {
          var animalId = parseInt(row.getAttribute('data-animal-id'), 10);
          var collection = row.getAttribute('data-collection');
          var id = parseInt(row.getAttribute('data-id'), 10);
          var item = all.find(function (x) { return x.animalId === animalId && x.collection === collection && x.id === id; });
          row.addEventListener('click', function (e) {
            if (e.target.closest('.home-queue__action')) return;
            state.currentAnimalId = animalId;
            saveState();
            showDetail({ tab: 'actes', nav: 'pets' });
          });
          if (item) bindReminderButtons(row, item);
          var act = row.querySelector('.home-queue__action');
          if (act) act.addEventListener('click', function (e) {
            e.stopPropagation();
            state.currentAnimalId = animalId;
            saveState();
            showDetail({ tab: 'actes', nav: 'pets' });
          });
        });
      }
    }

    if (petsWrap && petsStrip) {
      petsWrap.hidden = false;
      petsStrip.innerHTML = state.animals.map(function (data) {
        var a = data.animal;
        var tone = healthTone(data);
        var short = animalIssueLine(data) || (a.race || a.species || '');
        if (short.length > 18) short = short.slice(0, 16) + '…';
        var avatarInner = a.avatar
          ? (typeof a.avatar === 'number'
              ? '<img data-avatar-key="' + a.avatar + '" alt="">'
              : '<img src="' + escapeHtml(a.avatar) + '" alt="">')
          : ico(a.species === 'Féline' ? 'cat' : 'paw', 28);
        return '<button type="button" class="home-pet-chip" data-animal-id="' + data.id + '">' +
          '<div class="home-pet-chip__avatar home-pet-chip__avatar--' + tone + '">' + avatarInner + '</div>' +
          '<div class="home-pet-chip__name">' + escapeHtml(a.name || 'Sans nom') + '</div>' +
          '<div class="home-pet-chip__meta">' + escapeHtml(short) + '</div>' +
          '</button>';
      }).join('');
      petsStrip.querySelectorAll('.home-pet-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          state.currentAnimalId = parseInt(chip.getAttribute('data-animal-id'), 10);
          saveState();
          showDetail({ tab: 'profil', nav: 'pets' });
        });
      });
      petsStrip.querySelectorAll('img[data-avatar-key]').forEach(function (img) {
        var key = parseInt(img.getAttribute('data-avatar-key'), 10);
        if (!isNaN(key)) getPhotoObjectUrl(key).then(function (url) { if (url) img.src = url; }).catch(function () {});
      });
    }

    var seeAll = document.getElementById('home-see-all-pets');
    if (seeAll) seeAll.onclick = function () {
      if (state.animals.length) showDetail({ tab: 'profil', nav: 'pets' });
      else openModal('addAnimal');
    };
  }

  function renderAnimalRail(filterQ) {
    var needEl = document.getElementById('animal-rail-need');
    var okEl = document.getElementById('animal-rail-ok');
    if (!needEl || !okEl) return;
    filterQ = (filterQ || '').toLowerCase().trim();
    var need = [];
    var ok = [];
    state.animals.forEach(function (data) {
      var name = (data.animal && data.animal.name) || '';
      if (filterQ && name.toLowerCase().indexOf(filterQ) === -1) return;
      var tone = healthTone(data);
      var issue = animalIssueLine(data);
      var entry = { data: data, tone: tone, issue: issue, severity: tone === 'late' ? 0 : (tone === 'soon' ? 1 : 2) };
      if (tone === 'ok') ok.push(entry);
      else need.push(entry);
    });
    need.sort(function (a, b) { return a.severity - b.severity; });
    function renderGroup(el, items, title) {
      if (!items.length) { el.innerHTML = ''; return; }
      el.innerHTML = '<div class="animal-rail__group">' + title + ' · ' + items.length + '</div>' +
        items.map(function (e) {
          var a = e.data.animal;
          var active = e.data.id === state.currentAnimalId;
          return '<button type="button" class="animal-rail__row' + (active ? ' is-active' : '') + '" data-animal-id="' + e.data.id + '">' +
            '<span class="animal-rail__dot animal-rail__dot--' + e.tone + '"></span>' +
            '<span style="flex:1;min-width:0"><span class="animal-rail__name">' + escapeHtml(a.name || 'Sans nom') + '</span>' +
            (e.issue ? '<span class="animal-rail__issue">' + escapeHtml(e.issue) + '</span>' : '') +
            '</span></button>';
        }).join('');
      el.querySelectorAll('.animal-rail__row').forEach(function (row) {
        row.addEventListener('click', function () {
          state.currentAnimalId = parseInt(row.getAttribute('data-animal-id'), 10);
          saveState();
          renderAnimalSelect();
          refreshAll();
          renderAnimalRail(document.getElementById('animal-rail-search') && document.getElementById('animal-rail-search').value);
        });
      });
    }
    renderGroup(needEl, need, 'Demandent une action');
    renderGroup(okEl, ok, 'À jour');
  }

  function renderDossierHeader() {
    var data = getCurrent();
    if (!data) return;
    var a = data.animal;
    var nameEl = document.getElementById('dossier-name');
    var lineEl = document.getElementById('dossier-line');
    var avEl = document.getElementById('dossier-avatar');
    if (nameEl) nameEl.textContent = a.name || 'Animal';
    if (lineEl) {
      var age = a.dob ? (function () {
        var m = calculateAgeMonths(a.dob);
        return m == null ? '' : (m < 24 ? m + ' mois' : Math.floor(m / 12) + ' ans');
      })() : '';
      lineEl.textContent = [a.race || a.species, a.sex, age, a.sterilise === 'Oui' ? 'stérilisé' : ''].filter(Boolean).join(' · ');
    }
    var headerEl = document.getElementById('dossier-header');
    var statusEl = document.getElementById('dossier-status');
    if (headerEl && statusEl) {
      var dueH = collectDueItemsForAnimal(data);
      var lateH = dueH.filter(function (x) { return daysUntil(x.next) < 0; }).length;
      var soonH = dueH.filter(function (x) { var dd = daysUntil(x.next); return dd >= 0 && dd <= 30; }).length;
      var kindH = lateH ? 'late' : soonH ? 'soon' : 'ok';
      headerEl.setAttribute('data-status', kindH);
      statusEl.innerHTML = '<span class="care-status care-status--' + kindH + '">' + escapeHtml(lateH ? lateH + ' soin' + (lateH > 1 ? 's' : '') + ' en retard' : soonH ? soonH + ' soin' + (soonH > 1 ? 's' : '') + ' à prévoir ce mois-ci' : 'Carnet à jour') + '</span>';
    }
    if (avEl) {
      if (a.avatar && typeof a.avatar === 'number') {
        avEl.innerHTML = '<img data-avatar-key="' + a.avatar + '" alt="">';
        getPhotoObjectUrl(a.avatar).then(function (url) {
          var img = avEl.querySelector('img');
          if (img && url) img.src = url;
        }).catch(function () {});
      } else if (a.avatar) {
        avEl.innerHTML = '<img src="' + escapeHtml(a.avatar) + '" alt="">';
      } else {
        avEl.innerHTML = ico(a.species === 'Féline' ? 'cat' : 'paw', 28);
        avEl.style.fontSize = '28px';
      }
    }
  }

  function stitchInfo(label, value, icon) {
    return '<div class="identity-field">' + ico(icon || 'fileText', 18) + '<div><span>' + label + '</span><strong>' + escapeHtml(value || 'Non renseigné') + '</strong></div></div>';
  }
  function renderHealthOverview() {
    var data = getCurrent();
    if (!data) return;
    var due = collectDueItemsForAnimal(data);
    var late = due.filter(function (x) { return daysUntil(x.next) < 0; }).length;
    var soon = due.filter(function (x) { var days = daysUntil(x.next); return days >= 0 && days <= 14; }).length;
    var text = late ? late + ' rappel(s) en retard' : soon ? soon + ' soin(s) à prévoir dans les 14 jours' : 'Vos soins, réunis dans un même carnet';
    ['vaccins','deworming','hygiene','medications'].forEach(function (key) {
      var el = document.getElementById('health-overview-' + key);
      if (el) el.innerHTML = '<div><h2>Carnet de santé & soins</h2><p>' + escapeHtml(text) + '</p></div><div class="stitch-record-tags"><span>' + (data.vaccines || []).length + ' vaccin(s)</span><span>' + (data.dewormings || []).length + ' déparasitage(s)</span></div>';
    });
  }

  function renderIdentity() {
    var data = getCurrent();
    if (!data) return;
    var a = data.animal, o = getOwner(), pedigree = data.pedigree || {};
    var breedUrl = centraleCanineBreedUrl(a.race);
    document.getElementById('identity-passport').innerHTML = '<h2>Identité & passeport</h2>' +
      stitchInfo('Puce électronique', a.chip, 'qr') + stitchInfo('Registre / pedigree', [pedigree.registry, pedigree.registryNumber].filter(Boolean).join(' · '), 'fileText') +
      stitchInfo('Date de naissance', a.dob ? fmtDate(a.dob) : '', 'calendar') + stitchInfo('Stérilisation', a.sterilise, 'heart') +
      stitchInfo('Clinique référente', o.clinic, 'hospital') +
      '<button type="button" class="care-action" data-stitch-action="editAnimal">Compléter sa fiche</button>' +
      '<button type="button" class="care-action" data-stitch-action="editPedigree">' + ico('trophy', 16) + '<span>Modifier le pedigree</span></button>' +
      (breedUrl ? '<a class="care-action" href="' + breedUrl + '" target="_blank" rel="noopener">' + ico('fileText', 16) + '<span>Standard de la race (Centrale Canine)</span></a>' : '');
    document.getElementById('identity-owner').innerHTML = '<h2>Fiche propriétaire</h2><p>Contact principal pour votre compagnon.</p>' +
      stitchInfo('Nom', o.name, 'user') + stitchInfo('Téléphone', o.phone, 'phone') + stitchInfo('E-mail', o.email, 'fileText') + stitchInfo('Adresse', o.address, 'mapPin') + '<button type="button" class="care-action" data-stitch-action="editOwner">Modifier mes coordonnées</button>';
  }

  // Fiche : ce qui demande une action d'abord, l'état de santé ensuite, les constantes après ;
  // l'identité et le propriétaire vivent dans la colonne latérale (CSS).
  function ficheCompleteness(data) {
    var a = data.animal, o = getOwner();
    var fields = [
      { label: 'Date de naissance', ok: !!a.dob },
      { label: 'Poids', ok: a.weight != null && a.weight !== '' },
      { label: 'Race', ok: !!a.race },
      { label: 'Puce électronique', ok: !!a.chip },
      { label: 'Clinique référente', ok: !!o.clinic },
      { label: 'Téléphone', ok: !!o.phone }
    ];
    return { fields: fields, done: fields.filter(function (f) { return f.ok; }).length };
  }

  function friseLastDate(items, key) {
    var dates = (items || []).map(function (x) { return x[key || 'date']; }).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : '';
  }

  function ficheSpark(values) {
    if (values.length < 2) return '';
    var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    if (lo === hi) { lo -= 0.5; hi += 0.5; }
    var pts = values.map(function (v, i) { return [4 + i * 112 / (values.length - 1), 28 - (v - lo) / (hi - lo) * 24]; });
    var last = pts[pts.length - 1];
    return '<svg class="fiche-spark" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="var(--brand-mid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3" fill="var(--brand-mid)"/></svg>';
  }

  function renderFicheV1() {
    renderIdentity();
    renderPedigree();
    renderHealthOverview();
    var data = getCurrent();
    var metrics = document.getElementById('fiche-metrics');
    var domains = document.getElementById('fiche-domains');
    var watch = document.getElementById('fiche-watch');
    var complete = document.getElementById('fiche-complete');
    if (!data || !metrics) return;
    var a = data.animal;
    var name = a.name || 'votre compagnon';

    // 0. Complétude de la fiche (relais de l'onboarding en une étape)
    if (complete) {
      var c = ficheCompleteness(data);
      if (c.done === c.fields.length) complete.hidden = true;
      else {
        var missing = c.fields.filter(function (f) { return !f.ok; });
        var ownerOnly = missing.every(function (f) { return f.label === 'Clinique référente' || f.label === 'Téléphone'; });
        complete.hidden = false;
        complete.innerHTML = '<div class="fiche-complete__top"><div><strong>Compléter la fiche de ' + escapeHtml(name) + '</strong><span>' + c.done + ' sur ' + c.fields.length + ' renseignés</span></div>' +
          '<button type="button" class="rem-btn rem-btn--done" data-stitch-action="' + (ownerOnly ? 'editOwner' : 'editAnimal') + '">Compléter</button></div>' +
          '<div class="fiche-complete__bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + c.fields.length + '" aria-valuenow="' + c.done + '" aria-label="Fiche renseignée à ' + Math.round(c.done / c.fields.length * 100) + ' %"><span style="width:' + (c.done / c.fields.length * 100) + '%"></span></div>' +
          '<div class="fiche-complete__missing">' + missing.map(function (f) { return '<span>' + escapeHtml(f.label) + '</span>'; }).join('') + '</div>';
      }
    }

    // 1. À surveiller : soins en retard puis à venir, avec Fait / Reporter
    if (watch) {
      var dues = collectDueItemsForAnimal(data).sort(function (x, y) { return x.next.localeCompare(y.next); });
      if (!dues.length) {
        watch.innerHTML = '<div class="ag__todo-empty">' + ico('check', 20) + '<span>Aucun rappel programmé.</span></div><p class="fiche-hint">Ajoutez un vaccin ou un vermifuge avec sa date de rappel, vous serez prévenu à temps.</p>';
      } else {
        var evs = dues.slice(0, 3).map(function (d) { return agendaDueEvent(d, false); });
        watch.innerHTML = '<ul class="ag__list">' + evs.map(agendaEventCard).join('') + '</ul>' +
          (dues.length > 3 ? '<button type="button" class="ag__more" data-care-route="historique">' + (dues.length === 4 ? 'Voir l\u2019autre échéance dans la frise' : 'Voir les ' + (dues.length - 3) + ' autres dans la frise') + '</button>' : '');
        bindAgendaCards(watch, evs);
      }
    }

    // 2. Constantes
    var tiles = [];
    var weights = (a.weightHistory || []).filter(function (w) { return w.date && Number(w.weight) > 0; }).slice().sort(function (x, y) { return x.date.localeCompare(y.date); });
    if (a.weight != null && a.weight !== '') {
      var trend = '';
      if (weights.length > 1) {
        var dl = Number(weights[weights.length - 1].weight) - Number(weights[weights.length - 2].weight);
        trend = Math.abs(dl) < 0.05 ? 'Stable depuis le ' + fmtDate(weights[weights.length - 2].date) : wDelta(dl) + ' depuis le ' + fmtDate(weights[weights.length - 2].date);
      }
      tiles.push({ label: 'Poids', value: uW(a.weight), trend: trend, extra: ficheSpark(weights.slice(-8).map(function (w) { return Number(w.weight); })), route: 'poids' });
    }
    if (a.height != null && a.height !== '') tiles.push({ label: 'Taille au garrot', value: uH(a.height), trend: '', route: 'poids' });
    var yearSpend = 0, consultCount = 0;
    var yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    (data.consultations || []).forEach(function (cn) {
      var dt = cn.date && isoToLocalDate(cn.date);
      if (!dt || dt < yearAgo) return;
      consultCount++;
      var cost = parseFloat(cn.cost || cn.prix || cn.amount || 0);
      if (!isNaN(cost)) yearSpend += cost;
    });
    if (consultCount > 0 || yearSpend > 0) {
      tiles.push({ label: 'Dépenses 12 mois', value: yearSpend ? Math.round(yearSpend).toLocaleString('fr-FR') + ' €' : '—', trend: consultCount ? consultCount + ' consultation' + (consultCount > 1 ? 's' : '') : '', route: 'consultations' });
    }
    metrics.innerHTML = tiles.map(function (t) {
      return '<button type="button" class="fiche-metric" data-care-route="' + t.route + '"><span class="fiche-metric__label">' + escapeHtml(t.label) + '</span>' +
        '<span class="fiche-metric__value">' + escapeHtml(t.value) + '</span>' + (t.extra || '') +
        (t.trend ? '<span class="fiche-metric__trend">' + escapeHtml(t.trend) + '</span>' : '') + '</button>';
    }).join('') || '<p class="fiche-hint">Renseignez le poids ou la taille pour suivre la croissance.</p>';

    // 3. Santé en un coup d'œil : quatre domaines cliquables
    if (domains) {
      var meds = (data.medications || []).filter(function (m) { return m.active !== false; });
      var medSum;
      if (!meds.length) medSum = { status: 'ok', statusLabel: 'Aucun', body: 'Pas de traitement en cours.' };
      else medSum = { status: 'soon', statusLabel: 'En cours', body: (meds[0].name || 'Traitement') + (meds[0].endDate ? ', fin le ' + fmtDate(meds[0].endDate) : '') + '.' };
      var blocks = [
        { title: 'Vaccins', s: summarizeDomain(data.vaccines, 'name', 'next'), last: friseLastDate(data.vaccines), route: 'vaccins', icon: 'vaccine' },
        { title: 'Déparasitage', s: summarizeDomain(data.dewormings, 'name', 'next'), last: friseLastDate(data.dewormings), route: 'deworming', icon: 'pill' },
        { title: 'Hygiène', s: summarizeDomain(data.hygiene, 'type', 'next'), last: friseLastDate(data.hygiene), route: 'hygiene', icon: 'droplet' },
        { title: 'Traitement', s: medSum, last: friseLastDate(data.medications, 'startDate'), route: 'medications', icon: 'pill' }
      ];
      domains.innerHTML = blocks.map(function (b) {
        var st = b.s.status;
        var label = b.s.statusLabel === '—' ? 'Non suivi' : b.s.statusLabel.charAt(0).toUpperCase() + b.s.statusLabel.slice(1);
        return '<button type="button" class="fiche-domain" data-care-route="' + b.route + '"><span class="fiche-domain__top"><span class="fiche-domain__icon">' + ico(b.icon, 18) + '</span><span class="fiche-domain__name">' + b.title + '</span></span>' +
          '<span class="fiche-domain__status fiche-domain__status--' + st + '">' + escapeHtml(label) + '</span>' +
          '<span class="fiche-domain__body">' + escapeHtml(b.s.body) + '</span>' +
          (b.last ? '<span class="fiche-domain__last">Dernier : ' + escapeHtml(fmtDate(b.last)) + '</span>' : '') + '</button>';
      }).join('');
    }
  }

  function renderActes() {
    var data = getCurrent();
    var list = document.getElementById('actes-list');
    var title = document.getElementById('actes-title');
    var sub = document.getElementById('actes-sub');
    var groupBanner = document.getElementById('actes-group-banner');
    var dupBanner = document.getElementById('actes-dup-banner');
    if (!data || !list) return;
    var name = (data.animal && data.animal.name) || 'Animal';
    if (title) title.textContent = 'Protection de ' + name;
    var protections = buildProtections(data);
    var lateCount = protections.filter(function (p) { return p.tone === 'late'; }).length;
    if (sub) sub.textContent = protections.length + ' protection' + (protections.length > 1 ? 's' : '') + ' suivie' + (protections.length > 1 ? 's' : '') + (lateCount ? (' · ' + lateCount + ' à rattraper') : '');

    list.innerHTML = protections.map(function (p) {
      var fillCls = p.tone === 'late' ? 'acte-track__fill--late' : (p.tone === 'soon' ? 'acte-track__fill--soon' : '');
      var hist = (p.history || []).map(function (h) {
        return '<li>' + escapeHtml(fmtDate(h.date || h.startDate || '') + ' — ' + (h.name || h.type || p.name)) + '</li>';
      }).join('');
      return '<div class="acte-card' + (p.tone === 'late' ? ' acte-card--late' : '') + '">' +
        '<div class="acte-card__top"><div><div class="acte-card__name">' + escapeHtml(p.name) + '</div>' +
        '<div class="acte-card__sub">' + escapeHtml(p.sub || '') + '</div></div>' +
        '<span class="acte-card__status fiche-domain__status--' + p.tone + '">' + escapeHtml(p.statusLabel) + '</span></div>' +
        '<div class="acte-track"><span class="acte-track__fill ' + fillCls + '" style="width:' + Math.min(100, p.pct) + '%"></span></div>' +
        '<div class="acte-card__dates"><span>' + escapeHtml(p.from ? fmtDate(p.from) + ' · fait' : '—') + '</span>' +
        '<span style="color:' + (p.tone === 'late' ? 'var(--status-late)' : 'inherit') + '">' + escapeHtml(p.to ? fmtDate(p.to) + (p.tone === 'late' ? ' · échu' : '') : '—') + '</span></div>' +
        (hist ? '<details class="acte-card__history"><summary>Historique</summary><ul>' + hist + '</ul></details>' : '') +
        '</div>';
    }).join('') || '<p class="global-view__sub">Aucun acte enregistré. Ajoutez un vaccin ou un déparasitage.</p>';

    var lateVax = protections.filter(function (p) { return p.collection === 'vaccines' && p.tone === 'late'; });
    var hasRage = lateVax.some(function (p) { return isRageName(p.name); });
    var hasChppi = lateVax.some(function (p) { return isChppiName(p.name); });
    if (groupBanner) {
      if (hasRage && hasChppi) {
        groupBanner.hidden = false;
        var clinic = getPrimaryClinicPhone();
        groupBanner.innerHTML = '<div style="font-size:14px;color:#7a5646;line-height:1.5"><span style="font-weight:700;color:var(--status-late)">Rage et CHPPi s\'administrent ensemble.</span> Une seule visite remet les deux barres au vert.</div>' +
          (clinic && clinic.phone
            ? '<a class="dossier-btn dossier-btn--primary" href="tel:' + escapeHtml(clinic.phone.replace(/\s+/g, '')) + '">Prendre RDV</a>'
            : '<button type="button" class="dossier-btn dossier-btn--primary" id="actes-group-dir">Annuaire</button>');
        var gbtn = document.getElementById('actes-group-dir');
        if (gbtn) gbtn.addEventListener('click', showDirectory);
      } else groupBanner.hidden = true;
    }

    var dups = findDuplicates(data);
    if (dupBanner) {
      if (!dups.length) dupBanner.hidden = true;
      else {
        dupBanner.hidden = false;
        var d = dups[0];
        dupBanner.innerHTML = '<div class="actes-dup-banner__title">Doublons détectés</div>' +
          '<div class="actes-dup-banner__body">' + escapeHtml(d.label) + ' saisi deux fois le ' + fmtDate(d.date) + '.</div>' +
          '<div class="actes-dup-banner__actions">' +
          '<button type="button" class="dossier-btn dossier-btn--primary" id="actes-merge-dup">Fusionner</button>' +
          '<button type="button" class="dossier-btn dossier-btn--ghost" id="actes-keep-dup">Garder les deux</button></div>';
        document.getElementById('actes-merge-dup').addEventListener('click', function () {
          var list2 = data[d.collection];
          var idx = list2.findIndex(function (x) { return x.id === d.b.id; });
          if (idx >= 0) list2.splice(idx, 1);
          saveState();
          showToast('Doublon fusionné', 'success');
          renderActes();
        });
        document.getElementById('actes-keep-dup').addEventListener('click', function () {
          dupBanner.hidden = true;
        });
      }
    }
  }

  // ——— Agenda ——————————————————————————————————————————
  // Calendrier du mois (tous les animaux ou un seul), panneau du jour sélectionné
  // et liste « À faire ». Les soins à faire portent les boutons Fait / Reporter.
  var AGENDA_TODO_MAX = 8;
  function localIso(y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function todayLocalIso() { var n = new Date(); return localIso(n.getFullYear(), n.getMonth(), n.getDate()); }
  function agendaAnimals() {
    var sel = uiState.agendaPet;
    if (!sel || sel === 'all') return state.animals;
    return state.animals.filter(function (a) { return String(a.id) === String(sel); });
  }
  function agendaDues() {
    var dues = [];
    agendaAnimals().forEach(function (d) { dues = dues.concat(collectDueItemsForAnimal(d)); });
    return dues.sort(function (x, y) { return x.next.localeCompare(y.next); });
  }
  function agendaDueEvent(d, multi) {
    var c = friseCat(friseDueCat(d)) || { key: 'vaccins', tone: 'care', icon: 'bell', tab: 'vaccins' };
    var dt = delayTone(d.next);
    return { kind: 'due', due: d, date: d.next, title: d.name, sub: d.collection === 'medications' ? 'Fin de traitement' : 'À prévoir', tone: dt === 'ok' ? c.tone : dt, badgeTone: c.tone, icon: c.icon, cat: c.key, tab: c.tab, animalName: d.animalName, animalId: d.animalId, multi: multi };
  }
  // Tous les événements par date ISO : soins à faire, historique déjà enregistré, anniversaires de l'année affichée.
  function buildAgendaEvents(year) {
    var map = {};
    var animals = agendaAnimals();
    var multi = animals.length > 1;
    function add(iso, e) { (map[iso] = map[iso] || []).push(e); }
    animals.forEach(function (data) {
      var name = data.animal.name || 'Animal';
      buildFriseEvents(data).forEach(function (e) {
        if (e.icon === 'utensils') return; // les repas encombreraient le calendrier
        add(e.date, Object.assign({}, e, { kind: 'past', badgeTone: e.tone, animalName: name, animalId: data.id, multi: multi }));
      });
      collectDueItemsForAnimal(data).forEach(function (d) { add(d.next, agendaDueEvent(d, multi)); });
      if (data.animal.dob) {
        var dob = isoToLocalDate(data.animal.dob);
        if (dob && dob.getFullYear() < year) {
          add(localIso(year, dob.getMonth(), dob.getDate()), { kind: 'past', title: 'Anniversaire de ' + name, sub: (year - dob.getFullYear()) + ' an' + (year - dob.getFullYear() > 1 ? 's' : ''), tone: 'warm', badgeTone: 'warm', icon: 'cake', animalName: name, animalId: data.id, multi: multi, tab: 'profil' });
        }
      }
    });
    return map;
  }
  function agendaEventCard(e, idx) {
    var who = e.multi ? '<span class="fr__meta">' + escapeHtml(e.animalName) + '</span>' : '';
    var badge = '<span class="fr__badge" data-tone="' + e.badgeTone + '">' + ico(e.icon, 18) + '</span>';
    if (e.kind === 'due') {
      var when = '<span class="fr__meta fr__meta--' + (e.tone === 'late' || e.tone === 'soon' ? e.tone : 'soon') + '">' + escapeHtml(formatJDelay(e.date)) + '</span>';
      return '<li class="ag__row" data-tone="' + e.tone + '"><div class="fr__card fr__card--due">' + badge +
        '<span class="fr__text"><span class="fr__title">' + escapeHtml(e.title) + '</span><span class="fr__sub">' + escapeHtml(e.sub) + when + who + '</span></span>' +
        '<span class="fr__actions" data-ag-due="' + idx + '">' + reminderButtons(e.due) + '</span></div></li>';
    }
    return '<li class="ag__row"><button type="button" class="fr__card" data-ag-open="' + idx + '">' + badge +
      '<span class="fr__text"><span class="fr__title">' + escapeHtml(e.title) + '</span><span class="fr__sub">' + escapeHtml(e.sub) + (e.meta ? '<span class="fr__meta">' + escapeHtml(e.meta) + '</span>' : '') + who + '</span></span></button></li>';
  }
  function bindAgendaCards(scope, events) {
    scope.querySelectorAll('[data-ag-due]').forEach(function (box) {
      var e = events[parseInt(box.getAttribute('data-ag-due'), 10)];
      if (e && e.due) bindReminderButtons(box, e.due);
    });
    scope.querySelectorAll('[data-ag-open]').forEach(function (btn) {
      var e = events[parseInt(btn.getAttribute('data-ag-open'), 10)];
      btn.addEventListener('click', function () {
        if (!e) return;
        state.currentAnimalId = e.animalId; saveState();
        showDetail({ tab: e.tab || 'profil', nav: 'pets' });
      });
    });
  }

  function renderAgendaList() {
    var list = document.getElementById('agenda-list');
    var sub = document.getElementById('agenda-sub');
    if (!list) return;
    var animals = agendaAnimals();
    var multi = animals.length > 1;
    var dues = agendaDues();
    var late = dues.filter(function (d) { return daysUntil(d.next) < 0; }).length;
    if (sub) {
      sub.textContent = !state.animals.length ? 'Ajoutez un animal pour suivre ses échéances.'
        : (dues.length ? dues.length + ' soin' + (dues.length > 1 ? 's' : '') + ' à faire' + (late ? ' · ' + late + ' en retard' : '') : 'Tout est à jour');
    }
    if (!dues.length) {
      list.innerHTML = '<div class="ag__todo-empty">' + ico('check', 20) + '<span>' + (state.animals.length ? 'Rien à faire pour le moment.' : 'Aucune échéance.') + '</span></div>';
      return;
    }
    var events = dues.slice(0, AGENDA_TODO_MAX).map(function (d) { return agendaDueEvent(d, multi); });
    list.innerHTML = '<ul class="ag__list">' + events.map(agendaEventCard).join('') + '</ul>' +
      (dues.length > AGENDA_TODO_MAX ? '<button type="button" class="ag__more" data-care-route="historique">' + (dues.length - AGENDA_TODO_MAX === 1 ? 'Voir l\u2019autre échéance dans la frise' : 'Voir les ' + (dues.length - AGENDA_TODO_MAX) + ' autres dans la frise') + '</button>' : '');
    bindAgendaCards(list, events);
  }

  function renderAgendaPets() {
    var box = document.getElementById('ag-pets');
    if (!box) return;
    if (state.animals.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
    var sel = uiState.agendaPet || 'all';
    box.hidden = false;
    box.innerHTML = [{ id: 'all', name: 'Tous' }].concat(state.animals.map(function (a) { return { id: a.id, name: a.animal.name || 'Sans nom' }; })).map(function (p) {
      var on = String(p.id) === String(sel);
      return '<button type="button" class="fr__chip' + (on ? ' is-on' : '') + '" data-ag-pet="' + p.id + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span>' + escapeHtml(p.name) + '</span></button>';
    }).join('');
    box.querySelectorAll('[data-ag-pet]').forEach(function (btn) {
      btn.addEventListener('click', function () { uiState.agendaPet = btn.getAttribute('data-ag-pet'); renderAgenda(); });
    });
  }

  function renderAgenda() {
    renderAgendaPets();
    renderAgendaList();
    renderCalendar();
  }

  function hideAppViews() {
    ['view-home', 'view-detail', 'view-community', 'view-user-profile', 'view-favorites', 'view-help', 'view-agenda', 'view-annuaire'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    var vd = document.getElementById('view-detail');
    if (vd) vd.classList.remove('is-pet-profile');
  }

  function setBottomNavActive(nav) {
    renderCareSidebar();
    markCareRoute(nav);
    document.querySelectorAll('.bottom-nav__item').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === nav);
      if (b.getAttribute('data-nav') === nav) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.top-nav__btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-nav') === nav);
    });
  }

  function syncBottomNavFromTab() {
    setBottomNavActive('pets');
  }

  function showHome() {
    state.viewMode = 'home';
    hideAppViews();
    var viewHome = document.getElementById('view-home');
    viewHome.hidden = false;
    viewHome.classList.remove('view-enter');
    void viewHome.offsetWidth;
    viewHome.classList.add('view-enter');
    document.getElementById('animal-select').hidden = true;
    document.getElementById('fab-container').hidden = !state.animals.length;
    setBottomNavActive('home');
    renderHome();
    saveRoute({ view: 'home' });
  }

  function showAgenda() {
    state.viewMode = 'agenda';
    hideAppViews();
    var view = document.getElementById('view-agenda');
    if (view) view.hidden = false;
    document.getElementById('fab-container').hidden = !state.animals.length;
    document.getElementById('animal-select').hidden = true;
    setBottomNavActive('calendar');
    setupAgendaGrid();
    renderAgenda();
    saveRoute({ view: 'agenda' });
  }

  function showDirectory() {
    state.viewMode = 'directory';
    hideAppViews();
    var view = document.getElementById('view-annuaire');
    if (view) view.hidden = false;
    document.getElementById('fab-container').hidden = !state.animals.length;
    document.getElementById('animal-select').hidden = true;
    setBottomNavActive('directory');
    renderVetDirectory();
    var emerg = document.getElementById('annuaire-emergency-slot');
    if (emerg) {
      var dir = loadVetDirectory();
      var emergency = ((dir && dir.entries) || []).filter(function (e) { return e.emergency; });
      emerg.innerHTML = emergency.map(function (e) {
        return '<div class="annuaire-emergency"><div class="label-caps" style="color:var(--status-late)">Urgences 24 h/24</div>' +
          '<div style="font-size:17px;font-weight:800;color:var(--deep-green);margin-top:4px">' + escapeHtml(e.name || e.clinic || 'Urgence') + '</div>' +
          '<div style="font-size:13px;color:#7a5646;margin-top:3px">' + escapeHtml([e.phone, e.address, e.hours].filter(Boolean).join(' · ')) + '</div>' +
          (e.phone ? '<a class="dossier-btn dossier-btn--primary" style="display:inline-block;margin-top:12px" href="tel:' + escapeHtml(e.phone.replace(/\s+/g, '')) + '">Appeler</a>' : '') +
          '</div>';
      }).join('');
    }
    var sub = document.getElementById('annuaire-sub');
    if (sub) {
      var n = ((loadVetDirectory().entries) || []).length;
      sub.textContent = n + ' praticien' + (n > 1 ? 's' : '') + ' · urgences';
    }
    saveRoute({ view: 'directory' });
  }

  function showDetail(opts) {
    opts = opts || {};
    state.viewMode = 'detail';
    hideAppViews();
    var viewDetail = document.getElementById('view-detail');
    viewDetail.hidden = false;
    viewDetail.classList.remove('view-enter');
    void viewDetail.offsetWidth;
    viewDetail.classList.add('view-enter');
    document.getElementById('fab-container').hidden = false;
    renderAnimalSelect();
    uiState.petChartMode = 'weight';
    refreshAll();
    var tab = opts.tab || 'profil';
    if (tab === 'calendrier') { showAgenda(); return; }
    if (tab === 'annuaire') { showDirectory(); return; }
    if (tab === 'journal') tab = 'suivi';
    switchTab(tab);
    setBottomNavActive(opts.nav || 'pets');
    markCareRoute(tab);
    saveRoute({ view: 'detail', animalId: state.currentAnimalId, tab: tab });
  }

  // ——— Profile ———————————————————————————————————————————
  function renderProfile() {
    var data = getCurrent();
    if (!data) return;
    var a = data.animal;
    var o = getOwner();

    var hero = document.getElementById('animal-hero');
    if (hero) {
      hero.style.removeProperty('--animal-color');
      hero.style.background = '';
    }

    var titleEl = document.getElementById('pet-profile-page-title');
    if (titleEl) titleEl.textContent = 'Profil de ' + (a.name || 'Animal');

    renderDetailPetsRow();

    var chipWrap = document.getElementById('pet-profile-chip-wrap');
    var chipText = document.getElementById('pet-profile-chip-text');
    if (chipWrap && chipText) {
      if (a.chip) {
        chipWrap.hidden = false;
        chipText.textContent = a.chip;
      } else {
        chipWrap.hidden = true;
      }
    }

    var dotsEl = document.getElementById('pet-profile-photo-dots');
    if (dotsEl) {
      var nPhotos = Array.isArray(data.photos) ? data.photos.length : 0;
      var n = Math.max(1, Math.min(4, nPhotos > 0 ? Math.min(4, nPhotos) : 1));
      var dots = [];
      for (var di = 0; di < n; di++) dots.push('<span class="' + (di === 0 ? 'is-active' : '') + '"></span>');
      dotsEl.innerHTML = dots.join('');
    }

    var vac = getVaccinationStripState(data);
    var vacEl = document.getElementById('pet-vacc-status');
    if (vacEl) {
      vacEl.textContent = vac.text;
      vacEl.className = 'pet-vaccination-strip__badge ' + vac.className;
    }

    var lastVisitEl = document.getElementById('pet-last-visit');
    var lastC = getLastConsultDate(data);
    if (lastVisitEl) {
      lastVisitEl.textContent = lastC
        ? 'Basé sur la dernière visite : ' + fmtDate(lastC)
        : 'Basé sur la dernière visite : —';
    }

    function setText(id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    setText('pet-tile-breed', a.race || '—');
    setText('pet-tile-dob', a.dob ? fmtDate(a.dob) : '—');
    setText('pet-tile-gender', a.sex || '—');
    setText('pet-tile-height', a.height != null && a.height !== '' ? uH(a.height) : '—');
    setText('pet-tile-weight', a.weight != null ? uW(a.weight) : '—');
    setText('pet-tile-repro', formatReproLabel(a));

    var infoRace = document.getElementById('info-race');
    var infoWeight = document.getElementById('info-weight');
    var infoChip = document.getElementById('info-chip');
    var infoSter = document.getElementById('info-sterilise');
    if (infoRace) infoRace.textContent = a.race || '—';
    if (infoWeight) infoWeight.textContent = a.weight != null ? uW(a.weight) : '—';
    if (infoChip) infoChip.textContent = a.chip || 'Non renseigné';
    if (infoSter) infoSter.textContent = a.sterilise || 'Non';

    var ageEl = document.getElementById('age-display');
    if (a.dob) {
      var months = calculateAgeMonths(a.dob);
      if (ageEl) ageEl.textContent = months < 24 ? months + ' mois' : Math.floor(months / 12) + ' ans';
    } else {
      if (ageEl) ageEl.textContent = '—';
    }

    var av = document.getElementById('hero-avatar');
    if (av) {
      av.innerHTML = '';
      av.style.fontSize = '';

      if (a.avatar && typeof a.avatar === 'number') {
        av.innerHTML = '<img data-avatar-key="' + a.avatar + '" alt="' + escapeHtml(a.name || 'Animal') + '">';
        getPhotoObjectUrl(a.avatar).then(function (url) {
          var img = av.querySelector('img[data-avatar-key]');
          if (img && url) img.src = url;
        }).catch(function () {});
      } else if (a.avatar && typeof a.avatar === 'string') {
        av.innerHTML = '<img src="' + escapeHtml(a.avatar) + '" alt="' + escapeHtml(a.name || 'Animal') + '">';
      } else {
        av.innerHTML = ico(a.species === 'Féline' ? 'cat' : 'paw', 28);
        av.style.fontSize = '64px';
      }
    }

    var colorEl = document.getElementById('info-color');
    if (colorEl) colorEl.textContent = a.color || '—';

    document.getElementById('owner-name').textContent = o.name || '—';
    document.getElementById('owner-phone').textContent = o.phone || '—';
    document.getElementById('owner-email').textContent = o.email || '—';
    document.getElementById('owner-clinic').textContent = o.clinic || '—';

    animateCounter(document.getElementById('stat-vax'), (data.vaccines || []).length, 400);
    animateCounter(document.getElementById('stat-dew'), (data.dewormings || []).length, 400);
    animateCounter(document.getElementById('stat-photos'), (data.photos || []).length, 400);

    var upcoming = [].concat(data.vaccines.filter(function (v) { return v.next; }))
      .concat(data.dewormings.filter(function (d) { return d.next; }))
      .filter(function (e) {
        var dt = isoToLocalDate(e.next);
        if (!dt) return false;
        var today = new Date();
        var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return dt >= todayMid;
      });
    animateCounter(document.getElementById('stat-next'), upcoming.length, 400);

    renderProfileCompleteness(data);
    renderActiveMedsSummary(data);
    checkBirthday(data);
    renderQRCode(data);

    // Update tasks heading with pet name
    var tasksHeading = document.getElementById('pet-tasks-heading');
    if (tasksHeading) {
      tasksHeading.textContent = 'Tâches de ' + (a.name || 'Animal') + ' pour aujourd\'hui';
    }

    document.querySelectorAll('.pet-task-filter').forEach(function (b) {
      var f = b.getAttribute('data-pet-task-filter');
      b.classList.toggle('active', (f || 'all') === (uiState.petTaskFilter || 'all'));
    });

    renderPetProfileTasks(data);
    renderDossierHeader();
    renderFicheV1();
  }

  function animateCounter(el, target, duration) {
    if (!el) return;
    var start = parseInt(el.textContent, 10) || 0;
    if (start === target) { el.textContent = target; return; }
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      el.textContent = Math.round(start + (target - start) * progress);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderProfileCompleteness(data) {
    var el = document.getElementById('profile-completeness');
    var fill = document.getElementById('completeness-fill');
    var text = document.getElementById('completeness-text');
    if (!el || !data) return;

    var a = data.animal;
    var o = getOwner();
    var fields = [a.name, a.dob, a.weight, a.height, a.race, a.color, a.chip, a.sterilise !== 'Non' ? a.sterilise : '', o.name, a.avatar];
    var filled = fields.filter(function (f) { return f != null && f !== '' && f !== false; }).length;
    var pct = Math.round((filled / fields.length) * 100);

    if (pct >= 100) {
      el.hidden = true;
    } else {
      el.hidden = false;
      fill.style.width = pct + '%';
      text.textContent = pct + '% — ' + t('completeFiche');
    }
  }

  function renderActiveMedsSummary(data) {
    var el = document.getElementById('active-meds-summary');
    var list = document.getElementById('active-meds-list');
    if (!el || !list) return;
    var meds = Array.isArray(data.medications) ? data.medications.filter(function (m) {
      return m.active !== false && (!m.endDate || isoToLocalDate(m.endDate) >= new Date());
    }) : [];
    if (meds.length === 0) { el.hidden = true; return; }
    el.hidden = false;
    list.innerHTML = meds.map(function (m) {
      return '<span class="med-badge">' + escapeHtml(m.name) + (m.dosage ? ' — ' + escapeHtml(m.dosage) : '') + '</span>';
    }).join('');
  }

  function checkBirthday(data) {
    var banner = document.getElementById('birthday-banner');
    var textEl = document.getElementById('birthday-text');
    if (!banner || !data || !data.animal.dob) { if (banner) banner.hidden = true; return; }

    var today = new Date();
    var dob = isoToLocalDate(data.animal.dob);
    if (!dob) { banner.hidden = true; return; }

    if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
      var age = today.getFullYear() - dob.getFullYear();
      textEl.textContent = t('birthday', escapeHtml(data.animal.name || 'votre animal')) + ' (' + age + ' an' + (age > 1 ? 's' : '') + ')';
      banner.hidden = false;
      startConfetti();
    } else {
      banner.hidden = true;
    }
  }

  function startConfetti() {
    var canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    var particles = [];
    var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6eb4'];
    for (var i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 4 + 2,
        d: Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        speed: Math.random() * 2 + 1
      });
    }
    var frames = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frames / 120);
        ctx.fillRect(p.x + p.tilt, p.y, p.r, p.r * 2);
        p.y += p.speed;
        p.tilt += 0.1;
      });
      frames++;
      if (frames < 120) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
  }

  function renderQRCode(data) {
    var section = document.getElementById('qr-section');
    var canvas = document.getElementById('qr-canvas');
    if (!section || !canvas || !data) { if (section) section.hidden = true; return; }

    var a = data.animal;
    var o = getOwner();
    if (!a.name && !a.chip) { section.hidden = true; return; }
    if (typeof qrcode === 'undefined') { section.hidden = true; return; }

    section.hidden = false;
    // Plain text with all animal info
    var lines = [];
    if (a.name) lines.push('Nom: ' + a.name);
    if (a.species) lines.push('Espece: ' + a.species);
    if (a.race) lines.push('Race: ' + a.race);
    if (a.sex) lines.push('Sexe: ' + a.sex);
    if (a.dob) lines.push('Naissance: ' + fmtDate(a.dob));
    if (a.weight) lines.push('Poids: ' + uW(a.weight));
    if (a.color) lines.push('Couleur: ' + a.color);
    if (a.chip) lines.push('Puce: ' + a.chip);
    if (a.sterilise && a.sterilise !== 'Non') lines.push('Sterilise: ' + a.sterilise);
    if (a.notes) lines.push('Notes: ' + a.notes);
    if (o && o.name) lines.push('Proprietaire: ' + o.name);
    if (o && o.phone) lines.push('Tel: ' + o.phone);
    var text = lines.join('\n');

    try {
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      var modules = qr.getModuleCount();
      var cellSize = Math.max(6, Math.floor(300 / modules));
      var margin = cellSize * 4;
      var totalSize = cellSize * modules + margin * 2;
      canvas.width = totalSize;
      canvas.height = totalSize;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalSize, totalSize);
      ctx.fillStyle = '#000000';
      for (var r = 0; r < modules; r++) {
        for (var c = 0; c < modules; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
          }
        }
      }
    } catch (e) {
      console.warn('App\'lika: QR generation failed', e);
      section.hidden = true;
    }
  }

  // ——— Animal select ——————————————————————————————————————
  function renderAnimalSelect() {
    var sel = document.getElementById('animal-select');
    if (!sel) return;
    sel.innerHTML = state.animals.map(function (an) {
      var name = escapeHtml(an.animal.name || 'Sans nom');
      return '<option value="' + an.id + '"' + (an.id === state.currentAnimalId ? ' selected' : '') + '>' + name + '</option>';
    }).join('');
    sel.hidden = state.animals.length <= 1;
  }

  function onAnimalSelectChange() {
    var sel = document.getElementById('animal-select');
    if (!sel) return;
    var id = parseInt(sel.value, 10);
    if (!isNaN(id) && state.animals.some(function (a) { return a.id === id; })) {
      state.currentAnimalId = id;
      saveState();
      refreshAll();
    }
  }

  // ——— Vaccine suggestions ——————————————————————————————
  function updateVaccineSuggestions() {
    var data = getCurrent();
    var datalist = document.getElementById('vaccine-suggestions');
    if (!datalist || !data) return;
    var species = data.animal.species || 'Canine';
    var suggestions = VACCINE_DB[species] || VACCINE_DB.Canine;
    datalist.innerHTML = suggestions.map(function (s) {
      return '<option value="' + escapeHtml(s) + '">';
    }).join('');
  }

  // ——— Breed suggestions & weight reference ——————————————————
  function getBreedList(species) {
    return BREED_DB[species] || BREED_DB.Canine;
  }

  function populateBreedSuggestions(species) {
    var datalist = document.getElementById('breed-suggestions');
    if (!datalist) return;
    var breeds = getBreedList(species);
    datalist.innerHTML = breeds.map(function (b) {
      return '<option value="' + escapeHtml(b.name) + '">';
    }).join('');
  }

  function findBreedWeightRange(species, race) {
    if (!race) return null;
    var breeds = getBreedList(species);
    var match = breeds.find(function (b) { return b.name.toLowerCase() === race.trim().toLowerCase(); });
    return match ? { min: match.weightMin, max: match.weightMax } : null;
  }

  // ——— Modals —————————————————————————————————————————
  function openModal(name) {
    var data = getCurrent();
    if (!data && name !== 'addAnimal' && name !== 'onboarding' && name !== 'editOwner' && name !== 'language' && name !== 'backup' && name !== 'pushSettings') return;

    if (name === 'addAnimal') {
      populateBreedSuggestions(document.getElementById('aa-species').value || 'Canine');
    }

    if (name === 'editAnimal') {
      var a = data.animal;
      var fields = ['name', 'species', 'race', 'sex', 'dob', 'weight', 'color', 'chip', 'sterilise', 'notes'];
      fields.forEach(function (f) {
        var el = document.getElementById('ea-' + f);
        if (el) el.value = a[f] != null && a[f] !== '' ? a[f] : '';
      });
      populateBreedSuggestions(a.species || 'Canine');
      var hEl = document.getElementById('ea-height');
      if (hEl) hEl.value = a.height != null && a.height !== '' ? a.height : '';
      var colorEl = document.getElementById('ea-themeColor');
      if (colorEl) colorEl.value = a.themeColor || '#1F3D34';
      var prev = document.getElementById('edit-avatar-preview');
      if (prev) {
        prev.innerHTML = '';
        if (a.avatar && typeof a.avatar === 'number') {
          prev.innerHTML = '<img data-avatar-key="' + a.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
          getPhotoObjectUrl(a.avatar).then(function (url) {
            var img = prev.querySelector('img[data-avatar-key]');
            if (img && url) img.src = url;
          }).catch(function () {});
        } else if (a.avatar && typeof a.avatar === 'string') {
          prev.innerHTML = '<img src="' + escapeHtml(a.avatar) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
        } else {
          prev.innerHTML = ico(a.species === 'Féline' ? 'cat' : 'paw', 28);
        }
      }
    }

    if (name === 'editOwner') {
      var o = getOwner();
      ['name', 'phone', 'email', 'clinic', 'address'].forEach(function (f) {
        var el = document.getElementById('eo-' + f);
        if (el) el.value = o[f] || '';
      });
    }

    if (name === 'addVaccin') {
      document.getElementById('v-name').value = '';
      document.getElementById('v-date').value = '';
      document.getElementById('v-next').value = '';
      document.getElementById('v-frequency').value = '';
      document.getElementById('v-vet').value = '';
      updateVaccineSuggestions();
    }

    if (name === 'addDeworming') {
      document.getElementById('d-name').value = '';
      document.getElementById('d-date').value = '';
      document.getElementById('d-next').value = '';
      document.getElementById('d-frequency').value = '';
      document.getElementById('d-type').value = 'interne';
    }

    if (name === 'addWeight') {
      var todayStr = todayISO();
      var aw = data.animal || {};
      var dateEl = document.getElementById('wh-date');
      var wEl = document.getElementById('wh-weight');
      if (dateEl) dateEl.value = todayStr;
      if (wEl) wEl.value = aw.weight != null ? aw.weight : '';
    }

    if (name === 'addHeight') {
      var todayStrH = todayISO();
      var ah = data.animal || {};
      var dateElH = document.getElementById('hh-date');
      var hhEl = document.getElementById('hh-height');
      if (dateElH) dateElH.value = todayStrH;
      if (hhEl) hhEl.value = ah.height != null ? ah.height : '';
    }

    if (name === 'addConsult') {
      document.getElementById('c-date').value = todayISO();
      document.getElementById('c-vet').value = '';
      document.getElementById('c-reason').value = '';
      document.getElementById('c-diagnosis').value = '';
      document.getElementById('c-treatment').value = '';
      document.getElementById('c-cost').value = '';
      document.getElementById('c-notes').value = '';
    }

    if (name === 'editConsult') {
      var cid = uiState.editConsultId;
      var c = Array.isArray(data.consultations) ? data.consultations.find(function (x) { return x.id === cid; }) : null;
      if (!c) return;
      document.getElementById('ec-id').value = String(c.id);
      document.getElementById('ec-date').value = c.date || '';
      document.getElementById('ec-vet').value = c.vet || '';
      document.getElementById('ec-reason').value = c.reason || '';
      document.getElementById('ec-diagnosis').value = c.diagnosis || '';
      document.getElementById('ec-treatment').value = c.treatment || '';
      document.getElementById('ec-cost').value = c.cost != null ? String(c.cost) : '';
      document.getElementById('ec-notes').value = c.notes || '';
    }

    if (name === 'addMedication') {
      document.getElementById('m-name').value = '';
      document.getElementById('m-dosage').value = '';
      document.getElementById('m-frequency').value = '';
      document.getElementById('m-start').value = todayISO();
      document.getElementById('m-end').value = '';
      document.getElementById('m-notes').value = '';
    }

    if (name === 'editMedication') {
      var mid = uiState.editMedicationId;
      var m = Array.isArray(data.medications) ? data.medications.find(function (x) { return x.id === mid; }) : null;
      if (!m) return;
      document.getElementById('em-id').value = String(m.id);
      document.getElementById('em-name').value = m.name || '';
      document.getElementById('em-dosage').value = m.dosage || '';
      document.getElementById('em-frequency').value = m.frequency || '';
      document.getElementById('em-start').value = m.startDate || '';
      document.getElementById('em-end').value = m.endDate || '';
      document.getElementById('em-notes').value = m.notes || '';
    }

    if (name === 'addNote') {
      document.getElementById('n-date').value = todayISO();
      document.getElementById('n-category').value = 'sante';
      document.getElementById('n-title').value = '';
      document.getElementById('n-content').value = '';
      var nSymptomGroup = document.getElementById('n-symptom-group');
      if (nSymptomGroup) nSymptomGroup.hidden = false;
      document.getElementById('n-symptom-type').value = SYMPTOM_TYPES[0];
      setSeverityValue(nSymptomGroup, document.getElementById('n-severity'), 'Normal');
    }

    if (name === 'editNote') {
      var nid = uiState.editNoteId;
      var n = Array.isArray(data.notes) ? data.notes.find(function (x) { return x.id === nid; }) : null;
      if (!n) return;
      document.getElementById('en-id').value = String(n.id);
      document.getElementById('en-date').value = n.date || '';
      document.getElementById('en-category').value = n.category || 'autre';
      document.getElementById('en-title').value = n.title || '';
      document.getElementById('en-content').value = n.content || '';
      var enSymptomGroup = document.getElementById('en-symptom-group');
      if (enSymptomGroup) enSymptomGroup.hidden = (n.category !== 'sante');
      document.getElementById('en-symptom-type').value = n.symptomType || SYMPTOM_TYPES[0];
      setSeverityValue(enSymptomGroup, document.getElementById('en-severity'), n.severity || 'Normal');
    }

    // Hygiene modals
    if (name === 'addHygiene') {
      document.getElementById('hy-type').value = HYGIENE_TYPES[0];
      document.getElementById('hy-date').value = todayISO();
      document.getElementById('hy-next').value = '';
      document.getElementById('hy-frequency').value = '';
      document.getElementById('hy-notes').value = '';
    }
    if (name === 'editHygiene') {
      var hid = uiState.editHygieneId;
      var hEntry = Array.isArray(data.hygiene) ? data.hygiene.find(function (x) { return x.id === hid; }) : null;
      if (!hEntry) return;
      document.getElementById('ehy-type').value = hEntry.type || HYGIENE_TYPES[0];
      document.getElementById('ehy-date').value = hEntry.date || '';
      document.getElementById('ehy-next').value = hEntry.next || '';
      document.getElementById('ehy-frequency').value = hEntry.frequencyDays != null ? String(hEntry.frequencyDays) : '';
      document.getElementById('ehy-notes').value = hEntry.notes || '';
    }

    // Heat cycle modals
    if (name === 'addHeatCycle') {
      document.getElementById('hc-start').value = todayISO();
      document.getElementById('hc-end').value = '';
      document.getElementById('hc-intensity').value = 'Moyenne';
      document.getElementById('hc-notes').value = '';
    }
    if (name === 'editHeatCycle') {
      var hcid = uiState.editHeatCycleId;
      var hcEntry = Array.isArray(data.heatCycles) ? data.heatCycles.find(function (x) { return x.id === hcid; }) : null;
      if (!hcEntry) return;
      document.getElementById('ehc-start').value = hcEntry.startDate || '';
      document.getElementById('ehc-end').value = hcEntry.endDate || '';
      document.getElementById('ehc-intensity').value = hcEntry.intensity || 'Moyenne';
      document.getElementById('ehc-notes').value = hcEntry.notes || '';
    }

    // Mating (saillie) modals
    if (name === 'addMating') {
      document.getElementById('mt-date').value = todayISO();
      document.getElementById('mt-method').value = 'Naturelle';
      document.getElementById('mt-partner-name').value = '';
      document.getElementById('mt-partner-owner').value = '';
      document.getElementById('mt-partner-reg').value = '';
      document.getElementById('mt-notes').value = '';
      document.getElementById('mt-birth-date').value = '';
      document.getElementById('mt-live-born').value = '';
      document.getElementById('mt-still-born').value = '';
    }
    if (name === 'editMating') {
      var mtid = uiState.editMatingId;
      var mtEntry = Array.isArray(data.matings) ? data.matings.find(function (x) { return x.id === mtid; }) : null;
      if (!mtEntry) return;
      document.getElementById('emt-date').value = mtEntry.date || '';
      document.getElementById('emt-method').value = mtEntry.method || 'Naturelle';
      document.getElementById('emt-partner-name').value = mtEntry.partnerName || '';
      document.getElementById('emt-partner-owner').value = mtEntry.partnerOwner || '';
      document.getElementById('emt-partner-reg').value = mtEntry.partnerRegistry || '';
      document.getElementById('emt-notes').value = mtEntry.notes || '';
      document.getElementById('emt-birth-date').value = mtEntry.birthDate || '';
      document.getElementById('emt-live-born').value = mtEntry.liveBorn || '';
      document.getElementById('emt-still-born').value = mtEntry.stillBorn || '';
    }

    // Activity modals
    if (name === 'addActivity') {
      document.getElementById('act-date').value = todayISO();
      document.getElementById('act-type').value = ACTIVITY_TYPES[0];
      document.getElementById('act-duration').value = '';
      document.getElementById('act-distance').value = '';
      document.getElementById('act-notes').value = '';
    }
    if (name === 'editActivity') {
      var aid = uiState.editActivityId;
      var aEntry = Array.isArray(data.activities) ? data.activities.find(function (x) { return x.id === aid; }) : null;
      if (!aEntry) return;
      document.getElementById('eact-date').value = aEntry.date || '';
      document.getElementById('eact-type').value = aEntry.type || ACTIVITY_TYPES[0];
      document.getElementById('eact-duration').value = aEntry.duration || '';
      document.getElementById('eact-distance').value = aEntry.distance || '';
      document.getElementById('eact-notes').value = aEntry.notes || '';
    }

    // Meal modals
    if (name === 'addMeal') {
      document.getElementById('meal-date').value = todayISO();
      document.getElementById('meal-time').value = '';
      document.getElementById('meal-type').value = MEAL_TYPES[0];
      document.getElementById('meal-food').value = '';
      document.getElementById('meal-quantity').value = '';
      document.getElementById('meal-unit').value = 'g';
      document.getElementById('meal-notes').value = '';
    }
    if (name === 'editMeal') {
      var mealId = uiState.editMealId;
      var mealEntry = data.nutrition && Array.isArray(data.nutrition.meals) ? data.nutrition.meals.find(function (x) { return x.id === mealId; }) : null;
      if (!mealEntry) return;
      document.getElementById('emeal-date').value = mealEntry.date || '';
      document.getElementById('emeal-time').value = mealEntry.time || '';
      document.getElementById('emeal-type').value = mealEntry.type || MEAL_TYPES[0];
      document.getElementById('emeal-food').value = mealEntry.food || '';
      document.getElementById('emeal-quantity').value = mealEntry.quantity || '';
      document.getElementById('emeal-unit').value = mealEntry.unit || 'g';
      document.getElementById('emeal-notes').value = mealEntry.notes || '';
    }
    if (name === 'editNutritionPlan') {
      var nPlan = data.nutrition ? data.nutrition.dailyPlan || {} : {};
      document.getElementById('np-calories').value = nPlan.targetCalories || '';
      document.getElementById('np-meals-per-day').value = nPlan.mealsPerDay || '';
      document.getElementById('np-food-brand').value = nPlan.foodBrand || '';
      document.getElementById('np-portion').value = nPlan.portionSize || '';
    }

    // Pedigree modal
    if (name === 'editPedigree') {
      var ped = data.pedigree || {};
      document.getElementById('ped-registry').value = ped.registry || 'Non inscrit';
      document.getElementById('ped-reg-number').value = ped.registryNumber || '';
      document.getElementById('ped-chip').value = ped.chipNumber || data.animal.chip || '';
      document.getElementById('ped-sire-name').value = (ped.sire && ped.sire.name) || '';
      document.getElementById('ped-sire-reg').value = (ped.sire && ped.sire.registry) || '';
      document.getElementById('ped-dam-name').value = (ped.dam && ped.dam.name) || '';
      document.getElementById('ped-dam-reg').value = (ped.dam && ped.dam.registry) || '';
      var gpd = ped.grandparents || {};
      document.getElementById('ped-gp-ps').value = gpd.paternalGrandsire || '';
      document.getElementById('ped-gp-pd').value = gpd.paternalGranddam || '';
      document.getElementById('ped-gp-ms').value = gpd.maternalGrandsire || '';
      document.getElementById('ped-gp-md').value = gpd.maternalGranddam || '';
      document.getElementById('ped-gp-ps-reg').value = gpd.paternalGrandsireRegistry || '';
      document.getElementById('ped-gp-pd-reg').value = gpd.paternalGranddamRegistry || '';
      document.getElementById('ped-gp-ms-reg').value = gpd.maternalGrandsireRegistry || '';
      document.getElementById('ped-gp-md-reg').value = gpd.maternalGranddamRegistry || '';
      document.getElementById('ped-health-notes').value = ped.healthNotes || '';
      toggleLofVerifyControls();
    }

    // Vet contact modals
    if (name === 'addVetContact') {
      document.getElementById('vc-name').value = '';
      document.getElementById('vc-clinic').value = '';
      document.getElementById('vc-phone').value = '';
      document.getElementById('vc-email').value = '';
      document.getElementById('vc-address').value = '';
      document.getElementById('vc-lat').value = '';
      document.getElementById('vc-lng').value = '';
      document.getElementById('vc-hours').value = '';
      document.getElementById('vc-emergency').checked = false;
      document.getElementById('vc-notes').value = '';
    }
    if (name === 'editVetContact') {
      var dir = loadVetDirectory();
      var vcid = uiState.editVetContactId;
      var vcEntry = dir.entries.find(function (e) { return e.id === vcid; });
      if (!vcEntry) return;
      document.getElementById('evc-name').value = vcEntry.name || '';
      document.getElementById('evc-clinic').value = vcEntry.clinic || '';
      document.getElementById('evc-phone').value = vcEntry.phone || '';
      document.getElementById('evc-email').value = vcEntry.email || '';
      document.getElementById('evc-address').value = vcEntry.address || '';
      document.getElementById('evc-hours').value = vcEntry.hours || '';
      document.getElementById('evc-emergency').checked = !!vcEntry.emergency;
      document.getElementById('evc-lat').value = vcEntry.lat != null ? vcEntry.lat : '';
      document.getElementById('evc-lng').value = vcEntry.lng != null ? vcEntry.lng : '';
      document.getElementById('evc-notes').value = vcEntry.notes || '';
    }

    if (name === 'editCaption') {
      var photoId = uiState.editCaptionPhotoId;
      var photo = data.photos.find(function (p) { return p.id === photoId; });
      document.getElementById('cap-photo-id').value = photoId;
      document.getElementById('cap-text').value = (photo && photo.caption) || '';
    }

    if (name === 'backup') {
      var input = document.getElementById('backup-import-file');
      if (input) input.value = '';
      var fileNameEl = document.getElementById('backup-file-name');
      if (fileNameEl) fileNameEl.textContent = 'Aucun fichier sélectionné';
    }

    if (name === 'pushSettings') {
      refreshPushSettingsUI();
      refreshDogEventsToggleUI();
    }

    if (name === 'monthlySummary') {
      renderMonthlySummary();
    }

    if (name === 'editVaccin') {
      var vid = uiState.editVaccineId;
      var v = Array.isArray(data.vaccines) ? data.vaccines.find(function (x) { return x.id === vid; }) : null;
      if (!v) return;
      document.getElementById('ev-id').value = String(v.id);
      document.getElementById('ev-name').value = v.name || '';
      document.getElementById('ev-date').value = v.date || '';
      document.getElementById('ev-next').value = v.next || '';
      document.getElementById('ev-frequency').value = v.frequencyDays != null ? String(v.frequencyDays) : '';
      document.getElementById('ev-vet').value = v.vet || '';
      updateVaccineSuggestions();
    }

    if (name === 'editDeworming') {
      var did = uiState.editDewormingId;
      var d = Array.isArray(data.dewormings) ? data.dewormings.find(function (x) { return x.id === did; }) : null;
      if (!d) return;
      document.getElementById('ed-id').value = String(d.id);
      document.getElementById('ed-name').value = d.name || '';
      document.getElementById('ed-date').value = d.date || '';
      document.getElementById('ed-next').value = d.next || '';
      document.getElementById('ed-frequency').value = d.frequencyDays != null ? String(d.frequencyDays) : '';
      document.getElementById('ed-type').value = d.type || 'interne';
    }

    if (name === 'editWeight') {
      var wid = uiState.editWeightEntryId;
      var entries = Array.isArray(data.animal?.weightHistory) ? data.animal.weightHistory : [];
      var wEntry = entries.find(function (x) { return x.id === wid; }) || null;
      if (!wEntry) return;
      document.getElementById('ew-id').value = String(wEntry.id);
      document.getElementById('ew-date').value = wEntry.date || '';
      document.getElementById('ew-weight').value = wEntry.weight != null ? String(wEntry.weight) : '';
    }

    if (name === 'editHeight') {
      var editHeightId = uiState.editHeightEntryId;
      var hEntries = Array.isArray(data.animal?.heightHistory) ? data.animal.heightHistory : [];
      var heightEntry = hEntries.find(function (x) { return x.id === editHeightId; }) || null;
      if (!heightEntry) return;
      document.getElementById('eh-id').value = String(heightEntry.id);
      document.getElementById('eh-date').value = heightEntry.date || '';
      document.getElementById('eh-height').value = heightEntry.height != null ? String(heightEntry.height) : '';
    }

    var overlay = document.getElementById('modal-' + name);
    if (overlay) {
      modalLastFocused = document.activeElement;
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      window.setTimeout(function () {
        var focusable = overlay.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
        if (!focusable) focusable = overlay.querySelector('button:not([disabled])');
        if (focusable) focusable.focus();
      }, 50);
    }
  }

  var modalLastFocused = null;

  function closeModal(name) {
    var overlay = document.getElementById('modal-' + name);
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      if (modalLastFocused && typeof modalLastFocused.focus === 'function') {
        modalLastFocused.focus();
      }
      modalLastFocused = null;
    }
  }

  // ——— Save forms ———————————————————————————————————————
  function saveAnimal() {
    var data = getCurrent();
    if (!data) return;
    var a = data.animal;
    var fields = ['name', 'species', 'race', 'sex', 'dob', 'color', 'chip', 'sterilise', 'notes'];
    fields.forEach(function (f) {
      var el = document.getElementById('ea-' + f);
      if (el) a[f] = el.value.trim();
    });
    var w = parseFloat(document.getElementById('ea-weight').value, 10);
    a.weight = isNaN(w) ? a.weight : w;
    var hIn = document.getElementById('ea-height');
    if (hIn) {
      var hv = parseFloat(hIn.value, 10);
      a.height = hIn.value.trim() === '' || isNaN(hv) ? null : hv;
    }
    var colorEl = document.getElementById('ea-themeColor');
    if (colorEl) a.themeColor = colorEl.value === '#1F3D34' ? '' : colorEl.value;
    closeModal('editAnimal');
    saveState();
    renderProfile();
    renderAnimalSelect();
    showToast('Fiche modifiée', 'success');
  }

  function saveOwner() {
    var o = getOwner();
    ['name', 'phone', 'email', 'clinic', 'address'].forEach(function (f) {
      var el = document.getElementById('eo-' + f);
      if (el) o[f] = el.value.trim();
    });
    closeModal('editOwner');
    saveState();
    renderProfile();
    // "Mon compte" affiche aussi ce nom/email (voir showUserProfile) : les
    // mettre à jour même si cette vue n'est pas visible à l'instant T.
    var nameEl = document.getElementById('user-profile-name');
    var emailEl = document.getElementById('user-profile-email');
    if (nameEl) nameEl.textContent = o.name || 'Utilisateur';
    if (emailEl) emailEl.textContent = o.email || '';
    showToast('Propriétaire modifié', 'success');
  }

  // ——— Weight ————————————————————————————————————————
  function addWeightEntry() {
    var data = getCurrent();
    if (!data) return;
    if (!data.animal) data.animal = {};
    if (!Array.isArray(data.animal.weightHistory)) data.animal.weightHistory = [];

    var date = document.getElementById('wh-date')?.value;
    var w = parseFloat(document.getElementById('wh-weight')?.value, 10);

    if (!date) { showToast('Veuillez choisir une date.', 'error'); return; }
    if (isNaN(w) || w <= 0) { showToast('Veuillez saisir un poids valide (kg).', 'error'); return; }

    data.animal.weightHistory.push({ id: state.nextId++, date: date, weight: w });
    data.animal.weight = w;
    closeModal('addWeight');
    saveState();
    refreshAll();
    showToast('Pesée ajoutée', 'success');
  }

  function syncAnimalWeightFromHistory(wrap) {
    if (!wrap || !wrap.animal) return;
    var entries = Array.isArray(wrap.animal.weightHistory) ? wrap.animal.weightHistory : [];
    if (entries.length === 0) { wrap.animal.weight = null; return; }
    var latest = entries.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
    wrap.animal.weight = latest && latest.weight != null ? Number(latest.weight) : null;
  }

  function updateWeightEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editWeightEntryId;
    var entries = Array.isArray(data.animal?.weightHistory) ? data.animal.weightHistory : [];
    var entry = entries.find(function (x) { return x.id === id; }) || null;
    if (!entry) return;

    var date = document.getElementById('ew-date').value;
    var weight = parseFloat(document.getElementById('ew-weight').value, 10);
    if (!date) { showToast('Veuillez choisir une date.', 'error'); return; }
    if (isNaN(weight) || weight <= 0) { showToast('Veuillez saisir un poids valide (kg).', 'error'); return; }

    entry.date = date;
    entry.weight = weight;
    syncAnimalWeightFromHistory(data);
    closeModal('editWeight');
    uiState.editWeightEntryId = null;
    saveState();
    refreshAll();
    showToast('Pesée modifiée', 'success');
  }

  function deleteWeightEntry(entryId) {
    var data = getCurrent();
    if (!data || !data.animal || !Array.isArray(data.animal.weightHistory)) return;
    confirmDelete('Supprimer cette pesée ?', function () {
      var idx = data.animal.weightHistory.findIndex(function (w) { return w.id === entryId; });
      if (idx === -1) return;
      var removed = data.animal.weightHistory[idx];
      data.animal.weightHistory.splice(idx, 1);
      syncAnimalWeightFromHistory(data);
      saveState();
      refreshAll();
      showUndoToast('Pesée supprimée', function () {
        data.animal.weightHistory.splice(idx, 0, removed);
        syncAnimalWeightFromHistory(data);
        saveState();
        refreshAll();
      });
    });
  }

  // ——— Height (taille au garrot) ————————————————————————————
  function addHeightEntry() {
    var data = getCurrent();
    if (!data) return;
    if (!data.animal) data.animal = {};
    if (!Array.isArray(data.animal.heightHistory)) data.animal.heightHistory = [];

    var date = document.getElementById('hh-date')?.value;
    var h = parseFloat(document.getElementById('hh-height')?.value, 10);

    if (!date) { showToast('Veuillez choisir une date.', 'error'); return; }
    if (isNaN(h) || h <= 0) { showToast('Veuillez saisir une taille valide (cm).', 'error'); return; }

    data.animal.heightHistory.push({ id: state.nextId++, date: date, height: h });
    data.animal.height = h;
    closeModal('addHeight');
    saveState();
    refreshAll();
    showToast('Mesure ajoutée', 'success');
  }

  function syncAnimalHeightFromHistory(wrap) {
    if (!wrap || !wrap.animal) return;
    var entries = Array.isArray(wrap.animal.heightHistory) ? wrap.animal.heightHistory : [];
    if (entries.length === 0) return;
    var latest = entries.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
    wrap.animal.height = latest && latest.height != null ? Number(latest.height) : wrap.animal.height;
  }

  function updateHeightEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editHeightEntryId;
    var entries = Array.isArray(data.animal?.heightHistory) ? data.animal.heightHistory : [];
    var entry = entries.find(function (x) { return x.id === id; }) || null;
    if (!entry) return;

    var date = document.getElementById('eh-date').value;
    var height = parseFloat(document.getElementById('eh-height').value, 10);
    if (!date) { showToast('Veuillez choisir une date.', 'error'); return; }
    if (isNaN(height) || height <= 0) { showToast('Veuillez saisir une taille valide (cm).', 'error'); return; }

    entry.date = date;
    entry.height = height;
    syncAnimalHeightFromHistory(data);
    closeModal('editHeight');
    uiState.editHeightEntryId = null;
    saveState();
    refreshAll();
    showToast('Mesure modifiée', 'success');
  }

  function deleteHeightEntry(entryId) {
    var data = getCurrent();
    if (!data || !data.animal || !Array.isArray(data.animal.heightHistory)) return;
    confirmDelete('Supprimer cette mesure ?', function () {
      var idx = data.animal.heightHistory.findIndex(function (h) { return h.id === entryId; });
      if (idx === -1) return;
      var removed = data.animal.heightHistory[idx];
      data.animal.heightHistory.splice(idx, 1);
      syncAnimalHeightFromHistory(data);
      saveState();
      refreshAll();
      showUndoToast('Mesure supprimée', function () {
        data.animal.heightHistory.splice(idx, 0, removed);
        syncAnimalHeightFromHistory(data);
        saveState();
        refreshAll();
      });
    });
  }

  // ——— Add animal ———————————————————————————————————————
  async function addAnimal() {
    if (uiState.addingAnimal) return;
    var name = document.getElementById('aa-name').value.trim();
    if (!name) { showToast("Veuillez saisir le nom de l'animal.", 'error'); return; }
    var newAnimal = {
      id: state.nextId++,
      animal: {
        name: name,
        species: document.getElementById('aa-species').value || 'Canine',
        race: document.getElementById('aa-race').value.trim() || '',
        sex: document.getElementById('aa-sex').value || 'Mâle',
        dob: document.getElementById('aa-dob').value || '',
        weight: parseFloat(document.getElementById('aa-weight').value, 10) || null,
        weightHistory: [], height: null, heightHistory: [], color: '', chip: document.getElementById('aa-chip').value.trim(), sterilise: document.getElementById('aa-sterilise').value, notes: '', avatar: null, themeColor: ''
      },
      photos: [], vaccines: [], dewormings: [], consultations: [], medications: [], notes: [],
      notifications: { vaccineReminder: true, dewormingReminder: true, hygieneReminder: true, birthdayReminder: true, medicationReminder: true, matingReminder: true, monthlySummary: false }
    };
    uiState.addingAnimal = true;
    var submit = document.querySelector('#form-add-animal [type=submit]');
    submit.disabled = true;
    var photo = document.getElementById('aa-photo').files[0];
    if (photo) {
      try {
        var blob = await resizeImageToBlob(photo, 320, 'image/jpeg', 0.85);
        var photoKey = state.nextId++;
        await putPhotoBlob(photoKey, blob, blob.type);
        newAnimal.animal.avatar = photoKey;
      } catch (err) { uiState.addingAnimal = false; submit.disabled = false; showToast('La photo n’a pas pu être ajoutée. Choisissez une autre image.', 'error'); return; }
    }
    uiState.addingAnimal = false;
    submit.disabled = false;
    state.animals.push(newAnimal);
    state.currentAnimalId = newAnimal.id;
    closeModal('addAnimal');
    document.getElementById('form-add-animal').reset();
    saveState();
    renderAnimalSelect();
    refreshAll();
    showToast('Animal ajouté', 'success');
    showDetail({ tab: 'profil', nav: 'pets' });
  }

  // ——— Avatar ————————————————————————————————————————
  function handleAvatarUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    var data = getCurrent();
    if (!data) return;

    var oldKey = typeof data.animal.avatar === 'number' ? data.animal.avatar : null;
    var inputKey = state.nextId++;

    resizeImageToBlob(file, 320, 'image/jpeg', 0.85).then(function (blob) {
      return putPhotoBlob(inputKey, blob, blob.type);
    }).then(function () {
      data.animal.avatar = inputKey;
      var prev = document.getElementById('edit-avatar-preview');
      if (prev) {
        prev.innerHTML = '';
        getPhotoObjectUrl(inputKey).then(function (url) {
          if (!prev) return;
          prev.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="">';
        }).catch(function () {});
      }
      if (oldKey != null && oldKey !== inputKey) deletePhotoBlob(oldKey).catch(function () {});
      saveState();
      renderProfile();
    }).catch(function (err) { console.warn('App\'lika: avatar upload échoué', err); })
    .finally(function () { e.target.value = ''; });
  }

  // ——— Photos ————————————————————————————————————————
  function triggerPhotoUpload() { document.getElementById('photo-input').click(); }

  function handlePhotoUpload(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    processPhotoFiles(Array.from(files));
    e.target.value = '';
  }

  function processPhotoFiles(fileArr) {
    var data = getCurrent();
    if (!data) return;
    var todayStr = todayISO();

    Promise.all(fileArr.map(function (file) {
      if (!file || !file.type || !file.type.startsWith('image/')) return Promise.resolve(null);
      var key = state.nextId++;
      return resizeImageToBlob(file, 1600, 'image/jpeg', 0.85).then(function (blob) {
        return putPhotoBlob(key, blob, blob.type).then(function () {
          return { id: key, date: todayStr, caption: '' };
        });
      });
    })).then(function (results) {
      results.filter(Boolean).forEach(function (p) { data.photos.push(p); });
      saveState();
      renderGallery();
      renderProfile();
      showToast(results.filter(Boolean).length + ' photo(s) ajoutée(s)', 'success');
    }).catch(function (err) { console.warn('App\'lika: upload photos échoué', err); });
  }

  function renderGallery() {
    var summary = document.getElementById('gallery-summary');
    var current = getCurrent();
    if (summary && current) summary.textContent = (current.photos || []).length + ' photo(s) dans le carnet de ' + (current.animal.name || 'votre compagnon') + '.';
    var data = getCurrent();
    var grid = document.getElementById('gallery-grid');
    if (!data || !grid) return;

    if (data.photos.length === 0) {
      grid.innerHTML = '<button type="button" class="gallery-add" id="gallery-add-trigger"><span class="gallery-add-icon">' + ico('camera', 18) + '</span><span>Ajouter une photo</span></button>' +
        '<div class="empty-state-illustrated"><div class="empty-svg" style="display:flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;border:4px solid var(--border)">' + ico('camera') + '</div><p>' + t('noPhotos', escapeHtml(data.animal.name || '')) + '</p></div>';
    } else {
      var addBtn = '<button type="button" class="gallery-add" id="gallery-add-trigger"><span class="gallery-add-icon">' + ico('camera', 18) + '</span><span>Ajouter une photo</span></button>';
      var items = data.photos.map(function (p) {
        var photoId = p.id;
        var legacySrc = (p && typeof p.src === 'string') ? escapeHtml(p.src) : '';
        var captionHtml = p.caption ? '<div class="photo-caption">' + escapeHtml(p.caption) + '</div>' : '';
        return '<div class="gallery-item" role="group" data-photo-id="' + p.id + '">' +
          '<img src="' + legacySrc + '" data-photo-key="' + photoId + '" tabindex="0" role="button" alt="' + escapeHtml(p.caption || 'Ouvrir la photo du ' + fmtDate(p.date)) + '">' +
          '<div class="photo-date">' + fmtDate(p.date) + captionHtml + '</div>' +
          '<div class="photo-actions-overlay">' +
          '<button type="button" class="photo-action-btn caption-btn" data-caption-id="' + p.id + '" aria-label="Légende" title="Légende">' + ico('edit', 14) + '</button>' +
          '<button type="button" class="photo-action-btn" data-delete-photo="' + p.id + '" aria-label="Supprimer">✕</button>' +
          '</div></div>';
      }).join('');
      grid.innerHTML = addBtn + items;
    }

    grid.querySelectorAll('.gallery-item').forEach(function (el) {
      var id = parseInt(el.getAttribute('data-photo-id'), 10);
      if (isNaN(id)) return;
      var img = el.querySelector('img');
      if (img) img.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openLightbox(id, img.src || ''); } });
      el.addEventListener('click', function (e) {
        if (e.target.closest('.photo-actions-overlay')) return;
        openLightbox(id, img?.src || '');
      });
    });

    grid.querySelectorAll('[data-delete-photo]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deletePhoto(parseInt(btn.getAttribute('data-delete-photo'), 10));
      });
    });

    grid.querySelectorAll('[data-caption-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        uiState.editCaptionPhotoId = parseInt(btn.getAttribute('data-caption-id'), 10);
        openModal('editCaption');
      });
    });

    grid.querySelectorAll('img[data-photo-key]').forEach(function (imgEl) {
      var photoId = parseInt(imgEl.getAttribute('data-photo-key'), 10);
      if (isNaN(photoId)) return;
      getPhotoObjectUrl(photoId).then(function (url) { if (url) imgEl.src = url; }).catch(function () {});
    });

    var addTrigger = document.getElementById('gallery-add-trigger');
    if (addTrigger) addTrigger.addEventListener('click', triggerPhotoUpload);

    // Drag & drop
    setupGalleryDragDrop(grid);
  }

  function setupGalleryDragDrop(grid) {
    grid.addEventListener('dragover', function (e) { e.preventDefault(); grid.classList.add('drag-over'); });
    grid.addEventListener('dragenter', function (e) { e.preventDefault(); grid.classList.add('drag-over'); });
    grid.addEventListener('dragleave', function () { grid.classList.remove('drag-over'); });
    grid.addEventListener('drop', function (e) {
      e.preventDefault();
      grid.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        processPhotoFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  function saveCaption() {
    var data = getCurrent();
    if (!data) return;
    var photoId = parseInt(document.getElementById('cap-photo-id').value, 10);
    var caption = document.getElementById('cap-text').value.trim();
    var photo = data.photos.find(function (p) { return p.id === photoId; });
    if (photo) {
      photo.caption = caption;
      saveState();
      renderGallery();
      showToast('Légende modifiée', 'success');
    }
    closeModal('editCaption');
  }

  function deletePhoto(id) {
    var data = getCurrent();
    if (!data) return;
    confirmDelete('Supprimer cette photo ? Cette action est irréversible.', function () {
      data.photos = data.photos.filter(function (p) { return p.id !== id; });
      deletePhotoBlob(id).catch(function () {});
      saveState();
      renderGallery();
      renderProfile();
      showToast('Photo supprimée', 'success');
    });
  }

  function openLightbox(photoId, fallbackSrc) {
    var data = getCurrent();
    var photo = data ? data.photos.find(function (p) { return p.id === photoId; }) : null;
    var captionEl = document.getElementById('lightbox-caption');
    if (captionEl) captionEl.textContent = (photo && photo.caption) || '';

    getPhotoObjectUrl(photoId).then(function (url) {
      document.getElementById('lightbox-img').src = url || fallbackSrc || '';
      document.getElementById('lightbox').classList.add('open');
      document.getElementById('lightbox').setAttribute('aria-hidden', 'false');
    }).catch(function () {
      document.getElementById('lightbox-img').src = fallbackSrc || '';
      document.getElementById('lightbox').classList.add('open');
      document.getElementById('lightbox').setAttribute('aria-hidden', 'false');
    });
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.getElementById('lightbox').setAttribute('aria-hidden', 'true');
  }

  // ——— Vaccines ————————————————————————————————————————
  // Markup partagée pour l'état vide des 5 écrans "tableaux santé" (Vaccins,
  // Déparasitage, Consultations, Médicaments, Hygiène) — un seul rendu au
  // lieu de deux implémentations divergentes.
  function medicalEmptyStateHtml(iconName, text) {
    return '<div class="empty-state-illustrated"><div class="empty-svg" style="display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;border:4px solid var(--border);margin-left:auto;margin-right:auto">' + ico(iconName) + '</div><p>' + text + '</p></div>';
  }

  function renderVaccines() {
    var data = getCurrent();
    var cardsContainer = document.getElementById('vaccine-cards');
    var alertsEl = document.getElementById('vaccine-alerts');
    if (!data || !cardsContainer) return;

    var searchQ = (document.getElementById('vaccine-search')?.value || '').toLowerCase().trim();
    var statusFilter = document.getElementById('vaccine-status-filter')?.value || 'all';
    var sortBy = document.getElementById('vaccine-sort')?.value || 'dateDesc';

    var list = Array.isArray(data.vaccines) ? data.vaccines.slice() : [];

    if (searchQ) {
      list = list.filter(function (v) {
        return (v.name || '').toLowerCase().includes(searchQ) || (v.vet || '').toLowerCase().includes(searchQ) || (v.date || '').includes(searchQ);
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter(function (v) {
        var st = getStatus(v.next);
        if (!st) return false;
        if (statusFilter === 'ok') return st.cls === 'status-ok';
        if (statusFilter === 'soon') return st.cls === 'status-soon';
        if (statusFilter === 'overdue') return st.cls === 'status-overdue';
        return true;
      });
    }

    list.sort(function (a, b) {
      var nextA = a.next ? (isoToLocalDate(a.next) ? isoToLocalDate(a.next).getTime() : Infinity) : Infinity;
      var nextB = b.next ? (isoToLocalDate(b.next) ? isoToLocalDate(b.next).getTime() : Infinity) : Infinity;
      var dateA = a.date ? (isoToLocalDate(a.date) ? isoToLocalDate(a.date).getTime() : Infinity) : Infinity;
      var dateB = b.date ? (isoToLocalDate(b.date) ? isoToLocalDate(b.date).getTime() : Infinity) : Infinity;
      if (sortBy === 'nextAsc') return nextA - nextB;
      if (sortBy === 'nextDesc') return nextB - nextA;
      if (sortBy === 'dateAsc') return dateA - dateB;
      return dateB - dateA;
    });

    if (list.length === 0 && !searchQ && statusFilter === 'all') {
      cardsContainer.innerHTML = medicalEmptyStateHtml('vaccine', t('noVaccines', escapeHtml(data.animal.name || '')));
    } else if (list.length === 0) {
      cardsContainer.innerHTML = medicalEmptyStateHtml('search', 'Aucun résultat pour cette recherche.');
    } else {
      cardsContainer.innerHTML = list.map(function (v) {
        var st = getStatus(v.next);
        var statusCls = st ? st.cls : '';
        var statusLbl = st ? st.lbl : '';
        var rel = v.next ? relativeDate(v.next) : '';
        return '<div class="med-record-card">' +
          '<div class="med-record-card__icon med-record-card__icon--vaccine">' + ico('vaccine', 18) + '</div>' +
          '<div class="med-record-card__body">' +
            '<div class="med-record-card__header">' +
              '<div class="med-record-card__title">' + escapeHtml(v.name || '') + '</div>' +
              (st ? '<span class="med-record-card__status ' + statusCls + '">' + escapeHtml(statusLbl) + '</span>' : '') +
            '</div>' +
            (v.vet ? '<div class="med-record-card__meta">Dr. ' + escapeHtml(v.vet) + '</div>' : '') +
            '<div class="med-record-card__dates">' +
              '<span>Fait le ' + fmtDate(v.date) + '</span>' +
              (v.next ? '<span>Rappel : ' + fmtDate(v.next) + (rel ? ' (' + escapeHtml(rel) + ')' : '') + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="med-record-card__actions">' +
            '<button type="button" class="med-record-card__btn" data-vaccine-id="' + v.id + '" data-action="edit" title="Modifier">' + ico('edit', 14) + '</button>' +
            '<button type="button" class="med-record-card__btn med-record-card__btn--delete" data-vaccine-id="' + v.id + '" data-action="delete" title="Supprimer">✕</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    cardsContainer.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-vaccine-id'), 10);
        confirmDelete('Supprimer ce vaccin ?', function () {
          var idx = data.vaccines.findIndex(function (v) { return v.id === id; });
          if (idx === -1) return;
          var removed = data.vaccines[idx];
          data.vaccines.splice(idx, 1);
          saveState(); renderVaccines(); renderProfile();
          showUndoToast('Vaccin supprimé', function () {
            data.vaccines.splice(idx, 0, removed);
            saveState(); renderVaccines(); renderProfile();
          });
        });
      });
    });

    cardsContainer.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editVaccineId = parseInt(btn.getAttribute('data-vaccine-id'), 10);
        openModal('editVaccin');
      });
    });

    if (alertsEl) {
      var overdue = data.vaccines.filter(function (v) { return v.next && getStatus(v.next)?.cls === 'status-overdue'; });
      var soon = data.vaccines.filter(function (v) { return v.next && getStatus(v.next)?.cls === 'status-soon'; });
      var html = '';
      if (overdue.length) html += '<div class="alert-banner alert-warning"><span>' + ico('warning', 16) + '</span> En retard : ' + overdue.map(function (v) { return escapeHtml(v.name); }).join(', ') + '</div>';
      if (soon.length) html += '<div class="alert-banner alert-info"><span>' + ico('clock', 16) + '</span> Bientôt : ' + soon.map(function (v) { return escapeHtml(v.name); }).join(', ') + '</div>';
      alertsEl.innerHTML = html;
    }
  }

  function addVaccine() {
    var name = document.getElementById('v-name').value.trim();
    var date = document.getElementById('v-date').value;
    if (!name || !date) { showToast('Nom et date du vaccin sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;

    var freqVal = document.getElementById('v-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('v-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';
    var next = computedNext || manualNext;

    data.vaccines.push({
      id: state.nextId++, date: date, name: name, next: next,
      frequencyDays: !isNaN(freqDays) && freqDays > 0 ? freqDays : '',
      vet: document.getElementById('v-vet').value.trim()
    });
    closeModal('addVaccin');
    saveState(); renderVaccines(); renderProfile();
    showToast('Vaccin ajouté', 'success');
  }

  function updateVaccineEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editVaccineId;
    var v = Array.isArray(data.vaccines) ? data.vaccines.find(function (x) { return x.id === id; }) : null;
    if (!v) return;

    var name = document.getElementById('ev-name').value.trim();
    var date = document.getElementById('ev-date').value;
    if (!name || !date) { showToast('Nom et date du vaccin sont requis.', 'error'); return; }

    var freqVal = document.getElementById('ev-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('ev-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    v.name = name; v.date = date; v.next = computedNext || manualNext;
    v.vet = document.getElementById('ev-vet').value.trim();
    v.frequencyDays = !isNaN(freqDays) && freqDays > 0 ? freqDays : '';

    closeModal('editVaccin');
    uiState.editVaccineId = null;
    saveState(); refreshAll();
    showToast('Vaccin modifié', 'success');
  }

  // ——— Dewormings ————————————————————————————————————
  function renderDewormings() {
    var data = getCurrent();
    var cardsContainer = document.getElementById('deworming-cards');
    if (!data || !cardsContainer) return;

    var searchQ = (document.getElementById('deworming-search')?.value || '').toLowerCase().trim();
    var statusFilter = document.getElementById('deworming-status-filter')?.value || 'all';
    var sortBy = document.getElementById('deworming-sort')?.value || 'dateDesc';

    var list = Array.isArray(data.dewormings) ? data.dewormings.slice() : [];

    if (searchQ) {
      list = list.filter(function (d) {
        return (d.name || '').toLowerCase().includes(searchQ) || (d.type || '').toLowerCase().includes(searchQ) || (d.date || '').includes(searchQ);
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter(function (d) {
        var st = d.next ? getStatus(d.next) : null;
        if (!st) return false;
        if (statusFilter === 'ok') return st.cls === 'status-ok';
        if (statusFilter === 'soon') return st.cls === 'status-soon';
        if (statusFilter === 'overdue') return st.cls === 'status-overdue';
        return true;
      });
    }

    list.sort(function (a, b) {
      var nextA = a.next ? (isoToLocalDate(a.next) ? isoToLocalDate(a.next).getTime() : Infinity) : Infinity;
      var nextB = b.next ? (isoToLocalDate(b.next) ? isoToLocalDate(b.next).getTime() : Infinity) : Infinity;
      var dateA = a.date ? (isoToLocalDate(a.date) ? isoToLocalDate(a.date).getTime() : Infinity) : Infinity;
      var dateB = b.date ? (isoToLocalDate(b.date) ? isoToLocalDate(b.date).getTime() : Infinity) : Infinity;
      if (sortBy === 'nextAsc') return nextA - nextB;
      if (sortBy === 'nextDesc') return nextB - nextA;
      if (sortBy === 'dateAsc') return dateA - dateB;
      return dateB - dateA;
    });

    if (list.length === 0 && !searchQ && statusFilter === 'all') {
      cardsContainer.innerHTML = medicalEmptyStateHtml('pill', t('noDewormings', escapeHtml(data.animal.name || '')));
    } else if (list.length === 0) {
      cardsContainer.innerHTML = medicalEmptyStateHtml('search', 'Aucun résultat pour cette recherche.');
    } else {
      cardsContainer.innerHTML = list.map(function (d) {
        var st = d.next ? getStatus(d.next) : null;
        var statusCls = st ? st.cls : '';
        var statusLbl = st ? st.lbl : '';
        var rel = d.next ? relativeDate(d.next) : '';
        return '<div class="med-record-card">' +
          '<div class="med-record-card__icon med-record-card__icon--deworming">' + ico('pill', 18) + '</div>' +
          '<div class="med-record-card__body">' +
            '<div class="med-record-card__header">' +
              '<div class="med-record-card__title">' + escapeHtml(d.name || '') + '</div>' +
              (st ? '<span class="med-record-card__status ' + statusCls + '">' + escapeHtml(statusLbl) + '</span>' : '') +
            '</div>' +
            (d.type ? '<div class="med-record-card__meta">Type : ' + escapeHtml(d.type) + '</div>' : '') +
            '<div class="med-record-card__dates">' +
              '<span>Fait le ' + fmtDate(d.date) + '</span>' +
              (d.next ? '<span>Rappel : ' + fmtDate(d.next) + (rel ? ' (' + escapeHtml(rel) + ')' : '') + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="med-record-card__actions">' +
            '<button type="button" class="med-record-card__btn" data-deworming-id="' + d.id + '" data-action="edit" title="Modifier">' + ico('edit', 14) + '</button>' +
            '<button type="button" class="med-record-card__btn med-record-card__btn--delete" data-deworming-id="' + d.id + '" data-action="delete" title="Supprimer">✕</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    cardsContainer.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-deworming-id'), 10);
        confirmDelete('Supprimer ce déparasitage ?', function () {
          var idx = data.dewormings.findIndex(function (d) { return d.id === id; });
          if (idx === -1) return;
          var removed = data.dewormings[idx];
          data.dewormings.splice(idx, 1);
          saveState(); renderDewormings(); renderProfile();
          showUndoToast('Déparasitage supprimé', function () {
            data.dewormings.splice(idx, 0, removed);
            saveState(); renderDewormings(); renderProfile();
          });
        });
      });
    });

    cardsContainer.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editDewormingId = parseInt(btn.getAttribute('data-deworming-id'), 10);
        openModal('editDeworming');
      });
    });
  }

  function addDeworming() {
    var name = document.getElementById('d-name').value.trim();
    var date = document.getElementById('d-date').value;
    if (!name || !date) { showToast('Traitement et date sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;

    var freqVal = document.getElementById('d-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('d-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    data.dewormings.push({
      id: state.nextId++, date: date, name: name, next: computedNext || manualNext,
      frequencyDays: !isNaN(freqDays) && freqDays > 0 ? freqDays : '',
      type: document.getElementById('d-type').value || 'interne'
    });
    closeModal('addDeworming');
    saveState(); renderDewormings(); renderProfile();
    showToast('Déparasitage ajouté', 'success');
  }

  function updateDewormingEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editDewormingId;
    var d = Array.isArray(data.dewormings) ? data.dewormings.find(function (x) { return x.id === id; }) : null;
    if (!d) return;

    var name = document.getElementById('ed-name').value.trim();
    var date = document.getElementById('ed-date').value;
    if (!name || !date) { showToast('Traitement et date sont requis.', 'error'); return; }

    var freqVal = document.getElementById('ed-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('ed-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    d.name = name; d.date = date; d.next = computedNext || manualNext;
    d.type = document.getElementById('ed-type').value || 'interne';
    d.frequencyDays = !isNaN(freqDays) && freqDays > 0 ? freqDays : '';

    closeModal('editDeworming');
    uiState.editDewormingId = null;
    saveState(); refreshAll();
    showToast('Déparasitage modifié', 'success');
  }

  // ——— Consultations ————————————————————————————————————
  function renderConsultations() {
    var data = getCurrent();
    var cardsContainer = document.getElementById('consult-cards');
    if (!data || !cardsContainer) return;

    var list = Array.isArray(data.consultations) ? data.consultations.slice() : [];
    var searchQ = (document.getElementById('consult-search')?.value || '').toLowerCase().trim();

    if (searchQ) {
      list = list.filter(function (c) {
        return (c.reason || '').toLowerCase().includes(searchQ) || (c.vet || '').toLowerCase().includes(searchQ) || (c.diagnosis || '').toLowerCase().includes(searchQ);
      });
    }

    list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    var summaryEl = document.getElementById('consult-summary');
    var consultSection = document.getElementById('section-consultations');
    if (summaryEl && consultSection) consultSection.prepend(summaryEl);
    if (summaryEl) {
      var allConsults = Array.isArray(data.consultations) ? data.consultations : [];
      summaryEl.hidden = false;
      var filteredTotal = list.reduce(function (sum, c) { return sum + (Number(c.cost) || 0); }, 0);
      var yearAgo = new Date(); yearAgo.setDate(yearAgo.getDate() - 365);
      var yearTotal = allConsults.reduce(function (sum, c) {
        return sum + (c.date && new Date(c.date) >= yearAgo ? (Number(c.cost) || 0) : 0);
      }, 0);
      var filteredEl = document.getElementById('consult-summary-filtered');
      var yearEl = document.getElementById('consult-summary-year');
      if (filteredEl) filteredEl.textContent = fmtCost(filteredTotal);
      if (yearEl) yearEl.textContent = fmtCost(yearTotal);
    }

    if (list.length === 0 && !searchQ) {
      cardsContainer.innerHTML = medicalEmptyStateHtml('stethoscope', t('noConsultations', escapeHtml(data.animal.name || '')));
    } else if (list.length === 0) {
      cardsContainer.innerHTML = medicalEmptyStateHtml('search', 'Aucun résultat pour cette recherche.');
    } else {
      cardsContainer.innerHTML = list.map(function (c) {
        var hasCost = c.cost != null && c.cost !== '';
        return '<div class="med-record-card">' +
          '<div class="med-record-card__icon med-record-card__icon--consult">' + ico('stethoscope', 18) + '</div>' +
          '<div class="med-record-card__body">' +
            '<div class="med-record-card__header">' +
              '<div class="med-record-card__title">' + escapeHtml(c.reason || '') + '</div>' +
              (hasCost ? '<span class="med-record-card__status status-neutral">' + fmtCost(c.cost) + '</span>' : '') +
            '</div>' +
            (c.diagnosis ? '<div class="med-record-card__meta">' + escapeHtml(c.diagnosis) + '</div>' : '') +
            '<div class="med-record-card__dates">' +
              '<span>Le ' + fmtDate(c.date) + '</span>' +
              (c.vet ? '<span>Dr. ' + escapeHtml(c.vet) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="med-record-card__actions">' +
            '<button type="button" class="med-record-card__btn" data-consult-id="' + c.id + '" data-action="edit" title="Modifier">' + ico('edit', 14) + '</button>' +
            '<button type="button" class="med-record-card__btn med-record-card__btn--delete" data-consult-id="' + c.id + '" data-action="delete" title="Supprimer">✕</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    cardsContainer.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-consult-id'), 10);
        confirmDelete('Supprimer cette consultation ?', function () {
          var idx = data.consultations.findIndex(function (c) { return c.id === id; });
          if (idx === -1) return;
          var removed = data.consultations[idx];
          data.consultations.splice(idx, 1);
          saveState(); renderConsultations();
          showUndoToast('Consultation supprimée', function () {
            data.consultations.splice(idx, 0, removed);
            saveState(); renderConsultations();
          });
        });
      });
    });

    cardsContainer.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editConsultId = parseInt(btn.getAttribute('data-consult-id'), 10);
        openModal('editConsult');
      });
    });
  }

  function addConsultation() {
    var date = document.getElementById('c-date').value;
    var reason = document.getElementById('c-reason').value.trim();
    if (!date || !reason) { showToast('Date et motif sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.consultations)) data.consultations = [];

    data.consultations.push({
      id: state.nextId++, date: date, vet: document.getElementById('c-vet').value.trim(),
      reason: reason, diagnosis: document.getElementById('c-diagnosis').value.trim(),
      treatment: document.getElementById('c-treatment').value.trim(),
      cost: parseFloat(document.getElementById('c-cost').value) || null,
      notes: document.getElementById('c-notes').value.trim()
    });
    closeModal('addConsult');
    saveState(); renderConsultations();
    showToast('Consultation ajoutée', 'success');
  }

  function updateConsultation() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editConsultId;
    var c = Array.isArray(data.consultations) ? data.consultations.find(function (x) { return x.id === id; }) : null;
    if (!c) return;

    var date = document.getElementById('ec-date').value;
    var reason = document.getElementById('ec-reason').value.trim();
    if (!date || !reason) { showToast('Date et motif sont requis.', 'error'); return; }

    c.date = date; c.vet = document.getElementById('ec-vet').value.trim();
    c.reason = reason; c.diagnosis = document.getElementById('ec-diagnosis').value.trim();
    c.treatment = document.getElementById('ec-treatment').value.trim();
    c.cost = parseFloat(document.getElementById('ec-cost').value) || null;
    c.notes = document.getElementById('ec-notes').value.trim();

    closeModal('editConsult');
    uiState.editConsultId = null;
    saveState(); renderConsultations();
    showToast('Consultation modifiée', 'success');
  }

  // ——— Medications ———————————————————————————————————————
  function renderMedications() {
    var data = getCurrent();
    var cardsContainer = document.getElementById('medication-cards');
    if (!data || !cardsContainer) return;

    var searchQ = (document.getElementById('medication-search')?.value || '').toLowerCase().trim();
    var list = Array.isArray(data.medications) ? data.medications.slice() : [];

    if (searchQ) {
      list = list.filter(function (m) {
        return (m.name || '').toLowerCase().includes(searchQ) || (m.dosage || '').toLowerCase().includes(searchQ) || (m.frequency || '').toLowerCase().includes(searchQ);
      });
    }

    list.sort(function (a, b) { return new Date(b.startDate || 0) - new Date(a.startDate || 0); });

    if (list.length === 0 && !searchQ) {
      cardsContainer.innerHTML = medicalEmptyStateHtml('pill', 'Aucun médicament enregistré');
    } else if (list.length === 0) {
      cardsContainer.innerHTML = medicalEmptyStateHtml('search', 'Aucun résultat pour cette recherche.');
    } else {
      var todayDt = new Date();
      cardsContainer.innerHTML = list.map(function (m) {
        var isActive = m.active !== false && (!m.endDate || isoToLocalDate(m.endDate) >= todayDt);
        var statusHtml = isActive
          ? '<span class="med-record-card__status status-ok">En cours</span>'
          : '<span class="med-record-card__status status-neutral">Terminé</span>';
        return '<div class="med-record-card">' +
          '<div class="med-record-card__icon med-record-card__icon--medication">' + ico('pill', 18) + '</div>' +
          '<div class="med-record-card__body">' +
            '<div class="med-record-card__header">' +
              '<div class="med-record-card__title">' + escapeHtml(m.name || '') + '</div>' +
              statusHtml +
            '</div>' +
            (m.dosage || m.frequency ? '<div class="med-record-card__meta">' + escapeHtml([m.dosage, m.frequency].filter(Boolean).join(' · ')) + '</div>' : '') +
            '<div class="med-record-card__dates">' +
              '<span>Début : ' + fmtDate(m.startDate) + '</span>' +
              (m.endDate ? '<span>Fin : ' + fmtDate(m.endDate) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="med-record-card__actions">' +
            '<button type="button" class="med-record-card__btn" data-med-id="' + m.id + '" data-action="edit" title="Modifier">' + ico('edit', 14) + '</button>' +
            '<button type="button" class="med-record-card__btn med-record-card__btn--delete" data-med-id="' + m.id + '" data-action="delete" title="Supprimer">✕</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    cardsContainer.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-med-id'), 10);
        confirmDelete('Supprimer ce médicament ?', function () {
          var idx = data.medications.findIndex(function (m) { return m.id === id; });
          if (idx === -1) return;
          var removed = data.medications[idx];
          data.medications.splice(idx, 1);
          saveState(); renderMedications(); renderProfile();
          showUndoToast('Médicament supprimé', function () {
            data.medications.splice(idx, 0, removed);
            saveState(); renderMedications(); renderProfile();
          });
        });
      });
    });

    cardsContainer.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editMedicationId = parseInt(btn.getAttribute('data-med-id'), 10);
        openModal('editMedication');
      });
    });
  }

  function addMedication() {
    var name = document.getElementById('m-name').value.trim();
    var startDate = document.getElementById('m-start').value;
    if (!name || !startDate) { showToast('Nom et date de début sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.medications)) data.medications = [];

    data.medications.push({
      id: state.nextId++, name: name, dosage: document.getElementById('m-dosage').value.trim(),
      frequency: document.getElementById('m-frequency').value.trim(),
      startDate: startDate, endDate: document.getElementById('m-end').value || '',
      notes: document.getElementById('m-notes').value.trim(), active: true
    });
    closeModal('addMedication');
    saveState(); renderMedications(); renderProfile();
    showToast('Médicament ajouté', 'success');
  }

  function updateMedication() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editMedicationId;
    var m = Array.isArray(data.medications) ? data.medications.find(function (x) { return x.id === id; }) : null;
    if (!m) return;

    m.name = document.getElementById('em-name').value.trim();
    m.dosage = document.getElementById('em-dosage').value.trim();
    m.frequency = document.getElementById('em-frequency').value.trim();
    m.startDate = document.getElementById('em-start').value;
    m.endDate = document.getElementById('em-end').value || '';
    m.notes = document.getElementById('em-notes').value.trim();

    closeModal('editMedication');
    uiState.editMedicationId = null;
    saveState(); renderMedications(); renderProfile();
    showToast('Médicament modifié', 'success');
  }

  // ——— Journal / Notes ———————————————————————————————————
  function renderJournal() {
    var data = getCurrent();
    var container = document.getElementById('journal-cards');
    var emptyEl = document.getElementById('journal-empty');
    if (!data || !container) return;

    var catFilter = document.getElementById('journal-cat-filter')?.value || 'all';
    var list = Array.isArray(data.notes) ? data.notes.slice() : [];

    if (catFilter !== 'all') {
      list = list.filter(function (n) { return n.category === catFilter; });
    }

    list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    if (list.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      var catLabels = { sante: 'Santé', comportement: 'Comportement', alimentation: 'Alimentation', autre: 'Autre' };
      var severityCls = { 'Normal': 'checkup-ok', 'À surveiller': 'checkup-warn', 'Préoccupant': 'checkup-bad' };
      container.innerHTML = list.map(function (n) {
        var symptomHtml = n.symptomType ? (
          '<div class="journal-card-symptom ' + (severityCls[n.severity] || '') + '">' +
          escapeHtml(n.symptomType) + (n.severity ? ' — ' + escapeHtml(n.severity) : '') +
          '</div>'
        ) : '';
        return '<div class="journal-card">' +
          '<div class="journal-card-header">' +
          '<div class="journal-card-title">' + escapeHtml(n.title || 'Sans titre') + '</div>' +
          '<span class="journal-card-cat">' + escapeHtml(catLabels[n.category] || n.category || 'Autre') + '</span>' +
          '</div>' +
          '<div class="journal-card-date">' + fmtDate(n.date) + ' · ' + escapeHtml(relativeDate(n.date)) + '</div>' +
          symptomHtml +
          '<div class="journal-card-content">' + escapeHtml(n.content || '') + '</div>' +
          '<div class="journal-card-actions">' +
          '<button type="button" class="btn-edit" data-note-id="' + n.id + '">Modifier</button> ' +
          '<button type="button" class="btn-delete" data-note-id="' + n.id + '">✕</button>' +
          '</div></div>';
      }).join('');
    }

    container.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-note-id'), 10);
        confirmDelete('Supprimer cette note ?', function () {
          var idx = data.notes.findIndex(function (n) { return n.id === id; });
          if (idx === -1) return;
          var removed = data.notes[idx];
          data.notes.splice(idx, 1);
          saveState(); renderJournal();
          showUndoToast('Note supprimée', function () {
            data.notes.splice(idx, 0, removed);
            saveState(); renderJournal();
          });
        });
      });
    });

    container.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editNoteId = parseInt(btn.getAttribute('data-note-id'), 10);
        openModal('editNote');
      });
    });
  }

  function addNote() {
    var date = document.getElementById('n-date').value;
    var title = document.getElementById('n-title').value.trim();
    if (!date || !title) { showToast('Date et titre sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.notes)) data.notes = [];

    var category = document.getElementById('n-category').value || 'autre';
    data.notes.push({
      id: state.nextId++, date: date, title: title,
      content: document.getElementById('n-content').value.trim(),
      category: category,
      symptomType: category === 'sante' ? (document.getElementById('n-symptom-type').value || '') : '',
      severity: category === 'sante' ? (document.getElementById('n-severity').value || 'Normal') : ''
    });
    closeModal('addNote');
    saveState(); renderJournal();
    showToast('Note ajoutée', 'success');
  }

  function updateNote() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editNoteId;
    var n = Array.isArray(data.notes) ? data.notes.find(function (x) { return x.id === id; }) : null;
    if (!n) return;

    n.date = document.getElementById('en-date').value;
    n.title = document.getElementById('en-title').value.trim();
    n.content = document.getElementById('en-content').value.trim();
    n.category = document.getElementById('en-category').value || 'autre';
    n.symptomType = n.category === 'sante' ? (document.getElementById('en-symptom-type').value || '') : '';
    n.severity = n.category === 'sante' ? (document.getElementById('en-severity').value || 'Normal') : '';

    closeModal('editNote');
    uiState.editNoteId = null;
    saveState(); renderJournal();
    showToast('Note modifiée', 'success');
  }

  function populateSymptomSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = SYMPTOM_TYPES.map(function (s) {
      return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
    }).join('');
  }

  function setSeverityValue(groupEl, hiddenInput, value) {
    hiddenInput.value = value;
    groupEl.querySelectorAll('.checkup-level').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-value') === value);
    });
  }

  function setupSymptomFields() {
    populateSymptomSelect(document.getElementById('n-symptom-type'));
    populateSymptomSelect(document.getElementById('en-symptom-type'));

    [
      { catSel: 'n-category', groupSel: 'n-symptom-group', hiddenSel: 'n-severity' },
      { catSel: 'en-category', groupSel: 'en-symptom-group', hiddenSel: 'en-severity' }
    ].forEach(function (cfg) {
      var catEl = document.getElementById(cfg.catSel);
      var groupEl = document.getElementById(cfg.groupSel);
      var hiddenEl = document.getElementById(cfg.hiddenSel);
      if (!catEl || !groupEl || !hiddenEl) return;

      catEl.addEventListener('change', function () {
        groupEl.hidden = catEl.value !== 'sante';
      });

      groupEl.querySelectorAll('[data-severity-target]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          setSeverityValue(groupEl, hiddenEl, btn.getAttribute('data-value'));
        });
      });
    });
  }

  // ——— Hygiene ————————————————————————————————————————
  var HYGIENE_TYPES = ['Brossage dents', 'Coupe griffes', 'Bain', 'Toilettage', 'Nettoyage oreilles', 'Nettoyage yeux'];

  function renderHygiene() {
    var data = getCurrent();
    var cardsContainer = document.getElementById('hygiene-cards');
    if (!data || !cardsContainer) return;

    var searchQ = (document.getElementById('hygiene-search')?.value || '').toLowerCase().trim();
    var statusFilter = document.getElementById('hygiene-status-filter')?.value || 'all';
    var sortBy = document.getElementById('hygiene-sort')?.value || 'dateDesc';
    var list = Array.isArray(data.hygiene) ? data.hygiene.slice() : [];

    if (searchQ) {
      list = list.filter(function (h) {
        return (h.type || '').toLowerCase().includes(searchQ) || (h.notes || '').toLowerCase().includes(searchQ) || (h.date || '').includes(searchQ);
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter(function (h) {
        var st = h.next ? getStatus(h.next) : null;
        if (!st) return false;
        if (statusFilter === 'ok') return st.cls === 'status-ok';
        if (statusFilter === 'soon') return st.cls === 'status-soon';
        if (statusFilter === 'overdue') return st.cls === 'status-overdue';
        return true;
      });
    }
    list.sort(function (a, b) {
      var nextA = a.next ? (isoToLocalDate(a.next) ? isoToLocalDate(a.next).getTime() : Infinity) : Infinity;
      var nextB = b.next ? (isoToLocalDate(b.next) ? isoToLocalDate(b.next).getTime() : Infinity) : Infinity;
      var dateA = a.date ? (isoToLocalDate(a.date) ? isoToLocalDate(a.date).getTime() : Infinity) : Infinity;
      var dateB = b.date ? (isoToLocalDate(b.date) ? isoToLocalDate(b.date).getTime() : Infinity) : Infinity;
      if (sortBy === 'nextAsc') return nextA - nextB;
      if (sortBy === 'nextDesc') return nextB - nextA;
      if (sortBy === 'dateAsc') return dateA - dateB;
      return dateB - dateA;
    });

    if (list.length === 0 && !searchQ && statusFilter === 'all') {
      cardsContainer.innerHTML = medicalEmptyStateHtml('droplet', 'Aucun soin d\'hygiène enregistré');
    } else if (list.length === 0) {
      cardsContainer.innerHTML = medicalEmptyStateHtml('search', 'Aucun résultat pour cette recherche.');
    } else {
      cardsContainer.innerHTML = list.map(function (h) {
        var st = h.next ? getStatus(h.next) : null;
        var statusCls = st ? st.cls : '';
        var statusLbl = st ? st.lbl : '';
        var rel = h.next ? relativeDate(h.next) : '';
        return '<div class="med-record-card">' +
          '<div class="med-record-card__icon med-record-card__icon--hygiene">' + ico('droplet', 18) + '</div>' +
          '<div class="med-record-card__body">' +
            '<div class="med-record-card__header">' +
              '<div class="med-record-card__title">' + escapeHtml(h.type || '') + '</div>' +
              (st ? '<span class="med-record-card__status ' + statusCls + '">' + escapeHtml(statusLbl) + '</span>' : '') +
            '</div>' +
            (h.notes ? '<div class="med-record-card__meta">' + escapeHtml(h.notes) + '</div>' : '') +
            '<div class="med-record-card__dates">' +
              '<span>Fait le ' + fmtDate(h.date) + '</span>' +
              (h.next ? '<span>Rappel : ' + fmtDate(h.next) + (rel ? ' (' + escapeHtml(rel) + ')' : '') + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<div class="med-record-card__actions">' +
            '<button type="button" class="med-record-card__btn" data-hygiene-id="' + h.id + '" data-action="edit" title="Modifier">' + ico('edit', 14) + '</button>' +
            '<button type="button" class="med-record-card__btn med-record-card__btn--delete" data-hygiene-id="' + h.id + '" data-action="delete" title="Supprimer">✕</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    cardsContainer.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-hygiene-id'), 10);
        confirmDelete('Supprimer ce soin ?', function () {
          var idx = data.hygiene.findIndex(function (h) { return h.id === id; });
          if (idx === -1) return;
          var removed = data.hygiene[idx];
          data.hygiene.splice(idx, 1);
          saveState(); renderHygiene(); renderProfile();
          showUndoToast('Soin supprimé', function () {
            data.hygiene.splice(idx, 0, removed);
            saveState(); renderHygiene(); renderProfile();
          });
        });
      });
    });
    cardsContainer.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editHygieneId = parseInt(btn.getAttribute('data-hygiene-id'), 10);
        openModal('editHygiene');
      });
    });
  }

  function addHygiene() {
    var type = document.getElementById('hy-type').value;
    var date = document.getElementById('hy-date').value;
    if (!type || !date) { showToast('Type et date sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.hygiene)) data.hygiene = [];

    var freqVal = document.getElementById('hy-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('hy-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    data.hygiene.push({
      id: state.nextId++, type: type, date: date, next: computedNext || manualNext,
      frequencyDays: !isNaN(freqDays) && freqDays > 0 ? freqDays : '',
      notes: document.getElementById('hy-notes').value.trim()
    });
    closeModal('addHygiene');
    saveState(); renderHygiene(); renderProfile();
    showToast('Soin ajouté', 'success');
  }

  function updateHygieneEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editHygieneId;
    var h = Array.isArray(data.hygiene) ? data.hygiene.find(function (x) { return x.id === id; }) : null;
    if (!h) return;

    var type = document.getElementById('ehy-type').value;
    var date = document.getElementById('ehy-date').value;
    if (!type || !date) { showToast('Type et date sont requis.', 'error'); return; }

    var freqVal = document.getElementById('ehy-frequency')?.value;
    var freqDays = freqVal ? parseInt(freqVal, 10) : NaN;
    var manualNext = document.getElementById('ehy-next').value || '';
    var computedNext = !isNaN(freqDays) && freqDays > 0 ? addDaysISO(date, freqDays) : '';

    h.type = type; h.date = date; h.next = computedNext || manualNext;
    h.frequencyDays = !isNaN(freqDays) && freqDays > 0 ? freqDays : '';
    h.notes = document.getElementById('ehy-notes').value.trim();

    closeModal('editHygiene');
    uiState.editHygieneId = null;
    saveState(); refreshAll();
    showToast('Soin modifié', 'success');
  }

  // ——— Heat Cycles ————————————————————————————————————————
  function renderHeatCycles() {
    var data = getCurrent();
    var section = document.getElementById('section-chaleurs');
    if (!data || !section) return;

    var container = document.getElementById('heat-cycles-content');
    var naMsg = document.getElementById('heat-na-message');
    if (!container || !naMsg) return;

    var isFemaleIntact = data.animal.sex === 'Femelle' && data.animal.sterilise !== 'Oui';
    container.hidden = !isFemaleIntact;
    naMsg.hidden = isFemaleIntact;
    if (!isFemaleIntact) return;

    var tbody = document.getElementById('heat-table');
    if (!tbody) return;

    var list = Array.isArray(data.heatCycles) ? data.heatCycles.slice() : [];
    list.sort(function (a, b) { return new Date(b.startDate) - new Date(a.startDate); });

    // Predictive logic
    var predictionHtml = '';
    var sorted = list.slice().sort(function (a, b) { return new Date(a.startDate) - new Date(b.startDate); });
    var avgCycle = 180;
    if (sorted.length >= 2) {
      var gaps = [];
      for (var i = 1; i < sorted.length; i++) {
        var diff = Math.round((new Date(sorted[i].startDate) - new Date(sorted[i - 1].startDate)) / 864e5);
        if (diff > 0) gaps.push(diff);
      }
      if (gaps.length > 0) avgCycle = Math.round(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length);
    }
    if (sorted.length > 0) {
      var lastStart = sorted[sorted.length - 1].startDate;
      var nextPredicted = addDaysISO(lastStart, avgCycle);
      var rel = relativeDate(nextPredicted);
      predictionHtml = '<div class="heat-prediction-banner">' + ico('calendar',24) + '<span> Prochaines chaleurs estimées : <strong>' + fmtDate(nextPredicted) + '</strong> (' + escapeHtml(rel) + ') — cycle moyen : ' + avgCycle + ' jours.</span></div><p class="stitch-note">Projection indicative à partir des périodes enregistrées' + (sorted.length < 2 ? ' et d’un intervalle par défaut de 180 jours' : '') + '. Elle ne permet pas de déterminer une fenêtre fertile.</p>';
    }

    var predEl = document.getElementById('heat-prediction');
    if (predEl) predEl.innerHTML = predictionHtml;

    tbody.innerHTML = list.length ? list.map(function (c) {
      var days = c.endDate ? Math.round((new Date(c.endDate) - new Date(c.startDate)) / 864e5) : null;
      return '<article class="stitch-record heat-record"><span class="stitch-record-icon">' + ico('calendar',22) + '</span><div class="stitch-record-copy"><h3>' + fmtDate(c.startDate) + ' — ' + (c.endDate ? fmtDate(c.endDate) : 'En cours') + '</h3><p>' + escapeHtml(c.notes || 'Aucune observation renseignée.') + '</p><div class="stitch-record-tags"><span>' + (days == null ? 'Fin à renseigner' : days + ' jours') + '</span><span>Intensité : ' + escapeHtml(c.intensity || 'Non renseignée') + '</span></div></div><div class="stitch-record-actions"><button type="button" class="btn-edit" data-heat-id="' + c.id + '">Modifier</button><button type="button" class="btn-delete" data-heat-id="' + c.id + '" aria-label="Supprimer cette période">' + ico('trash',16) + '</button></div></article>';
    }).join('') : '<div class="stitch-empty"><h3>Commencez le suivi de ses cycles</h3><p>Notez les dates et les observations pour retrouver son historique.</p><button type="button" class="care-action" data-stitch-action="addHeatCycle">Enregistrer une période</button></div>';

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-heat-id'), 10);
        confirmDelete('Supprimer cette période ?', function () {
          var idx = data.heatCycles.findIndex(function (c) { return c.id === id; });
          if (idx === -1) return;
          var removed = data.heatCycles[idx];
          data.heatCycles.splice(idx, 1);
          saveState(); renderHeatCycles();
          showUndoToast('Période supprimée', function () {
            data.heatCycles.splice(idx, 0, removed);
            saveState(); renderHeatCycles();
          });
        });
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editHeatCycleId = parseInt(btn.getAttribute('data-heat-id'), 10);
        openModal('editHeatCycle');
      });
    });
  }

  function addHeatCycle() {
    var startDate = document.getElementById('hc-start').value;
    if (!startDate) { showToast('Date de début requise.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.heatCycles)) data.heatCycles = [];

    data.heatCycles.push({
      id: state.nextId++, startDate: startDate,
      endDate: document.getElementById('hc-end').value || '',
      intensity: document.getElementById('hc-intensity').value || 'Moyenne',
      notes: document.getElementById('hc-notes').value.trim()
    });
    closeModal('addHeatCycle');
    saveState(); renderHeatCycles();
    showToast('Période ajoutée', 'success');
  }

  function updateHeatCycleEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editHeatCycleId;
    var c = Array.isArray(data.heatCycles) ? data.heatCycles.find(function (x) { return x.id === id; }) : null;
    if (!c) return;

    var startDate = document.getElementById('ehc-start').value;
    if (!startDate) { showToast('Date de début requise.', 'error'); return; }

    c.startDate = startDate;
    c.endDate = document.getElementById('ehc-end').value || '';
    c.intensity = document.getElementById('ehc-intensity').value || 'Moyenne';
    c.notes = document.getElementById('ehc-notes').value.trim();

    closeModal('editHeatCycle');
    uiState.editHeatCycleId = null;
    saveState(); refreshAll();
    showToast('Période modifiée', 'success');
  }

  // ——— Reproduction (saillies) ——————————————————————————————
  // Délais administratifs après une saillie — même séquence que le circuit
  // officiel ACYM/LOMAD (déclaration de saillie sous 4 semaines, déclaration
  // de naissance sous 4 semaines, inscription au registre sous 24 semaines).
  // Dupliqué côté serveur (api/_lib/reminders.js, nextMatingDeadline) pour
  // le rappel push/e-mail : à garder synchronisé à la main.
  function matingNextDeadline(m) {
    if (!m.declaredAt) return { date: addDaysISO(m.date, 28), label: 'Déclaration de saillie', field: 'declaredAt' };
    if (!m.birthDate) return null;
    if (!m.birthDeclaredAt) return { date: addDaysISO(m.birthDate, 28), label: 'Déclaration de naissance', field: 'birthDeclaredAt' };
    if (!m.lomadDeclaredAt) return { date: addDaysISO(m.birthDate, 168), label: 'Inscription au registre (LOF/LOMAD)', field: 'lomadDeclaredAt' };
    return null;
  }

  function renderMatings() {
    var data = getCurrent();
    var section = document.getElementById('section-reproduction');
    if (!data || !section) return;

    var container = document.getElementById('matings-content');
    var naMsg = document.getElementById('reproduction-na-message');
    if (!container || !naMsg) return;

    var breedingRelevant = data.animal.sterilise !== 'Oui';
    container.hidden = !breedingRelevant;
    naMsg.hidden = breedingRelevant;
    if (!breedingRelevant) return;

    var list = document.getElementById('mating-list');
    if (!list) return;

    var items = Array.isArray(data.matings) ? data.matings.slice() : [];
    items.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    list.innerHTML = items.length ? items.map(function (m) {
      var partner = [m.partnerName, m.partnerOwner ? '(propriétaire : ' + m.partnerOwner + ')' : ''].filter(Boolean).join(' ');
      var outcomeHtml;
      if (m.birthDate) {
        var born = [];
        if (m.liveBorn) born.push(m.liveBorn + ' vivant(s)');
        if (m.stillBorn) born.push(m.stillBorn + ' mort-né(s)');
        outcomeHtml = 'Mise bas le ' + fmtDate(m.birthDate) + (born.length ? ' — ' + born.join(', ') : '');
      } else {
        outcomeHtml = 'Mise bas prévue le ' + fmtDate(addDaysISO(m.date, 63)) + ' (estimation, 63 jours après la saillie)';
      }
      var due = matingNextDeadline(m);
      var dueTone = due ? (delayTone(due.date) === 'late' ? 'overdue' : delayTone(due.date)) : 'ok';
      var dueHtml = due ? '<span class="status status-' + dueTone + '">' + escapeHtml(due.label) + ' : ' + formatJDelay(due.date) + ' (' + fmtDate(due.date) + ')</span>' : '<span class="status status-ok">Démarches à jour</span>';

      var actionBtn = '';
      if (!m.declaredAt) actionBtn = '<button type="button" class="btn-card-secondary" data-mark="declaredAt" data-mating-id="' + m.id + '">Déclaration de saillie faite</button>';
      else if (m.birthDate && !m.birthDeclaredAt) actionBtn = '<button type="button" class="btn-card-secondary" data-mark="birthDeclaredAt" data-mating-id="' + m.id + '">Déclaration de naissance faite</button>';
      else if (m.birthDate && !m.lomadDeclaredAt) actionBtn = '<button type="button" class="btn-card-secondary" data-mark="lomadDeclaredAt" data-mating-id="' + m.id + '">Inscription LOF/LOMAD faite</button>';

      return '<article class="stitch-record mating-record"><span class="stitch-record-icon">' + ico('heart', 22) + '</span><div class="stitch-record-copy"><h3>' + fmtDate(m.date) + (m.method ? ' — ' + escapeHtml(m.method) : '') + '</h3>' +
        '<p>' + escapeHtml(partner || 'Partenaire non renseigné') + (m.partnerRegistry ? ' · ' + escapeHtml(m.partnerRegistry) : '') + '</p>' +
        '<p class="table-muted">' + escapeHtml(outcomeHtml) + '</p>' +
        (m.notes ? '<p>' + escapeHtml(m.notes) + '</p>' : '') +
        '<div class="stitch-record-tags">' + dueHtml + '</div>' +
        (actionBtn ? '<div class="stitch-record-tags">' + actionBtn + '</div>' : '') +
        '</div><div class="stitch-record-actions"><button type="button" class="btn-edit" data-mating-id="' + m.id + '" data-mating-edit="1">Modifier</button><button type="button" class="btn-delete" data-mating-id="' + m.id + '" data-mating-del="1" aria-label="Supprimer cette saillie">' + ico('trash', 16) + '</button></div></article>';
    }).join('') : '<div class="stitch-empty"><h3>Aucune saillie enregistrée</h3><p>Notez la date, le partenaire et suivez les délais de déclaration.</p><button type="button" class="care-action" data-stitch-action="addMating">Enregistrer une saillie</button></div>';

    list.querySelectorAll('[data-mating-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-mating-id'), 10);
        confirmDelete('Supprimer cette saillie ?', function () {
          var idx = data.matings.findIndex(function (x) { return x.id === id; });
          if (idx === -1) return;
          var removed = data.matings[idx];
          data.matings.splice(idx, 1);
          saveState(); renderMatings();
          showUndoToast('Saillie supprimée', function () {
            data.matings.splice(idx, 0, removed);
            saveState(); renderMatings();
          });
        });
      });
    });
    list.querySelectorAll('[data-mating-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editMatingId = parseInt(btn.getAttribute('data-mating-id'), 10);
        openModal('editMating');
      });
    });
    list.querySelectorAll('[data-mark]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-mating-id'), 10);
        var field = btn.getAttribute('data-mark');
        var m = data.matings.find(function (x) { return x.id === id; });
        if (!m) return;
        m[field] = todayISO();
        saveState(); renderMatings();
        showToast('Démarche marquée comme faite', 'success');
      });
    });
  }

  function readMatingForm(prefix) {
    var val = function (id) { return document.getElementById(prefix + id).value; };
    return {
      date: val('-date'),
      method: val('-method') || 'Naturelle',
      partnerName: val('-partner-name').trim(),
      partnerOwner: val('-partner-owner').trim(),
      partnerRegistry: val('-partner-reg').trim(),
      notes: val('-notes').trim(),
      birthDate: val('-birth-date') || '',
      liveBorn: parseInt(val('-live-born'), 10) || 0,
      stillBorn: parseInt(val('-still-born'), 10) || 0,
    };
  }

  function addMating() {
    var fields = readMatingForm('mt');
    if (!fields.date) { showToast('Date de saillie requise.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.matings)) data.matings = [];
    data.matings.push(Object.assign({ id: state.nextId++, declaredAt: null, birthDeclaredAt: null, lomadDeclaredAt: null }, fields));
    closeModal('addMating');
    saveState(); renderMatings();
    showToast('Saillie enregistrée', 'success');
  }

  function updateMatingEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editMatingId;
    var m = Array.isArray(data.matings) ? data.matings.find(function (x) { return x.id === id; }) : null;
    if (!m) return;
    var fields = readMatingForm('emt');
    if (!fields.date) { showToast('Date de saillie requise.', 'error'); return; }
    Object.assign(m, fields);
    closeModal('editMating');
    uiState.editMatingId = null;
    saveState(); renderMatings();
    showToast('Saillie modifiée', 'success');
  }

  // ——— Check-up rapide ————————————————————————————————————
  var CHECKUP_QUESTIONS = [
    { key: 'appetite', label: 'Appétit', icon: ico('utensils', 18), levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'energy', label: 'Énergie', icon: ico('zap', 18), levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'hydration', label: 'Hydratation', icon: '💧', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'coat', label: 'Pelage', icon: ico('sparkle', 18), levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'eyes', label: 'Yeux', icon: ico('eye', 18), levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'ears', label: 'Oreilles', icon: '👂', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'gums', label: 'Gencives', icon: '🦷', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'mobility', label: 'Mobilité', icon: '🦿', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'behavior', label: 'Comportement', icon: '🧠', levels: ['Normal', 'À surveiller', 'Préoccupant'] },
    { key: 'weight', label: 'Poids', icon: ico('scale', 18), levels: ['Normal', 'À surveiller', 'Préoccupant'] }
  ];

  function renderCheckup() {
    var container = document.getElementById('checkup-content');
    if (!container) return;

    var html = '<div class="checkup-intro"><h3>Évaluez rapidement l\'état de santé de votre animal</h3><p>Répondez aux 10 questions ci-dessous en choisissant le niveau qui correspond le mieux.</p></div>';
    html += '<div class="checkup-questions">';
    CHECKUP_QUESTIONS.forEach(function (q) {
      html += '<div class="checkup-question" data-key="' + q.key + '">' +
        '<div class="checkup-q-label">' + q.icon + ' ' + escapeHtml(q.label) + '</div>' +
        '<div class="checkup-levels">' +
        '<button type="button" class="checkup-level checkup-level-1" data-key="' + q.key + '" data-value="1">Normal</button>' +
        '<button type="button" class="checkup-level checkup-level-2" data-key="' + q.key + '" data-value="2">À surveiller</button>' +
        '<button type="button" class="checkup-level checkup-level-3" data-key="' + q.key + '" data-value="3">Préoccupant</button>' +
        '</div></div>';
    });
    html += '</div>';
    html += '<div class="checkup-actions"><button type="button" class="btn-primary" id="btn-checkup-submit">Calculer le score</button></div>';
    html += '<div id="checkup-result" class="checkup-result" hidden></div>';

    container.innerHTML = html;

    var answers = {};
    container.querySelectorAll('.checkup-level').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        var val = parseInt(btn.getAttribute('data-value'), 10);
        answers[key] = val;
        var siblings = btn.parentElement.querySelectorAll('.checkup-level');
        siblings.forEach(function (s) { s.classList.remove('active'); });
        btn.classList.add('active');
      });
    });

    document.getElementById('btn-checkup-submit').addEventListener('click', function () {
      var keys = CHECKUP_QUESTIONS.map(function (q) { return q.key; });
      var answered = keys.filter(function (k) { return answers[k]; });
      if (answered.length < keys.length) {
        showToast('Répondez à toutes les questions.', 'warning');
        return;
      }
      var total = keys.reduce(function (sum, k) { return sum + (answers[k] || 1); }, 0);
      var avg = total / keys.length;

      var color, label, reco;
      if (avg <= 1.3) {
        color = '#22c55e'; label = 'Bon état général'; reco = 'Votre animal semble en bonne santé. Continuez les soins réguliers et les visites de contrôle.';
      } else if (avg <= 2.0) {
        color = '#f59e0b'; label = 'À surveiller'; reco = 'Certains points méritent votre attention. Surveillez l\'évolution et consultez un vétérinaire si les symptômes persistent.';
      } else {
        color = '#ef4444'; label = 'Consultation recommandée'; reco = 'Plusieurs indicateurs sont préoccupants. Une visite chez le vétérinaire est recommandée rapidement.';
      }

      var detailHtml = keys.map(function (k) {
        var q = CHECKUP_QUESTIONS.find(function (x) { return x.key === k; });
        var v = answers[k];
        var cls = v === 1 ? 'checkup-ok' : (v === 2 ? 'checkup-warn' : 'checkup-bad');
        return '<div class="checkup-detail-row ' + cls + '">' + q.icon + ' ' + escapeHtml(q.label) + ': <strong>' + q.levels[v - 1] + '</strong></div>';
      }).join('');

      var resultEl = document.getElementById('checkup-result');
      resultEl.hidden = false;
      resultEl.innerHTML = '<div class="checkup-score-card" style="border-color:' + color + '">' +
        '<div class="checkup-score-header" style="background:' + color + '">' +
        '<div class="checkup-score-value">' + avg.toFixed(1) + ' / 3</div>' +
        '<div class="checkup-score-label">' + escapeHtml(label) + '</div></div>' +
        '<div class="checkup-score-body"><p>' + escapeHtml(reco) + '</p>' + detailHtml +
        '<button type="button" class="btn-primary" id="btn-checkup-save" style="margin-top:12px">' + ico('fileText', 14) + ' Sauvegarder dans le journal</button></div></div>';

      document.getElementById('btn-checkup-save').addEventListener('click', function () {
        var data = getCurrent();
        if (!data) return;
        if (!Array.isArray(data.notes)) data.notes = [];
        var content = 'Score: ' + avg.toFixed(1) + '/3 — ' + label + '\n' + keys.map(function (k) {
          var q = CHECKUP_QUESTIONS.find(function (x) { return x.key === k; });
          return q.label + ': ' + q.levels[answers[k] - 1];
        }).join('\n');
        data.notes.push({ id: state.nextId++, date: todayISO(), title: 'Check-up rapide — ' + label, content: content, category: 'sante' });
        saveState();
        showToast('Résultat sauvegardé dans le journal', 'success');
      });

      resultEl.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ——— Activities ————————————————————————————————————————
  var ACTIVITY_TYPES = ['Promenade', 'Course', 'Jeu', 'Natation', 'Agility', 'Autre'];

  // Approximate MET (Metabolic Equivalent of Task) values per activity type,
  // used only for a rough calorie estimate — not veterinary-grade data.
  var MET_TABLE = { 'Promenade': 3.0, 'Course': 8.0, 'Jeu': 4.0, 'Natation': 6.0, 'Agility': 5.5, 'Autre': 3.5 };

  function estimateActivityCalories(activity, weightKg) {
    if (!weightKg || !activity.duration) return null;
    var hours = parseFloat(activity.duration) / 60;
    if (!hours || isNaN(hours)) return null;
    var met = MET_TABLE[activity.type] != null ? MET_TABLE[activity.type] : MET_TABLE.Autre;
    return met * weightKg * hours;
  }

  function renderActivities() {
    var data = getCurrent();
    var tbody = document.getElementById('activity-table');
    var statsEl = document.getElementById('activity-stats');
    if (!data || !tbody) return;

    var list = Array.isArray(data.activities) ? data.activities.slice() : [];
    list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    // Stats
    if (statsEl) {
      if (list.length === 0) {
        statsEl.innerHTML = '';
      } else {
        var totalDuration = list.reduce(function (s, a) { return s + (parseFloat(a.duration) || 0); }, 0);
        var totalDistance = list.reduce(function (s, a) { return s + (parseFloat(a.distance) || 0); }, 0);
        var typeCounts = {};
        list.forEach(function (a) { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });
        var topType = Object.keys(typeCounts).sort(function (a, b) { return typeCounts[b] - typeCounts[a]; })[0] || '—';
        var weightKg = data.animal && data.animal.weight != null && data.animal.weight !== '' ? Number(data.animal.weight) : null;
        var totalCalories = list.reduce(function (s, a) { return s + (estimateActivityCalories(a, weightKg) || 0); }, 0);
        statsEl.innerHTML =
          '<div class="stat-card"><span class="stat-number">' + list.length + '</span><span class="stat-label">Sessions</span></div>' +
          '<div class="stat-card"><span class="stat-number">' + Math.round(totalDuration) + '</span><span class="stat-label">min totales</span></div>' +
          '<div class="stat-card"><span class="stat-number">' + totalDistance.toFixed(1) + '</span><span class="stat-label">km parcourus</span></div>' +
          '<div class="stat-card"><span class="stat-number">' + (weightKg ? Math.round(totalCalories) : '—') + '</span><span class="stat-label">kcal estimées</span></div>' +
          '<div class="stat-card"><span class="stat-number stat-accent">' + escapeHtml(topType) + '</span><span class="stat-label">Activité favorite</span></div>';
      }
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state-illustrated"><div class="empty-svg" style="display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;border:4px solid var(--border)">' + ico('activity') + '</div><p>Aucune activité enregistrée</p></div></td></tr>';
    } else {
      tbody.innerHTML = list.map(function (a) {
        return '<tr><td>' + fmtDate(a.date) + '</td>' +
          '<td>' + escapeHtml(a.type || '') + '</td>' +
          '<td>' + (a.duration ? a.duration + ' min' : '—') + '</td>' +
          '<td>' + (a.distance ? a.distance + ' km' : '—') + '</td>' +
          '<td>' + escapeHtml(a.notes || '') + '</td>' +
          '<td><button type="button" class="btn-edit" data-activity-id="' + a.id + '">Modifier</button> <button type="button" class="btn-delete" data-activity-id="' + a.id + '">✕</button></td></tr>';
      }).join('');
    }

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-activity-id'), 10);
        confirmDelete('Supprimer cette activité ?', function () {
          var idx = data.activities.findIndex(function (a) { return a.id === id; });
          if (idx === -1) return;
          var removed = data.activities[idx];
          data.activities.splice(idx, 1);
          saveState(); renderActivities();
          showUndoToast('Activité supprimée', function () {
            data.activities.splice(idx, 0, removed);
            saveState(); renderActivities();
          });
        });
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editActivityId = parseInt(btn.getAttribute('data-activity-id'), 10);
        openModal('editActivity');
      });
    });
  }

  function addActivity() {
    var date = document.getElementById('act-date').value;
    var type = document.getElementById('act-type').value;
    if (!date || !type) { showToast('Date et type sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!Array.isArray(data.activities)) data.activities = [];

    data.activities.push({
      id: state.nextId++, date: date, type: type,
      duration: document.getElementById('act-duration').value || '',
      distance: document.getElementById('act-distance').value || '',
      notes: document.getElementById('act-notes').value.trim()
    });
    closeModal('addActivity');
    saveState(); renderActivities();
    showToast('Activité ajoutée', 'success');
  }

  function updateActivityEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editActivityId;
    var a = Array.isArray(data.activities) ? data.activities.find(function (x) { return x.id === id; }) : null;
    if (!a) return;

    var date = document.getElementById('eact-date').value;
    var type = document.getElementById('eact-type').value;
    if (!date || !type) { showToast('Date et type sont requis.', 'error'); return; }

    a.date = date; a.type = type;
    a.duration = document.getElementById('eact-duration').value || '';
    a.distance = document.getElementById('eact-distance').value || '';
    a.notes = document.getElementById('eact-notes').value.trim();

    closeModal('editActivity');
    uiState.editActivityId = null;
    saveState(); refreshAll();
    showToast('Activité modifiée', 'success');
  }

  // ——— Nutrition ————————————————————————————————————————
  var MEAL_TYPES = ['Croquettes', 'Pâtée', 'BARF', 'Ration ménagère', 'Friandise'];

  function renderNutrition() {
    var data = getCurrent();
    var container = document.getElementById('nutrition-content');
    if (!data || !container) return;

    if (!data.nutrition) data.nutrition = { meals: [], dailyPlan: {} };
    var plan = data.nutrition.dailyPlan || {};
    var meals = Array.isArray(data.nutrition.meals) ? data.nutrition.meals.slice() : [];
    meals.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    // Calorie estimation
    var weight = parseFloat(data.animal.weight) || 0;
    var rer = weight > 0 ? 70 * Math.pow(weight, 0.75) : 0;
    var mer = rer * 1.6;

    // Plan card
    var planHtml = '<div class="nutrition-plan-card"><div class="card-header"><h3 class="section-title">' + ico('clipboard') + ' Plan nutritionnel</h3><button type="button" class="btn-icon" onclick="app.openModal(\'editNutritionPlan\')">' + ico('edit', 14) + ' Modifier</button></div>' +
      '<div class="info-grid">' +
      '<div><span class="info-label">Marque aliment</span><span class="info-value">' + escapeHtml(plan.foodBrand || 'Non renseigné') + '</span></div>' +
      '<div><span class="info-label">Portion</span><span class="info-value">' + escapeHtml(plan.portionSize || 'Non renseigné') + '</span></div>' +
      '<div><span class="info-label">Repas/jour</span><span class="info-value">' + escapeHtml(plan.mealsPerDay || 'Non renseigné') + '</span></div>' +
      '<div><span class="info-label">Objectif calories</span><span class="info-value">' + (plan.targetCalories || 'Auto') + '</span></div>' +
      '</div>';
    if (weight > 0) {
      planHtml += '<div class="nutrition-calorie-info">Estimation calorique : RER = <strong>' + Math.round(rer) + ' kcal</strong> · MER = <strong>' + Math.round(mer) + ' kcal/j</strong> (facteur 1.6)</div>';
    }
    planHtml += '</div>';

    // Today's summary
    var todayStr = todayISO();
    var todayMeals = meals.filter(function (m) { return m.date === todayStr; });
    var plannedPerDay = parseInt(plan.mealsPerDay, 10) || 0;


    var mealList = '<section class="stitch-meals"><header class="stitch-page-head"><h2>Repas enregistrés</h2><button type="button" class="care-action" data-stitch-action="addMeal">Ajouter un repas</button></header><div id="meal-table" class="stitch-record-list"></div></section>';
    var dailyHtml = '<div class="stitch-daily-summary">' + ico('utensils', 32) + '<div><h2>Apport du jour</h2><p>' + todayMeals.length + (plannedPerDay ? ' / ' + plannedPerDay : '') + ' repas enregistrés aujourd’hui</p></div>' + (plannedPerDay ? '<progress max="' + plannedPerDay + '" value="' + Math.min(todayMeals.length, plannedPerDay) + '" aria-label="Repas enregistrés sur le nombre prévu"></progress>' : '') + '</div>';
    container.innerHTML = '<nav class="stitch-community-nav" aria-label="Suivi quotidien">' + careButton('nutrition', 'Nutrition & repas', 'utensils', true) + careButton('activites', 'Activités & balades', 'activity') + '</nav>' + dailyHtml + planHtml + mealList;
    var tbody = document.getElementById('meal-table');
    tbody.innerHTML = meals.length ? meals.map(function (m) {
      return '<article class="stitch-record"><span class="stitch-record-icon">' + ico('utensils', 22) + '</span><div class="stitch-record-copy"><h3>' + escapeHtml(m.type || 'Repas') + (m.time ? ' · ' + escapeHtml(m.time) : '') + '</h3><p>' + escapeHtml([m.quantity, m.unit, m.food].filter(Boolean).join(' ')) + '</p><small>' + fmtDate(m.date) + '</small>' + (m.notes ? '<p class="stitch-inset">' + escapeHtml(m.notes) + '</p>' : '') + '</div><div class="stitch-record-actions"><button type="button" class="btn-edit" data-meal-id="' + m.id + '">Modifier</button><button type="button" class="btn-delete" data-meal-id="' + m.id + '" aria-label="Supprimer ce repas">' + ico('trash',16) + '</button></div></article>';
    }).join('') : '<div class="stitch-card stitch-empty">' + ico('utensils',32) + '<h3>Son premier repas vous attend</h3><p>Consignez les quantités et les horaires pour suivre son alimentation.</p><button type="button" class="care-action" data-stitch-action="addMeal">Ajouter un repas</button></div>';

    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-meal-id'), 10);
        confirmDelete('Supprimer ce repas ?', function () {
          var idx = data.nutrition.meals.findIndex(function (m) { return m.id === id; });
          if (idx === -1) return;
          var removed = data.nutrition.meals[idx];
          data.nutrition.meals.splice(idx, 1);
          saveState(); renderNutrition();
          showUndoToast('Repas supprimé', function () {
            data.nutrition.meals.splice(idx, 0, removed);
            saveState(); renderNutrition();
          });
        });
      });
    });
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editMealId = parseInt(btn.getAttribute('data-meal-id'), 10);
        openModal('editMeal');
      });
    });
  }

  function addMeal() {
    var date = document.getElementById('meal-date').value;
    var type = document.getElementById('meal-type').value;
    if (!date || !type) { showToast('Date et type sont requis.', 'error'); return; }
    var data = getCurrent();
    if (!data) return;
    if (!data.nutrition) data.nutrition = { meals: [], dailyPlan: {} };
    if (!Array.isArray(data.nutrition.meals)) data.nutrition.meals = [];

    data.nutrition.meals.push({
      id: state.nextId++, date: date, type: type,
      time: document.getElementById('meal-time').value || '',
      food: document.getElementById('meal-food').value.trim(),
      quantity: document.getElementById('meal-quantity').value || '',
      unit: document.getElementById('meal-unit').value || 'g',
      notes: document.getElementById('meal-notes').value.trim()
    });
    closeModal('addMeal');
    saveState(); renderNutrition();
    showToast('Repas ajouté', 'success');
  }

  function updateMealEntry() {
    var data = getCurrent();
    if (!data) return;
    var id = uiState.editMealId;
    var m = data.nutrition && Array.isArray(data.nutrition.meals) ? data.nutrition.meals.find(function (x) { return x.id === id; }) : null;
    if (!m) return;

    m.date = document.getElementById('emeal-date').value;
    m.type = document.getElementById('emeal-type').value;
    m.time = document.getElementById('emeal-time').value || '';
    m.food = document.getElementById('emeal-food').value.trim();
    m.quantity = document.getElementById('emeal-quantity').value || '';
    m.unit = document.getElementById('emeal-unit').value || 'g';
    m.notes = document.getElementById('emeal-notes').value.trim();

    closeModal('editMeal');
    uiState.editMealId = null;
    saveState(); renderNutrition();
    showToast('Repas modifié', 'success');
  }

  function saveNutritionPlan() {
    var data = getCurrent();
    if (!data) return;
    if (!data.nutrition) data.nutrition = { meals: [], dailyPlan: {} };
    data.nutrition.dailyPlan = {
      targetCalories: document.getElementById('np-calories').value || '',
      mealsPerDay: document.getElementById('np-meals-per-day').value || '',
      foodBrand: document.getElementById('np-food-brand').value.trim(),
      portionSize: document.getElementById('np-portion').value.trim()
    };
    closeModal('editNutritionPlan');
    saveState(); renderNutrition();
    showToast('Plan nutritionnel enregistré', 'success');
  }

  // ——— Pedigree ————————————————————————————————————————
  function renderPedigree() {
    var data = getCurrent();
    var container = document.getElementById('pedigree-card');
    if (!data || !container) return;

    var p = data.pedigree || {};
    var name = escapeHtml(data.animal.name || 'Animal');
    var chip = p.chipNumber || data.animal.chip || '';

    var html = '<div class="card-header"><h2 class="section-title">' + ico('trophy', 18) + ' Pedigree</h2><button type="button" class="btn-icon" onclick="app.openModal(\'editPedigree\')">' + ico('edit', 14) + ' Modifier</button></div>';

    if (p.registry && p.registry !== 'Non inscrit') {
      html += '<div class="pedigree-registry"><span class="badge">' + escapeHtml(p.registry) + '</span>';
      if (p.registryNumber) html += ' <span class="table-muted">N° ' + escapeHtml(p.registryNumber) + '</span>';
      if (p.verified) {
        html += ' <span class="badge badge-verified">' + ico('check', 16) + ' Vérifié</span>';
        if (p.verifiedDate) html += ' <span class="table-muted">le ' + escapeHtml(p.verifiedDate) + '</span>';
      }
      // LOF Select expose une vraie fiche officielle par numéro — pas d'équivalent
      // public trouvé côté LOMAD (ACYM), qui ne propose que des démarches sur compte.
      if (p.registry === 'LOF' && p.registryNumber) {
        // p.registryNumber = "n° de portée/année" (ex: "123 456/2024", voir LOF_PATTERN) —
        // seule la partie avant le "/" se rapproche du "numéro LOF" attendu par ce champ
        // de recherche ; à défaut de certitude totale sur la correspondance exacte des
        // deux identifiants, ne garder que cette partie plutôt que de les concaténer.
        var lofNum = p.registryNumber.split('/')[0].replace(/[^0-9]/g, '');
        if (lofNum) html += ' <a class="pedigree-lof-link" target="_blank" rel="noopener" href="https://www.centrale-canine.fr/lofselect/recherche-chien/identifiant?numLof=' + encodeURIComponent(lofNum) + '">' + ico('search', 14) + ' Vérifier sur LOF Select</a>';
      }
      html += '</div>';
    }
    if (chip) {
      html += '<div class="pedigree-chip">N° Puce : <span class="chip-number">' + escapeHtml(chip) + '</span></div>';
    }
    if (p.healthNotes) {
      html += '<div class="pedigree-health"><strong>' + ico('heart', 14) + ' Tests de santé / ADN</strong><p>' + escapeHtml(p.healthNotes).replace(/\n/g, '<br>') + '</p></div>';
    }

    // Arbre à 3 générations avec de vraies lignes de filiation (SVG, coordonnées
    // fixes en % — pas de mesure DOM au runtime, donc robuste à toute taille
    // d'écran). 2 branches (paternelle / maternelle) qui convergent vers le
    // sujet ; chaque branche s'empile verticalement sur mobile (voir CSS),
    // où le connecteur large est alors masqué au profit d'un simple trait.
    var CONNECTOR_NARROW = '<svg class="pedigree-connector" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="15" y1="0" x2="50" y2="24" stroke="var(--border)" stroke-width="2"/>' +
      '<line x1="85" y1="0" x2="50" y2="24" stroke="var(--border)" stroke-width="2"/>' +
      '</svg>';
    var CONNECTOR_WIDE = '<svg class="pedigree-connector pedigree-connector--wide" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="25" y1="0" x2="50" y2="24" stroke="var(--border)" stroke-width="2"/>' +
      '<line x1="75" y1="0" x2="50" y2="24" stroke="var(--border)" stroke-width="2"/>' +
      '</svg>';
    var gp = p.grandparents || {};
    var gpNode = function (n, reg) { return '<div class="pedigree-node pedigree-node-gp">' + escapeHtml(n || '?') + (reg ? '<br><span class="table-muted">' + escapeHtml(reg) + '</span>' : '') + '</div>'; };
    html += '<div class="pedigree-tree">' +
      '<div class="pedigree-branches">' +
        '<div class="pedigree-branch pedigree-branch--paternal">' +
          '<span class="pedigree-branch__label">Branche paternelle</span>' +
          '<div class="pedigree-generation pedigree-gp">' +
            gpNode(gp.paternalGrandsire, gp.paternalGrandsireRegistry) +
            gpNode(gp.paternalGranddam, gp.paternalGranddamRegistry) +
          '</div>' +
          CONNECTOR_NARROW +
          '<div class="pedigree-generation pedigree-parents">' +
            '<div class="pedigree-node pedigree-node-parent">♂ ' + escapeHtml((p.sire && p.sire.name) || '?') + (p.sire && p.sire.registry ? '<br><span class="table-muted">' + escapeHtml(p.sire.registry) + '</span>' : '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pedigree-branch pedigree-branch--maternal">' +
          '<span class="pedigree-branch__label">Branche maternelle</span>' +
          '<div class="pedigree-generation pedigree-gp">' +
            gpNode(gp.maternalGrandsire, gp.maternalGrandsireRegistry) +
            gpNode(gp.maternalGranddam, gp.maternalGranddamRegistry) +
          '</div>' +
          CONNECTOR_NARROW +
          '<div class="pedigree-generation pedigree-parents">' +
            '<div class="pedigree-node pedigree-node-parent">♀ ' + escapeHtml((p.dam && p.dam.name) || '?') + (p.dam && p.dam.registry ? '<br><span class="table-muted">' + escapeHtml(p.dam.registry) + '</span>' : '') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      CONNECTOR_WIDE +
      '<div class="pedigree-generation pedigree-subject">' +
        '<div class="pedigree-node pedigree-node-subject">' + name + '</div>' +
      '</div>' +
    '</div>';

    if (p.registry && p.registry !== 'Non inscrit') {
      html += '<div class="lof-disclaimer-display"><small>' + ico('warning', 16) + ' La vérification est une simulation locale de format. Une vérification officielle nécessite un accès aux bases de la SCC (LOF) ou aux registres officiels (LOMAD).</small></div>';
    }

    container.innerHTML = html;
  }

  function savePedigree() {
    var data = getCurrent();
    if (!data) return;
    var registry = document.getElementById('ped-registry').value || 'Non inscrit';
    var regNumber = document.getElementById('ped-reg-number').value.trim();
    var vResult = validateRegistryNumber(registry, regNumber);
    data.pedigree = {
      registry: registry,
      registryNumber: regNumber,
      chipNumber: document.getElementById('ped-chip').value.trim(),
      sire: { name: document.getElementById('ped-sire-name').value.trim(), registry: document.getElementById('ped-sire-reg').value.trim() },
      dam: { name: document.getElementById('ped-dam-name').value.trim(), registry: document.getElementById('ped-dam-reg').value.trim() },
      healthNotes: document.getElementById('ped-health-notes').value.trim(),
      grandparents: {
        paternalGrandsire: document.getElementById('ped-gp-ps').value.trim(),
        paternalGranddam: document.getElementById('ped-gp-pd').value.trim(),
        maternalGrandsire: document.getElementById('ped-gp-ms').value.trim(),
        maternalGranddam: document.getElementById('ped-gp-md').value.trim(),
        paternalGrandsireRegistry: document.getElementById('ped-gp-ps-reg').value.trim(),
        paternalGranddamRegistry: document.getElementById('ped-gp-pd-reg').value.trim(),
        maternalGrandsireRegistry: document.getElementById('ped-gp-ms-reg').value.trim(),
        maternalGranddamRegistry: document.getElementById('ped-gp-md-reg').value.trim()
      },
      verified: vResult.valid,
      verifiedDate: vResult.valid ? new Date().toISOString().slice(0, 10) : null
    };
    closeModal('editPedigree');
    saveState(); renderPedigree();
    showToast('Pedigree enregistré', 'success');
  }

  // ——— Vet Directory (app-level) ————————————————————————————
  var DEFAULT_VET_ENTRIES = [
    { id: 1, name: 'Centre Antipoison Animal CAPAE-Ouest', clinic: 'CAPAE-Ouest', phone: '02 40 68 77 40', email: '', address: 'Nantes', hours: '24h/24', emergency: true, favorite: false, notes: 'Centre antipoison vétérinaire', lat: 47.2184, lng: -1.5536 },
    { id: 2, name: 'Centre Antipoison VetAgro Sup', clinic: 'VetAgro Sup', phone: '04 78 87 10 40', email: '', address: 'Lyon', hours: '24h/24', emergency: true, favorite: false, notes: 'Centre antipoison vétérinaire', lat: 45.7640, lng: 4.8357 }
  ];

  function loadVetDirectory() {
    try {
      var raw = localStorage.getItem(VET_DIRECTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { entries: DEFAULT_VET_ENTRIES.slice(), nextId: 10 };
  }

  function saveVetDirectory(dir) {
    try { localStorage.setItem(VET_DIRECTORY_KEY, JSON.stringify(dir)); } catch (e) {}
  }

  function renderVetDirectory() {
    var container = document.getElementById('vet-directory-content');
    if (!container) return;

    var dir = loadVetDirectory();
    var entries = dir.entries || [];
    var searchQ = (document.getElementById('vet-search')?.value || '').toLowerCase().trim();

    if (searchQ) {
      entries = entries.filter(function (e) {
        return (e.name || '').toLowerCase().includes(searchQ) || (e.clinic || '').toLowerCase().includes(searchQ);
      });
    }

    // Calculate distances if geolocation active
    if (uiState.geoSortActive && uiState.userLat != null) {
      entries.forEach(function (e) {
        if (e.lat != null && e.lng != null) {
          e._distance = haversineDistance(uiState.userLat, uiState.userLng, e.lat, e.lng);
        } else {
          e._distance = null;
        }
      });
    }

    // Sort: favorites first, then emergency, then by distance (if geo active), then name
    entries.sort(function (a, b) {
      if (a.favorite !== b.favorite) return b.favorite ? 1 : -1;
      if (a.emergency !== b.emergency) return b.emergency ? 1 : -1;
      if (uiState.geoSortActive) {
        var da = a._distance != null ? a._distance : 999999;
        var db = b._distance != null ? b._distance : 999999;
        if (da !== db) return da - db;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    var emergencyEntries = entries.filter(function (e) { return e.emergency; });
    var normalEntries = entries.filter(function (e) { return !e.emergency; });

    var html = '';

    // Emergency section
    if (emergencyEntries.length > 0) {
      html += '<div class="vet-emergency-section"><h3>' + ico('warning', 16) + ' Urgences</h3><div class="vet-cards">';
      emergencyEntries.forEach(function (e) {
        html += renderVetCard(e, dir);
      });
      html += '</div></div>';
    }

    // Normal contacts
    html += '<div class="vet-contacts-section"><div class="vet-cards">';
    if (normalEntries.length === 0 && emergencyEntries.length === 0 && !searchQ) {
      html += '<p class="empty-state">Aucun contact enregistré</p>';
    } else {
      normalEntries.forEach(function (e) {
        html += renderVetCard(e, dir);
      });
    }
    html += '</div></div>';

    container.innerHTML = html;

    // Bind events
    container.querySelectorAll('[data-vet-fav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-vet-fav'), 10);
        var entry = dir.entries.find(function (e) { return e.id === id; });
        if (entry) { entry.favorite = !entry.favorite; saveVetDirectory(dir); renderVetDirectory(); }
      });
    });
    container.querySelectorAll('[data-vet-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editVetContactId = parseInt(btn.getAttribute('data-vet-edit'), 10);
        openModal('editVetContact');
      });
    });
    container.querySelectorAll('[data-vet-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-vet-delete'), 10);
        confirmDelete('Supprimer ce contact ?', function () {
          var idx = dir.entries.findIndex(function (e) { return e.id === id; });
          if (idx === -1) return;
          var removed = dir.entries[idx];
          dir.entries.splice(idx, 1);
          saveVetDirectory(dir); renderVetDirectory();
          showUndoToast('Contact supprimé', function () {
            dir.entries.splice(idx, 0, removed);
            saveVetDirectory(dir); renderVetDirectory();
          });
        });
      });
    });
  }

  // "Favoris" (Mon compte) : mêmes contacts vétérinaires que l'annuaire,
  // filtrés sur favorite=true — pas une liste séparée, une vue sur la même
  // source (vetDirectory) pour ne jamais désynchroniser les deux écrans.
  function renderFavorites() {
    var container = document.getElementById('favorites-content');
    if (!container) return;

    var dir = loadVetDirectory();
    var favs = (dir.entries || []).filter(function (e) { return e.favorite; });
    favs.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });

    if (favs.length === 0) {
      container.innerHTML = '<p class="empty-state">Aucun favori pour l\'instant. Marque un vétérinaire d\'un ' + ico('star', 14) + ' depuis l\'annuaire (fiche animal → onglet Annuaire).</p>';
      return;
    }

    container.innerHTML = '<div class="vet-cards">' + favs.map(function (e) { return renderVetCard(e, dir); }).join('') + '</div>';

    container.querySelectorAll('[data-vet-fav]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-vet-fav'), 10);
        var entry = dir.entries.find(function (e) { return e.id === id; });
        if (entry) { entry.favorite = !entry.favorite; saveVetDirectory(dir); renderFavorites(); }
      });
    });
    container.querySelectorAll('[data-vet-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editVetContactId = parseInt(btn.getAttribute('data-vet-edit'), 10);
        openModal('editVetContact');
      });
    });
    container.querySelectorAll('[data-vet-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-vet-delete'), 10);
        confirmDelete('Supprimer ce contact ?', function () {
          var idx = dir.entries.findIndex(function (e) { return e.id === id; });
          if (idx === -1) return;
          var removed = dir.entries[idx];
          dir.entries.splice(idx, 1);
          saveVetDirectory(dir); renderFavorites();
          showUndoToast('Contact supprimé', function () {
            dir.entries.splice(idx, 0, removed);
            saveVetDirectory(dir); renderFavorites();
          });
        });
      });
    });
  }

  function renderVetCard(e) {
    var distHtml = (e._distance != null) ? '<span class="vet-card__distance">' + ico('mapPin', 14) + ' ' + e._distance.toFixed(1) + ' km</span>' : '';
    var initial = (e.name || '?').charAt(0).toUpperCase();
    var starsFull = Math.floor(e.rating || 0);
    var starsHtml = '';
    for (var s = 0; s < 5; s++) starsHtml += '<span class="vet-star' + (s < starsFull ? ' vet-star--filled' : '') + '">★</span>';
    var ratingHtml = e.rating ? '<div class="vet-card__rating">' + starsHtml + '<span class="vet-card__rating-num">' + Number(e.rating).toFixed(1) + '</span></div>' : '';

    return '<div class="vet-card' + (e.emergency ? ' vet-card--emergency' : '') + '">' +
      '<div class="vet-card__top">' +
        '<div class="vet-card__avatar">' + initial + '</div>' +
        '<div class="vet-card__info">' +
          '<div class="vet-card__name">' + (e.emergency ? ico('warning', 16) + ' ' : '') + escapeHtml(e.name) + '</div>' +
          (e.clinic ? '<div class="vet-card__specialty">' + escapeHtml(e.clinic) + '</div>' : '<div class="vet-card__specialty">Vétérinaire</div>') +
          ratingHtml +
        '</div>' +
        '<button type="button" class="vet-card__fav-btn" data-vet-fav="' + e.id + '" title="Favori">' + (e.favorite ? ico('star', 16) : ico('starOff', 16)) + '</button>' +
      '</div>' +
      '<div class="vet-card__details">' +
        (e.phone ? '<div class="vet-card__detail-row"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> <a href="tel:' + escapeHtml(e.phone) + '">' + escapeHtml(e.phone) + '</a></div>' : '') +
        (e.address ? '<div class="vet-card__detail-row"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + escapeHtml(e.address) + '</div>' : '') +
        distHtml +
        (e.hours ? '<div class="vet-card__detail-row"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + escapeHtml(e.hours) + '</div>' : '') +
        (e.email ? '<div class="vet-card__detail-row"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ' + escapeHtml(e.email) + '</div>' : '') +
        (e.notes ? '<div class="vet-card__notes">' + escapeHtml(e.notes) + '</div>' : '') +
      '</div>' +
      '<div class="vet-card__actions">' +
        (e.phone ? '<a href="tel:' + escapeHtml(e.phone) + '" class="vet-card__btn vet-card__btn--primary">Appeler</a>' : '') +
        '<button type="button" class="vet-card__btn vet-card__btn--outline" data-vet-edit="' + e.id + '">Modifier</button>' +
        '<button type="button" class="vet-card__btn vet-card__btn--ghost" data-vet-delete="' + e.id + '">✕</button>' +
      '</div></div>';
  }

  function addVetContact() {
    var name = document.getElementById('vc-name').value.trim();
    if (!name) { showToast('Nom requis.', 'error'); return; }
    var dir = loadVetDirectory();

    var latVal = parseFloat(document.getElementById('vc-lat').value);
    var lngVal = parseFloat(document.getElementById('vc-lng').value);
    dir.entries.push({
      id: dir.nextId++, name: name,
      clinic: document.getElementById('vc-clinic').value.trim(),
      phone: document.getElementById('vc-phone').value.trim(),
      email: document.getElementById('vc-email').value.trim(),
      address: document.getElementById('vc-address').value.trim(),
      lat: isNaN(latVal) ? null : latVal,
      lng: isNaN(lngVal) ? null : lngVal,
      hours: document.getElementById('vc-hours').value.trim(),
      emergency: document.getElementById('vc-emergency').checked,
      favorite: false,
      notes: document.getElementById('vc-notes').value.trim()
    });
    saveVetDirectory(dir);
    closeModal('addVetContact');
    renderVetDirectory();
    showToast('Contact ajouté', 'success');
  }

  function updateVetContact() {
    var dir = loadVetDirectory();
    var id = uiState.editVetContactId;
    var entry = dir.entries.find(function (e) { return e.id === id; });
    if (!entry) return;

    var name = document.getElementById('evc-name').value.trim();
    if (!name) { showToast('Nom requis.', 'error'); return; }

    var eLatVal = parseFloat(document.getElementById('evc-lat').value);
    var eLngVal = parseFloat(document.getElementById('evc-lng').value);
    entry.name = name;
    entry.clinic = document.getElementById('evc-clinic').value.trim();
    entry.phone = document.getElementById('evc-phone').value.trim();
    entry.email = document.getElementById('evc-email').value.trim();
    entry.address = document.getElementById('evc-address').value.trim();
    entry.lat = isNaN(eLatVal) ? null : eLatVal;
    entry.lng = isNaN(eLngVal) ? null : eLngVal;
    entry.hours = document.getElementById('evc-hours').value.trim();
    entry.emergency = document.getElementById('evc-emergency').checked;
    entry.notes = document.getElementById('evc-notes').value.trim();

    saveVetDirectory(dir);
    closeModal('editVetContact');
    uiState.editVetContactId = null;
    renderVetDirectory();
    showToast('Contact modifié', 'success');
  }

  // ——— Community (events & tips) ————————————————————————————

  function loadCommunity() {
    try {
      var raw = localStorage.getItem(COMMUNITY_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { userTips: [], nextTipId: 100 };
  }

  function saveCommunity(data) {
    try { localStorage.setItem(COMMUNITY_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function showCommunity(panel) {
    setBottomNavActive('community');
    markCareRoute(panel);
    hideAppViews();
    var viewCommunity = document.getElementById('view-community');
    viewCommunity.hidden = false;
    viewCommunity.classList.remove('view-enter');
    void viewCommunity.offsetWidth;
    viewCommunity.classList.add('view-enter');
    document.getElementById('animal-select').hidden = true;
    document.getElementById('fab-container').hidden = true;

    document.getElementById('community-events').hidden = (panel !== 'events');
    document.getElementById('community-tips').hidden = (panel !== 'tips');

    if (panel === 'events') renderCommunityEvents();
    if (panel === 'tips') renderCommunityTips();
    saveRoute({ view: 'community', panel: panel });
  }

  function renderCommunityEvents() {
    var container = document.getElementById('community-events-list');
    var reminderBox = document.getElementById('community-next-reminder');
    if (!container) return;

    var today = new Date();
    var currentMonth = today.getMonth() + 1;
    var currentDay = today.getDate();

    var events = DEFAULT_DOG_EVENTS.slice().sort(function (a, b) {
      // Sort by upcoming: current month first, then future months, then past
      var aMonthDiff = (a.month - currentMonth + 12) % 12;
      var bMonthDiff = (b.month - currentMonth + 12) % 12;
      if (aMonthDiff !== bMonthDiff) return aMonthDiff - bMonthDiff;
      return a.day - b.day;
    });

    var eventQuery = (document.getElementById('events-search')?.value || '').toLocaleLowerCase('fr');
    events = events.filter(function (event) { return (event.title + ' ' + event.description).toLocaleLowerCase('fr').includes(eventQuery); });
    var monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    // Upcoming events this month
    var thisMonthEvents = events.filter(function (e) { return e.month === currentMonth; });
    var nextMonthEvents = events.filter(function (e) { return e.month === ((currentMonth % 12) + 1); });

    if (reminderBox) {
      if (thisMonthEvents.length > 0) {
        reminderBox.innerHTML = '<strong>' + ico('bell', 16) + ' Ce mois-ci :</strong> ' + thisMonthEvents.map(function (e) { return escapeHtml(e.title) + ' (' + e.day + ' ' + monthNames[e.month] + ')'; }).join(', ');
        reminderBox.hidden = false;
      } else if (nextMonthEvents.length > 0) {
        reminderBox.innerHTML = '<strong>' + ico('bell', 16) + ' Le mois prochain :</strong> ' + nextMonthEvents.map(function (e) { return escapeHtml(e.title) + ' (' + e.day + ' ' + monthNames[e.month] + ')'; }).join(', ');
        reminderBox.hidden = false;
      } else {
        reminderBox.hidden = true;
      }
    }

    var html = '<div class="community-events-grid">' + (events.length ? '' : '<p class="empty-state">Aucun événement ne correspond à votre recherche.</p>');
    events.forEach(function (ev) {
      var isThisMonth = ev.month === currentMonth;
      var isPast = ev.month < currentMonth || (ev.month === currentMonth && ev.day < currentDay);
      html += '<div class="community-event-card' + (isThisMonth ? ' community-event-upcoming' : '') + (isPast && !isThisMonth ? ' community-event-past' : '') + '">' +
        '<div class="community-event-date"><span class="community-event-day">' + ev.day + '</span><span class="community-event-month">' + monthNames[ev.month] + '</span></div>' +
        '<div class="community-event-info"><div class="community-event-title">' + escapeHtml(ev.title) + '</div>' +
        '<div class="community-event-desc">' + escapeHtml(ev.description) + '</div></div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function renderCommunityTips() {
    var container = document.getElementById('community-tips-list');
    if (!container) return;

    var community = loadCommunity();
    var categoryFilter = (document.getElementById('tips-category-filter')?.value || 'all');
    var allTips = DEFAULT_TIPS.concat((community.userTips || []).map(function (t) { return Object.assign({}, t, { userAdded: true }); }));

    if (categoryFilter !== 'all') {
      allTips = allTips.filter(function (t) { return t.category === categoryFilter; });
    }

    var tipQuery = (document.getElementById('tips-search')?.value || '').toLocaleLowerCase('fr');
    allTips = allTips.filter(function (tip) { return (tip.title + ' ' + tip.content).toLocaleLowerCase('fr').includes(tipQuery); });
    var categoryLabels = { sante: 'Santé', alimentation: 'Alimentation', education: 'Éducation', hygiene: 'Hygiène', comportement: 'Comportement' };

    var html = '<div class="community-tips-grid">';
    if (allTips.length === 0) {
      html += '<p class="empty-state">Aucune astuce dans cette catégorie.</p>';
    }
    allTips.forEach(function (tip) {
      html += '<div class="community-tip-card">' +
        '<div class="community-tip-header">' +
          '<span class="community-tip-badge community-tip-badge-' + tip.category + '">' + escapeHtml(categoryLabels[tip.category] || tip.category) + '</span>' +
          '<span class="community-tip-author">' + escapeHtml(tip.author || 'Utilisateur') + '</span>' +
        '</div>' +
        '<div class="community-tip-title">' + escapeHtml(tip.title) + '</div>' +
        '<div class="community-tip-content">' + escapeHtml(tip.content) + '</div>' +
        (tip.userAdded ? '<button type="button" class="btn-delete community-tip-delete" data-tip-id="' + tip.id + '">✕ Supprimer</button>' : '') +
        '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    // Bind delete buttons
    container.querySelectorAll('.community-tip-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.getAttribute('data-tip-id'), 10);
        var c = loadCommunity();
        c.userTips = (c.userTips || []).filter(function (t) { return t.id !== id; });
        saveCommunity(c);
        renderCommunityTips();
        showToast('Astuce supprimée', 'success');
      });
    });
  }

  function addCommunityTip() {
    var title = document.getElementById('tip-title').value.trim();
    var content = document.getElementById('tip-content').value.trim();
    var category = document.getElementById('tip-category').value;
    if (!title || !content) { showToast('Titre et contenu requis.', 'error'); return; }

    var community = loadCommunity();
    community.userTips = community.userTips || [];
    community.userTips.push({ id: community.nextTipId++, title: title, content: content, category: category, author: 'Moi', date: new Date().toISOString().slice(0, 10) });
    saveCommunity(community);
    closeModal('addTip');
    renderCommunityTips();
    showToast('Astuce ajoutée !', 'success');
  }

  // ——— Geolocation (Vet Directory) ————————————————————————————

  function haversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  var GEO_SEARCH_RADIUS = 10000; // 10 km in meters

  function geolocateUser() {
    var statusEl = document.getElementById('geo-status');
    if (!navigator.geolocation) {
      showToast('Géolocalisation non disponible sur ce navigateur.', 'error');
      return;
    }
    if (statusEl) statusEl.textContent = 'Localisation en cours...';
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        uiState.userLat = pos.coords.latitude;
        uiState.userLng = pos.coords.longitude;
        uiState.geoSortActive = true;
        if (statusEl) statusEl.textContent = 'Position trouvée ✓';
        renderVetDirectory();
        searchNearbyVets(pos.coords.latitude, pos.coords.longitude);
      },
      function (err) {
        if (statusEl) statusEl.textContent = 'Erreur : ' + err.message;
        showToast('Impossible d\'obtenir la position.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function searchNearbyVets(lat, lng) {
    var statusEl = document.getElementById('geo-status');
    var resultsContainer = document.getElementById('vet-nearby-results');
    var listEl = document.getElementById('vet-nearby-list');
    var radiusInfo = document.getElementById('geo-radius-info');
    if (!listEl || !resultsContainer) return;

    if (statusEl) statusEl.textContent = 'Recherche des cliniques...';
    if (radiusInfo) radiusInfo.textContent = '(rayon ' + (GEO_SEARCH_RADIUS / 1000) + ' km)';
    resultsContainer.hidden = false;
    listEl.innerHTML = '<p class="table-muted">Recherche en cours...</p>';

    var query = '[out:json][timeout:15];(' +
      'node["amenity"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
      'way["amenity"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
      'node["healthcare"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
      'way["healthcare"="veterinary"](around:' + GEO_SEARCH_RADIUS + ',' + lat + ',' + lng + ');' +
    ');out center body;';

    var overpassUrl = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

    fetch(overpassUrl)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var elements = (data.elements || []).map(function (el) {
        var elLat = el.lat || (el.center && el.center.lat);
        var elLng = el.lon || (el.center && el.center.lon);
        var tags = el.tags || {};
        return {
          name: tags.name || tags['name:fr'] || tags['name:en'] || tags['name:mg'] || 'Clinique vétérinaire',
          phone: tags.phone || tags['contact:phone'] || '',
          address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ') || '',
          website: tags.website || tags['contact:website'] || '',
          hours: tags.opening_hours || '',
          lat: elLat,
          lng: elLng,
          distance: (elLat && elLng) ? haversineDistance(lat, lng, elLat, elLng) : null
        };
      });

      // Remove duplicates by name+address
      var seen = {};
      elements = elements.filter(function (e) {
        var key = (e.name + '|' + e.address).toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });

      // Sort by distance
      elements.sort(function (a, b) {
        return (a.distance || 999) - (b.distance || 999);
      });

      if (elements.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Aucune clinique vétérinaire trouvée dans un rayon de ' + (GEO_SEARCH_RADIUS / 1000) + ' km.</p>';
        if (statusEl) statusEl.textContent = '0 résultat';
        return;
      }

      if (statusEl) statusEl.textContent = elements.length + ' clinique(s) trouvée(s)';

      var html = '<div class="vet-cards">';
      elements.forEach(function (e, idx) {
        html += '<div class="vet-card vet-card-nearby">' +
          '<div class="vet-card-header"><div class="vet-card-name">' + escapeHtml(e.name) + '</div></div>' +
          (e.distance != null ? '<div class="vet-card-distance">' + ico('mapPin', 14) + ' ' + e.distance.toFixed(1) + ' km</div>' : '') +
          (e.phone ? '<div class="vet-card-phone"><a href="tel:' + escapeHtml(e.phone) + '">' + ico('phone', 14) + ' ' + escapeHtml(e.phone) + '</a></div>' : '') +
          (e.address ? '<div class="vet-card-address">' + ico('mapPin', 14) + ' ' + escapeHtml(e.address) + '</div>' : '') +
          (e.hours ? '<div class="vet-card-hours">' + ico('clock', 14) + ' ' + escapeHtml(e.hours) + '</div>' : '') +
          (e.website ? '<div class="vet-card-website"><a href="' + escapeHtml(e.website) + '" target="_blank" rel="noopener">' + ico('globe', 14) + ' Site web</a></div>' : '') +
          '<div class="vet-card-actions">' +
            '<button type="button" class="btn-icon vet-add-to-dir" data-nearby-idx="' + idx + '">+ Ajouter à mon annuaire</button>' +
          '</div></div>';
      });
      html += '</div>';
      listEl.innerHTML = html;

      // Bind "add to directory" buttons
      listEl.querySelectorAll('.vet-add-to-dir').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.getAttribute('data-nearby-idx'), 10);
          var e = elements[idx];
          if (!e) return;
          var dir = loadVetDirectory();
          dir.entries.push({
            id: dir.nextId++,
            name: e.name,
            clinic: e.name,
            phone: e.phone,
            email: '',
            address: e.address,
            lat: e.lat || null,
            lng: e.lng || null,
            hours: e.hours,
            emergency: false,
            favorite: false,
            notes: 'Ajouté via recherche GPS'
          });
          saveVetDirectory(dir);
          renderVetDirectory();
          btn.textContent = '✓ Ajouté';
          btn.disabled = true;
          showToast(e.name + ' ajouté à l\'annuaire', 'success');
        });
      });
    })
    .catch(function (err) {
      console.warn('App\'lika: Overpass search failed', err);
      listEl.innerHTML = '<p class="empty-state">Erreur lors de la recherche. Vérifiez votre connexion internet.</p>';
      if (statusEl) statusEl.textContent = 'Erreur de recherche';
      showToast('Recherche échouée : ' + err.message, 'error');
    });
  }

  function fillCurrentPosition(latId, lngId) {
    if (!navigator.geolocation) {
      showToast('Géolocalisation non disponible.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var latEl = document.getElementById(latId);
        var lngEl = document.getElementById(lngId);
        if (latEl) latEl.value = pos.coords.latitude.toFixed(6);
        if (lngEl) lngEl.value = pos.coords.longitude.toFixed(6);
        showToast('Position GPS récupérée', 'success');
      },
      function () { showToast('Impossible d\'obtenir la position.', 'error'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ——— LOF/LOMAD Verification ————————————————————————————

  function validateRegistryNumber(registry, number) {
    if (!number || !registry) return { valid: false, message: 'Numéro non renseigné' };
    number = number.trim();
    if (registry === 'LOF') {
      if (LOF_PATTERN.test(number)) return { valid: true, message: 'Format LOF valide ✓ (simulation)' };
      return { valid: false, message: 'Format LOF invalide. Attendu : ex. 123 456/12345' };
    }
    if (registry === 'LOMAD') {
      if (LOMAD_PATTERN.test(number)) return { valid: true, message: 'Format LOMAD valide ✓ (simulation)' };
      return { valid: false, message: 'Format LOMAD invalide. Attendu : 6 à 15 chiffres' };
    }
    return { valid: false, message: 'Registre non reconnu pour la vérification' };
  }

  function simulateVerification() {
    var registry = document.getElementById('ped-registry').value;
    var number = document.getElementById('ped-reg-number').value;
    var resultEl = document.getElementById('lof-verify-result');
    if (!resultEl) return;

    var result = validateRegistryNumber(registry, number);
    resultEl.innerHTML = '<span class="lof-badge ' + (result.valid ? 'lof-badge-valid' : 'lof-badge-invalid') + '">' +
      (result.valid ? ico('check', 16) : ico('x', 16)) + ' ' + escapeHtml(result.message) + '</span>';
  }

  function toggleLofVerifyControls() {
    var registry = document.getElementById('ped-registry').value;
    var isLofLomad = (registry === 'LOF' || registry === 'LOMAD');
    var verifyGroup = document.getElementById('lof-verify-group');
    var disclaimer = document.getElementById('lof-disclaimer');
    if (verifyGroup) verifyGroup.hidden = !isLofLomad;
    if (disclaimer) disclaimer.hidden = !isLofLomad;
    var resultEl = document.getElementById('lof-verify-result');
    if (resultEl) resultEl.innerHTML = '';
  }

  // ——— Alerts & notifications ————————————————————————————
  function renderAlerts() {
    var data = getCurrent();
    var cont = document.getElementById('upcoming-alerts');
    var notifList = document.getElementById('notif-list');
    if (!data || !cont) return;

    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var rangeDays = parseInt(document.getElementById('alerts-range')?.value || '60', 10);
    var from = new Date(todayMid); from.setDate(from.getDate() - 30);
    var to = new Date(todayMid); to.setDate(to.getDate() + rangeDays);

    var events = []
      .concat((data.vaccines || []).filter(function (v) { return v.next; }).map(function (v) {
        return { type: 'vaccin', due: { animalId: data.id, animalName: data.animal.name || 'Animal', collection: 'vaccines', id: v.id, name: v.name || 'Vaccin', next: v.next }, date: v.next, icon: ico('vaccine', 18), title: 'Vaccin : ' + escapeHtml(v.name || ''), sub: v.vet ? 'Vétérinaire : ' + escapeHtml(v.vet) : '—' };
      }))
      .concat((data.dewormings || []).filter(function (d) { return d.next; }).map(function (d) {
        return { type: 'deworming', due: { animalId: data.id, animalName: data.animal.name || 'Animal', collection: 'dewormings', id: d.id, name: d.name || 'Déparasitage', next: d.next }, date: d.next, icon: ico('pill', 18), title: 'Déparasitage : ' + escapeHtml(d.name || ''), sub: 'Type : ' + escapeHtml(d.type || '') };
      }))
      .concat((data.hygiene || []).filter(function (h) { return h.next; }).map(function (h) {
        return { type: 'hygiene', due: { animalId: data.id, animalName: data.animal.name || 'Animal', collection: 'hygiene', id: h.id, name: h.type || 'Hygiène', next: h.next }, date: h.next, icon: ico('droplet', 18), title: 'Hygiène : ' + escapeHtml(h.type || ''), sub: h.notes ? escapeHtml(h.notes) : '—' };
      }))
      .concat((data.medications || []).filter(function (m) { return m.active !== false && m.endDate; }).map(function (m) {
        return { type: 'medication', due: { animalId: data.id, animalName: data.animal.name || 'Animal', collection: 'medications', id: m.id, name: m.name || 'Médicament', next: m.endDate }, date: m.endDate, icon: ico('pill', 18), title: 'Fin de traitement : ' + escapeHtml(m.name || ''), sub: m.dosage ? escapeHtml(m.dosage) : '—' };
      }))
      .concat((data.matings || []).map(function (m) {
        var due = matingNextDeadline(m);
        if (!due) return null;
        return { type: 'mating', due: { animalId: data.id, animalName: data.animal.name || 'Animal', collection: 'matings', id: m.id, name: due.label, next: due.date, deadlineField: due.field }, date: due.date, icon: ico('heart', 18), title: due.label, sub: m.partnerName ? 'Partenaire : ' + escapeHtml(m.partnerName) : '—' };
      }).filter(Boolean));

    // Heat cycle prediction
    if (data.animal.sex === 'Femelle' && data.animal.sterilise !== 'Oui') {
      var hcSorted = (data.heatCycles || []).slice().sort(function (a, b) { return new Date(a.startDate) - new Date(b.startDate); });
      if (hcSorted.length > 0) {
        var hcAvg = 180;
        if (hcSorted.length >= 2) {
          var hcGaps = [];
          for (var gi = 1; gi < hcSorted.length; gi++) {
            var gDiff = Math.round((new Date(hcSorted[gi].startDate) - new Date(hcSorted[gi - 1].startDate)) / 864e5);
            if (gDiff > 0) hcGaps.push(gDiff);
          }
          if (hcGaps.length > 0) hcAvg = Math.round(hcGaps.reduce(function (a, b) { return a + b; }, 0) / hcGaps.length);
        }
        var nextHeat = addDaysISO(hcSorted[hcSorted.length - 1].startDate, hcAvg);
        events.push({ type: 'heat', date: nextHeat, icon: ico('thermom', 18), title: 'Chaleurs prévues', sub: 'Cycle moyen : ' + hcAvg + ' jours' });
      }
    }

    // Mise bas prévue (63 jours après la saillie) — informatif, sans bouton Fait/Reporter.
    (data.matings || []).filter(function (m) { return !m.birthDate; }).forEach(function (m) {
      events.push({ type: 'mating', date: addDaysISO(m.date, 63), icon: ico('heart', 18), title: 'Mise bas prévue', sub: m.partnerName ? 'Partenaire : ' + escapeHtml(m.partnerName) : 'Estimation (63 jours)' });
    });

    var upcoming = events.map(function (e) {
      var dt = isoToLocalDate(e.date);
      if (!dt) return null;
      var diffDays = Math.round((dt - todayMid) / 864e5);
      return Object.assign({}, e, { dt: dt, diffDays: diffDays, dayKey: e.date, cls: diffDays < 0 ? 'j-overdue' : (diffDays <= 7 ? 'j-soon' : 'j-ok') });
    }).filter(Boolean).filter(function (e) { return e.dt >= from && e.dt <= to; }).sort(function (a, b) { return a.dt - b.dt; });

    // Filter by category if any
    var catFilter = cont.getAttribute('data-cat-filter') || 'all';
    if (catFilter !== 'all') {
      upcoming = upcoming.filter(function (e) { return e.type === catFilter; });
    }

    if (upcoming.length === 0) {
      cont.innerHTML = '<div class="reminder-empty"><div class="reminder-empty__icon">' + ico('bell', 18) + '</div><p class="reminder-empty__text">Aucun rappel dans la période.</p></div>';
    } else {
      cont.innerHTML = upcoming.map(function (e, idx) {
        var counterTxt = e.diffDays < 0 ? 'Retard ' + Math.abs(e.diffDays) + ' j' : (e.diffDays === 0 ? "Aujourd'hui" : 'J-' + e.diffDays);
        var dotClass = e.diffDays < 0 ? 'reminder-dot--overdue' : (e.diffDays <= 7 ? 'reminder-dot--soon' : 'reminder-dot--ok');
        return '<div class="reminder-card" data-rem-idx="' + idx + '">' +
          '<div class="reminder-card__dot ' + dotClass + '"></div>' +
          '<div class="reminder-card__icon">' + e.icon + '</div>' +
          '<div class="reminder-card__body">' +
            '<div class="reminder-card__title">' + e.title + '</div>' +
            '<div class="reminder-card__sub">' + e.sub + '</div>' +
            '<div class="reminder-card__date">' + fmtDate(e.date) + '</div>' +
          '</div>' +
          '<div class="reminder-card__badge ' + e.cls + '">' + counterTxt + '</div>' +
          (e.due ? '<div class="reminder-card__actions">' + reminderButtons(e.due) + '</div>' : '') +
        '</div>';
      }).join('');
      cont.querySelectorAll('.reminder-card').forEach(function (card) {
        var ev = upcoming[parseInt(card.getAttribute('data-rem-idx'), 10)];
        if (ev && ev.due) bindReminderButtons(card, ev.due);
      });
    }

    var n = data.notifications;
    var animalName = escapeHtml(data.animal.name || "l'animal");
    notifList.innerHTML = [
      { key: 'vaccineReminder', label: 'Rappels vaccins', desc: '30 jours avant la date de rappel' },
      { key: 'dewormingReminder', label: 'Rappels déparasitage', desc: '7 jours avant la date de rappel' },
      { key: 'hygieneReminder', label: 'Rappels hygiène', desc: '7 jours avant la date de rappel' },
      { key: 'medicationReminder', label: 'Fin de traitement', desc: '7 jours avant la fin d\'un médicament en cours' },
      { key: 'matingReminder', label: 'Démarches reproduction', desc: 'Déclaration de saillie, de naissance, inscription LOF/LOMAD' },
      { key: 'birthdayReminder', label: 'Anniversaire de ' + animalName, desc: data.animal.dob ? 'Le ' + fmtDate(data.animal.dob) + ' chaque année' : 'Date de naissance à renseigner' },
      { key: 'monthlySummary', label: 'Résumé mensuel', desc: 'Récapitulatif de santé chaque mois' }
    ].map(function (item) {
      var isOn = n[item.key];
      return '<div class="notif-row"><div><div class="notif-label">' + item.label + '</div><div class="notif-desc">' + item.desc + '</div></div><button type="button" class="toggle' + (isOn ? ' on' : '') + '" data-notif="' + item.key + '" aria-pressed="' + isOn + '"></button></div>';
    }).join('');

    notifList.querySelectorAll('.toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = this.getAttribute('data-notif');
        data.notifications[key] = !data.notifications[key];
        this.classList.toggle('on', data.notifications[key]);
        this.setAttribute('aria-pressed', data.notifications[key]);
        // Request notification permission when enabling
        if (data.notifications[key] && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        saveState();
      });
    });
  }

  // ——— Browser Notifications ————————————————————————————
  function checkBrowserNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var np = window.applikaPrefs ? window.applikaPrefs.get().notifications : null;
    if (np && (np.push === false || window.applikaPrefs.inQuietHours())) return;
    var lead = function (type) { return window.applikaPrefs ? window.applikaPrefs.leadDays(type) : 7; };
    var lastCheck = localStorage.getItem(NOTIF_CHECK_KEY);
    var todayStr = todayISO();
    if (lastCheck === todayStr) return;
    localStorage.setItem(NOTIF_CHECK_KEY, todayStr);

    var today = new Date();
    var todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    state.animals.forEach(function (data) {
      var n = data.notifications || {};

      if (n.vaccineReminder) {
        data.vaccines.forEach(function (v) {
          if (!v.next) return;
          var dt = isoToLocalDate(v.next);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff < 0) {
            new Notification('App\'lika — Vaccin en retard', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(v.name) + ' (' + Math.abs(diff) + 'j de retard)', icon: 'icons/icon-192.png' });
          } else if (diff <= lead('vaccine')) {
            new Notification('App\'lika — Rappel vaccin', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(v.name) + ' dans ' + diff + 'j', icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.dewormingReminder) {
        data.dewormings.forEach(function (d) {
          if (!d.next) return;
          var dt = isoToLocalDate(d.next);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff >= 0 && diff <= lead('deworming')) {
            new Notification('App\'lika — Rappel déparasitage', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(d.name) + ' dans ' + diff + 'j', icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.hygieneReminder) {
        (data.hygiene || []).forEach(function (h) {
          if (!h.next) return;
          var dt = isoToLocalDate(h.next);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff >= 0 && diff <= lead('hygiene')) {
            new Notification('App\'lika — Rappel hygiène', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(h.type) + ' dans ' + diff + 'j', icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.birthdayReminder && data.animal.dob) {
        var dob = isoToLocalDate(data.animal.dob);
        if (dob && today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
          new Notification('App\'lika — Anniversaire !', { body: 'Joyeux anniversaire ' + escapeHtml(data.animal.name) + ' !', icon: 'icons/icon-192.png' });
        }
      }

      if (n.medicationReminder) {
        (data.medications || []).forEach(function (m) {
          if (m.active === false || !m.endDate) return;
          var dt = isoToLocalDate(m.endDate);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff >= 0 && diff <= lead('medication')) {
            new Notification('App\'lika — Fin de traitement', { body: escapeHtml(data.animal.name) + ' : ' + escapeHtml(m.name) + ' se termine dans ' + diff + 'j', icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.matingReminder) {
        (data.matings || []).forEach(function (m) {
          var due = matingNextDeadline(m);
          if (!due) return;
          var dt = isoToLocalDate(due.date);
          if (!dt) return;
          var diff = Math.round((dt - todayMid) / 864e5);
          if (diff <= 7) {
            var body = diff < 0
              ? escapeHtml(data.animal.name) + ' : ' + escapeHtml(due.label) + ' en retard (' + Math.abs(diff) + 'j)'
              : escapeHtml(data.animal.name) + ' : ' + escapeHtml(due.label) + ' dans ' + diff + 'j';
            new Notification('App\'lika — Rappel reproduction', { body: body, icon: 'icons/icon-192.png' });
          }
        });
      }

      if (n.monthlySummary) {
        checkMonthlySummary(data, todayMid);
      }
    });

    checkDogEventsReminder(todayMid);
  }

  // ——— Résumé mensuel : déclenchement une fois par frontière de mois ———
  function checkMonthlySummary(data, todayMid) {
    var currentMonthKey = todayMid.getFullYear() + '-' + String(todayMid.getMonth() + 1).padStart(2, '0');
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(MONTHLY_SUMMARY_SEEN_KEY) || '{}'); } catch (e) { seen = {}; }
    var animalKey = String(data.id);
    if (seen[animalKey] === currentMonthKey) return;

    // On ne notifie que si le mois précédent a des données (évite un
    // résumé vide au tout premier mois d'utilisation).
    var prevDate = new Date(todayMid.getFullYear(), todayMid.getMonth() - 1, 1);
    var summary = computeMonthlySummary(data, prevDate.getFullYear(), prevDate.getMonth());
    seen[animalKey] = currentMonthKey;
    localStorage.setItem(MONTHLY_SUMMARY_SEEN_KEY, JSON.stringify(seen));
    if (!summary.hasActivity) return;

    new Notification('App\'lika — Résumé mensuel', {
      body: 'Le résumé du mois de ' + escapeHtml(data.animal.name) + ' est prêt.',
      icon: 'icons/icon-192.png'
    });
  }

  // ——— Événements canins : rappel groupé une fois par mois (compte, pas par animal) ———
  function checkDogEventsReminder(todayMid) {
    var pref = localStorage.getItem(DOG_EVENTS_REMINDER_PREF_KEY);
    if (pref === 'false') return;

    var currentMonthKey = todayMid.getFullYear() + '-' + String(todayMid.getMonth() + 1).padStart(2, '0');
    if (localStorage.getItem(DOG_EVENTS_NOTIF_KEY) === currentMonthKey) return;
    localStorage.setItem(DOG_EVENTS_NOTIF_KEY, currentMonthKey);

    var monthEvents = DEFAULT_DOG_EVENTS.filter(function (e) { return e.month === todayMid.getMonth() + 1; });
    if (monthEvents.length === 0) return;

    var titles = monthEvents.map(function (e) { return e.title; }).join(', ');
    new Notification('App\'lika — Événements canins du mois', { body: titles, icon: 'icons/icon-192.png' });
  }

  // ——— Calendar view ————————————————————————————————————
  var CAL_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  var CAL_TONE_ORDER = ['late', 'soon', 'care', 'vet', 'warm', 'plain'];

  function selectCalendarDay(iso, keepFocus) {
    var p = iso.split('-');
    uiState.calendarYear = parseInt(p[0], 10);
    uiState.calendarMonth = parseInt(p[1], 10) - 1;
    uiState.calendarDay = iso;
    renderCalendar(keepFocus);
  }

  function renderCalendar(keepFocus) {
    var grid = document.getElementById('calendar-grid');
    var titleEl = document.getElementById('cal-month-title');
    var detailEl = document.getElementById('calendar-day-detail');
    var side = document.querySelector('.ag__side');
    if (!grid) return;
    if (!state.animals.length) {
      grid.innerHTML = '<div class="ag__empty"><p>Le calendrier affichera les soins et rappels de vos animaux.</p><button type="button" class="care-action care-action--primary" data-care-route="addAnimal">' + ico('plus', 18) + '<span>Ajouter mon animal</span></button></div>';
      if (titleEl) titleEl.textContent = '—';
      if (detailEl) detailEl.hidden = true;
      return;
    }
    if (detailEl) detailEl.hidden = false;

    var year = uiState.calendarYear;
    var month = uiState.calendarMonth;
    titleEl.textContent = CAL_MONTHS[month] + ' ' + year;

    var monthKey = year + '-' + String(month + 1).padStart(2, '0');
    var todayIso = todayLocalIso();
    var sel = uiState.calendarDay;
    if (!sel || sel.slice(0, 7) !== monthKey) sel = todayIso.slice(0, 7) === monthKey ? todayIso : monthKey + '-01';
    uiState.calendarDay = sel;

    var events = buildAgendaEvents(year);
    var sundayFirst = !!(window.applikaPrefs && window.applikaPrefs.weekStartsOnSunday());
    var startDow = sundayFirst ? new Date(year, month, 1).getDay() : (new Date(year, month, 1).getDay() + 6) % 7; // 0 = premier jour de la semaine choisi
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var dayNames = sundayFirst ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    var html = dayNames.map(function (d) { return '<div class="cal-header" aria-hidden="true">' + d + '</div>'; }).join('');
    for (var i = 0; i < startDow; i++) html += '<span class="cal-day cal-other" aria-hidden="true"></span>';
    for (var d = 1; d <= daysInMonth; d++) {
      var iso = localIso(year, month, d);
      var evs = events[iso] || [];
      var tones = [];
      CAL_TONE_ORDER.forEach(function (t) { if (evs.some(function (e) { return e.tone === t; })) tones.push(t); });
      var dots = tones.slice(0, 3).map(function (t) { return '<span class="ag__dot" data-tone="' + t + '"></span>'; }).join('') +
        (tones.length > 3 ? '<span class="ag__dot-more">+</span>' : '');
      var sorted = evs.slice().sort(function (x, y) { return CAL_TONE_ORDER.indexOf(x.tone) - CAL_TONE_ORDER.indexOf(y.tone); });
      var labels = sorted.slice(0, 2).map(function (e) { return '<span class="cal-label" data-tone="' + e.tone + '">' + (e.multi ? '<b>' + escapeHtml((e.animalName || '?').charAt(0).toUpperCase()) + '</b> ' : '') + escapeHtml(e.title) + '</span>'; }).join('') +
        (sorted.length > 2 ? '<span class="cal-label cal-label--more">+' + (sorted.length - 2) + '</span>' : '');
      var isSel = iso === sel;
      var aria = d + ' ' + CAL_MONTHS[month].toLowerCase() + ' ' + year + (evs.length ? ', ' + evs.length + ' événement' + (evs.length > 1 ? 's' : '') : ', aucun événement');
      html += '<button type="button" class="cal-day' + (iso === todayIso ? ' cal-today' : '') + (isSel ? ' is-sel' : '') + (evs.length ? ' has-ev' : '') + '" data-iso="' + iso + '" aria-pressed="' + (isSel ? 'true' : 'false') + '" aria-label="' + aria + '" tabindex="' + (isSel ? '0' : '-1') + '">' +
        '<span class="cal-num">' + d + '</span><span class="ag__dots">' + dots + '</span><span class="cal-labels">' + labels + '</span></button>';
    }
    grid.innerHTML = html;
    var todayBtn = document.getElementById('cal-today');
    if (todayBtn) todayBtn.hidden = sel === todayIso; // inutile quand on est déjà sur aujourd'hui

    grid.querySelectorAll('.cal-day[data-iso]').forEach(function (el) {
      el.addEventListener('click', function () { selectCalendarDay(el.getAttribute('data-iso'), true); });
    });
    if (keepFocus) { var cur = grid.querySelector('.is-sel'); if (cur) cur.focus({ preventScroll: true }); }

    // Panneau du jour sélectionné
    var dayEvents = (events[sel] || []).slice().sort(function (x, y) {
      var kx = x.kind === 'due' ? 0 : 1, ky = y.kind === 'due' ? 0 : 1;
      return kx - ky || CAL_TONE_ORDER.indexOf(x.tone) - CAL_TONE_ORDER.indexOf(y.tone);
    });
    var selDate = isoToLocalDate(sel);
    var label = selDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    label = label.charAt(0).toUpperCase() + label.slice(1);
    var rel = relativeDate(sel);
    detailEl.innerHTML = '<div class="ag__day-head"><h3>' + escapeHtml(label) + '</h3>' + (rel ? '<span class="ag__rel">' + escapeHtml(rel) + '</span>' : '') + '</div>' +
      (dayEvents.length
        ? '<ul class="ag__list">' + dayEvents.map(agendaEventCard).join('') + '</ul>'
        : '<div class="ag__day-empty"><p>Rien de prévu ce jour.</p><button type="button" class="rem-btn rem-btn--later" data-ag-add>Ajouter au carnet</button></div>');
    bindAgendaCards(detailEl, dayEvents);
    var addBtn = detailEl.querySelector('[data-ag-add]');
    if (addBtn) addBtn.addEventListener('click', function () {
      var trigger = [document.getElementById('fab-btn'), document.getElementById('bottom-add')].filter(function (b) { return b && b.offsetParent; })[0];
      if (trigger) trigger.click();
    });
    if (side) side.hidden = false;
  }

  function setupAgendaGrid() {
    var grid = document.getElementById('calendar-grid');
    if (!grid || grid.dataset.bound) return;
    grid.dataset.bound = '1';
    // Clavier : flèches = jour précédent / suivant, haut / bas = semaine, changement de mois automatique.
    grid.addEventListener('keydown', function (e) {
      var delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!delta || !uiState.calendarDay) return;
      e.preventDefault();
      var d = isoToLocalDate(uiState.calendarDay);
      d.setDate(d.getDate() + delta);
      selectCalendarDay(localIso(d.getFullYear(), d.getMonth(), d.getDate()), true);
    });
    // Tactile : un balayage horizontal change de mois.
    var sx = 0, sy = 0;
    grid.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    grid.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
      var btn = document.getElementById(dx < 0 ? 'cal-next' : 'cal-prev');
      if (btn) btn.click();
    }, { passive: true });
    var todayBtn = document.getElementById('cal-today');
    if (todayBtn) todayBtn.addEventListener('click', function () { selectCalendarDay(todayLocalIso(), false); });
  }

  // ——— History ——————————————————————————————————————
  // ——— Graphiques (Chart.js) ——————————————————————————————————
  // Une seule fonction pour les courbes poids/taille (remplace 2x2 tracés SVG
  // faits main quasi identiques) : vrai axe temporel (les pesées irrégulières
  // ne sont plus espacées comme si elles étaient régulières), info-bulles et
  // historique complet au lieu des 6 derniers points seulement. `entries`
  // = [{date, value, id}], `opts.rangeBand` = {min,max} optionnel (fourchette
  // race), `opts.thresholdLine` = valeur optionnelle (ex: seuil surpoids).
  var CHART_INSTANCES = {};
  // Chart.js fige les couleurs (chaînes JS, pas des var() CSS vivantes) au
  // moment du tracé : contrairement à l'ancien SVG, un changement de thème
  // ne les met pas à jour tout seul. On retient quel conteneur affiche quelle
  // courbe pour la retracer avec les bonnes couleurs — voir applyTheme().
  var CHART_TARGETS = {};
  function redrawChartsForTheme() {
    var data = getCurrent();
    if (!data) return;
    Object.keys(CHART_TARGETS).forEach(function (id) {
      if (!document.getElementById(id)) { delete CHART_TARGETS[id]; return; }
      if (CHART_TARGETS[id] === 'height') renderHeightEvolution(data, id);
      else renderWeightEvolution(data, id);
    });
  }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }
  function drawMetricChart(canvasId, entries, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (CHART_INSTANCES[canvasId]) { CHART_INSTANCES[canvasId].destroy(); delete CHART_INSTANCES[canvasId]; }
    opts = opts || {};
    var color = opts.color || cssVar('--teal-dark', '#0f766e');
    var muted = cssVar('--text-muted', '#6b7280');
    var gridColor = cssVar('--border', 'rgba(128,128,128,0.25)');
    // Axe X en timestamp numérique (type "linear", pas "time") : le build
    // chart.umd.js vendorisé n'embarque aucun adaptateur de dates
    // (chartjs-adapter-*), requis par le scale "time" — un axe linéaire sur
    // epoch-ms avec formatage manuel des ticks/tooltip donne le même espacement
    // proportionnel au temps sans dépendance supplémentaire à vendoriser.
    var toTs = function (d) { return new Date(d + 'T00:00:00').getTime(); };
    var datasets = [{
      label: opts.label || '', data: entries.map(function (e) { return { x: toTs(e.date), y: e.value }; }),
      borderColor: color, backgroundColor: color + '26', fill: true, tension: 0.3,
      pointRadius: entries.length > 30 ? 0 : 4, pointHoverRadius: 6, pointBackgroundColor: color,
      pointBorderColor: cssVar('--card-bg', '#fff'), pointBorderWidth: 2, borderWidth: 2.5,
    }];
    if (opts.rangeBand) {
      datasets.push({ label: 'Min race', data: entries.map(function (e) { return { x: toTs(e.date), y: opts.rangeBand.min }; }), borderColor: 'transparent', pointRadius: 0, fill: false, order: 3 });
      datasets.push({ label: 'Max race', data: entries.map(function (e) { return { x: toTs(e.date), y: opts.rangeBand.max }; }), borderColor: 'transparent', pointRadius: 0, backgroundColor: 'rgba(34,197,94,0.12)', fill: '-1', order: 3 });
    }
    if (opts.thresholdLine != null) {
      datasets.push({ label: opts.thresholdLabel || 'Seuil', data: entries.map(function (e) { return { x: toTs(e.date), y: opts.thresholdLine }; }), borderColor: '#ef4444', borderDash: [5, 4], pointRadius: 0, fill: false, borderWidth: 1.25 });
    }
    CHART_INSTANCES[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: function (item) { return item.datasetIndex === 0; },
            callbacks: {
              title: function (items) { return items.length ? fmtDate(new Date(items[0].parsed.x).toISOString().slice(0, 10)) : ''; },
              label: function (ctx) { return opts.formatValue ? opts.formatValue(ctx.parsed.y) : ctx.parsed.y; },
            },
          },
        },
        scales: {
          x: {
            type: 'linear', grid: { display: false },
            ticks: {
              color: muted, font: { size: 10 }, maxRotation: 0, maxTicksLimit: 6,
              // Libellé compact indépendant du format de date choisi par l'utilisateur
              // (fmtDate() en dépend, potentiellement "yyyy-mm-dd" ou autre) : jour + mois court fixes ici.
              callback: function (v) { return new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); },
            },
          },
          y: { grid: { color: gridColor }, ticks: { color: muted, font: { size: 10 }, callback: function (v) { return opts.formatValue ? opts.formatValue(v) : v; } } },
        },
      },
    });
  }

  function renderWeightEvolution(data, targetId) {
    var container = document.getElementById(targetId || 'weight-evolution');
    if (!container) return;
    CHART_TARGETS[targetId || 'weight-evolution'] = 'weight';
    if (!data || !data.animal) { container.innerHTML = ''; return; }

    var entriesRaw = Array.isArray(data.animal.weightHistory) ? data.animal.weightHistory : [];
    var entries = entriesRaw.filter(function (e) { return e && e.date && e.weight != null && !isNaN(Number(e.weight)); })
      .slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    if (entries.length === 0) { container.innerHTML = ''; return; }

    var first = Number(entries[0].weight);
    var last = Number(entries[entries.length - 1].weight);
    var delta = last - first;
    var deltaTxt = wDelta(delta);
    var lastTxt = wNum(last);

    // Trend
    var trendHtml = '';
    if (entries.length > 2) {
      trendHtml = ' · Tendance : ' + (delta > 0 ? '📈 hausse' : (delta < 0 ? '📉 baisse' : '→ stable'));
    }

    // Breed-based weight reference band (adult dogs/cats only)
    var breedRange = findBreedWeightRange(data.animal.species, data.animal.race);
    var ageMonths = calculateAgeMonths(data.animal.dob);
    var breedHintTxt = '';
    var rangeBand = null;
    if (breedRange && ageMonths != null && ageMonths >= 12) {
      rangeBand = breedRange;
      var outOfRange = last < breedRange.min || last > breedRange.max;
      breedHintTxt = ' · Fourchette race (adulte) : ' + wNum(breedRange.min, 0) + '–' + wNum(breedRange.max, 0) + ' ' + wUnit() + (outOfRange ? ' ⚠' : ' ✓');
    }

    var canvasId = (targetId || 'weight-evolution') + '-canvas';
    var listEntries = entries.slice(-6).reverse();
    var list = listEntries.map(function (e) {
      var wTxt = wNum(e.weight);
      return '<div class="weight-evolution-item" data-weight-entry-id="' + e.id + '"><div class="left">' + fmtDate(e.date) + '</div><div class="right-wrap"><div class="right">' + wTxt + ' ' + wUnit() + '</div><div class="weight-actions"><button type="button" class="btn-edit" data-action="edit-weight" data-weight-entry-id="' + e.id + '">Modifier</button> <button type="button" class="btn-delete" data-action="delete-weight" data-weight-entry-id="' + e.id + '">✕</button></div></div></div>';
    }).join('');

    container.innerHTML =
      '<div class="metric-chart-wrap"><canvas id="' + canvasId + '"></canvas></div>' +
      '<div class="weight-evolution-meta">Dernière: ' + lastTxt + ' ' + wUnit() + ' · Variation: ' + deltaTxt + trendHtml + breedHintTxt + '</div>' +
      '<div class="weight-evolution-list">' + list + '</div>';

    drawMetricChart(canvasId, entries.map(function (e) { return { date: e.date, value: Number(e.weight) }; }), {
      color: cssVar('--teal-dark', '#0f766e'), rangeBand: rangeBand, formatValue: function (v) { return wNum(v); },
    });

    container.querySelectorAll('[data-action="edit-weight"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editWeightEntryId = parseInt(btn.getAttribute('data-weight-entry-id'), 10);
        openModal('editWeight');
      });
    });
    container.querySelectorAll('[data-action="delete-weight"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteWeightEntry(parseInt(btn.getAttribute('data-weight-entry-id'), 10));
      });
    });
  }

  // Miroir de renderWeightEvolution pour la taille au garrot (sans
  // fourchette de race, données non disponibles pour la taille).
  function renderHeightEvolution(data, targetId) {
    var container = document.getElementById(targetId || 'height-evolution');
    if (!container) return;
    CHART_TARGETS[targetId || 'height-evolution'] = 'height';
    if (!data || !data.animal) { container.innerHTML = ''; return; }

    var entriesRaw = Array.isArray(data.animal.heightHistory) ? data.animal.heightHistory : [];
    var entries = entriesRaw.filter(function (e) { return e && e.date && e.height != null && !isNaN(Number(e.height)); })
      .slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    if (entries.length === 0) { container.innerHTML = ''; return; }

    var first = Number(entries[0].height);
    var last = Number(entries[entries.length - 1].height);
    var delta = last - first;
    var deltaTxt = hDelta(delta);
    var lastTxt = hNum(last);

    var trendHtml = '';
    if (entries.length > 2) {
      trendHtml = ' · Tendance : ' + (delta > 0 ? '📈 hausse' : (delta < 0 ? '📉 baisse' : '→ stable'));
    }

    var canvasId = (targetId || 'height-evolution') + '-canvas';
    var listEntries = entries.slice(-6).reverse();
    var list = listEntries.map(function (e) {
      var hTxt = hNum(e.height);
      return '<div class="weight-evolution-item" data-height-entry-id="' + e.id + '"><div class="left">' + fmtDate(e.date) + '</div><div class="right-wrap"><div class="right">' + hTxt + ' ' + hUnit() + '</div><div class="weight-actions"><button type="button" class="btn-edit" data-action="edit-height" data-height-entry-id="' + e.id + '">Modifier</button> <button type="button" class="btn-delete" data-action="delete-height" data-height-entry-id="' + e.id + '">✕</button></div></div></div>';
    }).join('');

    container.innerHTML =
      '<div class="metric-chart-wrap"><canvas id="' + canvasId + '"></canvas></div>' +
      '<div class="weight-evolution-meta">Dernière: ' + lastTxt + ' ' + hUnit() + ' · Variation: ' + deltaTxt + trendHtml + '</div>' +
      '<div class="weight-evolution-list">' + list + '</div>';

    drawMetricChart(canvasId, entries.map(function (e) { return { date: e.date, value: Number(e.height) }; }), {
      color: '#2563eb', formatValue: function (v) { return hNum(v); },
    });

    container.querySelectorAll('[data-action="edit-height"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        uiState.editHeightEntryId = parseInt(btn.getAttribute('data-height-entry-id'), 10);
        openModal('editHeight');
      });
    });
    container.querySelectorAll('[data-action="delete-height"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteHeightEntry(parseInt(btn.getAttribute('data-height-entry-id'), 10));
      });
    });
  }

  // ——— Résumé mensuel ——————————————————————————————————————
  var MONTH_NAMES_FULL = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  function computeMonthlySummary(data, year, month) {
    var monthStart = new Date(year, month, 1);
    var monthEnd = new Date(year, month + 1, 0);
    var inMonth = function (dateStr) {
      var d = isoToLocalDate(dateStr);
      return !!d && d >= monthStart && d <= monthEnd;
    };

    var vaccinesDone = (data.vaccines || []).filter(function (v) { return inMonth(v.date); });
    var dewormingsDone = (data.dewormings || []).filter(function (d) { return inMonth(d.date); });
    var hygieneDone = (data.hygiene || []).filter(function (h) { return inMonth(h.date); });

    var weightEntries = (data.animal.weightHistory || []).filter(function (w) { return inMonth(w.date); });
    var weightTrend = null;
    if (weightEntries.length > 0) {
      var sorted = weightEntries.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
      var first = Number(sorted[0].weight);
      var last = Number(sorted[sorted.length - 1].weight);
      weightTrend = { first: first, last: last, delta: last - first };
    }

    var activitiesInMonth = (data.activities || []).filter(function (a) { return inMonth(a.date); });
    var totalDuration = activitiesInMonth.reduce(function (s, a) { return s + (parseFloat(a.duration) || 0); }, 0);
    var totalDistance = activitiesInMonth.reduce(function (s, a) { return s + (parseFloat(a.distance) || 0); }, 0);

    var hasActivity = vaccinesDone.length + dewormingsDone.length + hygieneDone.length + activitiesInMonth.length > 0 || weightEntries.length > 0;

    return {
      year: year, month: month,
      vaccinesDone: vaccinesDone, dewormingsDone: dewormingsDone, hygieneDone: hygieneDone,
      weightTrend: weightTrend,
      activityCount: activitiesInMonth.length, totalDuration: totalDuration, totalDistance: totalDistance,
      nextDue: getNextDueItem(data),
      hasActivity: hasActivity
    };
  }

  function renderMonthlySummary() {
    var data = getCurrent();
    var container = document.getElementById('monthly-summary-content');
    if (!data || !container) return;

    var now = new Date();
    var s = computeMonthlySummary(data, now.getFullYear(), now.getMonth());
    var monthLabel = MONTH_NAMES_FULL[s.month] + ' ' + s.year;

    var rows = [];
    rows.push({ label: 'Vaccins', value: s.vaccinesDone.length });
    rows.push({ label: 'Vermifuges', value: s.dewormingsDone.length });
    rows.push({ label: 'Soins d\'hygiène', value: s.hygieneDone.length });
    rows.push({ label: 'Activités', value: s.activityCount + (s.totalDuration ? ' (' + Math.round(s.totalDuration) + ' min, ' + s.totalDistance.toFixed(1) + ' km)' : '') });

    var weightHtml = s.weightTrend
      ? '<div class="monthly-summary-row"><span>Poids</span><span>' + wNum(s.weightTrend.first) + ' → ' + wNum(s.weightTrend.last) + ' ' + wUnit() + ' (' + wDelta(s.weightTrend.delta) + ')</span></div>'
      : '';

    var nextDueHtml = s.nextDue
      ? '<div class="monthly-summary-row"><span>Prochaine échéance</span><span>' + escapeHtml(s.nextDue.label) + ' — ' + fmtDate(s.nextDue.date) + '</span></div>'
      : '';

    container.innerHTML =
      '<h3 class="monthly-summary-title">' + escapeHtml(data.animal.name || 'Animal') + ' — ' + monthLabel + '</h3>' +
      (s.hasActivity ? '' : '<p class="monthly-summary-empty">Aucune activité enregistrée ce mois-ci pour le moment.</p>') +
      rows.map(function (r) { return '<div class="monthly-summary-row"><span>' + r.label + '</span><span>' + r.value + '</span></div>'; }).join('') +
      weightHtml + nextDueHtml;
  }

  // ——— Frise du carnet ————————————————————————————————————
  // Un seul fil chronologique : ce qui reste à faire (en retard puis à venir)
  // en tête, puis tout ce qui a été fait, groupé par mois. Les rubriques
  // (Vaccins, Consultations…) deviennent des filtres.
  var FRISE_CATS = [
    { key: 'all', label: 'Tout' },
    { key: 'vaccins', label: 'Vaccins', tone: 'care', icon: 'vaccine', tab: 'vaccins' },
    { key: 'deworming', label: 'Déparasitage', tone: 'care', icon: 'pill', tab: 'deworming' },
    { key: 'traitements', label: 'Traitements', tone: 'care', icon: 'pill', tab: 'medications' },
    { key: 'consultations', label: 'Consultations', tone: 'vet', icon: 'stethoscope', tab: 'consultations' },
    { key: 'hygiene', label: 'Hygiène', tone: 'vet', icon: 'droplet', tab: 'hygiene' },
    { key: 'weight', label: 'Poids & taille', tone: 'warm', icon: 'scale', tab: 'poids' },
    { key: 'daily', label: 'Quotidien', tone: 'plain', icon: 'activity', tab: 'activites' },
    { key: 'notes', label: 'Notes', tone: 'plain', icon: 'fileText', tab: 'suivi' },
    { key: 'chaleurs', label: 'Chaleurs', tone: 'warm', icon: 'thermom', tab: 'chaleurs' },
    { key: 'reproduction', label: 'Reproduction', tone: 'warm', icon: 'heart', tab: 'reproduction' }
  ];
  var FRISE_PAGE = 30;

  function friseCat(key) { return FRISE_CATS.filter(function (c) { return c.key === key; })[0]; }

  function buildFriseEvents(data) {
    var ev = [];
    function add(cat, date, title, sub, extra) {
      if (!date) return;
      var c = friseCat(cat);
      ev.push(Object.assign({ cat: cat, date: date, title: title, sub: sub || '', tone: c.tone, icon: extra && extra.icon || c.icon, tab: c.tab }, extra || {}));
    }
    (data.vaccines || []).forEach(function (v) { add('vaccins', v.date, v.name || 'Vaccin', v.vet ? 'Chez ' + v.vet : 'Vaccin', { meta: v.next ? 'Rappel le ' + fmtDate(v.next) : '' }); });
    (data.dewormings || []).forEach(function (d) { add('deworming', d.date, d.name || 'Déparasitage', d.type || 'Déparasitage', { meta: d.next ? 'Prochain le ' + fmtDate(d.next) : '' }); });
    (data.medications || []).forEach(function (m) { add('traitements', m.startDate || m.date, m.name || 'Traitement', [m.dosage, m.endDate ? 'jusqu’au ' + fmtDate(m.endDate) : ''].filter(Boolean).join(' · ') || 'Traitement'); });
    (data.consultations || []).forEach(function (c) { add('consultations', c.date, c.reason || 'Consultation', c.vet ? 'Chez ' + c.vet : 'Consultation', { meta: c.cost ? fmtCost(c.cost) : '' }); });
    (data.hygiene || []).forEach(function (h) { add('hygiene', h.date, h.type || 'Hygiène', 'Hygiène', { meta: h.next ? 'Prochain le ' + fmtDate(h.next) : '' }); });
    var weights = ((data.animal && data.animal.weightHistory) || []).filter(function (w) { return w.date && Number(w.weight) > 0; }).slice().sort(function (x, y) { return x.date.localeCompare(y.date); });
    weights.forEach(function (w, i) {
      var delta = i ? Number(w.weight) - Number(weights[i - 1].weight) : null;
      var d = delta == null || Math.abs(delta) < 0.005 ? '' : wDelta(delta);
      add('weight', w.date, uW(w.weight), 'Pesée', { meta: d });
    });
    ((data.animal && data.animal.heightHistory) || []).forEach(function (h) { add('weight', h.date, uH(h.height), 'Taille', { icon: 'scale' }); });
    (data.activities || []).forEach(function (a) { add('daily', a.date, a.type || 'Activité', 'Activité', { meta: a.duration ? a.duration + ' min' : '', tab: 'activites' }); });
    ((data.nutrition && data.nutrition.meals) || []).forEach(function (m) { add('daily', m.date, (m.type || 'Repas') + (m.food ? ' — ' + m.food : ''), 'Repas', { icon: 'utensils', tab: 'nutrition' }); });
    (data.notes || []).forEach(function (n) { add('notes', n.date, n.title || 'Note', n.category || 'Note'); });
    (data.heatCycles || []).forEach(function (c) { add('chaleurs', c.startDate, 'Chaleurs' + (c.intensity ? ' — ' + c.intensity : ''), 'Reproduction'); });
    (data.matings || []).forEach(function (m) { add('reproduction', m.date, 'Saillie' + (m.partnerName ? ' — ' + m.partnerName : ''), m.method || 'Reproduction', { meta: m.birthDate ? 'Mise bas le ' + fmtDate(m.birthDate) : '' }); });
    return ev;
  }

  function friseDueCat(item) { return { vaccines: 'vaccins', dewormings: 'deworming', hygiene: 'hygiene', medications: 'traitements', matings: 'reproduction' }[item.collection]; }

  function renderHistory() {
    var data = getCurrent();
    var timeline = document.getElementById('history-timeline');
    if (!data || !timeline) return;
    var filter = uiState.friseFilter || 'all';
    var query = (uiState.friseQuery || '').trim().toLowerCase();

    var events = buildFriseEvents(data);
    var dues = collectDueItemsForAnimal(data);

    // Filtres : effectifs par rubrique (sur toute la frise, hors recherche)
    var counts = { all: events.length };
    var hasDue = {};
    events.forEach(function (e) { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    dues.forEach(function (d) { var c = friseDueCat(d); if (c) hasDue[c] = true; });
    var chips = document.getElementById('fr-chips');
    if (chips) {
      chips.innerHTML = FRISE_CATS.filter(function (c) { return c.key === 'all' || counts[c.key] || hasDue[c.key]; }).map(function (c) {
        var on = c.key === filter;
        return '<button type="button" class="fr__chip' + (on ? ' is-on' : '') + '" data-fr="' + c.key + '" aria-pressed="' + (on ? 'true' : 'false') + '"><span>' + c.label + '</span><b>' + (counts[c.key] || 0) + '</b></button>';
      }).join('');
      chips.querySelectorAll('.fr__chip').forEach(function (btn) {
        btn.addEventListener('click', function () { uiState.friseFilter = btn.getAttribute('data-fr'); uiState.friseLimit = FRISE_PAGE; renderHistory(); });
      });
    }
    if (filter !== 'all' && !counts[filter] && !hasDue[filter]) { uiState.friseFilter = filter = 'all'; }

    function match(text) { return !query || text.toLowerCase().indexOf(query) !== -1; }
    var todo = dues.filter(function (d) { return (filter === 'all' || friseDueCat(d) === filter) && match(d.name + ' ' + d.animalName); })
      .sort(function (x, y) { return x.next.localeCompare(y.next); });
    var past = events.filter(function (e) { return (filter === 'all' || e.cat === filter) && match(e.title + ' ' + e.sub); })
      .sort(function (x, y) { return y.date.localeCompare(x.date); });

    // Résumé
    var summary = document.getElementById('fr-summary');
    if (summary) {
      var lastCare = events.filter(function (e) { return ['vaccins', 'deworming', 'traitements', 'consultations', 'hygiene'].indexOf(e.cat) !== -1; }).sort(function (x, y) { return y.date.localeCompare(x.date); })[0];
      var late = dues.filter(function (d) { return daysUntil(d.next) < 0; }).length;
      summary.innerHTML = '<span class="fr__stat"><b>' + events.length + '</b> événement' + (events.length > 1 ? 's' : '') + '</span>' +
        (lastCare ? '<span class="fr__stat">Dernier soin <b>' + escapeHtml(relativeDate(lastCare.date)) + '</b></span>' : '') +
        (late ? '<span class="fr__stat fr__stat--late"><b>' + late + '</b> en retard</span>' : '<span class="fr__stat fr__stat--ok">Rien en retard</span>');
    }

    // Graphiques poids/taille : seulement quand on regarde les pesées
    var weightContainer = document.getElementById('weight-evolution');
    if (weightContainer) weightContainer.hidden = filter !== 'weight';
    if (weightContainer && !weightContainer.hidden) renderWeightEvolution(data);
    var heightContainer = document.getElementById('height-evolution');
    if (heightContainer) heightContainer.hidden = filter !== 'weight';
    if (heightContainer && !heightContainer.hidden) renderHeightEvolution(data);

    if (!todo.length && !past.length) {
      timeline.innerHTML = '<li class="fr__empty">' + (events.length || dues.length
        ? '<p>Aucun résultat pour cette recherche.</p>'
        : '<p>Le carnet est vide pour l’instant.</p><p class="fr__empty-hint">Ajoutez un vaccin, une pesée ou une consultation avec le bouton « Ajouter ».</p>') + '</li>';
      return;
    }

    function itemHtml(e) {
      var d = isoToLocalDate(e.date);
      var day = d ? d.getDate() : '';
      var mon = d ? d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '';
      var rel = relativeDate(e.date);
      var when = fmtDate(e.date) + (rel ? ' · ' + rel : '');
      var head = '<span class="fr__badge" data-tone="' + e.tone + '">' + ico(e.icon, 18) + '</span>';
      var body = '<span class="fr__title">' + escapeHtml(e.title) + '</span>' +
        '<span class="fr__sub">' + escapeHtml(e.sub) + (e.meta ? '<span class="fr__meta">' + escapeHtml(e.meta) + '</span>' : '') + '</span>' +
        '<span class="fr__when">' + escapeHtml(when) + '</span>';
      return '<li class="fr__item" data-tone="' + e.tone + '">' +
        '<time class="fr__date" datetime="' + e.date + '"><b>' + day + '</b><span>' + escapeHtml(mon) + '</span></time>' +
        '<span class="fr__rail" aria-hidden="true"></span>' +
        '<button type="button" class="fr__card" data-fr-tab="' + e.tab + '">' + head + '<span class="fr__text">' + body + '</span></button></li>';
    }
    function dueHtml(d) {
      var c = friseCat(friseDueCat(d)) || { tone: 'care', icon: 'bell' };
      var tone = delayTone(d.next);
      var when = fmtDate(d.next);
      return '<li class="fr__item fr__item--due" data-tone="' + tone + '">' +
        '<time class="fr__date fr__date--' + tone + '" datetime="' + d.next + '"><b>' + escapeHtml(formatJDelay(d.next).replace('aujourd\'hui', 'Auj.')) + '</b></time>' +
        '<span class="fr__rail" aria-hidden="true"></span>' +
        '<div class="fr__card fr__card--due"><span class="fr__badge" data-tone="' + c.tone + '">' + ico(c.icon, 18) + '</span>' +
        '<span class="fr__text"><span class="fr__title">' + escapeHtml(d.name) + '</span>' +
        '<span class="fr__sub">' + (d.collection === 'medications' ? 'Fin de traitement' : 'À prévoir') + '<span class="fr__meta fr__meta--' + tone + '">' + escapeHtml(when) + ' · ' + escapeHtml(formatJDelay(d.next)) + '</span></span></span>' +
        '<span class="fr__actions" data-due="' + d.collection + ':' + d.id + '">' + reminderButtons(d) + '</span></div></li>';
    }

    var limit = uiState.friseLimit || FRISE_PAGE;
    var shown = past.slice(0, limit);
    var html = '';
    if (todo.length) {
      html += '<li class="fr__group fr__group--todo"><h3>À faire <span>' + todo.length + '</span></h3></li>' + todo.map(dueHtml).join('');
    }
    var lastMonth = '';
    shown.forEach(function (e) {
      var d = isoToLocalDate(e.date);
      var month = d ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Sans date';
      month = month.charAt(0).toUpperCase() + month.slice(1);
      if (month !== lastMonth) { html += '<li class="fr__group"><h3>' + escapeHtml(month) + '</h3></li>'; lastMonth = month; }
      html += itemHtml(e);
    });
    if (past.length > shown.length) {
      html += '<li class="fr__more"><button type="button" id="fr-more">Afficher les ' + Math.min(FRISE_PAGE, past.length - shown.length) + ' suivants <span>(' + (past.length - shown.length) + ' restants)</span></button></li>';
    }
    timeline.innerHTML = html;

    timeline.querySelectorAll('.fr__card[data-fr-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-fr-tab')); });
    });
    timeline.querySelectorAll('.fr__actions').forEach(function (box) {
      var parts = box.getAttribute('data-due').split(':');
      var item = dues.filter(function (d) { return d.collection === parts[0] && String(d.id) === parts[1]; })[0];
      if (item) bindReminderButtons(box, item);
    });
    var more = document.getElementById('fr-more');
    if (more) more.addEventListener('click', function () { uiState.friseLimit = limit + FRISE_PAGE; renderHistory(); });
  }

  // ——— Tabs ————————————————————————————————————————
  var TABS_SANTE = ['vaccins', 'deworming', 'hygiene', 'consultations', 'medications'];
  var TABS_MORE = ['nutrition', 'activites', 'chaleurs', 'reproduction', 'journal', 'checkup', 'calendrier', 'annuaire', 'historique'];

  function closeNavMore() {
    var sub = document.getElementById('subnav-more');
    if (sub) sub.hidden = true;
    var btn = document.getElementById('btn-nav-more');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function updateDetailPrimaryNav(tabName) {
    var santeBtn = document.getElementById('btn-primary-sante');
    var moreBtn = document.getElementById('btn-nav-more');
    var subSante = document.getElementById('subnav-sante');
    var subMore = document.getElementById('subnav-more');
    var onSante = TABS_SANTE.indexOf(tabName) !== -1;
    var onMore = TABS_MORE.indexOf(tabName) !== -1;

    if (subSante) subSante.hidden = !onSante;
    if (subMore) subMore.hidden = !onMore;

    if (santeBtn) {
      santeBtn.classList.toggle('active', onSante);
      santeBtn.setAttribute('aria-selected', onSante ? 'true' : 'false');
      santeBtn.setAttribute('tabindex', onSante ? '0' : '-1');
    }
    if (moreBtn) {
      moreBtn.classList.toggle('active', onMore);
      moreBtn.setAttribute('aria-selected', onMore ? 'true' : 'false');
      moreBtn.setAttribute('aria-expanded', onMore ? 'true' : 'false');
      moreBtn.setAttribute('tabindex', onMore ? '0' : '-1');
    }
  }

  function switchTab(tabName) {
    if (!tabName) return;
    if (tabName === 'calendrier') { showAgenda(); return; }
    if (tabName === 'annuaire') { showDirectory(); return; }

    if (tabName === 'journal') tabName = 'suivi';

    var root = document.getElementById('view-detail');
    if (!root) return;
    root.querySelectorAll('.section').forEach(function (s) { s.classList.remove('active'); s.hidden = true; });
    root.querySelectorAll('.tab').forEach(function (t) {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });

    var tabGroups = [['profil','photos','historique'], ['actes','vaccins','deworming','medications','hygiene','consultations','alertes'], ['nutrition','activites','poids'], ['suivi','checkup','chaleurs','reproduction']];
    var visibleTabs = tabGroups.find(function (group) { return group.indexOf(tabName) !== -1; }) || [tabName];
    root.querySelectorAll('.tab').forEach(function (button) { button.hidden = visibleTabs.indexOf(button.dataset.tab) === -1; });
    root.dataset.currentTab = tabName;
    var sectionId = tabName === 'suivi' ? 'section-journal' : ('section-' + tabName);
    var section = document.getElementById(sectionId);
    var tab = root.querySelector('.tab[data-tab="' + tabName + '"]');
    if (section) { section.classList.add('active'); section.hidden = false; }
    if (tab) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    root.classList.toggle('is-pet-profile', tabName === 'profil');

    updateDetailPrimaryNav(tabName);
    syncBottomNavFromTab(tabName);

    if (tabName === 'profil') { renderProfile(); renderDossierHeader(); renderFicheV1(); renderAnimalRail(document.getElementById('animal-rail-search') && document.getElementById('animal-rail-search').value); }
    if (tabName === 'actes') { renderActes(); renderDossierHeader(); }
    if (tabName === 'vaccins') renderVaccines();
    if (tabName === 'deworming') renderDewormings();
    if (tabName === 'hygiene') renderHygiene();
    if (tabName === 'consultations') renderConsultations();
    if (tabName === 'medications') renderMedications();
    markCareRoute(tabName);
    if (tabName === 'alertes') renderAlerts();
    if (tabName === 'historique') renderHistory();
    if (tabName === 'photos') renderGallery();
    if (tabName === 'nutrition') renderNutrition();
    if (tabName === 'poids') {
      // Les courbes vivent aussi dans la frise (#weight-evolution, filtre « Poids & taille ») : un canvas
      // Chart.js ne peut pas être dupliqué par copie de innerHTML (perdrait son dessin), donc on redessine
      // ici dans les conteneurs dédiés à cet onglet plutôt que de copier le HTML de la frise.
      var poidsData = getCurrent();
      renderWeightEvolution(poidsData, 'poids-weight-wrap');
      renderHeightEvolution(poidsData, 'poids-height-wrap');
      var ph = document.getElementById('poids-height-wrap');
      if (ph) ph.hidden = false;
    }
    if (tabName === 'activites') renderActivities();
    if (tabName === 'chaleurs') renderHeatCycles();
    if (tabName === 'reproduction') renderMatings();
    if (tabName === 'suivi') renderJournal();
    if (tabName === 'checkup') renderCheckup();

    if (section && tabName !== 'profil') {
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (tabName === 'profil') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (state.viewMode === 'detail') {
      saveRoute({ view: 'detail', animalId: state.currentAnimalId, tab: tabName });
    }
  }

  function refreshAll() {
    renderProfile();
    renderDossierHeader();
    renderFicheV1();
    renderAnimalRail(document.getElementById('animal-rail-search') && document.getElementById('animal-rail-search').value);
    renderAnimalSelect();
    renderActes();
    renderVaccines();
    renderDewormings();
    renderHygiene();
    renderAlerts();
    renderHistory();
    renderGallery();
    renderConsultations();
    renderMedications();
    renderNutrition();
    renderActivities();
    renderHeatCycles();
    renderMatings();
    renderJournal();
    if (state.viewMode === 'agenda') renderAgenda();
    renderPedigree();
    if (state.viewMode === 'directory') renderVetDirectory();
  }

  // ——— Print / Share ————————————————————————————————————
  function printAnimalRecord() {
    // Show all sections for print
    document.querySelectorAll('.section').forEach(function (s) { s.hidden = false; s.classList.add('active'); });
    window.print();
    // Restore after print
    setTimeout(function () {
      var activeTab = document.querySelector('#view-detail .tab.active');
      var tabName = activeTab && activeTab.getAttribute('data-tab') ? activeTab.getAttribute('data-tab') : 'profil';
      switchTab(tabName);
    }, 500);
  }

  function printVetView() {
    var data = getCurrent();
    if (!data) return;
    var a = data.animal;
    var container = document.getElementById('vet-view-print');
    if (!container) return;

    var section = function (title, rowsHtml) {
      return '<div class="vet-view-section"><h2>' + escapeHtml(title) + '</h2>' +
        (rowsHtml || '<p class="vet-view-empty">Aucune donnée</p>') + '</div>';
    };
    var byDateDesc = function (x, y) { return new Date(y.date) - new Date(x.date); };

    var identityHtml =
      '<table class="vet-view-table"><tbody>' +
      '<tr><th>Nom</th><td>' + escapeHtml(a.name || '—') + '</td></tr>' +
      '<tr><th>Espèce</th><td>' + escapeHtml(a.species || '—') + '</td></tr>' +
      '<tr><th>Race</th><td>' + escapeHtml(a.race || '—') + '</td></tr>' +
      '<tr><th>Sexe</th><td>' + escapeHtml(a.sex || '—') + '</td></tr>' +
      '<tr><th>Date de naissance</th><td>' + (a.dob ? fmtDate(a.dob) : '—') + '</td></tr>' +
      '<tr><th>Puce électronique</th><td>' + escapeHtml(a.chip || '—') + '</td></tr>' +
      '<tr><th>Stérilisé(e)</th><td>' + escapeHtml(a.sterilise || 'Non') + '</td></tr>' +
      '<tr><th>Poids actuel</th><td>' + (a.weight != null && a.weight !== '' ? uW(a.weight) : '—') + '</td></tr>' +
      '</tbody></table>';

    var vaccinesRows = (data.vaccines || []).slice().sort(byDateDesc).map(function (v) {
      return '<tr><td>' + fmtDate(v.date) + '</td><td>' + escapeHtml(v.name || '') + '</td><td>' + (v.next ? fmtDate(v.next) : '—') + '</td><td>' + escapeHtml(v.vet || '') + '</td></tr>';
    }).join('');
    var vaccinesTable = vaccinesRows ? '<table class="vet-view-table"><thead><tr><th>Date</th><th>Nom</th><th>Prochain rappel</th><th>Vétérinaire</th></tr></thead><tbody>' + vaccinesRows + '</tbody></table>' : '';

    var dewormingsRows = (data.dewormings || []).slice().sort(byDateDesc).map(function (d) {
      return '<tr><td>' + fmtDate(d.date) + '</td><td>' + escapeHtml(d.name || '') + '</td><td>' + escapeHtml(d.type || '') + '</td><td>' + (d.next ? fmtDate(d.next) : '—') + '</td></tr>';
    }).join('');
    var dewormingsTable = dewormingsRows ? '<table class="vet-view-table"><thead><tr><th>Date</th><th>Nom</th><th>Type</th><th>Prochain rappel</th></tr></thead><tbody>' + dewormingsRows + '</tbody></table>' : '';

    var consultationsRows = (data.consultations || []).slice().sort(byDateDesc).map(function (c) {
      return '<tr><td>' + fmtDate(c.date) + '</td><td>' + escapeHtml(c.vet || '') + '</td><td>' + escapeHtml(c.reason || '') + '</td><td>' + escapeHtml(c.diagnosis || '') + '</td><td>' + escapeHtml(c.treatment || '') + '</td></tr>';
    }).join('');
    var consultationsTable = consultationsRows ? '<table class="vet-view-table"><thead><tr><th>Date</th><th>Vétérinaire</th><th>Motif</th><th>Diagnostic</th><th>Traitement</th></tr></thead><tbody>' + consultationsRows + '</tbody></table>' : '';

    var activeMeds = (data.medications || []).filter(function (m) { return m.active !== false && (!m.endDate || m.endDate >= todayISO()); });
    var medsRows = activeMeds.map(function (m) {
      return '<tr><td>' + escapeHtml(m.name || '') + '</td><td>' + escapeHtml(m.dosage || '') + '</td><td>' + escapeHtml(m.frequency || '') + '</td><td>' + (m.endDate ? fmtDate(m.endDate) : '—') + '</td></tr>';
    }).join('');
    var medsTable = medsRows ? '<table class="vet-view-table"><thead><tr><th>Nom</th><th>Dosage</th><th>Fréquence</th><th>Fin de traitement</th></tr></thead><tbody>' + medsRows + '</tbody></table>' : '';

    var symptomNotes = (data.notes || []).filter(function (n) { return n.category === 'sante' && n.symptomType; })
      .slice().sort(byDateDesc).slice(0, 15);
    var symptomsRows = symptomNotes.map(function (n) {
      return '<tr><td>' + fmtDate(n.date) + '</td><td>' + escapeHtml(n.symptomType) + '</td><td>' + escapeHtml(n.severity || '') + '</td><td>' + escapeHtml(n.content || '') + '</td></tr>';
    }).join('');
    var symptomsTable = symptomsRows ? '<table class="vet-view-table"><thead><tr><th>Date</th><th>Symptôme</th><th>Sévérité</th><th>Notes</th></tr></thead><tbody>' + symptomsRows + '</tbody></table>' : '';

    var weightRows = (Array.isArray(a.weightHistory) ? a.weightHistory.slice() : []).sort(byDateDesc).slice(0, 10).map(function (w) {
      return '<tr><td>' + fmtDate(w.date) + '</td><td>' + uW(w.weight) + '</td></tr>';
    }).join('');
    var weightTable = weightRows ? '<table class="vet-view-table"><thead><tr><th>Date</th><th>Poids</th></tr></thead><tbody>' + weightRows + '</tbody></table>' : '';

    var heightRows = (Array.isArray(a.heightHistory) ? a.heightHistory.slice() : []).sort(byDateDesc).slice(0, 10).map(function (h) {
      return '<tr><td>' + fmtDate(h.date) + '</td><td>' + uH(h.height) + '</td></tr>';
    }).join('');
    var heightTable = heightRows ? '<table class="vet-view-table"><thead><tr><th>Date</th><th>Taille</th></tr></thead><tbody>' + heightRows + '</tbody></table>' : '';

    var ped = data.pedigree || {};
    var pedigreeTable = (ped.registry && ped.registry !== 'Non inscrit') ? (
      '<table class="vet-view-table"><tbody>' +
      '<tr><th>Registre</th><td>' + escapeHtml(ped.registry || '—') + '</td></tr>' +
      '<tr><th>Numéro d\'enregistrement</th><td>' + escapeHtml(ped.registryNumber || '—') + '</td></tr>' +
      '<tr><th>Numéro de puce</th><td>' + escapeHtml(ped.chipNumber || '—') + '</td></tr>' +
      '<tr><th>Père</th><td>' + escapeHtml((ped.sire && ped.sire.name) || '—') + '</td></tr>' +
      '<tr><th>Mère</th><td>' + escapeHtml((ped.dam && ped.dam.name) || '—') + '</td></tr>' +
      '</tbody></table>'
    ) : '';

    container.innerHTML =
      '<div class="vet-view-header"><h1>Carnet de santé — ' + escapeHtml(a.name || 'Animal') + '</h1>' +
      '<p>Document généré le ' + fmtDate(todayISO()) + ' via App\'lika</p></div>' +
      section('Identité', identityHtml) +
      section('Vaccins', vaccinesTable) +
      section('Vermifuges / antiparasitaires', dewormingsTable) +
      section('Consultations', consultationsTable) +
      section('Médicaments en cours', medsTable) +
      section('Symptômes récents', symptomsTable) +
      section('Historique de poids', weightTable) +
      section('Historique de taille', heightTable) +
      (pedigreeTable ? section('Pedigree', pedigreeTable) : '');

    container.hidden = false;
    document.body.classList.add('printing-vet-view');
    window.print();
    setTimeout(function () {
      container.hidden = true;
      document.body.classList.remove('printing-vet-view');
    }, 500);
  }

  function shareRecord() {
    var data = getCurrent();
    if (!data) return;
    var animalName = data.animal.name || 'Animal';

    if (navigator.share) {
      var summary = animalName + '\n' +
        'Espèce: ' + (data.animal.species || '—') + '\n' +
        'Race: ' + (data.animal.race || '—') + '\n' +
        'Vaccins: ' + data.vaccines.length + '\n' +
        'Déparasitages: ' + data.dewormings.length;
      navigator.share({
        title: 'Carnet de santé — ' + animalName,
        text: summary
      }).catch(function () {});
    } else {
      // Fallback: copy summary to clipboard
      var text = animalName + ' — ' + data.vaccines.length + ' vaccins, ' + data.dewormings.length + ' déparasitages';
      navigator.clipboard.writeText(text).then(function () {
        showToast('Résumé copié dans le presse-papiers', 'info');
      }).catch(function () {
        showToast('Partage non disponible', 'warning');
      });
    }
  }

  // ——— Dark mode ————————————————————————————————————————
  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = saved ? saved === 'dark' : prefersDark;
    applyTheme(dark);
  }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = dark ? '🌙' : '☀️';
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    redrawChartsForTheme();
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current !== 'dark');
  }

  // 'light' | 'dark' | 'auto' (suit le réglage du système, sans mémoriser de choix).
  function setTheme(mode) {
    if (mode === 'auto') {
      localStorage.removeItem(THEME_KEY);
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      var btn = document.getElementById('btn-theme-toggle');
      if (btn) btn.textContent = prefersDark ? '🌙' : '☀️';
      redrawChartsForTheme();
    } else {
      applyTheme(mode === 'dark');
    }
  }

  // ——— Ajout rapide ——————————————————————————————————
  // Un seul panneau (#quick-add) pour deux déclencheurs : le bouton flottant
  // « Ajouter » (desktop ≥ 1024 px) et le « + » central de la barre basse
  // (mobile/tablette). Le CSS choisit popover ou feuille du bas.
  var QUICK_ADD_TAB = { vaccin: 'vaccins', deworming: 'deworming', hygiene: 'hygiene', consult: 'consultations', weight: 'poids', meal: 'nutrition', activity: 'activites', note: 'suivi', photo: 'photos' };
  var QUICK_ADD_MODAL = { vaccin: 'addVaccin', deworming: 'addDeworming', hygiene: 'addHygiene', consult: 'addConsult', weight: 'addWeight', meal: 'addMeal', activity: 'addActivity', note: 'addNote' };

  function setupFAB() {
    var panel = document.getElementById('quick-add');
    var fabBtn = document.getElementById('fab-btn');
    var bottomAdd = document.getElementById('bottom-add');
    if (!panel || !fabBtn) return;
    var lastTrigger = null;

    panel.querySelectorAll('.qa__icon').forEach(function (span) { span.innerHTML = ico(span.dataset.ico, 22); });

    function isOpen() { return !panel.hidden; }
    function openPanel(trigger) {
      var data = getCurrent();
      if (!data || !state.animals.length) { openModal('addAnimal'); return; }
      lastTrigger = trigger;
      document.getElementById('qa-title').textContent = 'Ajouter au carnet de ' + (data.animal.name || 'votre compagnon');
      panel.hidden = false;
      fabBtn.setAttribute('aria-expanded', 'true');
      if (bottomAdd) bottomAdd.classList.add('is-open');
      var first = panel.querySelector('.qa__item');
      if (first) first.focus({ preventScroll: true });
    }
    function closePanel(restoreFocus) {
      if (!isOpen()) return;
      panel.hidden = true;
      fabBtn.setAttribute('aria-expanded', 'false');
      if (bottomAdd) bottomAdd.classList.remove('is-open');
      if (restoreFocus !== false && lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus({ preventScroll: true });
    }

    fabBtn.addEventListener('click', function () { if (isOpen()) closePanel(); else openPanel(fabBtn); });
    if (bottomAdd) bottomAdd.addEventListener('click', function () { if (isOpen()) closePanel(); else openPanel(bottomAdd); });
    panel.querySelectorAll('[data-qa-close]').forEach(function (el) { el.addEventListener('click', function () { closePanel(); }); });

    panel.querySelectorAll('.qa__item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-fab');
        closePanel(false);
        // Depuis l'accueil, l'agenda ou l'annuaire : ouvrir d'abord le carnet à la bonne rubrique,
        // sinon l'enregistrement se ferait sans que l'on voie où il atterrit.
        if (state.viewMode !== 'detail') showDetail({ tab: QUICK_ADD_TAB[action] || 'profil', nav: 'pets' });
        if (action === 'photo') triggerPhotoUpload();
        else if (QUICK_ADD_MODAL[action]) openModal(QUICK_ADD_MODAL[action]);
      });
    });

    // Échap ferme ; Tab reste dans le panneau (dialogue modal).
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.slice.call(panel.querySelectorAll('button:not([hidden])')).filter(function (b) { return b.offsetParent !== null; });
      if (!items.length) return;
      var firstEl = items[0], lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    });
  }

  // ——— Quick date buttons ————————————————————————————————
  function setupQuickDateButtons() {
    document.querySelectorAll('.quick-date-btns').forEach(function (container) {
      var targetId = container.getAttribute('data-target');
      var sourceId = container.getAttribute('data-source');
      container.querySelectorAll('.btn-quick-date').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var days = parseInt(btn.getAttribute('data-days'), 10);
          var sourceEl = document.getElementById(sourceId);
          var targetEl = document.getElementById(targetId);
          if (!targetEl) return;
          if (days === 0) {
            targetEl.value = todayISO();
          } else {
            var base = (sourceEl && sourceEl.value) || todayISO();
            targetEl.value = addDaysISO(base, days);
          }
        });
      });
    });
  }

  // ——— Sortable table headers ————————————————————————————
  function setupSortableHeaders() {
    document.querySelectorAll('.sortable-th').forEach(function (th) {
      th.addEventListener('click', function () {
        var section = th.closest('.section');
        if (!section) return;
        var key = th.getAttribute('data-sort-key');
        var sortSelect;
        if (section.id === 'section-vaccins') sortSelect = document.getElementById('vaccine-sort');
        if (section.id === 'section-deworming') sortSelect = document.getElementById('deworming-sort');
        if (!sortSelect) return;

        var current = sortSelect.value;
        if (key === 'date') {
          sortSelect.value = current === 'dateDesc' ? 'dateAsc' : 'dateDesc';
        } else if (key === 'next') {
          sortSelect.value = current === 'nextAsc' ? 'nextDesc' : 'nextAsc';
        }
        sortSelect.dispatchEvent(new Event('change'));
      });
    });
  }

  // ——— Swipe on table rows (mobile) ————————————————————
  function setupSwipe() {
    // Simplified touch swipe for mobile
    var startX = 0;
    var threshold = 60;

    document.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      var endX = e.changedTouches[0].clientX;
      var diff = startX - endX;
      if (Math.abs(diff) < threshold) return;
      var row = e.target.closest('tr');
      if (!row || !row.closest('tbody')) return;

      var actions = row.querySelector('.swipe-actions');
      if (!actions) {
        // Create swipe actions
        var editBtn = row.querySelector('.btn-edit');
        var deleteBtn = row.querySelector('.btn-delete');
        if (!editBtn && !deleteBtn) return;

        var swipeDiv = document.createElement('div');
        swipeDiv.className = 'swipe-actions';
        if (editBtn) {
          var sb = document.createElement('button');
          sb.className = 'swipe-btn swipe-btn-edit';
          sb.textContent = 'Modifier';
          sb.addEventListener('click', function () { editBtn.click(); swipeDiv.classList.remove('visible'); });
          swipeDiv.appendChild(sb);
        }
        if (deleteBtn) {
          var db = document.createElement('button');
          db.className = 'swipe-btn swipe-btn-delete';
          db.textContent = 'Supprimer';
          db.addEventListener('click', function () { deleteBtn.click(); swipeDiv.classList.remove('visible'); });
          swipeDiv.appendChild(db);
        }
        row.style.position = 'relative';
        row.style.overflow = 'hidden';
        row.appendChild(swipeDiv);
        actions = swipeDiv;
      }

      if (diff > threshold) {
        // Swipe left -> show
        actions.classList.add('visible');
      } else {
        // Swipe right -> hide
        actions.classList.remove('visible');
      }
    }, { passive: true });
  }

  // ——— Onboarding ————————————————————————————————————
  // Une seule étape : prénom + espèce. Date de naissance, photo, puce… se
  // complètent depuis le profil. Desktop (dialogue à deux colonnes) et mobile
  // (feuille du bas) partagent ce formulaire, seul le CSS les distingue.
  function showOnboarding() {
    var nameInput = document.getElementById('ob-name');
    nameInput.value = '';
    document.getElementById('ob-name-error').hidden = true;
    nameInput.removeAttribute('aria-invalid');
    openModal('onboarding');
    // Sur mobile, ne pas ouvrir le clavier d'office : il masquerait la moitié de la feuille.
    if (window.matchMedia('(min-width: 720px)').matches) setTimeout(function () { nameInput.focus(); }, 60);
    // Rejouable depuis Centre d'aide ("Revoir l'introduction") : les écouteurs
    // visent des éléments statiques du DOM, jamais recréés — sans ce garde-fou,
    // chaque replay les empilerait (double création d'animal au submit).
    if (uiState.onboardingBound) return;
    uiState.onboardingBound = true;

    document.querySelectorAll('.ob__chip-icon').forEach(function (span) { span.innerHTML = ico(span.dataset.ico, 20); });

    var chips = Array.prototype.slice.call(document.querySelectorAll('.ob__chip'));
    function selectSpecies(chip, focus) {
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-checked', on ? 'true' : 'false');
        c.tabIndex = on ? 0 : -1;
      });
      document.getElementById('ob-species').value = chip.dataset.species;
      if (focus) chip.focus();
    }
    chips.forEach(function (chip, i) {
      chip.tabIndex = chip.classList.contains('is-on') ? 0 : -1;
      chip.addEventListener('click', function () { selectSpecies(chip, false); });
      chip.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        selectSpecies(chips[(i + step + chips.length) % chips.length], true);
      });
    });

    document.getElementById('ob-name').addEventListener('input', function () {
      document.getElementById('ob-name-error').hidden = true;
      this.removeAttribute('aria-invalid');
    });

    document.getElementById('form-onboarding-animal').addEventListener('submit', function (e) {
      e.preventDefault();
      var nameInput = document.getElementById('ob-name');
      var name = nameInput.value.trim();
      if (!name) {
        document.getElementById('ob-name-error').hidden = false;
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        return;
      }

      var newAnimal = JSON.parse(JSON.stringify(DEFAULT_ANIMAL));
      newAnimal.id = state.nextId++;
      newAnimal.animal.name = name;
      newAnimal.animal.species = document.getElementById('ob-species').value || 'Canine';

      state.animals.push(newAnimal);
      state.currentAnimalId = newAnimal.id;
      saveState();

      // Le geste utilisateur du submit est requis pour la demande de permission.
      if (document.getElementById('ob-notif').checked && 'Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (err) { /* navigateur sans support */ }
      }
      finishOnboarding();
      showToast('Le carnet de ' + name + ' est créé', 'success');
    });

    document.getElementById('onboarding-skip').addEventListener('click', function () {
      finishOnboarding();
    });
  }

  function finishOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'done');
    closeModal('onboarding');
    showHome();
  }

  // ——— PWA ————————————————————————————————————————
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    // updateViaCache:'none' — le navigateur doit toujours revérifier
    // sw.js sur le réseau (jamais via son propre cache HTTP local), sinon
    // une nouvelle version peut mettre des heures à être détectée.
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(function (reg) {
      if (reg.installing) console.log('App\'lika: SW en cours d\'installation');
      else if (reg.waiting) console.log('App\'lika: SW en attente');
      else if (reg.active) console.log('App\'lika: SW actif');
    }).catch(function (err) { console.warn('App\'lika: SW non enregistré', err); });
  }

  // ——— Notifications push (Web Push) ——————————————————————————
  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function getPushSubscriptionState() {
    if (!pushSupported()) return Promise.resolve({ supported: false });
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        return { supported: true, permission: Notification.permission, subscription: sub };
      });
    });
  }

  function refreshPushSettingsUI() {
    var statusEl = document.getElementById('push-settings-status');
    var hintEl = document.getElementById('push-settings-hint');
    var toggleBtn = document.getElementById('btn-push-toggle');
    if (!statusEl || !toggleBtn) return;

    var cfg = window.__SUPABASE_CONFIG__;
    var cloudReady = window.cloudSync && window.cloudSync.isConfigured();

    if (!pushSupported()) {
      statusEl.textContent = 'Ton navigateur ne supporte pas les notifications push.';
      if (hintEl) {
        hintEl.hidden = false;
        hintEl.textContent = 'Sur iPhone/iPad : ajoute App\'lika à l\'écran d\'accueil (Safari → Partager → Sur l\'écran d\'accueil), les notifications ne fonctionnent que depuis l\'app installée, jamais depuis un onglet Safari classique.';
      }
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'Non disponible';
      return;
    }

    if (!cfg || !cfg.vapidPublicKey) {
      statusEl.textContent = 'Configuration push manquante (vapidPublicKey absente de config.js).';
      toggleBtn.disabled = true;
      return;
    }

    if (!cloudReady) {
      statusEl.textContent = 'Active d\'abord la synchronisation cloud (onglet Cloud & synchronisation) : les notifications push en ont besoin pour savoir à qui envoyer les rappels.';
      toggleBtn.disabled = true;
      toggleBtn.textContent = 'Activer les notifications push';
      return;
    }

    toggleBtn.disabled = false;
    window.cloudSync.getSession().then(function (session) {
      if (!session) {
        statusEl.textContent = 'Connecte-toi (onglet Cloud & synchronisation) pour activer les notifications push.';
        toggleBtn.disabled = true;
        toggleBtn.textContent = 'Activer les notifications push';
        return;
      }
      getPushSubscriptionState().then(function (state2) {
        if (state2.subscription) {
          statusEl.textContent = 'Notifications push activées sur cet appareil.';
          toggleBtn.textContent = 'Désactiver les notifications push';
        } else if (state2.permission === 'denied') {
          statusEl.textContent = 'Notifications bloquées pour App\'lika dans les réglages de ton navigateur.';
          toggleBtn.disabled = true;
          toggleBtn.textContent = 'Bloquées par le navigateur';
        } else {
          statusEl.textContent = 'Notifications push désactivées sur cet appareil.';
          toggleBtn.textContent = 'Activer les notifications push';
        }
      });
    });
  }

  function subscribeToPush() {
    return Notification.requestPermission().then(function (permission) {
      if (permission !== 'granted') throw new Error('Permission refusée.');
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(window.__SUPABASE_CONFIG__.vapidPublicKey)
      });
    }).then(function (sub) {
      return window.cloudSync.subscribeToPush(sub.toJSON());
    });
  }

  function unsubscribeFromPush() {
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      if (!sub) return true;
      var endpoint = sub.endpoint;
      return sub.unsubscribe().then(function () {
        return window.cloudSync.unsubscribeFromPush(endpoint);
      });
    });
  }

  function togglePushSubscription() {
    var toggleBtn = document.getElementById('btn-push-toggle');
    var statusEl = document.getElementById('push-settings-status');
    if (toggleBtn) toggleBtn.disabled = true;

    getPushSubscriptionState().then(function (state2) {
      var action = state2.subscription ? unsubscribeFromPush() : subscribeToPush();
      return action;
    }).then(function () {
      refreshPushSettingsUI();
      showToast('Préférences de notifications push mises à jour', 'success');
    }).catch(function (err) {
      if (statusEl) statusEl.textContent = 'Erreur : ' + err.message;
      if (toggleBtn) toggleBtn.disabled = false;
    });
  }

  // ——— Préférence globale (compte) : rappel des événements canins ———
  function refreshDogEventsToggleUI() {
    var btn = document.getElementById('btn-dog-events-toggle');
    if (!btn) return;
    var pref = localStorage.getItem(DOG_EVENTS_REMINDER_PREF_KEY);
    var isOn = pref !== 'false'; // activé par défaut tant que rien n'est enregistré
    btn.classList.toggle('on', isOn);
    btn.setAttribute('aria-pressed', isOn);

    if (window.cloudSync && window.cloudSync.isConfigured()) {
      window.cloudSync.getSession().then(function (session) {
        if (!session) return;
        return window.cloudSync.getDogEventsReminderPref().then(function (serverValue) {
          localStorage.setItem(DOG_EVENTS_REMINDER_PREF_KEY, String(serverValue));
          btn.classList.toggle('on', serverValue);
          btn.setAttribute('aria-pressed', serverValue);
        });
      }).catch(function () { /* repli sur la valeur locale déjà affichée */ });
    }
  }

  function toggleDogEventsReminder() {
    var btn = document.getElementById('btn-dog-events-toggle');
    if (!btn) return;
    setDogEventsReminder(!btn.classList.contains('on'));
  }

  function setDogEventsReminder(next) {
    var btn = document.getElementById('btn-dog-events-toggle');
    if (btn) {
      btn.classList.toggle('on', next);
      btn.setAttribute('aria-pressed', next);
    }
    localStorage.setItem(DOG_EVENTS_REMINDER_PREF_KEY, String(next));

    if (window.cloudSync && window.cloudSync.isConfigured()) {
      window.cloudSync.setDogEventsReminderPref(next).catch(function () {
        showToast('Préférence enregistrée localement uniquement (hors ligne ou non connecté)', 'warning');
      });
    }
  }

  // ——— Export / Import ——————————————————————————————————
  function downloadText(filename, text, mimeType) {
    var blob = new Blob([text], { type: mimeType || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2500);
  }

  async function exportBackupJson() {
    var exportState = { version: 2, nextId: state.nextId, currentAnimalId: state.currentAnimalId, owner: getOwner(), animals: [] };

    for (var wrap of state.animals) {
      var a = wrap?.animal;
      var photos = Array.isArray(wrap.photos) ? wrap.photos : [];
      var exportedPhotos = [];
      for (var p of photos) {
        var out = Object.assign({}, p);
        if (out && out.id != null) {
          try { out.src = await getPhotoDataUrl(out.id); } catch (err) { out.src = ''; }
        }
        exportedPhotos.push(out);
      }
      var avatar = a && typeof a.avatar === 'number' ? await getPhotoDataUrl(a.avatar).catch(function () { return ''; }) : a?.avatar;
      exportState.animals.push(Object.assign({}, wrap, { photos: exportedPhotos, animal: Object.assign({}, a, { avatar: avatar }) }));
    }

    // Include vet directory & community
    exportState.vetDirectory = loadVetDirectory();
    exportState.community = loadCommunity();

    downloadText('applika-backup.json', JSON.stringify(exportState), 'application/json');
    showToast('Sauvegarde téléchargée', 'success');
  }

  async function importBackupJson(file) {
    if (!file) return;
    var text = await file.text();
    var parsed = JSON.parse(text || '{}');
    if (!parsed || !Array.isArray(parsed.animals)) throw new Error('JSON invalide');

    state.animals = parsed.animals || [];
    state.nextId = parsed.nextId != null ? parsed.nextId : 20;
    state.currentAnimalId = parsed.currentAnimalId != null ? parsed.currentAnimalId : (state.animals[0]?.id ?? null);
    state.owner = Object.assign(
      { name: '', phone: '', email: '', clinic: '', address: '' },
      parsed.owner || (state.animals[0] && state.animals[0].owner) || {}
    );

    // Backward compat
    state.animals.forEach(function (a) {
      if (!a) return;
      if (!Array.isArray(a.consultations)) a.consultations = [];
      if (!Array.isArray(a.medications)) a.medications = [];
      if (!Array.isArray(a.notes)) a.notes = [];
      if (!Array.isArray(a.hygiene)) a.hygiene = [];
      if (!Array.isArray(a.heatCycles)) a.heatCycles = [];
      if (!Array.isArray(a.activities)) a.activities = [];
      if (!Array.isArray(a.matings)) a.matings = [];
      if (!a.nutrition) a.nutrition = { meals: [], dailyPlan: {} };
      if (!a.pedigree) a.pedigree = {};
      if (a.animal && !a.animal.themeColor) a.animal.themeColor = '';
      if (!a.notifications) a.notifications = {};
      if (a.notifications.hygieneReminder === undefined) a.notifications.hygieneReminder = true;
      if (a.notifications.medicationReminder === undefined) a.notifications.medicationReminder = true;
      if (a.notifications.matingReminder === undefined) a.notifications.matingReminder = true;
    });

    // Restore vet directory & community if present
    if (parsed.vetDirectory) {
      saveVetDirectory(parsed.vetDirectory);
    }
    if (parsed.community) {
      saveCommunity(parsed.community);
    }

    try { await clearPhotoStore(); } catch (e) { console.warn('App\'lika: clearPhotoStore échoué', e); }
    await migrateLegacyImagesToIndexedDB();
    saveState();
    closeModal('backup');
    showToast('Données importées', 'success');
    if (state.viewMode === 'home') showHome(); else showDetail();
    refreshAll();
  }

  // ——— ICS export ——————————————————————————————————————
  function escapeIcsText(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function formatIcsStampUTC() {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  function icsDateFromISO(isoDate) {
    if (!isoDate || typeof isoDate !== 'string') return '';
    var m = isoDate.split('-');
    if (m.length !== 3) return '';
    return m[0] + m[1] + m[2];
  }

  async function exportUpcomingRemindersIcs() {
    var wrap = getCurrent();
    if (!wrap) throw new Error('Aucun animal');

    var rangeDays = parseInt(document.getElementById('alerts-range')?.value || '60', 10);
    var today = new Date();
    var from = new Date(today); from.setDate(from.getDate() - 30);
    var to = new Date(today); to.setDate(to.getDate() + rangeDays);

    var events = [];
    (wrap.vaccines || []).forEach(function (v) {
      if (!v.next) return;
      var dt = isoToLocalDate(v.next);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-vaccine-' + v.id, summary: 'Vaccin : ' + (v.name || ''), desc: v.vet ? 'Vétérinaire : ' + v.vet : '', isoDate: v.next });
    });
    (wrap.dewormings || []).forEach(function (d) {
      if (!d.next) return;
      var dt = isoToLocalDate(d.next);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-deworm-' + d.id, summary: 'Déparasitage : ' + (d.name || ''), desc: 'Type : ' + (d.type || ''), isoDate: d.next });
    });

    (wrap.hygiene || []).forEach(function (h) {
      if (!h.next) return;
      var dt = isoToLocalDate(h.next);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-hygiene-' + h.id, summary: 'Hygiène : ' + (h.type || ''), desc: h.notes || '', isoDate: h.next });
    });

    (wrap.medications || []).forEach(function (m) {
      if (m.active === false || !m.endDate) return;
      var dt = isoToLocalDate(m.endDate);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-med-' + m.id, summary: 'Fin de traitement : ' + (m.name || ''), desc: m.dosage || '', isoDate: m.endDate });
    });

    (wrap.matings || []).forEach(function (m) {
      var due = matingNextDeadline(m);
      if (!due) return;
      var dt = isoToLocalDate(due.date);
      if (!dt || dt < from || dt > to) return;
      events.push({ uid: 'vetbook-mating-' + m.id + '-' + due.field, summary: due.label, desc: m.partnerName ? 'Partenaire : ' + m.partnerName : '', isoDate: due.date });
    });

    var dob = wrap?.animal?.dob;
    if (wrap?.notifications?.birthdayReminder && dob) {
      var dobParts = dob.split('-');
      if (dobParts.length === 3) {
        var month = parseInt(dobParts[1], 10);
        var day = parseInt(dobParts[2], 10);
        for (var y = from.getFullYear() - 1; y <= to.getFullYear() + 1; y++) {
          var dt = new Date(y, month - 1, day);
          if (dt < from || dt > to) continue;
          events.push({ uid: 'vetbook-birthday-' + y, summary: 'Anniversaire de ' + (wrap.animal.name || "l'animal"), desc: '', isoDate: y + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') });
        }
      }
    }

    DEFAULT_DOG_EVENTS.forEach(function (evt) {
      for (var ey = from.getFullYear() - 1; ey <= to.getFullYear() + 1; ey++) {
        var edt = new Date(ey, evt.month - 1, evt.day);
        if (edt < from || edt > to) continue;
        events.push({
          uid: 'vetbook-dogevent-' + evt.id + '-' + ey,
          summary: evt.title,
          desc: evt.description || '',
          isoDate: ey + '-' + String(evt.month).padStart(2, '0') + '-' + String(evt.day).padStart(2, '0')
        });
      }
    });

    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//App\'lika//FR', 'CALSCALE:GREGORIAN'];
    var stamp = formatIcsStampUTC();
    events.forEach(function (e) {
      var dt = icsDateFromISO(e.isoDate);
      if (!dt) return;
      lines.push('BEGIN:VEVENT', 'UID:' + e.uid, 'DTSTAMP:' + stamp, 'SUMMARY:' + escapeIcsText(e.summary));
      if (e.desc) lines.push('DESCRIPTION:' + escapeIcsText(e.desc));
      lines.push('DTSTART;VALUE=DATE:' + dt, 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    downloadText('applika-rappels.ics', lines.join('\r\n'), 'text/calendar');
    showToast('Calendrier exporté', 'success');
  }

  // ——— Init ————————————————————————————————————————————
  async function init() {
    initTheme();
    var hasData = loadState();
    // Préférence « animal affiché en premier » (profil > Affichage) : appliquée au lancement seulement.
    if (hasData && window.applikaPrefs) {
      var wantedPet = window.applikaPrefs.get().defaultPetLocalId;
      if (wantedPet != null && state.animals.some(function (a) { return a.id === Number(wantedPet); })) state.currentAnimalId = Number(wantedPet);
    }

    try {
      await openPhotoDb();
      await migrateLegacyImagesToIndexedDB();
    } catch (e) { console.warn('App\'lika: IndexedDB indisponible', e); }

    // Onboarding
    if (!hasData && !localStorage.getItem(ONBOARDING_KEY)) {
      // Prepare a complete, useful home view behind the onboarding modal.
      showHome();
      showOnboarding();
    } else {
      if (!hasData) {
        // No onboarding but no data either — create default empty
        var def = JSON.parse(JSON.stringify(DEFAULT_ANIMAL));
        def.id = state.nextId++;
        state.animals = [def];
        state.currentAnimalId = def.id;
        saveState();
      }
      restoreRoute();
    }

    registerSW();

    // Check browser notifications
    checkBrowserNotifications();

    // Préremplit le profil propriétaire depuis le compte cloud connecté
    // (nom/email Google ou lien magique) s'il est vide localement.
    if (window.cloudSync && window.cloudSync.isConfigured()) {
      window.cloudSync.getSession().then(fillOwnerFromCloudSession);
      window.cloudSync.onAuthChange(function (event, session) {
        if (event === 'SIGNED_IN') fillOwnerFromCloudSession(session);
      });
    }

    // Bindings
    document.getElementById('logo-home').addEventListener('click', function (e) { e.preventDefault(); showHome(); });
    var btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) btnThemeToggle.addEventListener('click', toggleTheme);

    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var name = t.getAttribute('data-tab');
        if (!name) return;
        switchTab(name);
      });
    });

    // Navigation clavier standard des groupes d'onglets.
    document.querySelectorAll('[role="tablist"]').forEach(function (tablist) {
      tablist.addEventListener('keydown', function (e) {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        var tabs = Array.from(tablist.querySelectorAll('[role="tab"]')).filter(function (item) {
          return !item.disabled && item.offsetParent !== null;
        });
        if (!tabs.length) return;
        var current = tabs.indexOf(document.activeElement);
        if (current < 0) current = Math.max(0, tabs.findIndex(function (item) { return item.getAttribute('aria-selected') === 'true'; }));
        var next = current;
        if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        else if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
        else next = (current - 1 + tabs.length) % tabs.length;
        e.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      });
    });

    var btnSante = document.getElementById('btn-primary-sante');
    if (btnSante) btnSante.addEventListener('click', function () { switchTab('vaccins'); });

    var btnMore = document.getElementById('btn-nav-more');
    if (btnMore) btnMore.addEventListener('click', function () {
      var subMore = document.getElementById('subnav-more');
      if (subMore && !subMore.hidden) {
        // Already open — go to nutrition if not on a more tab
        var onMore = TABS_MORE.some(function (t) {
          var sec = document.getElementById('section-' + t);
          return sec && !sec.hidden;
        });
        if (!onMore) switchTab('nutrition');
        return;
      }
      switchTab('nutrition');
    });

    document.getElementById('animal-select').addEventListener('change', onAnimalSelectChange);
    document.getElementById('btn-add-animal').addEventListener('click', function () { openModal('addAnimal'); });
    var btnBackup = document.getElementById('btn-backup');
    if (btnBackup) btnBackup.addEventListener('click', function () { openModal('backup'); });
    var btnUserNav = document.getElementById('btn-user-nav');
    if (btnUserNav) btnUserNav.addEventListener('click', function () { showUserProfile(); });
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
    document.getElementById('btn-avatar-upload').addEventListener('click', function () { document.getElementById('avatar-input').click(); });
    document.getElementById('avatar-input').addEventListener('change', handleAvatarUpload);

    // Profile — menu photo & actions
    var petMenuBtn = document.getElementById('pet-profile-menu-btn');
    var petMenuPop = document.getElementById('pet-profile-menu-pop');
    if (petMenuBtn && petMenuPop) {
      petMenuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        petMenuPop.hidden = !petMenuPop.hidden;
        petMenuBtn.setAttribute('aria-expanded', petMenuPop.hidden ? 'false' : 'true');
      });
      document.addEventListener('click', function () {
        petMenuPop.hidden = true;
        petMenuBtn.setAttribute('aria-expanded', 'false');
      });
      petMenuPop.addEventListener('click', function (e) { e.stopPropagation(); });
    }
    var petMenuPrint = document.getElementById('pet-menu-print');
    var petMenuVetView = document.getElementById('pet-menu-vet-view');
    var petMenuShare = document.getElementById('pet-menu-share');
    var petMenuDelete = document.getElementById('pet-menu-delete');
    if (petMenuPrint) petMenuPrint.addEventListener('click', function () { if (petMenuPop) petMenuPop.hidden = true; printAnimalRecord(); });
    if (petMenuVetView) petMenuVetView.addEventListener('click', function () { if (petMenuPop) petMenuPop.hidden = true; printVetView(); });
    if (petMenuShare) petMenuShare.addEventListener('click', function () { if (petMenuPop) petMenuPop.hidden = true; shareRecord(); });
    if (petMenuDelete) petMenuDelete.addEventListener('click', function () {
      if (petMenuPop) petMenuPop.hidden = true;
      var data = getCurrent();
      if (data) deleteAnimal(data.id);
    });

    var petEmerg = document.getElementById('pet-profile-emergency');
    if (petEmerg) petEmerg.addEventListener('click', function () {
      var phone = getOwner().phone ? String(getOwner().phone).replace(/\s/g, '') : '';
      if (phone) window.location.href = 'tel:' + phone;
      else showToast('Ajoutez un numéro dans le profil propriétaire.', 'error');
    });

    var petHealthAll = document.getElementById('pet-health-view-all');
    if (petHealthAll) petHealthAll.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail({ tab: 'vaccins', nav: 'medical' }); }
    });
    var petTasksAll = document.getElementById('pet-tasks-view-all');
    if (petTasksAll) petTasksAll.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail({ tab: 'calendrier', nav: 'calendar' }); }
    });

    var petTileMed = document.getElementById('pet-tile-medical');
    if (petTileMed) petTileMed.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail({ tab: 'vaccins', nav: 'medical' }); }
    });
    var petTileNut = document.getElementById('pet-tile-nutrition-go');
    if (petTileNut) petTileNut.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail({ tab: 'nutrition', nav: 'nutrition' }); }
    });

    var petChartW = document.getElementById('pet-chart-toggle-weight');
    var petChartH = document.getElementById('pet-chart-toggle-height');
    if (petChartW && petChartH) {
      petChartW.addEventListener('click', function () {
        uiState.petChartMode = 'weight';
        petChartW.classList.add('active');
        petChartH.classList.remove('active');
        petChartW.setAttribute('aria-selected', 'true');
        petChartH.setAttribute('aria-selected', 'false');
        renderProfile();
      });
      petChartH.addEventListener('click', function () {
        uiState.petChartMode = 'height';
        petChartH.classList.add('active');
        petChartW.classList.remove('active');
        petChartH.setAttribute('aria-selected', 'true');
        petChartW.setAttribute('aria-selected', 'false');
        renderProfile();
      });
    }

    document.querySelectorAll('.pet-task-filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.pet-task-filter').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        uiState.petTaskFilter = btn.getAttribute('data-pet-task-filter') || 'all';
        var data = getCurrent();
        if (data) renderPetProfileTasks(data);
      });
    });

    var petAddRem = document.getElementById('pet-profile-add-reminder');
    if (petAddRem) petAddRem.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail(); openModal('addVaccin'); }
    });

    var birthdayDismiss = document.getElementById('birthday-dismiss');
    if (birthdayDismiss) birthdayDismiss.addEventListener('click', function () {
      document.getElementById('birthday-banner').hidden = true;
    });

    // Forms
    document.getElementById('form-edit-animal').addEventListener('submit', function (e) { e.preventDefault(); saveAnimal(); });
    document.getElementById('form-edit-owner').addEventListener('submit', function (e) { e.preventDefault(); saveOwner(); });

    var formEditVaccin = document.getElementById('form-edit-vaccin');
    if (formEditVaccin) formEditVaccin.addEventListener('submit', function (e) { e.preventDefault(); updateVaccineEntry(); });
    var formEditDeworming = document.getElementById('form-edit-deworming');
    if (formEditDeworming) formEditDeworming.addEventListener('submit', function (e) { e.preventDefault(); updateDewormingEntry(); });
    var formEditWeight = document.getElementById('form-edit-weight');
    if (formEditWeight) formEditWeight.addEventListener('submit', function (e) { e.preventDefault(); updateWeightEntry(); });
    var formEditHeight = document.getElementById('form-edit-height');
    if (formEditHeight) formEditHeight.addEventListener('submit', function (e) { e.preventDefault(); updateHeightEntry(); });

    document.getElementById('form-add-vaccin').addEventListener('submit', function (e) { e.preventDefault(); addVaccine(); });
    document.getElementById('form-add-deworming').addEventListener('submit', function (e) { e.preventDefault(); addDeworming(); });
    document.getElementById('form-add-animal').addEventListener('submit', function (e) { e.preventDefault(); addAnimal(); });

    var formAddWeight = document.getElementById('form-add-weight');
    if (formAddWeight) formAddWeight.addEventListener('submit', function (e) { e.preventDefault(); addWeightEntry(); });
    var formAddHeight = document.getElementById('form-add-height');
    if (formAddHeight) formAddHeight.addEventListener('submit', function (e) { e.preventDefault(); addHeightEntry(); });

    document.getElementById('form-add-consult').addEventListener('submit', function (e) { e.preventDefault(); addConsultation(); });
    document.getElementById('form-edit-consult').addEventListener('submit', function (e) { e.preventDefault(); updateConsultation(); });
    document.getElementById('form-add-medication').addEventListener('submit', function (e) { e.preventDefault(); addMedication(); });
    document.getElementById('form-edit-medication').addEventListener('submit', function (e) { e.preventDefault(); updateMedication(); });
    document.getElementById('form-add-note').addEventListener('submit', function (e) { e.preventDefault(); addNote(); });
    document.getElementById('form-edit-note').addEventListener('submit', function (e) { e.preventDefault(); updateNote(); });
    setupSymptomFields();

    var eaSpecies = document.getElementById('ea-species');
    if (eaSpecies) eaSpecies.addEventListener('change', function () { populateBreedSuggestions(eaSpecies.value); });
    var aaSpecies = document.getElementById('aa-species');
    if (aaSpecies) aaSpecies.addEventListener('change', function () { populateBreedSuggestions(aaSpecies.value); });
    document.getElementById('form-edit-caption').addEventListener('submit', function (e) { e.preventDefault(); saveCaption(); });

    // New feature forms
    document.getElementById('form-add-hygiene').addEventListener('submit', function (e) { e.preventDefault(); addHygiene(); });
    document.getElementById('form-edit-hygiene').addEventListener('submit', function (e) { e.preventDefault(); updateHygieneEntry(); });
    document.getElementById('form-add-heat-cycle').addEventListener('submit', function (e) { e.preventDefault(); addHeatCycle(); });
    document.getElementById('form-edit-heat-cycle').addEventListener('submit', function (e) { e.preventDefault(); updateHeatCycleEntry(); });
    document.getElementById('form-add-mating').addEventListener('submit', function (e) { e.preventDefault(); addMating(); });
    document.getElementById('form-edit-mating').addEventListener('submit', function (e) { e.preventDefault(); updateMatingEntry(); });
    document.getElementById('form-add-activity').addEventListener('submit', function (e) { e.preventDefault(); addActivity(); });
    document.getElementById('form-edit-activity').addEventListener('submit', function (e) { e.preventDefault(); updateActivityEntry(); });
    document.getElementById('form-add-meal').addEventListener('submit', function (e) { e.preventDefault(); addMeal(); });
    document.getElementById('form-edit-meal').addEventListener('submit', function (e) { e.preventDefault(); updateMealEntry(); });
    document.getElementById('form-edit-nutrition-plan').addEventListener('submit', function (e) { e.preventDefault(); saveNutritionPlan(); });
    document.getElementById('form-edit-pedigree').addEventListener('submit', function (e) { e.preventDefault(); savePedigree(); });
    document.getElementById('form-add-vet-contact').addEventListener('submit', function (e) { e.preventDefault(); addVetContact(); });
    document.getElementById('form-edit-vet-contact').addEventListener('submit', function (e) { e.preventDefault(); updateVetContact(); });
    document.getElementById('form-add-tip').addEventListener('submit', function (e) { e.preventDefault(); addCommunityTip(); });

    // Filters & sorts
    ['vaccine-search', 'vaccine-status-filter', 'vaccine-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { renderVaccines(); });
      el.addEventListener('change', function () { renderVaccines(); });
    });

    ['deworming-search', 'deworming-status-filter', 'deworming-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { renderDewormings(); });
      el.addEventListener('change', function () { renderDewormings(); });
    });

    ['hygiene-search', 'hygiene-status-filter', 'hygiene-sort'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { renderHygiene(); });
      el.addEventListener('change', function () { renderHygiene(); });
    });

    var vetSearch = document.getElementById('vet-search');
    if (vetSearch) vetSearch.addEventListener('input', function () { renderVetDirectory(); });

    var consultSearch = document.getElementById('consult-search');
    if (consultSearch) {
      consultSearch.addEventListener('input', function () { renderConsultations(); });
    }

    var medicationSearch = document.getElementById('medication-search');
    if (medicationSearch) {
      medicationSearch.addEventListener('input', function () { renderMedications(); });
    }

    var journalFilter = document.getElementById('journal-cat-filter');
    if (journalFilter) journalFilter.addEventListener('change', renderJournal);

    var alertsRange = document.getElementById('alerts-range');
    if (alertsRange) alertsRange.addEventListener('change', renderAlerts);

    // Reminder category pills
    document.querySelectorAll('.reminder-cat').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.reminder-cat').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var cont = document.getElementById('upcoming-alerts');
        if (cont) cont.setAttribute('data-cat-filter', btn.getAttribute('data-cat'));
        renderAlerts();
      });
    });

    // Reminder period pills
    document.querySelectorAll('.reminder-period').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.reminder-period').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var sel = document.getElementById('alerts-range');
        if (sel) { sel.value = btn.getAttribute('data-range'); }
        renderAlerts();
      });
    });

    var frSearch = document.getElementById('fr-search');
    if (frSearch) frSearch.addEventListener('input', function () { uiState.friseQuery = frSearch.value; uiState.friseLimit = FRISE_PAGE; renderHistory(); });

    // Calendar nav
    var calPrev = document.getElementById('cal-prev');
    var calNext = document.getElementById('cal-next');
    if (calPrev) calPrev.addEventListener('click', function () {
      uiState.calendarMonth--;
      if (uiState.calendarMonth < 0) { uiState.calendarMonth = 11; uiState.calendarYear--; }
      renderCalendar();
    });
    if (calNext) calNext.addEventListener('click', function () {
      uiState.calendarMonth++;
      if (uiState.calendarMonth > 11) { uiState.calendarMonth = 0; uiState.calendarYear++; }
      renderCalendar();
    });

    var btnExportIcs = document.getElementById('btn-export-ics');
    if (btnExportIcs) btnExportIcs.addEventListener('click', function () {
      exportUpcomingRemindersIcs().catch(function (err) {
        console.warn('App\'lika: export ICS échoué', err);
        showToast('Erreur export calendrier.', 'error');
      });
    });

    var btnMonthlySummary = document.getElementById('btn-monthly-summary');
    if (btnMonthlySummary) btnMonthlySummary.addEventListener('click', function () { openModal('monthlySummary'); });

    var btnDogEventsToggle = document.getElementById('btn-dog-events-toggle');
    if (btnDogEventsToggle) btnDogEventsToggle.addEventListener('click', toggleDogEventsReminder);

    var btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) btnExportJson.addEventListener('click', function () {
      exportBackupJson().catch(function (err) {
        console.warn('App\'lika: export JSON échoué', err);
        showToast('Erreur export JSON.', 'error');
      });
    });

    var pickBackupFileBtn = document.getElementById('btn-pick-backup-file');
    var backupImportFile = document.getElementById('backup-import-file');
    var backupFileName = document.getElementById('backup-file-name');
    var btnImportReplace = document.getElementById('btn-import-replace');

    if (pickBackupFileBtn && backupImportFile) {
      pickBackupFileBtn.addEventListener('click', function () { backupImportFile.click(); });
      backupImportFile.addEventListener('change', function () {
        if (backupFileName) backupFileName.textContent = (backupImportFile.files && backupImportFile.files[0]) ? backupImportFile.files[0].name : 'Aucun fichier sélectionné';
      });
    }

    if (btnImportReplace && backupImportFile) {
      btnImportReplace.addEventListener('click', function () {
        var file = backupImportFile.files && backupImportFile.files[0] ? backupImportFile.files[0] : null;
        if (!file) { showToast('Choisis un fichier JSON.', 'warning'); return; }
        importBackupJson(file).catch(function (err) {
          console.warn('App\'lika: import JSON échoué', err);
          showToast("Erreur d'importation.", 'error');
        });
      });
    }

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(this.getAttribute('data-close')); });
    });

    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) {
          this.classList.remove('open');
          this.setAttribute('aria-hidden', 'true');
        }
      });
    });

    document.getElementById('lightbox').addEventListener('click', function (e) { if (e.target === this) closeLightbox(); });
    document.getElementById('lightbox-close').addEventListener('click', function (e) { e.stopPropagation(); closeLightbox(); });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var lb = document.getElementById('lightbox');
      if (lb && lb.classList.contains('open')) { closeLightbox(); return; }
      var nmo = document.getElementById('subnav-more');
      if (nmo && !nmo.hidden && window.matchMedia('(max-width: 1023px)').matches) {
        closeNavMore();
        return;
      }
      var openOverlay = document.querySelector('.modal-overlay.open');
      if (!openOverlay) return;
      var id = openOverlay.getAttribute('id') || '';
      if (!id.startsWith('modal-')) return;
      closeModal(id.slice('modal-'.length));
    });

    // Community buttons
    document.getElementById('btn-show-events').addEventListener('click', function () { showCommunity('events'); });
    document.getElementById('btn-show-tips').addEventListener('click', function () { showCommunity('tips'); });
    document.getElementById('btn-community-back').addEventListener('click', function () { showHome(); });
    document.getElementById('btn-add-tip').addEventListener('click', function () { openModal('addTip'); });
    document.getElementById('tips-category-filter').addEventListener('change', function () { renderCommunityTips(); });

    // Geolocation
    document.getElementById('btn-geolocate-vets').addEventListener('click', function () { geolocateUser(); });
    document.getElementById('btn-geocode-vc').addEventListener('click', function () { fillCurrentPosition('vc-lat', 'vc-lng'); });
    document.getElementById('btn-geocode-evc').addEventListener('click', function () { fillCurrentPosition('evc-lat', 'evc-lng'); });

    // LOF/LOMAD verify
    document.getElementById('btn-verify-lof').addEventListener('click', function () { simulateVerification(); });
    document.getElementById('ped-registry').addEventListener('change', function () { toggleLofVerifyControls(); });

    document.getElementById('aa-photo').addEventListener('change', function () { document.getElementById('aa-photo-label').textContent = this.files[0] ? this.files[0].name : 'Choisir une photo JPG ou PNG'; });
    document.getElementById('tips-search').addEventListener('input', renderCommunityTips);
    document.getElementById('events-search').addEventListener('input', renderCommunityEvents);
    document.addEventListener('click', function (e) {
      var action = e.target.closest('[data-stitch-action]');
      if (!action) return;
      var key = action.dataset.stitchAction;
      if (key === 'upload-photo') triggerPhotoUpload();
      else if (key === 'export-json') exportBackupJson().catch(function () { showToast('Export impossible.', 'error'); });
      else if (key === 'export-ics') exportUpcomingRemindersIcs().catch(function () { showToast('Export impossible.', 'error'); });
      else if (key === 'download-qr') {
        var link = document.createElement('a'); link.download = 'applika-identite.png'; link.href = document.getElementById('qr-canvas').toDataURL('image/png'); link.click();
      } else openModal(key);
    });
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-care-route]');
      if (!btn) return;
      var route = btn.dataset.careRoute;
      if (route === 'home') showHome();
      else if (route === 'calendar') showAgenda();
      else if (route === 'directory') showDirectory();
      else if (route === 'help') { showHelp(); markCareRoute(route); }
      else if (route === 'account') { showUserProfile(); markCareRoute(route); }
      else if (route === 'events' || route === 'tips') { showCommunity(route); markCareRoute(route); }
      else if (!state.animals.length || route === 'addAnimal') openModal('addAnimal');
      else if (route.indexOf('add') === 0) { showDetail({tab: route === 'addWeight' ? 'poids' : route === 'addMeal' ? 'nutrition' : 'vaccins', nav:'pets'}); openModal(route); }
      else showDetail({tab:route, nav:'pets'});
    });

    // ——— Bottom + Top Navigation ———————————————————————————
    function handleGlobalNav(nav) {
      if (nav === 'home') showHome();
      else if (nav === 'account') showUserProfile();
      else if (nav === 'pets') {
        if (state.animals.length > 0) showDetail({ tab: 'profil', nav: 'pets' });
        else openModal('addAnimal');
      } else if (nav === 'calendar') {
        showAgenda();
      } else if (nav === 'directory') {
        showDirectory();
      }
    }
    document.querySelectorAll('.bottom-nav__item, .top-nav__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleGlobalNav(btn.getAttribute('data-nav'));
      });
    });

    var railSearch = document.getElementById('animal-rail-search');
    if (railSearch) {
      railSearch.addEventListener('input', function () { renderAnimalRail(railSearch.value); });
      document.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          var rail = document.getElementById('animal-rail');
          if (rail && getComputedStyle(rail).display !== 'none') {
            e.preventDefault();
            railSearch.focus();
          }
        }
      });
    }
    var railAdd = document.getElementById('animal-rail-add');
    if (railAdd) railAdd.addEventListener('click', function () { openModal('addAnimal'); });

    var dossierUrgence = document.getElementById('dossier-urgence');
    if (dossierUrgence) dossierUrgence.addEventListener('click', function () { showDirectory(); });
    var dossierActe = document.getElementById('dossier-add-acte');
    if (dossierActe) dossierActe.addEventListener('click', function () {
      var trigger = [document.getElementById('fab-btn'), document.getElementById('bottom-add')].filter(function (b) { return b && b.offsetParent; })[0];
      if (trigger) trigger.click();
      else { switchTab('actes'); openModal('addVaccin'); }
    });
    var actesAdd = document.getElementById('actes-add');
    if (actesAdd) actesAdd.addEventListener('click', function () { openModal('addVaccin'); });

    // ——— Home Action Pills (legacy, may be hidden) ——————————
    var pillComplete = document.getElementById('pill-complete-profile');
    if (pillComplete) pillComplete.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail(); openModal('editAnimal'); }
    });

    var pillEmergency = document.getElementById('pill-emergency');
    if (pillEmergency) pillEmergency.addEventListener('click', function () {
      showDirectory();
    });

    var pillReminder = document.getElementById('pill-add-reminder');
    if (pillReminder) pillReminder.addEventListener('click', function () {
      showAgenda();
    });

    var pillCalorie = document.getElementById('pill-calorie');
    if (pillCalorie) pillCalorie.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail({ tab: 'nutrition', nav: 'pets' }); }
    });

    // ——— Home Reminders Tabs ————————————————————————————
    document.querySelectorAll('.home-reminders__tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.home-reminders__tab').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');
        renderHomeReminders(tab.getAttribute('data-filter'));
      });
    });

    var btnSeeAllReminders = document.getElementById('btn-see-all-reminders');
    if (btnSeeAllReminders) btnSeeAllReminders.addEventListener('click', function () {
      if (state.animals.length > 0) { showDetail(); switchTab('alertes'); }
    });

    // ——— User Profile ——————————————————————————————————
    var btnUserBackup = document.getElementById('btn-user-backup');
    if (btnUserBackup) btnUserBackup.addEventListener('click', function () { openModal('backup'); });

    var btnUserNotifications = document.getElementById('btn-user-notifications');
    if (btnUserNotifications) btnUserNotifications.addEventListener('click', function () { openModal('pushSettings'); });

    var btnPushToggle = document.getElementById('btn-push-toggle');
    if (btnPushToggle) btnPushToggle.addEventListener('click', togglePushSubscription);

    var btnUserEditProfile = document.getElementById('btn-user-edit-profile');
    if (btnUserEditProfile) btnUserEditProfile.addEventListener('click', function () {
      // Profil propriétaire global au compte (voir getOwner()) : reste sur
      // "Mon compte", la modale s'ouvre par-dessus, aucun animal requis.
      openModal('editOwner');
    });

    var btnUserFavorites = document.getElementById('btn-user-favorites');
    if (btnUserFavorites) btnUserFavorites.addEventListener('click', function () { showFavorites(); });

    var btnFavoritesBack = document.getElementById('btn-favorites-back');
    if (btnFavoritesBack) btnFavoritesBack.addEventListener('click', function () { showUserProfile(); });

    var btnUserLanguage = document.getElementById('btn-user-language');
    if (btnUserLanguage) btnUserLanguage.addEventListener('click', function () { openModal('language'); });

    var btnUserHelp = document.getElementById('btn-user-help');
    if (btnUserHelp) btnUserHelp.addEventListener('click', function () { showHelp(); });

    var btnHelpBack = document.getElementById('btn-help-back');
    if (btnHelpBack) btnHelpBack.addEventListener('click', function () { showUserProfile(); });

    var btnHelpOnboarding = document.getElementById('btn-help-onboarding');
    if (btnHelpOnboarding) btnHelpOnboarding.addEventListener('click', function () { showOnboarding(); });

    // Tips & Vets see-all buttons
    var btnSeeAllVets = document.getElementById('btn-see-all-vets');
    if (btnSeeAllVets) btnSeeAllVets.addEventListener('click', function () {
      showDirectory();
    });

    var btnSeeAllTips = document.getElementById('btn-see-all-tips');
    if (btnSeeAllTips) btnSeeAllTips.addEventListener('click', function () { showCommunity('tips'); });

    // Setup features
    setupFAB();
    setupSnoozePicker();
    setupQuickDateButtons();
    setupSortableHeaders();
    setupSwipe();
  }

  // ——— Compte & paramètres ———————————————————————————————————
  // Le contenu de la page (profil, sécurité, notifications, affichage, partage, données) est rendu par account.js.
  function showUserProfile() {
    state.viewMode = 'profile';
    setBottomNavActive('account');
    hideAppViews();
    var viewProfile = document.getElementById('view-user-profile');

    if (viewProfile) {
      viewProfile.hidden = false;
      viewProfile.classList.remove('view-enter');
      void viewProfile.offsetWidth;
      viewProfile.classList.add('view-enter');
    }
    document.getElementById('animal-select').hidden = true;
    document.getElementById('fab-container').hidden = true;
    if (window.applikaAccount) window.applikaAccount.show();
    saveRoute({ view: 'profile' });
  }

  function showFavorites() {
    hideAppViews();
    var viewFavorites = document.getElementById('view-favorites');
    if (viewFavorites) {
      viewFavorites.hidden = false;
      viewFavorites.classList.remove('view-enter');
      void viewFavorites.offsetWidth;
      viewFavorites.classList.add('view-enter');
    }
    document.getElementById('animal-select').hidden = true;
    document.getElementById('fab-container').hidden = true;
    renderFavorites();
    saveRoute({ view: 'favorites' });
  }

  function showHelp() {
    setBottomNavActive('help');
    markCareRoute('help');
    hideAppViews();
    var viewHelp = document.getElementById('view-help');
    if (viewHelp) {
      viewHelp.hidden = false;
      viewHelp.classList.remove('view-enter');
      void viewHelp.offsetWidth;
      viewHelp.classList.add('view-enter');
    }
    document.getElementById('animal-select').hidden = true;
    document.getElementById('fab-container').hidden = true;
    saveRoute({ view: 'help' });
  }

  window.app = {
    openModal: openModal,
    closeModal: closeModal,
    switchTab: switchTab,
    showCommunity: showCommunity,
    showUserProfile: showUserProfile,
    showAgenda: showAgenda,
    showDirectory: showDirectory,
    // keep legacy helpers referenced for tooling / future screens
    _buildHealthRing: buildHealthRing,
    _renderHomeVetsAndTips: renderHomeVetsAndTips,
    // Contexte pour account.js (page « Compte & paramètres »).
    _ctx: {
      getState: function () { return state; },
      getOwner: getOwner,
      saveState: saveState,
      showToast: showToast,
      openModal: openModal,
      showUserProfile: showUserProfile,
      showHelp: showHelp,
      showOnboarding: showOnboarding,
      setTheme: setTheme,
      toggleDogEvents: setDogEventsReminder,
      exportJson: function () { exportBackupJson().catch(function () { showToast('Erreur lors de l’export des données.', 'error'); }); },
      exportIcs: function () { exportUpcomingRemindersIcs().catch(function () { showToast('Erreur lors de l’export du calendrier.', 'error'); }); },
      openPet: function (id) { state.currentAnimalId = id; saveState(); showDetail({ tab: 'profil', nav: 'pets' }); },
      refreshAll: function () { if (state.viewMode === 'home') renderHome(); else if (state.animals.length) refreshAll(); }
    }
  };
  // Les préférences d'affichage changent le rendu : on redessine la vue courante.
  document.addEventListener('applika:prefs', function () {
    if (state.viewMode === 'home') renderHome();
    else if (state.viewMode === 'agenda') renderAgenda();
    else if (state.viewMode === 'detail' && state.animals.length) refreshAll();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init().catch(console.error); });
  } else {
    init().catch(console.error);
  }
})();
