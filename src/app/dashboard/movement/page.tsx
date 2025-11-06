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
import { collection, collectionGroup, query, doc, addDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import type { Animal, AnimalMovement } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';

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

function MovementsTable({ movements, isLoading, onEdit }: { movements: (AnimalMovement & { animalGovtTagNo?: string })[] | null, isLoading: boolean, onEdit: (movement: AnimalMovement) => void }) {
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
                <TableCell>{new Date(movement.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{movement.animalGovtTagNo || movement.animalId}</TableCell>
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
                      <DropdownMenuItem onSelect={() => onEdit(movement)}>Edit Record</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {movements && movements.length === 0 && !isLoading && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No movement records found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
    );
}

const initialMovementState: Omit<AnimalMovement, 'id' | 'ownerId'> = {
  animalId: '',
  type: 'Entry',
  date: new Date().toISOString(),
  reason: '',
};

export default function MovementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedMovement, setSelectedMovement] = useState<AnimalMovement | null>(null);
  const [formData, setFormData] = useState<Omit<AnimalMovement, 'id' | 'ownerId'>>(initialMovementState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const animalsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'animals');
  }, [firestore]);
  const { data: animals, isLoading: isLoadingAnimals } = useCollection<Animal>(animalsQuery);

  const movementsQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(collectionGroup(firestore, 'movements'));
  }, [firestore, user]);

  const { data: allMovements, isLoading: isLoadingAll } = useCollection<AnimalMovement>(movementsQuery);
  
  const movementsWithAnimalTags = useMemo(() => {
    if (!allMovements || !animals) return allMovements;
    const animalMap = new Map(animals.map(a => [a.id, a.govtTagNo]));
    return allMovements.map(m => ({
        ...m,
        animalGovtTagNo: animalMap.get(m.animalId) || 'Unknown'
    }));
  }, [allMovements, animals]);

  const [entryMovements, setEntryMovements] = useState<(AnimalMovement & { animalGovtTagNo?: string })[] | null>(null);
  const [exitMovements, setExitMovements] = useState<(AnimalMovement & { animalGovtTagNo?: string })[] | null>(null);
  
  useEffect(() => {
    if (movementsWithAnimalTags) {
        setEntryMovements(movementsWithAnimalTags.filter(m => m.type === 'Entry'));
        setExitMovements(movementsWithAnimalTags.filter(m => m.type === 'Exit'));
    } else {
        setEntryMovements(null);
        setExitMovements(null);
    }
  }, [movementsWithAnimalTags]);

  const openDialog = (mode: 'create' | 'edit', movement: AnimalMovement | null = null) => {
    setDialogMode(mode);
    if (movement) {
        setSelectedMovement(movement);
        setFormData(movement);
    } else {
        setSelectedMovement(null);
        setFormData(initialMovementState);
    }
    setIsDialogOpen(true);
  }

  const handleFormSubmit = async () => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    if (!formData.animalId || !formData.date || !formData.reason) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Animal, Date, and Reason are required.' });
        return;
    }

    setIsSubmitting(true);
    
    try {
        if (dialogMode === 'create') {
            const movementColRef = collection(firestore, `animals/${formData.animalId}/movements`);
            await addDocumentNonBlocking(movementColRef, { ...formData, ownerId: user.uid });
            toast({ title: 'Success', description: 'New movement record has been added.' });
        } else if (dialogMode === 'edit' && selectedMovement) {
            const movementDocRef = doc(firestore, `animals/${selectedMovement.animalId}/movements`, selectedMovement.id);
            // Note: You can't change the animalId after creation in this data model.
            // If that's needed, the logic would be to delete and create a new one.
            await updateDocumentNonBlocking(movementDocRef, formData);
            toast({ title: 'Success', description: 'Movement record has been updated.' });
        }
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error saving movement record:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save movement record.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingAll || isLoadingAnimals;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle>Animal Movement</CardTitle>
                <CardDescription>Track animal entry and exit records.</CardDescription>
            </div>
            <Button onClick={() => openDialog('create')}>
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
            <MovementsTable movements={movementsWithAnimalTags} isLoading={isLoading} onEdit={(mov) => openDialog('edit', mov)} />
          </TabsContent>
          <TabsContent value="entries" className="mt-4">
             <MovementsTable movements={entryMovements} isLoading={isLoading} onEdit={(mov) => openDialog('edit', mov)} />
          </TabsContent>
           <TabsContent value="exits" className="mt-4">
             <MovementsTable movements={exitMovements} isLoading={isLoading} onEdit={(mov) => openDialog('edit', mov)} />
          </TabsContent>
        </Tabs>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{allMovements?.length ?? 0}</strong> of <strong>{allMovements?.length ?? 0}</strong> records
        </div>
      </CardFooter>
    </Card>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{dialogMode === 'create' ? 'Add Movement Record' : 'Edit Movement Record'}</DialogTitle>
                <DialogDescription>
                    Fill in the details for the animal's movement.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                    <Label htmlFor="animalId">Animal (by Tag No)</Label>
                    <Select 
                        value={formData.animalId} 
                        onValueChange={(value) => setFormData({...formData, animalId: value })}
                        disabled={isLoadingAnimals || dialogMode === 'edit'}
                    >
                        <SelectTrigger id="animalId">
                            <SelectValue placeholder="Select an animal..." />
                        </SelectTrigger>
                        <SelectContent>
                            {isLoadingAnimals ? <SelectItem value="loading" disabled>Loading animals...</SelectItem> :
                             animals?.map(animal => (
                                 <SelectItem key={animal.id} value={animal.id}>{animal.govtTagNo} - {animal.breed}</SelectItem>
                             ))
                            }
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Movement Type</Label>
                        <Select value={formData.type} onValueChange={(value: 'Entry' | 'Exit') => setFormData({...formData, type: value })}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Entry">Entry</SelectItem>
                                <SelectItem value="Exit">Exit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <DatePicker date={new Date(formData.date)} setDate={(d) => setFormData({ ...formData, date: d?.toISOString() || '' })} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input 
                        id="reason" 
                        value={formData.reason} 
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })} 
                        placeholder={formData.type === 'Entry' ? "e.g., Rescued, Born at Gaushala" : "e.g., Adopted, Deceased"}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={handleFormSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Record'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
