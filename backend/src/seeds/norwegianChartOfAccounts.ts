/**
 * Norwegian Chart of Accounts (Norsk Kontoplan - NRS)
 * Based on Norwegian accounting standards
 *
 * Account structure:
 * 1xxx - Assets (Eiendeler)
 * 2xxx - Liabilities and Equity (Gjeld og egenkapital)
 * 3xxx-4xxx - Operating income (Driftsinntekter)
 * 5xxx-7xxx - Operating expenses (Driftskostnader)
 * 8xxx - Financial income/expenses (Finansinntekter/-kostnader)
 */

export interface AccountTemplate {
  accountNumber: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  vatCode?: 'RATE_25' | 'RATE_15' | 'RATE_12' | 'RATE_0' | 'EXEMPT';
  description?: string;
}

export const norwegianChartOfAccounts: AccountTemplate[] = [
  // ==========================================
  // 1xxx - EIENDELER (ASSETS)
  // ==========================================

  // 10xx - Immaterielle eiendeler (Intangible assets)
  {
    accountNumber: '1000',
    name: 'Forsknings- og utviklingskostnader',
    type: 'ASSET',
    description: 'Aktiverte FoU-kostnader'
  },
  {
    accountNumber: '1050',
    name: 'Konsesjoner, patenter, lisenser mv.',
    type: 'ASSET',
    description: 'Immaterielle rettigheter'
  },
  {
    accountNumber: '1070',
    name: 'Utsatt skattefordel',
    type: 'ASSET',
    description: 'Skattemessig fremførbart underskudd'
  },
  {
    accountNumber: '1099',
    name: 'Akkumulerte avskrivninger immaterielle eiendeler',
    type: 'ASSET',
    description: 'Motpost for avskrivninger'
  },

  // 11xx-13xx - Varige driftsmidler (Fixed assets)
  {
    accountNumber: '1200',
    name: 'Tomter og bygninger',
    type: 'ASSET',
    description: 'Fast eiendom'
  },
  {
    accountNumber: '1220',
    name: 'Maskiner og anlegg',
    type: 'ASSET',
    description: 'Produksjonsutstyr'
  },
  {
    accountNumber: '1240',
    name: 'Inventar og utstyr',
    type: 'ASSET',
    description: 'Kontormøbler, IT-utstyr etc.'
  },
  {
    accountNumber: '1260',
    name: 'Biler og transportmidler',
    type: 'ASSET',
    description: 'Firmabiler'
  },
  {
    accountNumber: '1299',
    name: 'Akkumulerte avskrivninger varige driftsmidler',
    type: 'ASSET',
    description: 'Motpost for avskrivninger'
  },

  // 14xx - Varelager (Inventory)
  {
    accountNumber: '1400',
    name: 'Varelager',
    type: 'ASSET',
    description: 'Varer til videresalg'
  },
  {
    accountNumber: '1410',
    name: 'Lager av råvarer',
    type: 'ASSET',
    description: 'Råvarer til produksjon'
  },

  // 15xx - Kundefordringer (Accounts receivable)
  {
    accountNumber: '1500',
    name: 'Kundefordringer',
    type: 'ASSET',
    description: 'Utestående kundefakturaer'
  },
  {
    accountNumber: '1530',
    name: 'Andre fordringer',
    type: 'ASSET',
    description: 'Diverse fordringer'
  },

  // 16xx-17xx - Investeringer og bankinnskudd
  {
    accountNumber: '1600',
    name: 'Kortsiktige plasseringer',
    type: 'ASSET',
    description: 'Kortsiktige investeringer'
  },
  {
    accountNumber: '1900',
    name: 'Bankinnskudd, kontanter og lignende',
    type: 'ASSET',
    description: 'Driftskonto i bank'
  },
  {
    accountNumber: '1910',
    name: 'Sparekonto',
    type: 'ASSET',
    description: 'Sparekonto'
  },
  {
    accountNumber: '1920',
    name: 'Skattetrekkskonto',
    type: 'ASSET',
    description: 'Konto for skattetrekk'
  },

  // ==========================================
  // 2xxx - GJELD OG EGENKAPITAL (LIABILITIES & EQUITY)
  // ==========================================

  // 20xx - Egenkapital (Equity)
  {
    accountNumber: '2000',
    name: 'Aksjekapital',
    type: 'EQUITY',
    description: 'Innskutt aksjekapital'
  },
  {
    accountNumber: '2050',
    name: 'Overkursfond',
    type: 'EQUITY',
    description: 'Overkurs ved aksjetegning'
  },
  {
    accountNumber: '2080',
    name: 'Opptjent egenkapital',
    type: 'EQUITY',
    description: 'Akkumulert resultat'
  },
  {
    accountNumber: '2099',
    name: 'Årets resultat',
    type: 'EQUITY',
    description: 'Inneværende års resultat'
  },

  // 22xx - Langsiktig gjeld (Long-term liabilities)
  {
    accountNumber: '2200',
    name: 'Gjeld til kredittinstitusjoner',
    type: 'LIABILITY',
    description: 'Banklån'
  },
  {
    accountNumber: '2250',
    name: 'Utsatt skatt',
    type: 'LIABILITY',
    description: 'Utsatt skatteforpliktelse'
  },

  // 24xx - Kortsiktig gjeld (Current liabilities)
  {
    accountNumber: '2400',
    name: 'Leverandørgjeld',
    type: 'LIABILITY',
    description: 'Utestående leverandørfakturaer'
  },
  {
    accountNumber: '2600',
    name: 'Skyldige offentlige avgifter',
    type: 'LIABILITY',
    description: 'MVA, arbeidsgiveravgift etc.'
  },
  {
    accountNumber: '2610',
    name: 'Utgående merverdiavgift - høy sats (25%)',
    type: 'LIABILITY',
    vatCode: 'RATE_25',
    description: 'MVA å betale til staten - 25%'
  },
  {
    accountNumber: '2611',
    name: 'Utgående merverdiavgift - middels sats (15%)',
    type: 'LIABILITY',
    vatCode: 'RATE_15',
    description: 'MVA å betale til staten - 15%'
  },
  {
    accountNumber: '2612',
    name: 'Utgående merverdiavgift - lav sats (12%)',
    type: 'LIABILITY',
    vatCode: 'RATE_12',
    description: 'MVA å betale til staten - 12%'
  },
  {
    accountNumber: '2700',
    name: 'Forskuddstrekk',
    type: 'LIABILITY',
    description: 'Skattetrekk fra lønn'
  },
  {
    accountNumber: '2710',
    name: 'Påleggstrekk',
    type: 'LIABILITY',
    description: 'Trekk for gjeld'
  },
  {
    accountNumber: '2720',
    name: 'Arbeidsgiveravgift',
    type: 'LIABILITY',
    description: 'Påløpt arbeidsgiveravgift'
  },
  {
    accountNumber: '2730',
    name: 'Skyldig skattetrekk',
    type: 'LIABILITY',
    description: 'Skattetrekk til betaling'
  },
  {
    accountNumber: '2740',
    name: 'Påløpt feriepenger',
    type: 'LIABILITY',
    description: 'Avsatt feriepenger'
  },

  // ==========================================
  // 3xxx - SALGSINNTEKT (SALES REVENUE)
  // ==========================================

  {
    accountNumber: '3000',
    name: 'Salgsinntekt varer og tjenester',
    type: 'INCOME',
    vatCode: 'RATE_25',
    description: 'Hovedinntekt fra salg (25% MVA)'
  },
  {
    accountNumber: '3010',
    name: 'Salgsinntekt varer lav sats',
    type: 'INCOME',
    vatCode: 'RATE_15',
    description: 'Salg med 15% MVA (mat)'
  },
  {
    accountNumber: '3020',
    name: 'Salgsinntekt tjenester fritatt',
    type: 'INCOME',
    vatCode: 'EXEMPT',
    description: 'MVA-fritatt salg (helse, finans etc.)'
  },
  {
    accountNumber: '3100',
    name: 'Medlemskontingenter',
    type: 'INCOME',
    vatCode: 'EXEMPT',
    description: 'Medlemsinntekter'
  },

  // ==========================================
  // 4xxx - ANNEN DRIFTSINNTEKT (OTHER OPERATING INCOME)
  // ==========================================

  {
    accountNumber: '4000',
    name: 'Annen driftsinntekt',
    type: 'INCOME',
    description: 'Diverse driftsinntekter'
  },
  {
    accountNumber: '4200',
    name: 'Offentlige tilskudd',
    type: 'INCOME',
    description: 'Støtte og tilskudd'
  },

  // ==========================================
  // 5xxx - VAREKOSTNAD (COST OF GOODS SOLD)
  // ==========================================

  {
    accountNumber: '5000',
    name: 'Varekjøp',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'Innkjøp av varer til videresalg'
  },
  {
    accountNumber: '5100',
    name: 'Beholdningsendring',
    type: 'EXPENSE',
    description: 'Endring i varelager'
  },

  // ==========================================
  // 6xxx - LØNNSKOSTNAD (PAYROLL EXPENSES)
  // ==========================================

  {
    accountNumber: '6000',
    name: 'Lønn',
    type: 'EXPENSE',
    description: 'Bruttolønn til ansatte'
  },
  {
    accountNumber: '6100',
    name: 'Feriepenger',
    type: 'EXPENSE',
    description: 'Påløpte feriepenger'
  },
  {
    accountNumber: '6300',
    name: 'Arbeidsgiveravgift',
    type: 'EXPENSE',
    description: 'Arbeidsgiveravgift (14,1%)'
  },
  {
    accountNumber: '6400',
    name: 'Pensjonskostnader',
    type: 'EXPENSE',
    description: 'Pensjonsordning'
  },
  {
    accountNumber: '6500',
    name: 'Andre ytelser',
    type: 'EXPENSE',
    description: 'Forsikringer, personalaktiviteter etc.'
  },

  // ==========================================
  // 7xxx - ANNEN DRIFTSKOSTNAD (OTHER OPERATING EXPENSES)
  // ==========================================

  {
    accountNumber: '7000',
    name: 'Husleiekostnad',
    type: 'EXPENSE',
    vatCode: 'EXEMPT',
    description: 'Husleie lokaler'
  },
  {
    accountNumber: '7020',
    name: 'Strøm, vann, fyring',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'Energikostnader'
  },
  {
    accountNumber: '7050',
    name: 'Forsikringspremier',
    type: 'EXPENSE',
    description: 'Forsikringer'
  },
  {
    accountNumber: '7100',
    name: 'Fremmed tjeneste',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'Kjøp av tjenester'
  },
  {
    accountNumber: '7140',
    name: 'Regnskap og revisjon',
    type: 'EXPENSE',
    vatCode: 'EXEMPT',
    description: 'Regnskapstjenester'
  },
  {
    accountNumber: '7160',
    name: 'IT-tjenester og programvare',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'IT-kostnader'
  },
  {
    accountNumber: '7320',
    name: 'Kontorkostnader',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'Kontorrekvisita'
  },
  {
    accountNumber: '7330',
    name: 'Telefonkostnader',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'Telefon og internett'
  },
  {
    accountNumber: '7400',
    name: 'Markedsføring',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'Markedsføring og annonsering'
  },
  {
    accountNumber: '7500',
    name: 'Reisekostnader',
    type: 'EXPENSE',
    vatCode: 'RATE_25',
    description: 'Reise og opphold'
  },
  {
    accountNumber: '7700',
    name: 'Avskrivning driftsmidler',
    type: 'EXPENSE',
    description: 'Ordinære avskrivninger'
  },
  {
    accountNumber: '7800',
    name: 'Tap på krav',
    type: 'EXPENSE',
    description: 'Tap på kundefordringer'
  },

  // ==========================================
  // 8xxx - FINANSINNTEKTER OG -KOSTNADER (FINANCIAL ITEMS)
  // ==========================================

  {
    accountNumber: '8050',
    name: 'Renteinntekter',
    type: 'INCOME',
    description: 'Renteinntekter fra bank'
  },
  {
    accountNumber: '8150',
    name: 'Rentekostnader',
    type: 'EXPENSE',
    description: 'Rentekostnader på lån'
  },
  {
    accountNumber: '8160',
    name: 'Bankomkostninger',
    type: 'EXPENSE',
    description: 'Bankgebyrer'
  },
  {
    accountNumber: '8300',
    name: 'Valutagevinst',
    type: 'INCOME',
    description: 'Gevinst ved valutaveksling'
  },
  {
    accountNumber: '8310',
    name: 'Valutatap',
    type: 'EXPENSE',
    description: 'Tap ved valutaveksling'
  },
  {
    accountNumber: '8900',
    name: 'Betalbar skatt',
    type: 'EXPENSE',
    description: 'Skatt på alminnelig inntekt (22%)'
  }
];

