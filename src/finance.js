import Papa from 'papaparse';

const HEADER_COLUMNS = [
  'Transaction Date',
  'Value Date',
  'Statement Code',
  'Description',
  'Status',
  'Currency',
  'Debit Amount',
  'Credit Amount',
];

const CATEGORY_RULES = [
  ['Income', /salary|paynow transfer salary|giro salary|payroll/i],
  ['Groceries', /fairprice|cold storage|sheng siong|giant|ntuc|don don donki|redmart|supermarket/i],
  ['Dining & Drinks', /starbucks|coffee|kopi|mcdonald|kfc|burger|restaurant|food|toast box|yakun|grabfood|deliveroo|foodpanda|hawker|cafe|subway/i],
  ['Transport', /grab rides|grab\*rides|gojek|comfort|taxi|cdg|mrt|simplygo|ez-link|transitlink|bus\/mrt|transport/i],
  ['Shopping', /shopee|lazada|amazon|qoo10|uniqlo|zara|shein|etsy|retail|apple\.com|department store|watsons|koreanfashion|floristique/i],
  ['Gaming & Entertainment', /clash royale|steamgames|steam|epic games|riot games|gv online|gv i\d+|cinema|movie|escape room|lost sg|x-craft/i],
  ['Healthcare', /paincare|clinic|hospital|pharmacy|medical|dental|doctor|healthcare/i],
  ['Subscriptions', /spotify|netflix|disney|youtube|google storage|icloud|openai|anthropic|notion|adobe|circles\.life|subscription/i],
  ['Bills & Utilities', /singtel|starhub|m1|sp services|utilities|insurance|telco|mobile|broadband|electricity|water/i],
  ['Cash / ATM', /atm cash withdrawal|cash withdrawal|dbs\/posb atm/i],
  ['Transfers', /paylah|paynow|fund transfer|fast transfer|\btrf\b|ibg|meps|transfer/i],
  ['Fees & Finance', /fee|interest|charge|loan|installment|instalment|finance/i],
];

export function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[$,\s]/g, '').trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeDate(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (!match) return raw;
  const [, day, monthName, year] = match;
  const monthMap = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03', apr: '04', april: '04',
    may: '05', jun: '06', june: '06', jul: '07', july: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09',
    oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12',
  };
  const month = monthMap[monthName.toLowerCase()];
  return month ? `${year}-${month}-${String(day).padStart(2, '0')}` : raw;
}

function compactDescription(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\b\d{8,}\b/g, '')
    .trim();
}

export function categorizeTransaction(transaction) {
  const description = transaction.description || '';
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(description)) return category;
  }
  return transaction.type === 'income' ? 'Income' : 'Other';
}

function findHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const cells = row.map((cell) => String(cell || '').trim());
    return HEADER_COLUMNS.every((column) => cells.includes(column));
  });
}

export function parseDbsCsv(csvText) {
  const raw = Papa.parse(csvText.trim(), { skipEmptyLines: true }).data;
  const headerIndex = findHeaderIndex(raw);
  if (headerIndex === -1) {
    throw new Error('Could not find DBS transaction header row. Export must include Transaction Date, Description, Debit Amount, and Credit Amount.');
  }

  const headers = raw[headerIndex].map((header) => String(header || '').trim());
  return raw.slice(headerIndex + 1)
    .map((row, index) => Object.fromEntries(headers.map((header, colIndex) => [header, row[colIndex] ?? ''])))
    .filter((row) => row['Transaction Date'] && row.Description)
    .map((row, index) => {
      const debit = normalizeMoney(row['Debit Amount']);
      const credit = normalizeMoney(row['Credit Amount']);
      const amount = credit > 0 ? credit : -debit;
      const type = amount >= 0 ? 'income' : 'expense';
      const tx = {
        id: `${normalizeDate(row['Transaction Date'])}-${index}`,
        date: normalizeDate(row['Transaction Date']),
        valueDate: normalizeDate(row['Value Date']),
        statementCode: row['Statement Code'] || '',
        description: compactDescription(row.Description),
        supplementaryDescription: row['Supplementary Code Description'] || '',
        clientReference: row['Client Reference'] || '',
        additionalReference: row['Additional Reference'] || '',
        status: row.Status || '',
        currency: row.Currency || 'SGD',
        debit,
        credit,
        amount: round2(amount),
        type,
      };
      return { ...tx, category: categorizeTransaction(tx), merchant: merchantName(tx.description) };
    });
}

