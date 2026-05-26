import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  Coins,
  Download,
  FileUp,
  Landmark,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyzeDbsCsv, aggregateTransactions, generateInsights } from './finance.js';
import './styles.css';

const sampleTransactions = [
  // Demo rows only. They keep the page useful before upload without shipping any real statement data.
  { id: '1', date: '2026-05-01', description: 'NETS SUPERMARKET FAIRPRICE', merchant: 'SUPERMARKET FAIRPRICE', currency: 'SGD', debit: 43.2, credit: 0, amount: -43.2, type: 'expense', category: 'Groceries' },
  { id: '2', date: '2026-05-02', description: 'GRAB RIDES SINGAPORE', merchant: 'GRAB RIDES SINGAPORE', currency: 'SGD', debit: 18.8, credit: 0, amount: -18.8, type: 'expense', category: 'Transport' },
  { id: '3', date: '2026-05-03', description: 'STARBUCKS COFFEE', merchant: 'STARBUCKS COFFEE', currency: 'SGD', debit: 7.1, credit: 0, amount: -7.1, type: 'expense', category: 'Dining & Drinks' },
  { id: '4', date: '2026-05-04', description: 'PAYNOW TRANSFER SALARY', merchant: 'PAYNOW TRANSFER SALARY', currency: 'SGD', debit: 0, credit: 2500, amount: 2500, type: 'income', category: 'Income' },
  { id: '5', date: '2026-05-05', description: 'SPOTIFY PTE LTD', merchant: 'SPOTIFY PTE LTD', currency: 'SGD', debit: 11.98, credit: 0, amount: -11.98, type: 'expense', category: 'Subscriptions' },
  { id: '6', date: '2026-05-06', description: 'DBS/POSB ATM CASH WITHDRAWAL', merchant: 'DBS/POSB ATM CASH WITHDRAWAL', currency: 'SGD', debit: 100, credit: 0, amount: -100, type: 'expense', category: 'Cash / ATM' },
];

const demoSummary = aggregateTransactions(sampleTransactions);
const demoData = { transactions: sampleTransactions, summary: demoSummary, insights: generateInsights(demoSummary) };
const COLORS = ['#191c1f', '#494fdf', '#00a87e', '#e61e49', '#ec7e00', '#007bc2', '#936d62', '#8d969e'];

