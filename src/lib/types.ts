import type { LucideIcon } from "lucide-react";

export type Animal = {
  id: string;
  ownerId?: string;
  type: string;
  govtTagNo: string;
  breed: string;
  color: string;
  gender: 'Male' | 'Female';
  yearOfBirth: number;
  healthStatus: 'Healthy' | 'Sick' | 'Under Treatment';
  tagColor: string;
  identificationMark?: string;
  imageUrl?: string;
  imageHint?: string;
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
  validityDate?: string;
  address?: string;
  mobileNo?: string;
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

export type AmcRenewal = {
    id: string;
    userId: string;
    userName: string;
    customerId?: string;
    date: string;
    amount: number;
    transactionType: 'RTGS' | 'NEFT' | 'UPI' | 'Cash' | 'Other';
    status: 'Pending' | 'Approved';
    submittedAt: any; // Firestore Timestamp
};

export type AmcDetail = {
    id: string;
    userId: string;
    startDate: string;
    endDate: string;
    description: string;
};

export type GaushalaProfile = {
    id: string;
    name: string;
    address: string;
};
