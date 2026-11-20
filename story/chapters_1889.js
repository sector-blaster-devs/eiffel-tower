/**
 * Curated Archival Photo Stories (1887–1889) (`story/chapters_1889.js`)
 *
 * Grounded strictly in `data/catalog/photo_cameras_3d.json`.
 * Zero technical metadata, filenames, coordinates, or raw numeric step strings
 * are ever exposed in user-facing editorial labels or prose.
 */

import { CURATION_ENTRIES_EN } from './chapters_1889_en.js';

export const DEFAULT_LANGUAGE = 'en';

export function normalizeLanguage(lang) {
  if (typeof lang === 'string' && lang.trim().toLowerCase().startsWith('fr')) {
    return 'fr';
  }
  return 'en';
}

export const PHOTO_CHRONOLOGICAL_IDS = Object.freeze([
  '55',
  '13',
  '09',
  '51',
  '23',
  '14',
  '01',
  '46',
  '18',
  '36',
  '38',
]);

export const CHAMP_DE_MARS_TIMELAPSE_IDS = [
  '23',
  '14',
  '01',
  '46',
  '18',
];

const CURATION_ENTRIES_FR = [
  {
    photoId: '55',
    chronologicalIndex: 0,
    dateLabel: '1884–1889',
    title: 'La conception de la Tour de 300 mètres',
    vantageLabel: 'Planche d’élévation au millième de Gustave Eiffel',
    caption:
      "Conçu en 1884 par les ingénieurs Maurice Koechlin et Émile Nouguier puis précisé avec l’architecte Stephen Sauvestre, ce plan d’élévation au millième de Gustave Eiffel fixe la structure en fer riveté sur une base de 125 mètres, avec trois étages à 58, 116 et 276 mètres jusqu’à la lanterne de 300 mètres et au mât de 312 mètres.",
  },
  {
    photoId: '13',
    chronologicalIndex: 1,
    dateLabel: '21 Avril 1887',
    title: 'Les Caissons à Air Comprimé du Bord de Seine',
    vantageLabel: 'Fouille de la pile Ouest vers le Trocadéro',
    caption:
      "Photographiée le 21 avril 1887 lors d'une visite de la Société centrale des architectes, deux cheminées cylindriques à écluses alimentent les caissons de tôle de la pile Ouest.",
  },
  {
    photoId: '09',
    chronologicalIndex: 2,
    dateLabel: '18 Juillet 1887',
    title: "Les Sabots de Fonte et l'Élan d'un Pilier",
    vantageLabel: 'Pied de la pile Ouest au Champ-de-Mars',
    caption:
      "Appuyés par des contre-sabots d'acier moulé dans des sabots de fonte boulonnés sur les sommiers inclinés de pierre, les quatre premiers caissons d'angle portent la marque des ateliers de Levallois-Perret autour du mât-grue central.",
  },
  {
    photoId: '51',
    chronologicalIndex: 3,
    dateLabel: '14 Janvier 1888',
    title: 'Grandes Charpentes de Bois au Premier Étage',
    vantageLabel: 'Niveau du premier étage vers les charpentes centrales',
    caption:
      "Prise le 14 janvier 1888 pour la planche 5 de la monographie d'Eiffel, cette vue d'ensemble dévoile les grandes charpentes centrales boulonnées de quarante-huit mètres et les boîtes à sable réglant les poutres intérieures.",
  },
  {
    photoId: '23',
    chronologicalIndex: 4,
    dateLabel: '26 Mars 1888',
    title: 'Jonction des Poutres du Premier Étage sur les Quatre Piles',
    vantageLabel: 'Axe du Champ-de-Mars vers le Palais du Trocadéro',
    caption:
      "Premier jalon de la grande séquence axiale du Champ-de-Mars le 26 mars 1888 : les poutres horizontales à cinquante-huit mètres réunissent les quatre piles inclinées sur douze pylônes de bois et quatre charpentes centrales.",
  },
  {
    photoId: '14',
    chronologicalIndex: 5,
    dateLabel: '15 Mai 1888',
    title: 'Montée des Piles du Deuxième Étage et Grues Grimpantes',
    vantageLabel: 'Axe du Champ-de-Mars vers le Nord-Ouest',
    caption:
      "Le 15 mai 1888, quatre grues pivotantes hissent les montants jusqu'à quatre-vingt-neuf mètres vers le deuxième étage, tandis que les charpentes centrales attendent le levage des quatre arcs décoratifs sous le premier niveau.",
  },
  {
    photoId: '01',
    chronologicalIndex: 6,
    dateLabel: '21 Août 1888',
    title: 'Achèvement du Deuxième Étage et des Grands Arcs',
    vantageLabel: 'Esplanade du Champ-de-Mars vers le Trocadéro',
    caption:
      "Photographiée le 21 août 1888 pour la planche 8 de la monographie d'Eiffel : les charpentes au sol sont déposées, les quatre arcs de soixante-quatorze mètres encadrent le Trocadéro et le premier panneau supérieur surmonte le deuxième étage à cent vingt-sept mètres.",
  },
  {
    photoId: '46',
    chronologicalIndex: 7,
    dateLabel: '23 Novembre 1888',
    title: 'Le Fût au-dessus de l’Étage Intermédiaire',
    vantageLabel: 'Jardins d’automne du Champ-de-Mars',
    caption:
      "Le 23 novembre 1888, la colonne supérieure s'élève au-delà du plancher intermédiaire de cent quatre-vingt-seize mètres jusqu'à deux cent seize mètres sous ses grues grimpantes, tandis que les trois arcades centrales de la galerie du premier étage sont dressées.",
  },
  {
    photoId: '18',
    chronologicalIndex: 8,
    dateLabel: 'Mai 1889',
    title: 'La Tour Achevée et le Drapeau du Centenaire',
    vantageLabel: 'Grand axe du Champ-de-Mars devant la fontaine Coutan',
    caption:
      "Achevée le 31 mars et photographiée lors de l'Exposition universelle de 1889 : galerie vitrée à neuf arcades du premier étage, pavillons des quatre restaurants, frise dorée des savants, campanile ajouré, phare électrique et pavillon tricolore au sommet.",
  },
  {
    photoId: '36',
    chronologicalIndex: 9,
    dateLabel: 'Été 1889',
    title: 'Sous la Grande Arche vers le Dôme Central',
    vantageLabel: 'Parvis Nord-Ouest vers le Sud-Est à travers le Champ-de-Mars',
    caption:
      "En regardant vers le sud-est sous l'arche côté Seine vers le bassin circulaire de Saint-Vidal, la fontaine de Coutan et le Dôme central de Joseph Bouvard, les globes opalescents soulignent l'intrados de soixante-quatorze mètres sous la corniche portant les noms des soixante-douze savants.",
  },
  {
    photoId: '38',
    chronologicalIndex: 10,
    dateLabel: 'Été 1889',
    title: 'Le Bassin de Saint-Vidal et les Socles de Pierre',
    vantageLabel: 'Jardins sous la Tour vers les piles Sud et Est',
    caption:
      "Entre les socles en pierre de Château-Landon et les kiosques d'entrée desservant les escaliers et les ascenseurs hydrauliques inclinés, les visiteurs entourent le bassin sculpté par Francis de Saint-Vidal sous l'arche sud-est.",
  },
];

function normalizeCurationPhotoId(raw) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim().replace(/^#/, '');
  if (!s) return '';
  return /^\d$/.test(s) ? s.padStart(2, '0') : s;
}

const _curationMapEn = new Map(CURATION_ENTRIES_EN.map((entry) => [entry.photoId, entry]));
const _curationMapFr = new Map(CURATION_ENTRIES_FR.map((entry) => [entry.photoId, entry]));

export function getPhotoCuration(photoId, lang = DEFAULT_LANGUAGE) {
  const pid = normalizeCurationPhotoId(photoId);
  if (!pid) return null;
  const map = normalizeLanguage(lang) === 'fr' ? _curationMapFr : _curationMapEn;
  return map.get(pid) || null;
}

export const PHOTO_CURATION_1889 = {};
for (const entry of CURATION_ENTRIES_EN) {
  PHOTO_CURATION_1889[entry.photoId] = entry;
}

Object.defineProperties(PHOTO_CURATION_1889, {
  get: {
    value: (id, lang = DEFAULT_LANGUAGE) => getPhotoCuration(id, lang),
    enumerable: false,
  },
  has: {
    value: (id) => _curationMapEn.has(normalizeCurationPhotoId(id)),
    enumerable: false,
  },
});