function money(value) {
  return `S$${Number(value || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(value) {
  return `${Number(value || 0).toLocaleString('en-SG', { maximumFractionDigits: 1 })}%`;
}

function StatCard({ label, value, helper, icon: Icon, tone = 'dark' }) {
  return (
    <section className={`stat-card ${tone}`}>
      <div className="stat-icon"><Icon size={18} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{helper}</span>
      </div>
    </section>
  );
}

function InsightCard({ insight }) {
  const Icon = insight.severity === 'positive' ? ShieldCheck : insight.severity === 'warning' ? AlertTriangle : insight.severity === 'danger' ? AlertTriangle : Brain;
  return (
    <article className={`insight ${insight.severity}`}>
      <Icon size={18} />
      <div>
        <h3>{insight.title}</h3>
        <p>{insight.body}</p>
      </div>
    </article>
  );
}

function App() {
  const [analysis, setAnalysis] = useState(demoData);
  const [fileName, setFileName] = useState('Demo data — upload your DBS CSV');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [error, setError] = useState('');

  const { summary, insights } = analysis;
  const filteredTransactions = useMemo(() => {
    return summary.transactions.filter((tx) => {
      const matchesQuery = !query || `${tx.description} ${tx.category} ${tx.merchant}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || tx.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [summary.transactions, query, selectedCategory]);

  const categories = ['All', ...summary.categoryTotals.map((item) => item.category)];
  const topCategories = summary.categoryTotals.slice(0, 8);
  const topMerchants = summary.topMerchants.slice(0, 7);

  async function handleFile(event) {
    // file.text() keeps the whole flow inside the browser. No upload endpoint, no quiet leak.
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const next = analyzeDbsCsv(text);
      setAnalysis(next);
      setFileName(file.name);
      setSelectedCategory('All');
      setQuery('');
      setError('');
    } catch (err) {
      setError(err.message || 'Could not parse CSV.');
    }
  }

  function exportCleanCsv() {
    // Export only the rows the user is looking at. It makes the filtered table portable.
    const headers = ['date', 'description', 'category', 'type', 'debit', 'credit', 'amount'];
    const rows = filteredTransactions.map((tx) => headers.map((header) => JSON.stringify(tx[header] ?? '')).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dbs-dashboard-clean-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <header className="hero">
        <nav>
          <div className="brand">Finance Tracker Dashboard</div>
        </nav>
        <section className="hero-grid">
          <div>
            <p className="eyebrow">Personal banking dashboard</p>
            <h1>Track your spending!</h1>
            <p className="hero-copy">Upload your DBS transaction CSV and get insights! NO FINANCIAL DATA IS PROCESSED OR SENT ANYWHERE. EVERYTHING IS HANDLED LOCALLY.</p>
            <div className="upload-row">
              <label className="upload-button">
                <FileUp size={18} /> Upload DBS CSV
                <input type="file" accept=".csv,text/csv" onChange={handleFile} />
              </label>
              <button className="ghost-button" onClick={exportCleanCsv}><Download size={18} /> Export filtered</button>
            </div>
            {error ? <p className="error">{error}</p> : <p className="file-name">{fileName}</p>}
          </div>
          <div className="hero-panel">
            <Sparkles size={22} />
            <h2>{pct(summary.savingsRate)}</h2>
            <p>Recorded savings rate</p>
            <span>{summary.transactionCount} transactions analysed</span>
          </div>
        </section>
      </header>

      <section className="stats-grid">
        <StatCard label="Income" value={money(summary.totalIncome)} helper={`${summary.incomeCount} incoming transactions`} icon={ArrowUpRight} tone="green" />
        <StatCard label="Spending" value={money(summary.totalExpense)} helper={`${summary.expenseCount} outgoing transactions`} icon={ArrowDownRight} tone="red" />
        <StatCard label="Net cashflow" value={money(summary.netCashflow)} helper="Income minus spending" icon={WalletCards} tone="blue" />
        <StatCard label="Avg daily spend" value={money(summary.averageDailySpend)} helper="Based on active transaction days" icon={Coins} />
      </section>

      <section className="dashboard-grid">
        <article className="panel large">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Spending mix</p>
              <h2>Category breakdown</h2>
            </div>
          </div>
          <div className="chart-row">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={topCategories} dataKey="amount" nameKey="category" innerRadius={70} outerRadius={110} paddingAngle={3}>
                  {topCategories.map((entry, index) => <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="category-list">
              {topCategories.map((item, index) => (
                <button key={item.category} onClick={() => setSelectedCategory(item.category)} className="category-item">
                  <span style={{ background: COLORS[index % COLORS.length] }} />
                  <b>{item.category}</b>
                  <em>{money(item.amount)} · {pct(item.share)}</em>
                </button>
              ))}
            </div>
          </div>
        </article>

        <aside className="panel insights-panel">
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">AI insights</p>
              <h2>Next moves</h2>
            </div>
            <Brain size={22} />
          </div>
          <div className="insight-list">
            {insights.map((insight) => <InsightCard key={insight.title} insight={insight} />)}
          </div>
        </aside>
      </section>

      <section className="dashboard-grid lower">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Cashflow</p>
              <h2>Monthly trend</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.monthlyTrend} margin={{ left: 4, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e9" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="income" fill="#00a87e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" fill="#e23b4a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mini-ledger">
            {summary.monthlyTrend.map((month) => (
              <div key={month.month}><b>{month.month}</b><span>Income {money(month.income)}</span><span>Spend {money(month.expense)}</span><strong>{money(month.net)}</strong></div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Merchants</p>
              <h2>Top money sinks</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topMerchants} layout="vertical" margin={{ left: 10, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e9" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="merchant" width={128} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="amount" fill="#191c1f" radius={[0, 8, 8, 0]} minPointSize={4} />
            </BarChart>
          </ResponsiveContainer>
          <div className="merchant-list">
            {topMerchants.slice(0, 5).map((merchant) => (
              <div key={merchant.merchant}><span>{merchant.merchant}</span><b>{money(merchant.amount)}</b></div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel transactions-panel">
        <div className="panel-head table-head">
          <div>
            <p className="eyebrow">Ledger</p>
            <h2>Transactions</h2>
          </div>
          <div className="filters">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant/category" /></label>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Category</th><th>Debit</th><th>Credit</th></tr>
            </thead>
            <tbody>
              {filteredTransactions.slice(0, 80).map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.description}</td>
                  <td><span className="tag">{tx.category}</span></td>
                  <td className="debit">{tx.debit ? money(tx.debit) : '—'}</td>
                  <td className="credit">{tx.credit ? money(tx.credit) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
