/**
 * Chronological Story Walkthrough + Hero 3D Showcase Loop Data (`walkthrough_data.js`)
 * Grounded strictly in `data/catalog/photo_cameras_3d.json`.
 *
 * Key Guarantees:
 *   - 12 stops forming a seamless loop starting and ending on the full 300-meter Tower (`step = 11.0`):
 *       * Stop 1 (`#55`): Gustave Eiffel's 1:1,000 orthographic elevation plate — Designing the 300-Meter Tower
 *       * Stops 2–11 (`#13, #09, #51, #23, #14, #01, #46, #18, #36, #38`): 10 calibrated 1887–1889 glass plates
 *       * Stop 12 (`photoId: null`): Unobstructed Complete 1889 Tower in 3D Showcase (`step = 11.0`)
 *   - Literal, explanatory EN & FR copy (zero poetic filler, zero colons in titles).
 *   - All meter heights/dimensions rounded to the nearest whole meter (zero decimal meter values).
 */

export const WALKTHROUGH_STOPS = Object.freeze([
  {
    "stopIndex": 1,
    "stopId": "stop_01_design_elevation_1889",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "55",
    "calibratedStep": 11,
    "dateLabel": {
      "en": "1884–1889",
      "fr": "1884–1889"
    },
    "shortLabel": {
      "en": "1884–1889 · Designing the Tower",
      "fr": "1884–1889 · Conception de la Tour"
    },
    "elevationSummary": {
      "en": "125 m Base Span · Platforms at 58 m, 116 m, and 276 m · 312 m Tip",
      "fr": "Emprise de 125 m · Étages à 58 m, 116 m et 276 m · Sommet à 312 m"
    },
    "headline": {
      "en": "Designing the 300-Meter Tower",
      "fr": "La conception de la Tour de 300 mètres"
    },
    "narrative": {
      "en": "Conceived in 1884 by engineers Maurice Koechlin and Émile Nouguier and refined with architect Stephen Sauvestre, Gustave Eiffel’s 1-to-1,000 elevation drawing defines the riveted iron structure across a 125-meter base, with platforms at 58, 116, and 276 meters beneath the 300-meter lantern and 312-meter flagpole.",
      "fr": "Conçu en 1884 par les ingénieurs Maurice Koechlin et Émile Nouguier puis précisé avec l’architecte Stephen Sauvestre, ce plan d’élévation au millième de Gustave Eiffel fixe la structure en fer riveté sur une base de 125 mètres, avec trois étages à 58, 116 et 276 mètres jusqu’à la lanterne de 300 mètres et au mât de 312 mètres."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.08,
        0.28,
        0.34
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 2,
    "stopId": "1887_05_caissons",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "13",
    "calibratedStep": 0.55,
    "dateLabel": {
      "en": "21 April 1887",
      "fr": "21 avril 1887"
    },
    "shortLabel": {
      "en": "21 Apr 1887 · Foundation Caissons",
      "fr": "21 avr. 1887 · Caissons des fondations"
    },
    "elevationSummary": {
      "en": "5 m Below the Seine Bed · West Pier Foundation Caissons",
      "fr": "5 m sous le lit de la Seine · Caissons de la pile ouest"
    },
    "headline": {
      "en": "Compressed-Air Foundation Caissons",
      "fr": "Caissons à air comprimé des fondations"
    },
    "narrative": {
      "en": "Photographed on 21 April 1887 during a visit by the Société centrale des architectes, the West Pier foundation pit beside the Seine shows sheet-iron caissons fitted with cylindrical airlocks. Pressurized air kept river water out while workers excavated gravel down to compact sand 5 meters below the riverbed.",
      "fr": "Photographiée le 21 avril 1887 lors d’une visite de la Société centrale des architectes, la fouille de la pile ouest côté Seine montre les caissons en tôle équipés d’écluses cylindriques. L’air comprimé maintenait l’eau hors des chambres de travail pendant le creusement jusqu’au sable compact à 5 mètres sous le lit du fleuve."
    },
    "placard": {
      "normBboxXYWH": [
        0.03,
        0.03,
        0.44,
        0.24
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 3,
    "stopId": "1887_07_base_shoes",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "09",
    "calibratedStep": 1.5,
    "dateLabel": {
      "en": "18 July 1887",
      "fr": "18 juillet 1887"
    },
    "shortLabel": {
      "en": "18 Jul 1887 · Base Shoes",
      "fr": "18 juil. 1887 · Sabots d’appui"
    },
    "elevationSummary": {
      "en": "12 m Height · Cast-Iron Base Shoes and Cast-Steel Counter-Shoes",
      "fr": "Hauteur 12 m · Sabots en fonte et contre-sabots en acier moulé"
    },
    "headline": {
      "en": "Base Girders and Cast-Iron Shoes",
      "fr": "Poutrelles de base et sabots d’appui"
    },
    "narrative": {
      "en": "On 18 July 1887 at the West Pier, erection of the ironwork rises atop the masonry foundation blocks. Four inclined corner box-girders rest via cast-steel counter-shoes inside cast-iron base shoes bolted to sloped Château-Landon stone courses, with recesses in each shoe for 800-ton hydraulic alignment jacks.",
      "fr": "Le 18 juillet 1887 à la pile ouest, le montage métallique s’élève sur les massifs de maçonnerie. Les quatre arbalétriers inclinés reposent par des contre-sabots en acier moulé dans des sabots en fonte boulonnés sur des assises inclinées en pierre de Château-Landon, munis de logements pour des vérins hydrauliques de 800 tonnes."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.04,
        0.52,
        0.28
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 4,
    "stopId": "1888_01_14_lattice_closeup",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "51",
    "calibratedStep": 3.55,
    "dateLabel": {
      "en": "14 January 1888",
      "fr": "14 janvier 1888"
    },
    "shortLabel": {
      "en": "14 Jan 1888 · Central Timber Falsework",
      "fr": "14 janv. 1888 · Grandes charpentes centrales"
    },
    "elevationSummary": {
      "en": "48 m Timber Scaffolds · Sand-Box Supports and Inner Girders",
      "fr": "Charpentes de 48 m · Boîtes à sable et poutres intérieures"
    },
    "headline": {
      "en": "Central Timber Scaffolds at the First Platform",
      "fr": "Grandes charpentes de bois au premier étage"
    },
    "narrative": {
      "en": "Photographed on 14 January 1888 from the level of the first platform for Plate 5 of Eiffel’s monograph, this view looks across the 48-meter bolted central timber falsework towers and wooden trusses erected between the piers. Sand-box leveling cylinders crown the timber posts to position and rivet the inner box girders.",
      "fr": "Prise le 14 janvier 1888 depuis le niveau du premier étage pour la planche 5 de la monographie d’Eiffel, cette vue d’ensemble montre les grandes charpentes centrales boulonnées de 48 mètres dressées entre les piles. Des boîtes à sable coiffent les poteaux de bois pour régler et riveter les poutres intérieures."
    },
    "placard": {
      "normBboxXYWH": [
        0.03,
        0.65,
        0.32,
        0.28
      ],
      "surfaceTheme": "dark_plinth"
    }
  },
  {
    "stopIndex": 5,
    "stopId": "1888_01_07_first_stage_timelapse_1",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "23",
    "calibratedStep": 3.6,
    "dateLabel": {
      "en": "26 March 1888",
      "fr": "26 mars 1888"
    },
    "shortLabel": {
      "en": "26 Mar 1888 · First-Floor Belt",
      "fr": "26 mars 1888 · Ceinture du 1er étage"
    },
    "elevationSummary": {
      "en": "58 m First Platform Joined · Pier Pylons and Central Falsework",
      "fr": "Jonction du 1er étage à 58 m · Pylônes et charpentes de bois"
    },
    "headline": {
      "en": "Joining the First-Floor Girders Across the Four Piers",
      "fr": "Jonction des poutres du premier étage sur les quatre piles"
    },
    "narrative": {
      "en": "Taken on 26 March 1888 along the Champ-de-Mars axis, this view records the completed junction of the 58-meter first-floor girders uniting all four inclined piers into a rigid portal. Twelve timber pier pylons and four central wooden scaffolds still support the horizontal belt before the decorative arches begin.",
      "fr": "Prise le 26 mars 1888 dans l’axe du Champ-de-Mars, cette vue montre la jonction achevée des poutres horizontales du premier étage à 58 mètres, réunissant les quatre piles inclinées. Douze pylônes de bois et quatre échafaudages centraux soutiennent encore la ceinture avant le montage des arcs décoratifs."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.04,
        0.34,
        0.28
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 6,
    "stopId": "1888_06_12_second_stage_timelapse_2",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "14",
    "calibratedStep": 4.85,
    "dateLabel": {
      "en": "15 May 1888",
      "fr": "15 mai 1888"
    },
    "shortLabel": {
      "en": "15 May 1888 · Second-Stage Piers",
      "fr": "15 mai 1888 · Piles du 2e étage"
    },
    "elevationSummary": {
      "en": "89 m Height · Pivoting Creeper Cranes Above the First Platform",
      "fr": "Hauteur 89 m · Grues pivotantes au-dessus du premier étage"
    },
    "headline": {
      "en": "Second-Stage Piers and Climbing Creeper Cranes",
      "fr": "Montée des piles du deuxième étage et grues grimpantes"
    },
    "narrative": {
      "en": "On 15 May 1888, pivoting creeper cranes mounted on the internal elevator guide rails hoist ironwork up the four second-stage legs to 89 meters toward the 116-meter platform. Beneath the first-floor belt, the central timber scaffolds remain in place prior to erecting the four decorative arches.",
      "fr": "Le 15 mai 1888, quatre grues pivotantes déplacées sur les chemins de roulement des ascenseurs hissent les piles du deuxième étage jusqu’à 89 mètres vers la plate-forme de 116 mètres. Sous la ceinture du premier étage, les charpentes centrales demeurent en place avant le levage des quatre arcs décoratifs."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.04,
        0.26,
        0.38
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 7,
    "stopId": "1888_09_14_self_supporting_timelapse_3",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "01",
    "calibratedStep": 5.66,
    "dateLabel": {
      "en": "21 August 1888",
      "fr": "21 août 1888"
    },
    "shortLabel": {
      "en": "21 Aug 1888 · Second Platform",
      "fr": "21 août 1888 · Deuxième étage"
    },
    "elevationSummary": {
      "en": "127 m Height · Second Platform Completed and Scaffolds Cleared",
      "fr": "Hauteur 127 m · Deuxième étage achevé et échafaudages déposés"
    },
    "headline": {
      "en": "Completion of the Second Platform and Lower Arches",
      "fr": "Achèvement du deuxième étage et des grands arcs"
    },
    "narrative": {
      "en": "Photographed on 21 August 1888 for Plate 8 of Gustave Eiffel’s folio monograph, this axial view records the completed 116-meter second platform and its first upper panel at 127 meters. With all four 74-meter decorative arches closed and ground scaffolds cleared, the Palais du Trocadéro appears cleanly through the base.",
      "fr": "Photographiée le 21 août 1888 pour la planche 8 de la monographie de Gustave Eiffel, cette vue axiale montre le deuxième étage achevé à 116 mètres et son premier panneau supérieur à 127 mètres. Les quatre arcs décoratifs de 74 mètres étant fermés et les échafaudages déposés, le Palais du Trocadéro se dégage sous l’arche."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.04,
        0.27,
        0.42
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 8,
    "stopId": "1888_12_26_winter_ascent_timelapse_4",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "46",
    "calibratedStep": 6.52,
    "dateLabel": {
      "en": "23 November 1888",
      "fr": "23 novembre 1888"
    },
    "shortLabel": {
      "en": "23 Nov 1888 · Upper Shaft at 216 m",
      "fr": "23 nov. 1888 · Fût supérieur à 216 m"
    },
    "elevationSummary": {
      "en": "216 m Height · Intermediate Transfer Deck and Central Arcade Bays",
      "fr": "Hauteur 216 m · Plancher intermédiaire et arcades centrales"
    },
    "headline": {
      "en": "Upper Shaft Above the Intermediate Platform",
      "fr": "Le fût au-dessus de l’étage intermédiaire"
    },
    "narrative": {
      "en": "Taken on 23 November 1888, this view shows the merged upper iron column rising past the 196-meter intermediate elevator transfer platform to 216 meters, crowned by internal climbing cranes. Along the 58-meter first floor, the three central bays of the arched iron gallery frame are newly erected.",
      "fr": "Prise le 23 novembre 1888, cette photographie montre la colonne supérieure élevée au-delà du plancher intermédiaire de transbordement à 196 mètres jusqu’à 216 mètres, coiffée par ses grues grimpantes. Au premier étage, à 58 mètres, les trois travées centrales de la galerie arquée sont déjà montées."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.04,
        0.3,
        0.48
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 9,
    "stopId": "1889_05_completed_axial_timelapse_5",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "18",
    "calibratedStep": 11,
    "dateLabel": {
      "en": "May 1889",
      "fr": "Mai 1889"
    },
    "shortLabel": {
      "en": "May 1889 · Exposition Opening",
      "fr": "Mai 1889 · Ouverture de l’Exposition"
    },
    "elevationSummary": {
      "en": "300 m Lantern Terrace · 312 m Flagpole Tip",
      "fr": "Terrasse du phare à 300 m · Sommet du mât à 312 m"
    },
    "headline": {
      "en": "Completed Tower from the Champ-de-Mars",
      "fr": "La Tour achevée vue du Champ-de-Mars"
    },
    "narrative": {
      "en": "Completed and inaugurated on 31 March 1889 after 26 months of work—before opening to visitors on 15 May during the 1889 Exposition Universelle—the tower rises in full axial elevation behind the Coutan fountain. Nine-bay glazed galleries and four restaurant pavilions occupy the first platform beneath the 276-meter third floor, the 300-meter electric beacon, and the 312-meter flagpole.",
      "fr": "Achevée et inaugurée le 31 mars 1889 après 26 mois de travaux—avant son ouverture aux visiteurs le 15 mai lors de l’Exposition universelle de 1889—la tour s’élève en élévation complète derrière le bassin de Coutan. Galeries vitrées à neuf arcades et quatre restaurants occupent le premier étage, sous le troisième étage à 276 mètres, le phare électrique à 300 mètres et le mât à 312 mètres."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.05,
        0.33,
        0.44
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 10,
    "stopId": "1889_summer_under_the_arch",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "36",
    "calibratedStep": 11,
    "dateLabel": {
      "en": "Summer 1889",
      "fr": "Été 1889"
    },
    "shortLabel": {
      "en": "Summer 1889 · Lower Arch View",
      "fr": "Été 1889 · Vue sous l’arc"
    },
    "elevationSummary": {
      "en": "74 m Clear Arch Span · 39 m Arch Crown · Radial Spandrel Lattice",
      "fr": "Portée libre de 74 m · Clef de l’arc à 39 m · Tympans rayonnants"
    },
    "headline": {
      "en": "Lower Arch and Central Dome View",
      "fr": "L’arc inférieur et la vue vers le Dôme central"
    },
    "narrative": {
      "en": "Photographed from beneath the tower looking southeast across the Champ-de-Mars toward Francis de Saint-Vidal’s circular fountain, Jules Coutan’s luminous fountain, and Joseph Bouvard’s Central Dome, this view details the 74-meter decorative arch and radial spandrel lattice just below the first-floor cornice frieze of 72 French scientists.",
      "fr": "Prise sous la tour en regardant vers le sud-est à travers le Champ-de-Mars vers le bassin circulaire de Francis de Saint-Vidal, la fontaine lumineuse de Jules Coutan et le Dôme central de Joseph Bouvard, cette vue détaille l’arc décoratif de 74 mètres et ses tympans rayonnants juste sous la corniche portant les noms des 72 savants français."
    },
    "placard": {
      "normBboxXYWH": [
        0.04,
        0.66,
        0.32,
        0.22
      ],
      "surfaceTheme": "dark_plinth"
    }
  },
  {
    "stopIndex": 11,
    "stopId": "1889_summer_coutan_basin",
    "kind": "calibrated_archival_photo",
    "primaryPhotoId": "38",
    "calibratedStep": 11,
    "dateLabel": {
      "en": "Summer 1889",
      "fr": "Été 1889"
    },
    "shortLabel": {
      "en": "Summer 1889 · Basin and Piers",
      "fr": "Été 1889 · Bassin et piliers"
    },
    "elevationSummary": {
      "en": "125 m Outer Plinth Span · Pier Plinths, Ticket Kiosks, and Lifts",
      "fr": "Empattement de 125 m · Socles en pierre, guichets et ascenseurs"
    },
    "headline": {
      "en": "Fountain Basin and Pier Entrances",
      "fr": "Bassin de la Tour et entrées des piliers"
    },
    "narrative": {
      "en": "Exposition visitors gather around Francis de Saint-Vidal’s sculptural fountain basin beneath the southeast arch. Flanking the parvis, dressed Château-Landon limestone plinths and ground-level entrance kiosks serve the East and South piers, where staircases and inclined hydraulic elevators rise inside the iron legs.",
      "fr": "Les visiteurs de l’Exposition entourent le bassin sculpté par Francis de Saint-Vidal sous l’arche sud-est. De part et d’autre du parvis, les socles en pierre de Château-Landon et les kiosques d’entrée desservent les piles est et sud, d’où montent les escaliers et les ascenseurs hydrauliques inclinés."
    },
    "placard": {
      "normBboxXYWH": [
        0.47,
        0.22,
        0.28,
        0.25
      ],
      "surfaceTheme": "light_vellum"
    }
  },
  {
    "stopIndex": 12,
    "stopId": "1889_hero_3d_showcase_finale",
    "kind": "hero_3d_model_finale",
    "primaryPhotoId": null,
    "calibratedStep": 11,
    "dateLabel": {
      "en": "1889 in 3D",
      "fr": "1889 en 3D"
    },
    "shortLabel": {
      "en": "1889 · Complete 3D Tower",
      "fr": "1889 · Tour complète en 3D"
    },
    "elevationSummary": {
      "en": "125 m Base · 58 m, 116 m, and 276 m Platforms · 312 m Summit",
      "fr": "Base de 125 m · Étages à 58 m, 116 m et 276 m · Sommet à 312 m"
    },
    "headline": {
      "en": "Complete 1889 Tower in 3D",
      "fr": "La Tour complète de 1889 en 3D"
    },
    "narrative": {
      "en": "Inspect the reconstructed 1889 iron structure in three dimensions. Drag to orbit around the monument, select a structural detail below to examine the masonry plinths, 74-meter arches, 116-meter transfer deck, or 300-meter lighthouse cupola, or continue forward to return to Eiffel’s elevation drawing.",
      "fr": "Examinez en trois dimensions la charpente métallique reconstituée dans son état de 1889. Faites pivoter la vue librement, choisissez un détail ci-dessous pour observer les socles maçonnés, les arcs de 74 mètres, le deuxième étage à 116 mètres ou le phare à 300 mètres, ou poursuivez pour revenir au plan d’élévation."
    },
    "placard": {
      "normBboxXYWH": [
        0.03,
        0.09,
        0.27,
        0.3
      ],
      "surfaceTheme": "light_vellum"
    }
  },
]);

export const HERO_FINALE_PRESETS = Object.freeze([
  {
    presetId: 'overview',
    numeral: '0',
    label: {
      en: 'Full 300 m Elevation',
      fr: 'Élévation complète de 300 m',
    },
    caption: {
      en: 'Full three-quarter view of the 1889 tower from the 125-meter masonry base to the 312-meter flagpole.',
      fr: 'Vue d’ensemble trois-quarts de l’état de 1889, de l’emprise maçonnée de 125 mètres jusqu’au mât de 312 mètres.',
    },
    position: [240.0, 52.0, 440.0],
    target: [0.0, 134.0, 0.0],
    fovYDeg: 42.0,
    enableTurntable: true,
  },
  {
    presetId: 'plinths_shoes',
    numeral: 'I',
    label: {
      en: 'Plinths and Cast-Iron Sabots',
      fr: 'Soubassements et sabots en fonte',
    },
    caption: {
      en: 'Château-Landon stone plinths, cast-iron base shoes, and cast-steel counter-shoes anchoring the four corner box-girders of each pier.',
      fr: 'Massifs en pierre de Château-Landon, sabots en fonte et contre-sabots en acier moulé recevant les quatre arbalétriers de chaque pile.',
    },
    position: [76.0, 11.0, 78.0],
    target: [38.0, 7.5, 38.0],
    fovYDeg: 36.0,
    enableTurntable: false,
  },
  {
    presetId: 'arch_frieze',
    numeral: 'II',
    label: {
      en: '74 m Arch and First Platform',
      fr: 'Arc de 74 m et premier étage',
    },
    caption: {
      en: 'Decorative 74-meter lattice arch, frieze of 72 French scientists, and nine-bay glazed gallery at 58 meters.',
      fr: 'Arc décoratif de 74 mètres, frise des 72 savants français et galerie vitrée à neuf travées à 58 mètres.',
    },
    position: [52.0, 44.0, 118.0],
    target: [0.0, 52.0, 0.0],
    fovYDeg: 36.0,
    enableTurntable: false,
  },
  {
    presetId: 'second_platform',
    numeral: 'III',
    label: {
      en: 'Second Platform at 116 m',
      fr: 'Deuxième étage à 116 m',
    },
    caption: {
      en: 'Convergence of the four inclined piers at 116 meters, observation gallery, Le Figaro kiosk, and Édoux elevator transfer.',
      fr: 'Convergence des quatre piles à 116 mètres, galerie d’observation, kiosque du Figaro et relais des ascenseurs Édoux.',
    },
    position: [46.0, 122.0, 68.0],
    target: [0.0, 118.0, 0.0],
    fovYDeg: 38.0,
    enableTurntable: false,
  },
  {
    presetId: 'campanile_phare',
    numeral: 'IV',
    label: {
      en: 'Summit Campanile at 300 m',
      fr: 'Campanile et phare à 300 m',
    },
    caption: {
      en: 'Third platform at 276 meters, Gustave Eiffel’s private study, campanile arches, electric lighthouse at 300 meters, and 312-meter flagpole.',
      fr: 'Troisième étage à 276 mètres, bureau de Gustave Eiffel, arcs du campanile, phare électrique à 300 mètres et mât à 312 mètres.',
    },
    position: [34.0, 286.0, 48.0],
    target: [0.0, 289.0, 0.0],
    fovYDeg: 35.0,
    enableTurntable: false,
  },
]);

/**
 * Backward-compatibility mapping from Stage 3/5 IDs to Stage 6 1-based Stop indices (1..12).
 */
export const LEGACY_CHAPTER_TO_STOP_MAP = Object.freeze({
  ch1_vision: 1,
  stop_01_design_elevation_1889: 1,
  stop_12_full_elevation_1889: 1,
  '1889_300m_elevation_plate': 1,
  '1889_00_design_elevation': 1,
  ch1_foundations: 2,
  ch2_foundations: 2,
  ch2_piers: 3,
  ch3_first_platform: 4,
  ch3_first_stage: 4,
  ch4_second_stage: 6,
  ch4_second_platform: 6,
  ch5_summit_ascent: 8,
  ch5_upper_shaft: 8,
  ch6_exposition: 9,
  ch6_inauguration: 9,
  ch7_legacy: 12,
  ch7_hero_finale: 12,
  '1889_hero_3d_showcase_finale': 12,
});

/**
 * Look up a walkthrough stop by 1-based `stopIndex` (1..12), `stopId`, legacy `chapterId`, or `photoId` ('photo_14').
 */
export function getWalkthroughStop(query) {
  if (query === null || query === undefined) return WALKTHROUGH_STOPS[0];
  if (typeof query === 'number' && Number.isFinite(query)) {
    const clamped = Math.max(1, Math.min(WALKTHROUGH_STOPS.length, Math.round(query)));
    return WALKTHROUGH_STOPS[clamped - 1];
  }
  const key = String(query).trim();
  if (/^\d+$/.test(key)) {
    const idx = Number(key);
    if (idx >= 1 && idx <= WALKTHROUGH_STOPS.length) {
      return WALKTHROUGH_STOPS[idx - 1];
    }
  }
  if (LEGACY_CHAPTER_TO_STOP_MAP[key]) {
    return WALKTHROUGH_STOPS[LEGACY_CHAPTER_TO_STOP_MAP[key] - 1];
  }
  const byStopId = WALKTHROUGH_STOPS.find((s) => s.stopId === key);
  if (byStopId) return byStopId;

  const photoClean = key.replace(/^photo_|^#/i, '').padStart(2, '0');
  const byPhoto = WALKTHROUGH_STOPS.find((s) => s.primaryPhotoId === photoClean);
  return byPhoto || WALKTHROUGH_STOPS[0];
}

export function getStopForPhotoId(photoId) {
  const clean = String(photoId || '').trim().replace(/^photo_|^#/i, '').padStart(2, '0');
  return WALKTHROUGH_STOPS.find((s) => s.primaryPhotoId === clean) || null;
}
