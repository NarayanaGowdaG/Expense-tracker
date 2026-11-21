import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction } from '../types/finance.ts';
import { formatDateTimeDisplay, formatINR } from './format.ts';

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportTransactionsToCSV(transactions: Transaction[], reportLabel: string): void {
  const headers = [
    'Date & Time',
    'Title',
    'Type',
    'Category',
    'Payment Method',
    'Amount (INR)',
    'Notes',
  ];

  const rows = transactions.map((tx) => [
    tx.dateTime.replace('T', ' '),
    tx.title,
    tx.type === 'income' ? 'Income' : 'Expense',
    tx.categoryName,
    tx.paymentMethod,
    tx.amount.toFixed(2),
    tx.notes,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSlug = reportLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.href = url;
  link.download = `myexpense-${safeSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToPDF(
  transactions: Transaction[],
  reportTitle: string,
  userEmail: string,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

  // Header band
  doc.setFillColor(11, 18, 36);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 96, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MyExpense Financial Report', 40, 42);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`${reportTitle}  |  Account: ${userEmail}`, 40, 62);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 40, 76);

  // Summary metrics
  const formatPdfInr = (val: number) => `INR ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  autoTable(doc, {
    startY: 116,
    head: [['Total Income', 'Total Expenses', 'Net Savings', 'Savings Rate']],
    body: [[
      formatPdfInr(totalIncome),
      formatPdfInr(totalExpense),
      formatPdfInr(netSavings),
      `${savingsRate}%`,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [40, 123, 255], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 8 },
  });

  const summaryEndY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 180;

  // Category breakdown (expenses)
  const categoryTotals = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals.set(t.categoryName, (categoryTotals.get(t.categoryName) ?? 0) + t.amount);
    });

  const categoryRows = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => [
      name,
      formatPdfInr(amount),
      totalExpense > 0 ? `${((amount / totalExpense) * 100).toFixed(1)}%` : '0.0%',
    ]);

  let nextStartY = summaryEndY + 24;
  if (categoryRows.length > 0) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Expense Breakdown by Category', 40, nextStartY);

    autoTable(doc, {
      startY: nextStartY + 10,
      head: [['Category', 'Amount', 'Share of Expenses']],
      body: categoryRows,
      theme: 'striped',
      headStyles: { fillColor: [17, 28, 50], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
    });

    nextStartY =
      ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? nextStartY + 60) + 24;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Transactions (${transactions.length})`, 40, nextStartY);

  autoTable(doc, {
    startY: nextStartY + 10,
    head: [['Date & Time', 'Title', 'Category', 'Method', 'Type', 'Amount']],
    body: transactions.map((tx) => [
      formatDateTimeDisplay(tx.dateTime).replace(' · ', ' '),
      tx.title,
      tx.categoryName,
      tx.paymentMethod,
      tx.type === 'income' ? 'Income' : 'Expense',
      `${tx.type === 'income' ? '+' : '-'}${formatINR(tx.amount).replace('₹', 'INR ')}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [17, 28, 50], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 5 },
  });

  const safeSlug = reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`myexpense-${safeSlug}.pdf`);
}
