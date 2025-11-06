
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
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { FinancialRecord, Account } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { DatePickerWithRange } from '@/components/date-picker-range';
import type { DateRange } from 'react-day-picker';


function LedgerRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-4 w-24" /></TableCell>
    </TableRow>
  );
}

export default function LedgerPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Query for all accounts
  const accountsQuery = useCollection<Account>(
    useMemoFirebase(
      () => (user && firestore ? query(collection(firestore, `users/${user.uid}/accounts`)) : null),
      [user, firestore]
    )
  );

  // Query for all financial records
  const financialRecordsQuery = useCollection<FinancialRecord>(
    useMemoFirebase(
      () => (user && firestore ? query(collection(firestore, `users/${user.uid}/financial_records`)) : null),
      [user, firestore]
    )
  );

  const { data: accounts, isLoading: isLoadingAccounts } = accountsQuery;
  const { data: financialRecords, isLoading: isLoadingRecords } = financialRecordsQuery;
  
  const allAccountOptions = useMemo(() => {
    const options = accounts ? [...accounts] : [];
    options.unshift({ id: 'cash-customer', name: 'Cash Customer', type: 'Customer' } as Account);
    return options;
  }, [accounts]);

  const selectedAccountName = useMemo(() => {
    return allAccountOptions.find(a => a.id === selectedAccountId)?.name || 'Select an account...';
  }, [selectedAccountId, allAccountOptions]);

  const { transactions, openingBalance, closingBalance } = useMemo(() => {
    if (!financialRecords || !selectedAccountId) {
      return { transactions: [], openingBalance: 0, closingBalance: 0 };
    }
    
    const filteredByAccount = financialRecords.filter(record => {
        if (selectedAccountId === 'cash-customer') {
            return record.category === 'Milk Sale' && record.recordType === 'Receipt'
        }
        return record.accountId === selectedAccountId;
    });

    const sortedTransactions = filteredByAccount.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentBalance = 0;
    const startDate = dateRange?.from ? new Date(dateRange.from) : null;
    if (startDate) startDate.setHours(0,0,0,0);

    const openingBal = sortedTransactions.reduce((acc, tx) => {
        const txDate = new Date(tx.date);
        txDate.setHours(0,0,0,0);

        if (startDate && txDate >= startDate) {
            return acc;
        }

        const isReceipt = tx.recordType === 'Receipt';
        const credit = isReceipt ? tx.amount : 0;
        const debit = !isReceipt ? tx.amount : 0;
        return acc + credit - debit;
    }, 0);

    const transactionsInRange = sortedTransactions.filter(tx => {
        const txDate = new Date(tx.date);
        txDate.setHours(0,0,0,0);
        
        const from = dateRange?.from ? new Date(dateRange.from) : null;
        if(from) from.setHours(0,0,0,0);

        const to = dateRange?.to ? new Date(dateRange.to) : null;
        if(to) to.setHours(0,0,0,0);

        if (from && to) return txDate >= from && txDate <= to;
        if (from) return txDate >= from;
        if (to) return txDate <= to;
        return true; // No date range specified, include all
    });
    
    currentBalance = openingBal;
    const transactionsWithBalance = transactionsInRange.map(tx => {
      const isReceipt = tx.recordType === 'Receipt';
      const credit = isReceipt ? tx.amount : 0;
      const debit = !isReceipt ? tx.amount : 0;
      currentBalance += (credit - debit);
      return {
        ...tx,
        credit,
        debit,
        balance: currentBalance,
      };
    });

    return { 
        transactions: transactionsWithBalance, 
        openingBalance: openingBal, 
        closingBalance: currentBalance 
    };

  }, [financialRecords, selectedAccountId, dateRange]);

  const isLoading = isLoadingAccounts || isLoadingRecords;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Account Ledger</CardTitle>
              <CardDescription>View the detailed transaction history for any account.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
               <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full md:w-[300px] justify-between">
                            {selectedAccountName}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search account..." />
                            <CommandEmpty>No accounts found.</CommandEmpty>
                            <CommandGroup>
                                {allAccountOptions.map(account => (
                                    <CommandItem
                                        key={account.id}
                                        value={account.name}
                                        onSelect={() => {
                                            setSelectedAccountId(account.id);
                                            setPopoverOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", selectedAccountId === account.id ? "opacity-100" : "opacity-0")} />
                                        {account.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit (₹)</TableHead>
                <TableHead className="text-right">Credit (₹)</TableHead>
                <TableHead className="text-right">Balance (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && selectedAccountId && Array.from({length: 5}).map((_, i) => <LedgerRowSkeleton key={i} />)}
              
              {!selectedAccountId && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        Please select an account to view the ledger.
                    </TableCell>
                </TableRow>
              )}

              {selectedAccountId && !isLoading && transactions.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No transactions found for this account in the selected date range.
                    </TableCell>
                </TableRow>
              )}
              
              {transactions.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={4}>Opening Balance</TableCell>
                    <TableCell className={cn("text-right", openingBalance < 0 ? "text-destructive" : "")}>
                        {openingBalance.toFixed(2)}
                    </TableCell>
                </TableRow>
              )}

              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate">{tx.description}</TableCell>
                  <TableCell className="text-right text-destructive">{tx.debit > 0 ? tx.debit.toFixed(2) : '-'}</TableCell>
                  <TableCell className="text-right text-green-600">{tx.credit > 0 ? tx.credit.toFixed(2) : '-'}</TableCell>
                  <TableCell className={cn("text-right font-semibold", tx.balance < 0 ? "text-destructive" : "")}>
                    {tx.balance.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
             {transactions.length > 0 && (
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4} className="text-right font-bold text-lg">Closing Balance</TableCell>
                        <TableCell className={cn("text-right font-bold text-lg", closingBalance < 0 ? "text-destructive" : "")}>
                            ₹{closingBalance.toFixed(2)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
