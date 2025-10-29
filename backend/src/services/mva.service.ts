/**
 * Norwegian MVA (VAT) Service
 *
 * Handles automatic VAT calculation and reporting according to Norwegian standards
 * Supports RF-0002, RF-0004, RF-0005 codes for Altinn reporting
 */

import { PrismaClient, VATRate } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Norwegian MVA codes (Merverdiavgiftskoder)
 * Based on standard SAF-T (Standard Audit File for Tax)
 */
export enum MVACode {
  // Utgående MVA (Outgoing VAT - Sales)
  SALES_HIGH = '3',        // Salg med 25% MVA
  SALES_MEDIUM = '31',     // Salg med 15% MVA (mat)
  SALES_LOW = '32',        // Salg med 12% MVA (persontransport, kino etc.)
  SALES_RAW_FISH = '33',   // Salg med 11.11% MVA (råfisk)
  SALES_EXEMPT = '5',      // Salg fritatt for MVA (helse, finans, etc.)
  SALES_ZERO = '6',        // Salg med 0% MVA (export)

  // Inngående MVA (Incoming VAT - Purchases)
  PURCHASE_HIGH = '1',     // Kjøp med 25% MVA fradrag
  PURCHASE_MEDIUM = '11',  // Kjøp med 15% MVA fradrag
  PURCHASE_LOW = '12',     // Kjøp med 12% MVA fradrag
  PURCHASE_RAW_FISH = '13',// Kjøp med 11.11% MVA fradrag
  PURCHASE_IMPORT = '14',  // Kjøp med MVA ved innførsel
  PURCHASE_REVERSE = '81', // Kjøp med omvendt avgiftsplikt (snudd MVA)

  // Justering (Adjustments)
  ADJUSTMENT_OUT = '4',    // Justering utgående MVA
  ADJUSTMENT_IN = '2'      // Justering inngående MVA
}

/**
 * MVA Period Types
 */
export enum MVAPeriod {
  MONTHLY = 'MONTHLY',           // Månedlig (companies with turnover > 50M NOK)
  BIMONTHLY = 'BIMONTHLY',       // To-månedlig (companies with turnover 1-50M NOK)
  YEARLY = 'YEARLY'              // Årlig (companies with turnover < 1M NOK)
}

/**
 * MVA calculation result for a period
 */
export interface MVACalculation {
  period: {
    start: Date;
    end: Date;
    type: MVAPeriod;
  };
  outgoingVAT: {
    high: number;      // 25%
    medium: number;    // 15%
    low: number;       // 12%
    total: number;
  };
  incomingVAT: {
    high: number;      // 25%
    medium: number;    // 15%
    low: number;       // 12%
    import: number;
    reverse: number;
    total: number;
  };
  adjustments: {
    outgoing: number;
    incoming: number;
  };
  netVAT: number;      // Amount to pay (positive) or receive (negative)
  turnover: number;    // Total turnover excl. VAT
  basis: {
    outgoingHigh: number;     // Basis for 25% outgoing VAT
    outgoingMedium: number;   // Basis for 15% outgoing VAT
    outgoingLow: number;      // Basis for 12% outgoing VAT
    incomingHigh: number;     // Basis for 25% incoming VAT
    incomingMedium: number;   // Basis for 15% incoming VAT
    incomingLow: number;      // Basis for 12% incoming VAT
  };
}

/**
 * Calculate MVA for a given period
 */
