

// NOTE: This interface is for the MOCK data only. 
// The real interface in the service will use `totalAmount`.
export interface MockIncomeTransaction {
  date: string;
  company: string;
  description: string;
  totalAmount: number;
  incomeCategory: string;
  depositedTo: string;
  explanation: string;
  documentNumber: string;
  documentUrl?: string;
  type: 'business' | 'personal';
}

export interface MockExpenseTransaction {
  date: string;
  company: string;
  description: string;
  totalAmount: number;
  category: string;
  explanation: string;
  documentNumber: string;
  documentUrl?: string;
  type: 'business' | 'personal';
}

export const mockIncome: Omit<MockIncomeTransaction, 'userId'>[] = [
    { date: '2024-07-25', company: 'Client Alpha', description: 'Payment for web development services', totalAmount: 5000, incomeCategory: 'Service Revenue', depositedTo: 'Bank Account #1', explanation: 'Invoice #2024-015', documentNumber: '2024-015', type: 'business' },
    { date: '2024-07-24', company: 'E-commerce Store', description: 'Stripe Payout', totalAmount: 850.75, incomeCategory: 'Sales Revenue', depositedTo: 'Bank Account #1', explanation: 'Daily sales payout', documentNumber: 'STR-240724', type: 'business' },
    { date: '2024-07-22', company: 'Client Beta', description: 'Consulting services retainer', totalAmount: 2500, incomeCategory: 'Consulting', depositedTo: 'Bank Account #1', explanation: 'July Retainer', documentNumber: 'RET-007', type: 'business' },
    { date: '2024-07-20', company: 'Affiliate Payout', description: 'Affiliate commission', totalAmount: 120.50, incomeCategory: 'Other Income', depositedTo: 'Bank Account #1', explanation: 'Q2 Affiliate Payout', documentNumber: 'AFF-Q2-2024', type: 'business' },
];

export const mockExpenses: Omit<MockExpenseTransaction, 'userId'>[] = [
    { date: '2024-07-25', company: 'Cloud Hosting Inc.', description: 'Monthly server hosting', totalAmount: 150, category: 'Utilities', explanation: 'Server costs for ogeemo.com', documentNumber: 'CHI-98765', type: 'business' },
    { date: '2024-07-23', company: 'SaaS Tools Co.', description: 'Software subscription', totalAmount: 75.99, category: 'Other expenses', explanation: 'Monthly subscription for design software', documentNumber: 'SAAS-12345', type: 'business' },
    { date: '2024-07-20', company: 'Office Supply Hub', description: 'Printer paper and ink', totalAmount: 45.30, category: 'Office stationery and supplies', explanation: 'Restock office supplies', documentNumber: 'OSH-54321', type: 'business' },
    { date: '2024-07-18', company: 'Jane Designs', description: 'Contract graphic design work', totalAmount: 800, category: 'Professional fees (includes legal and accounting fees)', explanation: 'Logo design for new project', documentNumber: 'JD-2024-07', type: 'business' },
];
