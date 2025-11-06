
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
    options.unshift({ id: 'cash-customer', name: 'Cash Customer', type: 'Customer' });
    return options;
  }, [accounts]);

  const selectedAccountName = useMemo(() => {
    return allAccountOptions.find(a => a.id === selectedAccountId)?.name || 'Select an account...';
  }, [selectedAccountId, allAccountOptions]);

  const { transactions, openingBalance, closingBalance } = useMemo(() => {
    if (!financialRecords || !selectedAccountId) {
      return { transactions: [], openingBalance: 0, closingBalance: 0 };
    }
    
    // For 'cash-customer', we only consider records with category 'Milk Sale' and type 'Receipt'
     const filteredRecords = financialRecords.filter(record => {
        if (selectedAccountId === 'cash-customer') {
            return record.category === 'Milk Sale' && record.recordType === 'Receipt'
        }
        return record.accountId === selectedAccountId;
    });

    const sortedTransactions = filteredRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentBalance = 0;
    const transactionsWithBalance = sortedTransactions.map(tx => {
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
        openingBalance: 0, // Simplified for now
        closingBalance: currentBalance 
    };

  }, [financialRecords, selectedAccountId]);

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
            <div className="w-full md:w-auto md:min-w-[300px]">
               <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
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
                        No transactions found for this account.
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

