// DATOS ILUSTRATIVOS. Reemplazalos por datos con fuente real antes de presentar.
const YEARS = [2015, 2018, 2021, 2024, 2026];

const dept = (id, name, region, sector, color, m, litio, agro, turismo, empleo) => ({
  id, name, region, sector, color,
  metrics: {
    pbiShare: m[0], employmentGrowth: m[1], formalJobs: m[2],
    localSmes: m[3], mainActivity: m[4], exportValue: m[5]
  },
  yearlyData: YEARS.map((year, i) => ({
    year, litio: litio[i], agro: agro[i], turismo: turismo[i], empleo: empleo[i]
  }))
});

const Z = [0, 0, 0, 0, 0];

export const JUJUY_DEPARTMENTS_DATA = [
  // PUNA
  dept('santa_catalina', 'Santa Catalina', 'Puna', 'mineril', '#a855f7',
    ['2.8%', '+45%', '620', '22', 'Ganadería Camélida, Minería Artesanal y Comercio Fronterizo', '$18M USD'],
    [2, 3, 5, 8, 11], [1, 1, 2, 2, 2], [1, 2, 3, 4, 5], [420, 480, 530, 590, 620]),
  dept('yavi', 'Yavi', 'Puna', 'mineril', '#8b5cf6',
    ['3.9%', '+52%', '910', '34', 'Comercio Transfronterizo (La Quiaca), Ovinos y Pequeña Minería', '$28M USD'],
    [3, 5, 8, 12, 16], [3, 3, 4, 4, 5], [4, 5, 7, 9, 12], [600, 690, 760, 840, 910]),
  dept('rinconada', 'Rinconada', 'Puna', 'mineril', '#a855f7',
    ['7.8%', '+88%', '1,580', '48', 'Mina Pirquitas (Polimetálico) y Proyectos de Litio', '$135M USD'],
    [10, 18, 28, 42, 54], [1, 1, 1, 2, 2], [1, 2, 3, 4, 5], [840, 1020, 1240, 1460, 1580]),
  dept('cochinoca', 'Cochinoca', 'Puna', 'mineril', '#9333ea',
    ['6.4%', '+75%', '1,320', '41', 'Abra Pampa (Centro Logístico de la Puna), Salar de Olaroz-Cauchari', '$85M USD'],
    [6, 12, 22, 38, 48], [2, 2, 3, 3, 4], [3, 4, 6, 9, 11], [750, 910, 1080, 1220, 1320]),
  dept('susques', 'Susques', 'Puna', 'mineril', '#c084fc',
    ['34.2%', '+185%', '5,420', '162', 'Gigafactorías de Litio (Cauchari-Olaroz) y Planta Solar Cauchari (300MW)', '$520M USD'],
    [12, 35, 70, 130, 185], [1, 1, 2, 2, 2], [2, 3, 5, 7, 9], [1900, 2800, 3900, 4950, 5420]),

  // QUEBRADA DE HUMAHUACA
  dept('humahuaca', 'Humahuaca', 'Quebrada', 'turismo', '#eab308',
    ['10.5%', '+105%', '3,850', '225', 'Turismo Cultural (Serranía del Hornocal), Gastronomía y Agricultura de Altura', '$42M USD'],
    Z, [6, 7, 7, 8, 9], [28, 42, 55, 80, 98], [1880, 2400, 2950, 3500, 3850]),
  dept('tilcara', 'Tilcara', 'Quebrada', 'turismo', '#f59e0b',
    ['5.8%', '+120%', '2,150', '142', 'Pucará de Tilcara, Arqueología, Hotelería Boutique y Arqueo-Vitivinicultura', '$24M USD'],
    Z, [3, 4, 4, 5, 5], [22, 34, 48, 70, 88], [980, 1300, 1650, 1980, 2150]),
  dept('tumbaya', 'Tumbaya', 'Quebrada', 'turismo', '#d97706',
    ['4.9%', '+115%', '1,480', '98', 'Purmamarca (Cerro de los 7 Colores), Tren Solar y Turismo Ecoterritorial', '$29M USD'],
    Z, [2, 3, 3, 4, 4], [18, 28, 40, 62, 78], [690, 920, 1150, 1360, 1480]),
  dept('valle_grande', 'Valle Grande', 'Quebrada / Yungas', 'turismo', '#ca8a04',
    ['1.2%', '+35%', '340', '18', 'Ecoturismo, Senderismo de Montaña y Ganadería de Valles', '$4M USD'],
    Z, [2, 2, 3, 3, 4], [4, 6, 8, 11, 14], [250, 270, 295, 320, 340]),

  // YUNGAS
  dept('ledesma', 'Ledesma', 'Yungas', 'agro', '#10b981',
    ['16.8%', '+26%', '13,800', '310', 'Agroindustria Azucarera (Ledesma S.A.A.I.), Bioetanol, Papel y Cítricos', '$325M USD'],
    Z, [88, 94, 99, 108, 115], [8, 10, 12, 15, 18], [10900, 11800, 12500, 13300, 13800]),
  dept('santa_barbara', 'Santa Bárbara', 'Yungas', 'agro', '#059669',
    ['6.2%', '+30%', '3,200', '78', 'Explotación Forestal Sostenible, Granos, Ganadería y Citricultura', '$62M USD'],
    Z, [32, 35, 38, 42, 45], [2, 3, 4, 5, 6], [2460, 2650, 2850, 3050, 3200]),
  dept('san_pedro', 'San Pedro', 'Yungas / Valles', 'agro', '#047857',
    ['9.4%', '+34%', '7,900', '195', 'Ingenio La Esperanza (Azúcar/Alcohol), Horticultura Intensiva y Frutales', '$145M USD'],
    Z, [55, 60, 65, 72, 78], [4, 5, 6, 8, 9], [5900, 6450, 7000, 7500, 7900]),

  // VALLES
  dept('belgrano', 'Dr. Manuel Belgrano', 'Valles', 'servicios', '#06b6d4',
    ['22.1%', '+40%', '31,500', '1,380', 'San Salvador de Jujuy (Capital), Servicios Financieros, Salud y Polo Software', '$88M USD'],
    Z, [8, 9, 10, 12, 14], [25, 32, 40, 52, 62], [22500, 24800, 27000, 29800, 31500]),
  dept('palpala', 'Palpalá', 'Valles', 'servicios', '#0891b2',
    ['5.1%', '+38%', '5,800', '165', 'Siderurgia (Aceros Zapla), Parque Industrial Logístico y Metalmecánica', '$72M USD'],
    Z, [5, 5, 6, 7, 8], [3, 4, 5, 7, 8], [4200, 4650, 5100, 5500, 5800]),
  dept('san_antonio', 'San Antonio', 'Valles', 'agro', '#0d9488',
    ['1.6%', '+28%', '850', '32', 'Floricultura, Producción Quesera Artesanal y Turismo de Campiña', '$8M USD'],
    Z, [12, 14, 15, 17, 19], [4, 5, 7, 9, 11], [660, 710, 760, 810, 850]),
  dept('el_carmen', 'El Carmen', 'Valles', 'agro', '#059669',
    ['6.7%', '+32%', '6,400', '185', 'Tabaco Virginia (Finca El Carmen), Diques La Ciénaga/Las Maderas y Piscicultura', '$110M USD'],
    Z, [62, 66, 70, 76, 82], [8, 10, 12, 15, 18], [4850, 5300, 5750, 6150, 6400])
];

export const PROVINCIAL_TOTALS = {
  name: 'Toda la Provincia de Jujuy (16 Dptos)',
  pbiGrowth: '+72.4%',
  totalExports: '$1,817M USD',
  totalEmployment: '89,590',
  totalSmes: '3,188',
  yearlyData: YEARS.map((year, i) => ({
    year,
    litio: [36, 91, 171, 312, 432][i],
    agro: [376, 400, 426, 467, 504][i],
    turismo: [120, 156, 196, 275, 341][i],
    empleo: [55420, 62730, 70265, 82540, 89590][i]
  }))
};
