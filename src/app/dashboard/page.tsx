
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Beef,
  Droplets,
  IndianRupee,
  Activity,
  FileWarning,
} from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, serverTimestamp, doc, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { User as AppUser, Animal, MilkRecord, FinancialRecord } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, getMonth, getYear, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';


const chartConfig = {
  milk: {
    label: 'Milk (L)',
    color: 'hsl(var(--chart-1))',
  },
  expense: {
    label: 'Expense (₹)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

function AmcRenewalForm() {
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const userDocRef = useMemoFirebase(() => {
        if (!authUser) return null;
        return doc(firestore, 'users', authUser.uid);
    }, [authUser, firestore]);

    const { data: user } = useDoc<AppUser>(userDocRef);

    const [amount, setAmount] = useState<number | ''>('');
    const [transactionType, setTransactionType] = useState<string>('');
    const [transactionDate, setTransactionDate] = useState<Date | undefined>(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async () => {
        if (!user || !firestore) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }
        if (!amount || !transactionType || !transactionDate) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all fields.' });
            return;
        }

        setIsSubmitting(true);
        const amcCollectionRef = collection(firestore, `amc_renewals`);
        
        try {
            await addDocumentNonBlocking(amcCollectionRef, {
                userId: user.id,
                userName: user.name || user.email,
                customerId: user.customerId,
                amount,
                transactionType,
                date: transactionDate.toISOString().split('T')[0],
                status: 'Pending',
                submittedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Your AMC renewal request has been submitted for admin approval.' });
            setAmount('');
            setTransactionType('');
            setTransactionDate(new Date());
            setIsOpen(false);
        } catch (error) {
            console.error('Error submitting AMC:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit AMC renewal.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
         <Card className="border-amber-500/50 bg-amber-500/10">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <FileWarning className="h-6 w-6 text-amber-600" />
                        <div>
                            <CardTitle className="text-amber-800">Account Expired</CardTitle>
                            <CardDescription className="text-amber-700">Your AMC has expired. Please renew to restore full access.</CardDescription>
                        </div>
                    </div>
                    <CollapsibleTrigger asChild>
                         <Button className="w-full sm:w-auto" variant="secondary">Click for Renewal</Button>
                    </CollapsibleTrigger>
                </div>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="space-y-4 pt-4 border-t border-amber-500/30">
                     <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="customerId">Customer ID</Label>
                            <Input id="customerId" value={user?.customerId || ''} disabled />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input id="amount" type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transactionType">Transaction Type</Label>
                            <Select onValueChange={setTransactionType} value={transactionType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RTGS">RTGS</SelectItem>
                                    <SelectItem value="NEFT">NEFT</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="transactionDate">Date</Label>
                            <DatePicker date={transactionDate} setDate={setTransactionDate} />
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Button onClick={handleSubmit} disabled={isSubmitting || isUserLoading} className="w-full sm:w-auto">
                            {isSubmitting ? 'Submitting...' : 'Submit for Renewal'}
                        </Button>
                    </div>
                </CardContent>
            </CollapsibleContent>
        </Card>
        </Collapsible>
    )
}

export default function Dashboard() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();
  const [isExpired, setIsExpired] = useState(false);
  
  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [authUser, firestore]);

  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);
  
  const isAdmin = user?.role === 'Admin';
  
  const baseQueryPath = useMemo(() => {
    if (!firestore || !authUser) return null;
    return isAdmin ? 'users' : `users/${authUser.uid}`;
  }, [firestore, authUser, isAdmin]);


  // --- Data Queries for Dashboard Cards & Chart ---
  const animalsQuery = useMemoFirebase(() => {
    if (!baseQueryPath) return null;
    const collectionPath = isAdmin ? 'animals' : `${baseQueryPath}/animals`;
    const q = isAdmin ? collection(firestore, collectionPath) : collection(firestore, collectionPath);
    return q;
  }, [baseQueryPath, firestore, isAdmin]);
  const { data: animals, isLoading: isLoadingAnimals } = useCollection<Animal>(animalsQuery);

  const milkRecordsQuery = useMemoFirebase(() => {
      if (!baseQueryPath) return null;
      const collectionPath = isAdmin ? 'milk_records' : `${baseQueryPath}/milk_records`;
      return collection(firestore, collectionPath);
  }, [baseQueryPath, firestore, isAdmin]);
  const { data: milkRecords, isLoading: isLoadingMilk } = useCollection<MilkRecord>(milkRecordsQuery);

  const financialRecordsQuery = useMemoFirebase(() => {
      if (!baseQueryPath) return null;
      const collectionPath = isAdmin ? 'financial_records' : `${baseQueryPath}/financial_records`;
      return collection(firestore, collectionPath);
  }, [baseQueryPath, firestore, isAdmin]);
  const { data: financialRecords, isLoading: isLoadingFinancial } = useCollection<FinancialRecord>(financialRecordsQuery);

  // --- Calculate Stats for Cards ---
  const {
      totalAnimals,
      animalsUnderTreatment,
      milkThisMonth,
      expensesThisMonth,
  } = useMemo(() => {
      const now = new Date();
      const currentMonth = getMonth(now);
      const currentYear = getYear(now);

      const totalAnimals = animals?.length || 0;
      const animalsUnderTreatment = animals?.filter(a => a.healthStatus === 'Sick' || a.healthStatus === 'Under Treatment').length || 0;

      const milkThisMonth = milkRecords?.filter(r => {
          const recordDate = new Date(r.date);
          return getMonth(recordDate) === currentMonth && getYear(recordDate) === currentYear;
      }).reduce((sum, r) => sum + r.quantity, 0) || 0;

      const expensesThisMonth = financialRecords?.filter(r => {
          const recordDate = new Date(r.date);
          return (r.recordType === 'Expense' || r.recordType === 'Payment') && getMonth(recordDate) === currentMonth && getYear(recordDate) === currentYear;
      }).reduce((sum, r) => sum + r.amount, 0) || 0;

      return { totalAnimals, animalsUnderTreatment, milkThisMonth, expensesThisMonth };
  }, [animals, milkRecords, financialRecords]);

  // --- Process Data for Chart ---
  const monthlyChartData = useMemo(() => {
      const data: { [month: string]: { milk: number; expense: number } } = {};
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
          const date = subMonths(now, i);
          const monthKey = format(date, 'MMM yyyy');
          data[monthKey] = { milk: 0, expense: 0 };
      }

      milkRecords?.forEach(r => {
          const recordDate = new Date(r.date);
          const monthKey = format(recordDate, 'MMM yyyy');
          if (data[monthKey]) {
              data[monthKey].milk += r.quantity;
          }
      });
      
      financialRecords?.forEach(r => {
          if (r.recordType === 'Expense' || r.recordType === 'Payment') {
              const recordDate = new Date(r.date);
              const monthKey = format(recordDate, 'MMM yyyy');
              if (data[monthKey]) {
                  data[monthKey].expense += r.amount;
              }
          }
      });

      return Object.entries(data).map(([month, values]) => ({
          month: month.split(' ')[0], // Just the month name
          milk: parseFloat(values.milk.toFixed(2)),
          expense: parseFloat(values.expense.toFixed(2))
      }));
  }, [milkRecords, financialRecords]);


  useEffect(() => {
    if (user) {
      if (user.status === 'Expired') {
        setIsExpired(true);
        return;
      }
      if (user.validityDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Compare dates only, not time
        const validity = new Date(user.validityDate);
        validity.setHours(0, 0, 0, 0);
        setIsExpired(validity < today);
      } else if (user.status !== 'Active' || user.role !== 'Admin') {
        // If user is not admin and has no validity date, they might be pending or have an issue
        // We assume non-admin users without a date are expired or pending. Admin is always active.
        setIsExpired(true);
      } else {
        setIsExpired(false);
      }
    } else if (!isUserDocLoading) {
      // If there's no user data and we're not loading, they can't be expired (they might not exist or be pending)
      setIsExpired(false);
    }
  }, [user, isUserDocLoading]);

  const isLoading = isAuthUserLoading || isUserDocLoading || isLoadingAnimals || isLoadingMilk || isLoadingFinancial;

  return (
    <div className="space-y-6">
      {(isExpired && !isLoading) && <AmcRenewalForm />}
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Animals</CardTitle>
            <Beef className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{totalAnimals}</div>}
            <p className="text-xs text-muted-foreground">Total registered animals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milk This Month</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{milkThisMonth.toFixed(2)} L</div>}
            <p className="text-xs text-muted-foreground">For {format(new Date(), 'MMMM')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses This Month</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-28" /> : <div className="text-2xl font-bold">₹{expensesThisMonth.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">For {format(new Date(), 'MMMM')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animals Under Treatment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{animalsUnderTreatment}</div>}
            <p className="text-xs text-muted-foreground">Currently sick or injured</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Monthly Milk Production vs Expenses (Last 6 Months)</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? (
             <div className="h-[300px] w-full flex items-center justify-center">
                 <p className="text-muted-foreground">Loading chart data...</p>
             </div>
          ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis />
                <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend />
                <Bar dataKey="milk" fill="var(--color-milk)" radius={4} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
