import { describe, expect, it } from 'vitest';
import {
  aggregateTransactions,
  categorizeTransaction,
  generateInsights,
  parseDbsCsv,
} from '../src/finance.js';

const sampleCsv = `Account Details,,,,,,,,,,,
Generated On,26 May 2026,,,,,,,,,,
,,,,,,,,,,,
Transaction Date,Value Date,Statement Code,Description,Supplementary Code,Supplementary Code Description,Client Reference,Additional Reference,Status,Currency,Debit Amount,Credit Amount
01 May 2026,01 May 2026,881,NETS SUPERMARKET FAIRPRICE,,,,,COMPLETED,SGD,23.50,
02 May 2026,02 May 2026,881,GRAB RIDES SINGAPORE,,,,,COMPLETED,SGD,18.20,
03 May 2026,03 May 2026,169,PAYNOW TRANSFER SALARY,,,,,COMPLETED,SGD,,2500.00
04 May 2026,04 May 2026,881,STARBUCKS COFFEE,,,,,COMPLETED,SGD,7.10,
05 May 2026,05 May 2026,881,DBS/POSB ATM CASH WITHDRAWAL,,,,,COMPLETED,SGD,100.00,
`;

describe('parseDbsCsv', () => {
  it('finds the DBS header after preamble rows and parses debit/credit amounts', () => {
    const transactions = parseDbsCsv(sampleCsv);

    expect(transactions).toHaveLength(5);
    expect(transactions[0]).toMatchObject({
      date: '2026-05-01',
      description: 'NETS SUPERMARKET FAIRPRICE',
      currency: 'SGD',
      debit: 23.5,
      credit: 0,
      amount: -23.5,
      type: 'expense',
    });
    expect(transactions[2]).toMatchObject({
      amount: 2500,
      type: 'income',
    });
  });
});

describe('categorizeTransaction', () => {
  it('maps common Singapore/DBS merchant descriptions into useful budget categories', () => {
    expect(categorizeTransaction({ description: 'GRAB RIDES SINGAPORE' })).toBe('Transport');
    expect(categorizeTransaction({ description: 'STARBUCKS COFFEE' })).toBe('Dining & Drinks');
    expect(categorizeTransaction({ description: 'FAIRPRICE FINEST' })).toBe('Groceries');
    expect(categorizeTransaction({ description: 'SPOTIFY PTE LTD' })).toBe('Subscriptions');
    expect(categorizeTransaction({ description: 'BAT Google Clash Royale' })).toBe('Gaming & Entertainment');
    expect(categorizeTransaction({ description: 'BAT SINGAPORE PAINCARE CEN' })).toBe('Healthcare');
    expect(categorizeTransaction({ description: 'TRF TOP-UP TO PAYLAH!' })).toBe('Transfers');
    expect(categorizeTransaction({ description: 'BAT Shein Shein SGP' })).toBe('Shopping');
  });
});

describe('aggregateTransactions', () => {
  it('computes cashflow, category totals, top merchants, and monthly trends', () => {
    const summary = aggregateTransactions(parseDbsCsv(sampleCsv));

    expect(summary.totalIncome).toBe(2500);
    expect(summary.totalExpense).toBe(148.8);
    expect(summary.netCashflow).toBe(2351.2);
    expect(summary.savingsRate).toBe(94.05);
    expect(summary.categoryTotals).toEqual([
      { category: 'Cash / ATM', amount: 100, count: 1, share: 67.2 },
      { category: 'Groceries', amount: 23.5, count: 1, share: 15.79 },
      { category: 'Transport', amount: 18.2, count: 1, share: 12.23 },
      { category: 'Dining & Drinks', amount: 7.1, count: 1, share: 4.77 },
    ]);
    expect(summary.topMerchants[0]).toMatchObject({ merchant: 'DBS/POSB ATM CASH WITHDRAWAL', amount: 100 });
    expect(summary.monthlyTrend).toEqual([{ month: '2026-05', income: 2500, expense: 148.8, net: 2351.2 }]);
  });
});

describe('generateInsights', () => {
  it('returns actionable spending insights from summary patterns', () => {
    const summary = aggregateTransactions(parseDbsCsv(sampleCsv));
    const insights = generateInsights(summary);

    expect(insights.length).toBeGreaterThanOrEqual(3);
    expect(insights[0]).toMatchObject({ severity: 'positive' });
    expect(insights.map((item) => item.title)).toContain('Cash withdrawals are hiding detail');
  });
});