/**
 * Get accounts by type
 */
export function getAccountsByType(type: AccountTemplate['type']): AccountTemplate[] {
  return norwegianChartOfAccounts.filter(account => account.type === type);
}

/**
 * Get accounts by VAT code
 */
export function getAccountsByVATCode(vatCode: AccountTemplate['vatCode']): AccountTemplate[] {
  return norwegianChartOfAccounts.filter(account => account.vatCode === vatCode);
}

/**
 * Find account by account number
 */
export function findAccount(accountNumber: string): AccountTemplate | undefined {
  return norwegianChartOfAccounts.find(account => account.accountNumber === accountNumber);
}

/**
 * Get main account groups
 */
export const accountGroups = {
  ASSETS: { range: '1xxx', description: 'Eiendeler' },
  LIABILITIES_EQUITY: { range: '2xxx', description: 'Gjeld og egenkapital' },
  SALES_REVENUE: { range: '3xxx', description: 'Salgsinntekter' },
  OTHER_REVENUE: { range: '4xxx', description: 'Annen driftsinntekt' },
  COGS: { range: '5xxx', description: 'Varekostnad' },
  PAYROLL: { range: '6xxx', description: 'Lønnskostnad' },
  OPERATING_EXPENSES: { range: '7xxx', description: 'Annen driftskostnad' },
  FINANCIAL: { range: '8xxx', description: 'Finansposter' }
};
