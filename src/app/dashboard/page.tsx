
'use client';

import { useAuth, useCollection, useMemoFirebase, useDoc, useFirestore, useUser, useFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { Animal, MilkRecord, FinancialRecord, User as AppUser, AmcRenewal } from '@/lib/types';
import { Users, UserCheck, UserPlus, ShieldCheck } from 'lucide-react';

function StatCard({ title, value, icon: Icon, description }: { title: string, value: number | string, icon: React.ElementType, description?: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}

function AdminDashboard() {
  const { firestore } = useFirebase();

  // Queries for Admin Stats
  const allUsersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const pendingUsersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('status', '==', 'Pending')) : null, [firestore]);
  const activeUsersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users'), where('status', '==', 'Active')) : null, [firestore]);
  const pendingRenewalsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'amc_renewals'), where('status', '==', 'Pending')) : null, [firestore]);

  const { data: allUsers, isLoading: isLoadingAllUsers } = useCollection<AppUser>(allUsersQuery);
  const { data: pendingUsers, isLoading: isLoadingPendingUsers } = useCollection<AppUser>(pendingUsersQuery);
  const { data: activeUsers, isLoading: isLoadingActiveUsers } = useCollection<AppUser>(activeUsersQuery);
  const { data: pendingRenewals, isLoading: isLoadingRenewals } = useCollection<AmcRenewal>(pendingRenewalsQuery);

  const isLoading = isLoadingAllUsers || isLoadingPendingUsers || isLoadingActiveUsers || isLoadingRenewals;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium"><Spinner /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><Spinner /></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={allUsers?.length ?? 0} icon={Users} description="All registered users in the system." />
        <StatCard title="Pending Users" value={pendingUsers?.length ?? 0} icon={UserPlus} description="Users awaiting approval." />
        <StatCard title="Active Users" value={activeUsers?.length ?? 0} icon={UserCheck} description="Users with active accounts." />
        <StatCard title="Pending Renewals" value={pendingRenewals?.length ?? 0} icon={ShieldCheck} description="AMC renewal requests to be approved." />
    </div>
  );
}


function UserDashboard() {
    const { user } = useUser();
    const firestore = useFirestore();

    const animalsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, `users/${user.uid}/animals`) : null), [firestore, user]);
    const milkRecordsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, `users/${user.uid}/milk_records`) : null), [firestore, user]);
    const financialRecordsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, `users/${user.uid}/financial_records`) : null), [firestore, user]);

    const { data: animals, isLoading: isLoadingAnimals } = useCollection<Animal>(animalsQuery);
    const { data: milkRecords, isLoading: isLoadingMilk } = useCollection<MilkRecord>(milkRecordsQuery);
    const { data: financialRecords, isLoading: isLoadingFinancial } = useCollection<FinancialRecord>(financialRecordsQuery);

    const isLoading = isLoadingAnimals || isLoadingMilk || isLoadingFinancial;

     if (isLoading) {
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium"><Spinner /></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold"><Spinner /></div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Animals" value={animals?.length ?? 0} icon={Users} />
          <StatCard title="Milk Records" value={milkRecords?.length ?? 0} icon={Users} />
          <StatCard title="Financial Records" value={financialRecords?.length ?? 0} icon={Users} />
        </div>
    );
}

export default function Dashboard() {
  const { isUserLoading, isAdmin } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
                {isAdmin ? 'An overview of system activity.' : 'A summary of your Gaushala records.'}
            </p>
        </div>
        {isAdmin ? <AdminDashboard /> : <UserDashboard />}
    </div>
  );
}