export async function calculateMVA(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<MVACalculation> {
  // Get all transactions in the period
  const transactions = await prisma.transaction.findMany({
    where: {
      tenantId,
      transactionDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      account: true
    }
  });

  // Initialize calculation
  const calc: MVACalculation = {
    period: {
      start: startDate,
      end: endDate,
      type: determinePeriodType(startDate, endDate)
    },
    outgoingVAT: {
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    },
    incomingVAT: {
      high: 0,
      medium: 0,
      low: 0,
      import: 0,
      reverse: 0,
      total: 0
    },
    adjustments: {
      outgoing: 0,
      incoming: 0
    },
    netVAT: 0,
    turnover: 0,
    basis: {
      outgoingHigh: 0,
      outgoingMedium: 0,
      outgoingLow: 0,
      incomingHigh: 0,
      incomingMedium: 0,
      incomingLow: 0
    }
  };

  // Process each transaction
  transactions.forEach(tx => {
    const vatAmount = tx.vatAmount || 0;
    const amountExVAT = tx.amount - vatAmount;

    if (tx.type === 'INCOME') {
      // Outgoing VAT (Sales)
      calc.turnover += amountExVAT;

      switch (tx.vatRate) {
        case 'RATE_25':
          calc.outgoingVAT.high += vatAmount;
          calc.basis.outgoingHigh += amountExVAT;
          break;
        case 'RATE_15':
          calc.outgoingVAT.medium += vatAmount;
          calc.basis.outgoingMedium += amountExVAT;
          break;
        case 'RATE_12':
          calc.outgoingVAT.low += vatAmount;
          calc.basis.outgoingLow += amountExVAT;
          break;
      }
    } else if (tx.type === 'EXPENSE') {
      // Incoming VAT (Purchases) - deductible
      switch (tx.vatRate) {
        case 'RATE_25':
          calc.incomingVAT.high += vatAmount;
          calc.basis.incomingHigh += amountExVAT;
          break;
        case 'RATE_15':
          calc.incomingVAT.medium += vatAmount;
          calc.basis.incomingMedium += amountExVAT;
          break;
        case 'RATE_12':
          calc.incomingVAT.low += vatAmount;
          calc.basis.incomingLow += amountExVAT;
          break;
      }
    }
  });

  // Calculate totals
  calc.outgoingVAT.total =
    calc.outgoingVAT.high +
    calc.outgoingVAT.medium +
    calc.outgoingVAT.low;

  calc.incomingVAT.total =
    calc.incomingVAT.high +
    calc.incomingVAT.medium +
    calc.incomingVAT.low +
    calc.incomingVAT.import +
    calc.incomingVAT.reverse;

  // Net VAT = Outgoing - Incoming + Adjustments
  calc.netVAT =
    calc.outgoingVAT.total -
    calc.incomingVAT.total +
    calc.adjustments.outgoing -
    calc.adjustments.incoming;

  return calc;
}

/**
 * Determine period type based on date range
 */
function determinePeriodType(start: Date, end: Date): MVAPeriod {
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 35) {
    return MVAPeriod.MONTHLY;
  } else if (days <= 70) {
    return MVAPeriod.BIMONTHLY;
  } else {
    return MVAPeriod.YEARLY;
  }
}

/**
 * Generate MVA period dates for a given year
 */
export function generateMVAPeriods(year: number, periodType: MVAPeriod): Array<{start: Date, end: Date}> {
  const periods: Array<{start: Date, end: Date}> = [];

  if (periodType === MVAPeriod.MONTHLY) {
    // 12 monthly periods
    for (let month = 0; month < 12; month++) {
      periods.push({
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0) // Last day of month
      });
    }
  } else if (periodType === MVAPeriod.BIMONTHLY) {
    // 6 bi-monthly periods
    for (let period = 0; period < 6; period++) {
      const startMonth = period * 2;
      periods.push({
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 2, 0) // Last day of second month
      });
    }
  } else {
    // 1 yearly period
    periods.push({
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31)
    });
  }

  return periods;
}

/**
 * Validate MVA calculation and return warnings
 */
export interface MVAValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateMVACalculation(calc: MVACalculation): MVAValidation {
  const validation: MVAValidation = {
    valid: true,
    warnings: [],
    errors: []
  };

  // Check if net VAT is suspiciously high
  if (calc.netVAT > calc.turnover * 0.3) {
    validation.warnings.push(
      'Netto MVA er over 30% av omsetningen. Dette kan være feil.'
    );
  }

  // Check if turnover is zero but VAT exists
  if (calc.turnover === 0 && calc.outgoingVAT.total > 0) {
    validation.errors.push(
      'Omsetning er 0 men utgående MVA er registrert. Sjekk transaksjoner.'
    );
    validation.valid = false;
  }

  // Check if incoming VAT is higher than outgoing (unusual but possible)
  if (calc.incomingVAT.total > calc.outgoingVAT.total * 2) {
    validation.warnings.push(
      'Inngående MVA er mer enn dobbelt så høy som utgående MVA. Sjekk om dette er korrekt.'
    );
  }

  // Check basis amounts match calculated VAT
  const calculatedOutgoingHigh = calc.basis.outgoingHigh * 0.25;
  if (Math.abs(calculatedOutgoingHigh - calc.outgoingVAT.high) > 0.5) {
    validation.warnings.push(
      `Utgående MVA 25% matcher ikke grunnlaget. Forventet: ${calculatedOutgoingHigh.toFixed(2)}, Faktisk: ${calc.outgoingVAT.high.toFixed(2)}`
    );
  }

