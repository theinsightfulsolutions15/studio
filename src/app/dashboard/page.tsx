
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
import { monthlyChartData } from '@/lib/placeholder-data';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { User as AppUser } from '@/lib/types';


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
        } catch (error) {
            console.error('Error submitting AMC:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit AMC renewal.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
         <Card className="border-amber-500/50 bg-amber-500/10">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <FileWarning className="h-6 w-6 text-amber-600" />
                    <div>
                        <CardTitle className="text-amber-800">Account Expired</CardTitle>
                        <CardDescription className="text-amber-700">Your AMC has expired. Please renew to restore full access.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </Card>
    )
}

export default function Dashboard() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isExpired, setIsExpired] = useState(false);
  
  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [authUser, firestore]);

  const { data: user, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

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

  const isLoading = isUserLoading || isUserDocLoading;

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
            <div className="text-2xl font-bold">125</div>
            <p className="text-xs text-muted-foreground">+5 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milk This Month</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,890 L</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses This Month</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹3,800</div>
            <p className="text-xs text-muted-foreground">-10% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animals Under Treatment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 Sick, 1 Injured</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>Monthly Milk Production vs Expenses</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
