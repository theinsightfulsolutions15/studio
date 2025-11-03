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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collectionGroup, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { AnimalMovement } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


function MovementRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

function MovementsTable({ movements, isLoading }: { movements: AnimalMovement[] | null, isLoading: boolean }) {
    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Animal Tag</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Reason</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <MovementRowSkeleton key={i} />)}
            {movements?.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell>{movement.date}</TableCell>
                <TableCell className="font-medium">{movement.animalTag}</TableCell>
                <TableCell>
                    <Badge variant={movement.type === 'Entry' ? 'secondary' : 'destructive'} className="bg-opacity-80">
                        {movement.type}
                    </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell max-w-[200px] lg:max-w-[300px] truncate">{movement.reason}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Animal</DropdownMenuItem>
                      <DropdownMenuItem>Edit Record</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    );
}

export default function MovementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const movementsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collectionGroup(firestore, 'movements'));
  }, [firestore, user]);

  const { data: allMovements, isLoading: isLoadingAll } = useCollection<AnimalMovement>(movementsQuery);

  const [entryMovements, setEntryMovements] = useState<AnimalMovement[] | null>(null);
  const [exitMovements, setExitMovements] = useState<AnimalMovement[] | null>(null);
  
  useEffect(() => {
    if (allMovements) {
        setEntryMovements(allMovements.filter(m => m.type === 'Entry'));
        setExitMovements(allMovements.filter(m => m.type === 'Exit'));
    } else {
        setEntryMovements(null);
        setExitMovements(null);
    }
  }, [allMovements]);


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle>Animal Movement</CardTitle>
                <CardDescription>Track animal entry and exit records.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Movement
            </Button>
        </div>
      </CardHeader>
      <CardContent>
         <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="exits">Exits</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <MovementsTable movements={allMovements} isLoading={isLoadingAll} />
          </TabsContent>
          <TabsContent value="entries" className="mt-4">
             <MovementsTable movements={entryMovements} isLoading={isLoadingAll} />
          </TabsContent>
           <TabsContent value="exits" className="mt-4">
             <MovementsTable movements={exitMovements} isLoading={isLoadingAll} />
          </TabsContent>
        </Tabs>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-{allMovements?.length ?? 0}</strong> of <strong>{allMovements?.length ?? 0}</strong> records
        </div>
      </CardFooter>
    </Card>
  );
}