  const calculatedOutgoingMedium = calc.basis.outgoingMedium * 0.15;
  if (Math.abs(calculatedOutgoingMedium - calc.outgoingVAT.medium) > 0.5) {
    validation.warnings.push(
      `Utgående MVA 15% matcher ikke grunnlaget. Forventet: ${calculatedOutgoingMedium.toFixed(2)}, Faktisk: ${calc.outgoingVAT.medium.toFixed(2)}`
    );
  }

  return validation;
}

/**
 * Create or update VAT report in database
 */
export async function saveVATReport(
  tenantId: string,
  userId: string,
  calculation: MVACalculation,
  submit: boolean = false
): Promise<any> {
  // Check if report already exists for this period
  const existing = await prisma.vATReport.findFirst({
    where: {
      tenantId,
      periodStart: calculation.period.start,
      periodEnd: calculation.period.end
    }
  });

  const data = {
    periodStart: calculation.period.start,
    periodEnd: calculation.period.end,
    totalSales: calculation.turnover,
    totalVATOut: calculation.outgoingVAT.total,
    totalPurchases: calculation.basis.incomingHigh + calculation.basis.incomingMedium + calculation.basis.incomingLow,
    totalVATIn: calculation.incomingVAT.total,
    netVAT: calculation.netVAT,
    status: submit ? 'SUBMITTED' : 'DRAFT',
    submittedAt: submit ? new Date() : null,
    submittedBy: submit ? userId : null,
    notes: JSON.stringify({
      outgoingVAT: calculation.outgoingVAT,
      incomingVAT: calculation.incomingVAT,
      basis: calculation.basis
    })
  };

  if (existing) {
    return prisma.vATReport.update({
      where: { id: existing.id },
      data
    });
  } else {
    return prisma.vATReport.create({
      data: {
        tenantId,
        ...data
      }
    });
  }
}

/**
 * Get the current MVA period based on today's date
 */
export function getCurrentMVAPeriod(periodType: MVAPeriod): {start: Date, end: Date} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (periodType === MVAPeriod.MONTHLY) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0)
    };
  } else if (periodType === MVAPeriod.BIMONTHLY) {
    const periodIndex = Math.floor(month / 2);
    const startMonth = periodIndex * 2;
    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 2, 0)
    };
  } else {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31)
    };
  }
}

/**
 * Generate formatted MVA report text for export
 */
export function formatMVAReportText(calc: MVACalculation): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('MVA-OPPGAVE (MERVERDIAVGIFT)');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Periode: ${calc.period.start.toLocaleDateString('nb-NO')} - ${calc.period.end.toLocaleDateString('nb-NO')}`);
  lines.push('');

  lines.push('UTGÅENDE MERVERDIAVGIFT:');
  lines.push(`  Salg 25% MVA (grunnlag: ${calc.basis.outgoingHigh.toFixed(2)})  ${calc.outgoingVAT.high.toFixed(2)} kr`);
  lines.push(`  Salg 15% MVA (grunnlag: ${calc.basis.outgoingMedium.toFixed(2)})  ${calc.outgoingVAT.medium.toFixed(2)} kr`);
  lines.push(`  Salg 12% MVA (grunnlag: ${calc.basis.outgoingLow.toFixed(2)})  ${calc.outgoingVAT.low.toFixed(2)} kr`);
  lines.push(`  SUM utgående MVA:                              ${calc.outgoingVAT.total.toFixed(2)} kr`);
  lines.push('');

  lines.push('INNGÅENDE MERVERDIAVGIFT:');
  lines.push(`  Kjøp 25% MVA (grunnlag: ${calc.basis.incomingHigh.toFixed(2)})  ${calc.incomingVAT.high.toFixed(2)} kr`);
  lines.push(`  Kjøp 15% MVA (grunnlag: ${calc.basis.incomingMedium.toFixed(2)})  ${calc.incomingVAT.medium.toFixed(2)} kr`);
  lines.push(`  Kjøp 12% MVA (grunnlag: ${calc.basis.incomingLow.toFixed(2)})  ${calc.incomingVAT.low.toFixed(2)} kr`);
  lines.push(`  SUM inngående MVA:                             ${calc.incomingVAT.total.toFixed(2)} kr`);
  lines.push('');

  lines.push(`Total omsetning (eks. MVA):                      ${calc.turnover.toFixed(2)} kr`);
  lines.push('');
  lines.push('='.repeat(60));
  lines.push(`MVA TIL ${calc.netVAT >= 0 ? 'BETALING' : 'TILBAKEBETALING'}:                           ${Math.abs(calc.netVAT).toFixed(2)} kr`);
  lines.push('='.repeat(60));

  return lines.join('\n');
}
