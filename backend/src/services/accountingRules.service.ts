/**
 * Automatic Posting Rules Engine (Konteringsregler)
 *
 * This service automatically suggests accounts for transactions based on:
 * - Transaction description
 * - Amount
 * - Vendor/Supplier
 * - Transaction type
 * - Historical patterns
 */

import { VATRate } from '@prisma/client';

export interface PostingRule {
  name: string;
  description: string;
  patterns: string[]; // Keywords to match in description
  debitAccount: string; // Account to debit
  creditAccount: string; // Account to credit
  vatCode?: VATRate;
  category: 'PURCHASE' | 'SALE' | 'PAYROLL' | 'FINANCIAL' | 'OTHER';
  confidence: number; // 0-1, how confident this rule is
}

/**
 * Standard Norwegian posting rules
 */
export const standardPostingRules: PostingRule[] = [
  // ==========================================
  // SALES / INCOME RULES
  // ==========================================
  {
    name: 'Varesalg 25% MVA',
    description: 'Salg av varer med 25% MVA',
    patterns: ['salg', 'faktura', 'sale', 'betaling kunde', 'stripe', 'vipps'],
    debitAccount: '1500', // Kundefordringer
    creditAccount: '3000', // Salgsinntekt
    vatCode: 'RATE_25',
    category: 'SALE',
    confidence: 0.9
  },
  {
    name: 'Medlemsinntekt',
    description: 'Medlemskontingent uten MVA',
    patterns: ['medlemskap', 'kontingent', 'membership', 'subscription'],
    debitAccount: '1900', // Bank
    creditAccount: '3100', // Medlemskontingenter
    vatCode: 'EXEMPT',
    category: 'SALE',
    confidence: 0.85
  },
  {
    name: 'PT-tjenester',
    description: 'PT-økter og treningstjenester',
    patterns: ['pt', 'personlig trener', 'treningstime', 'personal training'],
    debitAccount: '1500', // Kundefordringer
    creditAccount: '3000', // Salgsinntekt tjenester
    vatCode: 'RATE_25',
    category: 'SALE',
    confidence: 0.9
  },

  // ==========================================
  // PURCHASE / EXPENSE RULES
  // ==========================================
  {
    name: 'Varekjøp',
    description: 'Innkjøp av varer til videresalg',
    patterns: ['kjøp', 'innkjøp', 'leverandør', 'purchase', 'supplier'],
    debitAccount: '5000', // Varekjøp
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'RATE_25',
    category: 'PURCHASE',
    confidence: 0.8
  },
  {
    name: 'Husleie',
    description: 'Leiekostnader for lokaler',
    patterns: ['husleie', 'leie', 'rent', 'lokaler'],
    debitAccount: '7000', // Husleiekostnad
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'EXEMPT',
    category: 'PURCHASE',
    confidence: 0.95
  },
  {
    name: 'Strøm og energi',
    description: 'Strøm, vann, fyring',
    patterns: ['strøm', 'power', 'electricity', 'energi', 'vann', 'water', 'fyring'],
    debitAccount: '7020', // Strøm, vann, fyring
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'RATE_25',
    category: 'PURCHASE',
    confidence: 0.9
  },
  {
    name: 'IT-tjenester',
    description: 'IT-kostnader og programvare',
    patterns: ['it', 'software', 'programvare', 'hosting', 'domain', 'server', 'cloud', 'saas'],
    debitAccount: '7160', // IT-tjenester
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'RATE_25',
    category: 'PURCHASE',
    confidence: 0.85
  },
  {
    name: 'Kontorrekvisita',
    description: 'Kontormateriell og forbruksmateriell',
    patterns: ['kontorrekvisita', 'office supplies', 'printer', 'papir', 'paper', 'pens'],
    debitAccount: '7320', // Kontorkostnader
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'RATE_25',
    category: 'PURCHASE',
    confidence: 0.85
  },
  {
    name: 'Telefon og internett',
    description: 'Telefonkostnader og internett',
    patterns: ['telefon', 'phone', 'mobil', 'internet', 'telenor', 'telia'],
    debitAccount: '7330', // Telefonkostnader
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'RATE_25',
    category: 'PURCHASE',
    confidence: 0.9
  },
  {
    name: 'Markedsføring',
    description: 'Markedsføring og annonsering',
    patterns: ['markedsføring', 'marketing', 'advertising', 'annons', 'facebook ads', 'google ads', 'meta'],
    debitAccount: '7400', // Markedsføring
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'RATE_25',
    category: 'PURCHASE',
    confidence: 0.9
  },
  {
    name: 'Reisekostnader',
    description: 'Reise og opphold',
    patterns: ['reise', 'travel', 'flight', 'hotel', 'hotell', 'taxi', 'nsb', 'vy'],
    debitAccount: '7500', // Reisekostnader
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'RATE_25',
    category: 'PURCHASE',
    confidence: 0.85
  },
  {
    name: 'Regnskap og revisjon',
    description: 'Regnskapstjenester (MVA-fritatt)',
    patterns: ['regnskap', 'accounting', 'revisor', 'auditor', 'regnskapsfører'],
    debitAccount: '7140', // Regnskap og revisjon
    creditAccount: '2400', // Leverandørgjeld
    vatCode: 'EXEMPT',
    category: 'PURCHASE',
    confidence: 0.95
  },
  {
    name: 'Forsikring',
    description: 'Forsikringspremier',
    patterns: ['forsikring', 'insurance', 'if', 'tryg'],
    debitAccount: '7050', // Forsikringspremier
    creditAccount: '2400', // Leverandørgjeld
    category: 'PURCHASE',
    confidence: 0.9
  },

  // ==========================================
  // PAYROLL RULES
  // ==========================================
  {
    name: 'Lønnsutbetaling',
    description: 'Utbetaling av lønn',
    patterns: ['lønn', 'salary', 'lønninger', 'ansatt', 'employee'],
    debitAccount: '6000', // Lønn
    creditAccount: '1900', // Bank
    category: 'PAYROLL',
    confidence: 0.9
  },
  {
    name: 'Arbeidsgiveravgift',
    description: 'Arbeidsgiveravgift (14,1%)',
    patterns: ['arbeidsgiveravgift', 'aga', 'employer tax'],
    debitAccount: '6300', // Arbeidsgiveravgift
    creditAccount: '2720', // Arbeidsgiveravgift (gjeld)
    category: 'PAYROLL',
    confidence: 0.95
  },
  {
    name: 'Skattetrekk',
    description: 'Forskuddstrekk fra lønn',
    patterns: ['skattetrekk', 'forskuddstrekk', 'tax withholding'],
    debitAccount: '2700', // Forskuddstrekk
    creditAccount: '1920', // Skattetrekkskonto
    category: 'PAYROLL',
    confidence: 0.95
  },

  // ==========================================
  // FINANCIAL RULES
  // ==========================================
  {
    name: 'Renteinntekt',
    description: 'Renteinntekter fra bank',
    patterns: ['rente', 'interest income', 'bank rente'],
    debitAccount: '1900', // Bank
    creditAccount: '8050', // Renteinntekter
    category: 'FINANCIAL',
    confidence: 0.95
  },
  {
    name: 'Rentekostnad',
    description: 'Rentekostnader på lån',
    patterns: ['rente betaling', 'loan interest', 'lånerente'],
    debitAccount: '8150', // Rentekostnader
    creditAccount: '1900', // Bank
    category: 'FINANCIAL',
    confidence: 0.9
  },
  {
    name: 'Bankgebyr',
    description: 'Bankomkostninger',
    patterns: ['gebyr', 'bank fee', 'omkostning', 'avgift bank'],
    debitAccount: '8160', // Bankomkostninger
    creditAccount: '1900', // Bank
    category: 'FINANCIAL',
    confidence: 0.85
  },

  // ==========================================
  // VAT RULES
  // ==========================================
  {
    name: 'MVA-oppgjør betaling',
    description: 'Betaling av MVA til staten',
    patterns: ['mva oppgjør', 'merverdiavgift', 'vat payment', 'skatteetaten mva'],
    debitAccount: '2610', // Utgående MVA
    creditAccount: '1900', // Bank
    category: 'OTHER',
    confidence: 0.95
  }
];

