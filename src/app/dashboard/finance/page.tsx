
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { FinancialRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function TransactionRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20 rounded-full" />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-4 w-16" />
      </TableCell>
    </TableRow>
  );
}

export default function FinancePage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const financialRecordsQuery = useCollection(
    useMemoFirebase(
      () => (user && firestore ? query(collection(firestore, 'financial_records')) : null),
      [user, firestore]
    )
  );

  const { data: financialData, isLoading } = financialRecordsQuery;
  
  const receipts = financialData?.filter((t) => t.type === 'Receipt');
  const payments = financialData?.filter((t) => t.type === 'Payment');
  const expenses = financialData?.filter((t) => t.type === 'Expense');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Financial Records</CardTitle>
            <CardDescription>
              Track all receipts, payments, and expenses.
            </CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <TransactionsTable data={financialData} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="receipts" className="mt-4">
            <TransactionsTable data={receipts} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="payments" className="mt-4">
            <TransactionsTable data={payments} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="expenses" className="mt-4">
            <TransactionsTable data={expenses} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-{financialData?.length ?? 0}</strong> of{' '}
          <strong>{financialData?.length ?? 0}</strong> transactions
        </div>
      </CardFooter>
    </Card>
  );
}

function TransactionsTable({
  data,
  isLoading,
}: {
  data: FinancialRecord[] | undefined | null;
  isLoading: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="hidden sm:table-cell">Category</TableHead>
          <TableHead className="hidden md:table-cell">Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <TransactionRowSkeleton key={i} />
          ))}
        {data?.map((record) => (
          <TableRow key={record.id}>
            <TableCell>{record.date}</TableCell>
            <TableCell>
              <Badge
                variant={
                  record.type === 'Receipt'
                    ? 'secondary'
                    : record.type === 'Expense'
                    ? 'destructive'
                    : 'outline'
                }
                className="bg-opacity-80"
              >
                {record.type}
              </Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {record.category}
            </TableCell>
            <TableCell className="hidden md:table-cell max-w-[200px] lg:max-w-[300px] truncate">
              {record.description}
            </TableCell>
            <TableCell className="text-right font-medium">
              ₹{record.amount.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
