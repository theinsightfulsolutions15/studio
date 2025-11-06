
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { MilkRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


function MilkRecordRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
    )
}

export default function MilkRecordsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const milkRecordsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/milk_records`));
  }, [user, firestore]);

  const { data: milkData, isLoading } = useCollection<MilkRecord>(milkRecordsQuery);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Milk Records</CardTitle>
                <CardDescription>Log and monitor daily milk production.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Record
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Animal Tag</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Quantity (Liters)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({length: 5}).map((_, i) => <MilkRecordRowSkeleton key={i} />)}
            {milkData?.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.date}</TableCell>
                <TableCell className="font-medium">{record.animalTag}</TableCell>
                <TableCell>
                    <Badge variant={record.time === 'Morning' ? 'outline' : 'secondary'} className="bg-opacity-70">
                        {record.time}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{record.quantity.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {milkData?.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No milk records found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{milkData?.length ?? 0}</strong> of <strong>{milkData?.length ?? 0}</strong> records
        </div>
      </CardFooter>
    </Card>
  );
}
