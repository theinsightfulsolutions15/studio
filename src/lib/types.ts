import type { LucideIcon } from "lucide-react";

export type Animal = {
  id: string;
  govtTagNo: string;
  tagColor: 'Yellow' | 'Blue' | 'Green' | 'Red';
  breed: 'Gir' | 'Sahiwal' | 'Red Sindhi' | 'Murrah' | 'Other';
  color: string;
  healthStatus: 'Healthy' | 'Sick' | 'Under Treatment';
  imageUrl: string;
  imageHint: string;
  entryDate: string;
  reasonForEntry: string;
  exitDate?: string;
  reasonForExit?: string;
  ownerId?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  status: 'Pending' | 'Active' | 'Inactive' | 'Expired';
  signupDate: string;
  customerId?: string;
  photoURL?: string;
  validityDate?: string; // Added validityDate
};

export type FinancialRecord = {
  id: string;
  date: string;
  type: 'Receipt' | 'Payment' | 'Expense' | 'AMC';
  category: string;
  amount: number;
  description: string;
  ownerId?: string;
  transactionType?: 'RTGS' | 'NEFT' | 'UPI' | 'Cash' | 'Other';
};

export type MilkRecord = {
  id: string;
  date: string;
  animalId: string;
  animalTag: string;
  quantity: number; // in liters
  time: 'Morning' | 'Evening';
};

export type NavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  label?: string;
};

export type AnimalMovement = {
  id: string;
  animalId: string;
  animalTag: string;
  type: 'Entry' | 'Exit';
  date: string;
  reason: string;
};

export type AmcDetail = {
    id: string;
    userId: string;
    customerId?: string;
    startDate: string;
    endDate: string;
    amount: number;
    transactionType: 'RTGS' | 'NEFT' | 'UPI' | 'Cash' | 'Other';
    description: string;
};