/**
 * Find matching posting rules for a transaction
 */
export function findMatchingRules(description: string, amount?: number): PostingRule[] {
  const lowerDescription = description.toLowerCase();

  const matchedRules = standardPostingRules
    .map(rule => {
      // Check if any pattern matches
      const patternMatches = rule.patterns.some(pattern =>
        lowerDescription.includes(pattern.toLowerCase())
      );

      if (!patternMatches) {
        return null;
      }

      // Calculate match score
      let score = rule.confidence;

      // Boost score if multiple patterns match
      const matchCount = rule.patterns.filter(pattern =>
        lowerDescription.includes(pattern.toLowerCase())
      ).length;

      if (matchCount > 1) {
        score = Math.min(1, score + (matchCount - 1) * 0.05);
      }

      return { ...rule, matchScore: score };
    })
    .filter(rule => rule !== null) as (PostingRule & { matchScore: number })[];

  // Sort by match score
  return matchedRules.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get the best matching rule for a transaction
 */
export function suggestPosting(
  description: string,
  amount?: number,
  supplierName?: string
): PostingRule | null {
  // Combine description and supplier name for matching
  const searchText = `${description} ${supplierName || ''}`;

  const matches = findMatchingRules(searchText, amount);

  return matches.length > 0 ? matches[0] : null;
}

/**
 * Get posting suggestion with detailed explanation
 */
export interface PostingSuggestion {
  debitAccount: string;
  debitAccountName: string;
  creditAccount: string;
  creditAccountName: string;
  vatCode?: VATRate;
  explanation: string;
  confidence: number;
  alternatives: PostingRule[];
}

export async function getPostingSuggestion(
  description: string,
  amount: number,
  supplierName?: string
): Promise<PostingSuggestion | null> {
  const matches = findMatchingRules(`${description} ${supplierName || ''}`, amount);

  if (matches.length === 0) {
    return null;
  }

  const bestMatch = matches[0];
  const alternatives = matches.slice(1, 4); // Top 3 alternatives

  // Note: In a real implementation, you would fetch account names from the database
  // For now, we'll use the account numbers
  return {
    debitAccount: bestMatch.debitAccount,
    debitAccountName: `Konto ${bestMatch.debitAccount}`,
    creditAccount: bestMatch.creditAccount,
    creditAccountName: `Konto ${bestMatch.creditAccount}`,
    vatCode: bestMatch.vatCode,
    explanation: bestMatch.description,
    confidence: bestMatch.confidence,
    alternatives
  };
}

/**
 * Learn from user corrections (for future ML implementation)
 */
export interface PostingCorrection {
  originalDescription: string;
  suggestedDebitAccount: string;
  suggestedCreditAccount: string;
  actualDebitAccount: string;
  actualCreditAccount: string;
  userId: string;
  tenantId: string;
  timestamp: Date;
}

// This would be stored in a database for ML training
const corrections: PostingCorrection[] = [];

export function recordCorrection(correction: PostingCorrection): void {
  corrections.push(correction);
  // In a real implementation, this would be saved to the database
  // and used to improve the ML model over time
}

/**
 * Calculate VAT amount based on VAT code
 */
export function calculateVAT(amount: number, vatCode: VATRate): number {
  switch (vatCode) {
    case 'RATE_25':
      return amount * 0.25;
    case 'RATE_15':
      return amount * 0.15;
    case 'RATE_12':
      return amount * 0.12;
    case 'RATE_0':
    case 'EXEMPT':
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate amount excluding VAT
 */
export function calculateAmountExVAT(amountIncVAT: number, vatCode: VATRate): number {
  switch (vatCode) {
    case 'RATE_25':
      return amountIncVAT / 1.25;
    case 'RATE_15':
      return amountIncVAT / 1.15;
    case 'RATE_12':
      return amountIncVAT / 1.12;
    case 'RATE_0':
    case 'EXEMPT':
      return amountIncVAT;
    default:
      return amountIncVAT;
  }
}