export function merchantName(description) {
  const compact = compactDescription(description);
  const upper = compact.toUpperCase();

  if (/^TRF\s+TOP-?UP\s+TO\s+PAYLAH!?/i.test(compact)) return 'PayLah! Top-up';
  if (/^TRF\s+FT[A-Z0-9]+\s+\d{3}-\d{5}-\d:IB(?:\s+UEN)?$/i.test(compact)) return 'Bank Transfer';
  if (/^TRF\s+/i.test(compact)) return 'Bank Transfer';

  let merchant = upper
    .replace(/^(NETS|VISA|MASTERCARD|PAYNOW|FAST|GIRO|BAT)\s+/i, '')
    .replace(/\s+\d{1,2}[A-Z]{3}\s+.*$/i, '')
    .replace(/\s+\d{4}-\d{4}-\d{4}-\d{4}.*$/i, '')
    .replace(/\s+G\.CO\/.*$/i, '')
    .replace(/\s+(SI|SGP|SG|USA|DUBL|AD)\s*$/i, '')
    .trim();

  const knownCleanup = [
    [/^SINGAPORE PAINCARE CEN\b.*/i, 'SINGAPORE PAINCARE CEN'],
    [/^GOOGLE CLASH ROYALE\b.*/i, 'GOOGLE CLASH ROYALE'],
    [/^STEAMGAMES\.COM\b.*/i, 'STEAMGAMES.COM'],
    [/^PAYPAL \*EPIC GAMES\b.*/i, 'EPIC GAMES'],
    [/^ADOBE\b.*/i, 'ADOBE'],
  ];
  for (const [pattern, replacement] of knownCleanup) {
    if (pattern.test(merchant)) return replacement;
  }

  return merchant;
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sortAmountDesc(a, b) {
  return b.amount - a.amount;
}

export function aggregateTransactions(transactions) {
  const expenses = transactions.filter((tx) => tx.type === 'expense');
  const income = transactions.filter((tx) => tx.type === 'income');
  const totalIncome = round2(income.reduce((sum, tx) => sum + tx.credit, 0));
  const totalExpense = round2(expenses.reduce((sum, tx) => sum + tx.debit, 0));
  const netCashflow = round2(totalIncome - totalExpense);
  const savingsRate = totalIncome ? round2((netCashflow / totalIncome) * 100) : 0;

  const categoryMap = new Map();
  for (const tx of expenses) {
    const current = categoryMap.get(tx.category) || { category: tx.category, amount: 0, count: 0, share: 0 };
    current.amount = round2(current.amount + tx.debit);
    current.count += 1;
    categoryMap.set(tx.category, current);
  }
  const categoryTotals = [...categoryMap.values()]
    .map((item) => ({ ...item, share: totalExpense ? round2((item.amount / totalExpense) * 100) : 0 }))
    .sort(sortAmountDesc);

  const merchantMap = new Map();
  for (const tx of expenses) {
    const current = merchantMap.get(tx.merchant) || { merchant: tx.merchant, category: tx.category, amount: 0, count: 0 };
    current.amount = round2(current.amount + tx.debit);
    current.count += 1;
    merchantMap.set(tx.merchant, current);
  }
  const topMerchants = [...merchantMap.values()].sort(sortAmountDesc).slice(0, 10);

  const monthlyMap = new Map();
  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    const current = monthlyMap.get(month) || { month, income: 0, expense: 0, net: 0 };
    if (tx.type === 'income') current.income = round2(current.income + tx.credit);
    if (tx.type === 'expense') current.expense = round2(current.expense + tx.debit);
    current.net = round2(current.income - current.expense);
    monthlyMap.set(month, current);
  }

  return {
    transactionCount: transactions.length,
    expenseCount: expenses.length,
    incomeCount: income.length,
    totalIncome,
    totalExpense,
    netCashflow,
    savingsRate,
    averageDailySpend: round2(totalExpense / Math.max(1, new Set(transactions.map((tx) => tx.date)).size)),
    categoryTotals,
    topMerchants,
    monthlyTrend: [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    transactions: [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export function generateInsights(summary) {
  const insights = [];
  if (summary.savingsRate >= 20) {
    insights.push({ severity: 'positive', title: 'Strong savings rate', body: `You kept ${summary.savingsRate}% of recorded income. Preserve this before optimizing small leaks.` });
  } else if (summary.totalIncome > 0) {
    insights.push({ severity: 'danger', title: 'Savings rate needs attention', body: `Savings rate is ${summary.savingsRate}%. Aim for 20% first, then raise the target.` });
  }

  const largestCategory = summary.categoryTotals[0];
  if (largestCategory) {
    insights.push({ severity: 'info', title: `${largestCategory.category} is your largest outflow`, body: `${largestCategory.category} took S$${largestCategory.amount.toFixed(2)} (${largestCategory.share}%). Start there; tiny cuts elsewhere are decorative gardening.` });
  }

  const cash = summary.categoryTotals.find((item) => item.category === 'Cash / ATM');
  if (cash && cash.share >= 20) {
    insights.push({ severity: 'warning', title: 'Cash withdrawals are hiding detail', body: `S$${cash.amount.toFixed(2)} went out through ATM/cash. Track where that cash goes or the dashboard loses x-ray vision.` });
  }

  const dining = summary.categoryTotals.find((item) => item.category === 'Dining & Drinks');
  if (dining && dining.count >= 5) {
    insights.push({ severity: 'warning', title: 'Dining frequency is the leak', body: `${dining.count} dining/drink transactions. Set a weekly cap rather than pretending coffee is not a budget category.` });
  }

  const subscriptions = summary.categoryTotals.find((item) => item.category === 'Subscriptions');
  if (subscriptions) {
    insights.push({ severity: 'info', title: 'Audit subscriptions monthly', body: `Recurring-looking spend is S$${subscriptions.amount.toFixed(2)}. Cancel one low-value service and redirect it to savings.` });
  }

  if (insights.length < 3) {
    insights.push({ severity: 'info', title: 'Next upgrade: tag recurring payments', body: 'Once recurring bills are tagged, we can separate fixed obligations from flexible spending.' });
  }
  return insights.slice(0, 6);
}

export function analyzeDbsCsv(csvText) {
  const transactions = parseDbsCsv(csvText);
  const summary = aggregateTransactions(transactions);
  return { transactions, summary, insights: generateInsights(summary) };
}
