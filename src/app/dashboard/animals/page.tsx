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
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Animal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function AnimalRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="h-16 w-16 rounded-md" />
      </TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export default function AnimalsPage() {
  const firestore = useFirestore();
  const animalsCollection = useMemoFirebase(() => collection(firestore, 'animals'), [firestore]);
  const { data: animals, isLoading } = useCollection<Animal>(animalsCollection);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle>Animals</CardTitle>
                <CardDescription>Manage and track all animals in the Gaushala.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search animals..." className="pl-8 w-full md:w-[250px] lg:w-[300px]" />
                </div>
                <Button className="w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Register Animal
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
              <TableHead>Tag No.</TableHead>
              <TableHead className="hidden md:table-cell">Breed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Entry Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <AnimalRowSkeleton key={i} />)}
            {animals?.map((animal) => (
              <TableRow key={animal.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={animal.imageHint || 'Animal image'}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={animal.imageUrl || "https://picsum.photos/seed/placeholder/64/64"}
                    width="64"
                    data-ai-hint={animal.imageHint}
                  />
                </TableCell>
                <TableCell className="font-medium">{animal.govtTagNo}</TableCell>
                <TableCell className="hidden md:table-cell">{animal.breed}</TableCell>
                <TableCell>
                  <Badge variant={animal.healthStatus === 'Healthy' ? 'secondary' : animal.healthStatus === 'Sick' ? 'destructive' : 'default'} className="bg-opacity-80">
                    {animal.healthStatus}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{animal.entryDate}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Mark as Exited</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-{animals?.length ?? 0}</strong> of <strong>{animals?.length ?? 0}</strong> animals
        </div>
      </CardFooter>
    </Card>
  );
}
