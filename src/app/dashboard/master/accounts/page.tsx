
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Account } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

function AccountRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
    </TableRow>
  );
}

const initialAccountState: Omit<Account, 'id' | 'ownerId'> = {
  name: '',
  type: 'Customer',
};

export default function AccountsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<Account, 'id' | 'ownerId'>>(initialAccountState);

  const accountsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/accounts`));
  }, [user, firestore]);

  const { data: accounts, isLoading } = useCollection<Account>(accountsQuery);

  const customerAccounts = useMemo(() => accounts?.filter(acc => acc.type === 'Customer'), [accounts]);
  const bankAccounts = useMemo(() => accounts?.filter(acc => acc.type === 'Bank'), [accounts]);
  const expenseAccounts = useMemo(() => accounts?.filter(acc => acc.type === 'Expense'), [accounts]);

  const openDialog = () => {
    setFormData(initialAccountState);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!formData.name) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Account Name is required.' });
      return;
    }

    setIsSubmitting(true);
    const accountsColRef = collection(firestore, `users/${user.uid}/accounts`);
    
    try {
      await addDocumentNonBlocking(accountsColRef, { ...formData, ownerId: user.uid });
      toast({ title: 'Success', description: 'New account has been created.' });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating account:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Master Accounts</CardTitle>
              <CardDescription>Manage your customer, bank, and expense accounts.</CardDescription>
            </div>
            <Button onClick={openDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="customers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="banks">Bank Accounts</TabsTrigger>
              <TabsTrigger value="expenses">Expense Accounts</TabsTrigger>
            </TabsList>
            <TabsContent value="customers" className="mt-4">
              <AccountsTable accounts={customerAccounts} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="banks" className="mt-4">
              <AccountsTable accounts={bankAccounts} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="expenses" className="mt-4">
              <AccountsTable accounts={expenseAccounts} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{accounts?.length ?? 0}</strong> total accounts
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new customer, bank, or expense account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-type">Account Type</Label>
              <Select value={formData.type} onValueChange={(value: 'Customer' | 'Bank' | 'Expense') => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="account-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Bank">Bank Account</SelectItem>
                  <SelectItem value="Expense">Expense Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                    formData.type === 'Customer' ? 'e.g., John Doe' :
                    formData.type === 'Bank' ? 'e.g., SBI Main Branch' :
                    'e.g., Fodder Expenses'
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleFormSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountsTable({ accounts, isLoading }: { accounts: Account[] | null | undefined, isLoading: boolean }) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Name</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 3 }).map((_, i) => <AccountRowSkeleton key={i} />)}
          {accounts?.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">{account.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{account.type}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && (!accounts || accounts.length === 0) && (
            <TableRow>
              <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                No accounts of this type found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
