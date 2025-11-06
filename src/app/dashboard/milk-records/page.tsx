
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, ChevronsUpDown, Check } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { MilkRecord, Animal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';


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

const initialRecordState: Omit<MilkRecord, 'id' | 'ownerId'> = {
    animalId: '',
    animalTag: '',
    date: new Date().toISOString().split('T')[0],
    quantity: 0,
    time: 'Morning',
};


export default function MilkRecordsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<MilkRecord, 'id' | 'ownerId'>>(initialRecordState);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  const animalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/animals`);
  }, [firestore, user]);
  const { data: animals, isLoading: isLoadingAnimals } = useCollection<Animal>(animalsQuery);

  const milkRecordsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/milk_records`));
  }, [user, firestore]);

  const { data: milkData, isLoading: isLoadingRecords } = useCollection<MilkRecord>(milkRecordsQuery);

  const milkingCows = useMemo(() => {
    return animals?.filter(animal => animal.gender === 'Female' && animal.type === 'Cow' || animal.type === 'Buffalo') || [];
  }, [animals]);

  const openDialog = () => {
    setFormData(initialRecordState);
    setIsDialogOpen(true);
  };
  
  const handleFormSubmit = async () => {
      if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
      }
       if (!formData.animalId || !formData.date || formData.quantity <= 0) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Animal, Date, and a valid Quantity are required.' });
        return;
      }

      setIsSubmitting(true);
      try {
        const recordsColRef = collection(firestore, `users/${user.uid}/milk_records`);
        await addDocumentNonBlocking(recordsColRef, { ...formData, ownerId: user.uid });
        toast({ title: 'Success', description: 'New milk record has been added.' });
        setIsDialogOpen(false);
      } catch (error) {
          console.error("Error adding milk record:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to add milk record.' });
      } finally {
          setIsSubmitting(false);
      }
  };

  const isLoading = isLoadingAnimals || isLoadingRecords;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Milk Records</CardTitle>
                <CardDescription>Log and monitor daily milk production.</CardDescription>
            </div>
            <Button onClick={openDialog}>
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

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Add Milk Record</DialogTitle>
                <DialogDescription>
                    Log a new milk production entry.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                    <Label htmlFor="animalId">Animal (by Tag No)</Label>
                     <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={comboboxOpen}
                            className="w-full justify-between"
                            disabled={isLoadingAnimals}
                            >
                            {formData.animalTag || "Select an animal..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={5}>
                            <Command>
                            <CommandInput placeholder="Search animal..." />
                            <CommandEmpty>
                                {isLoadingAnimals ? "Loading animals..." : "No milking animals found."}
                            </CommandEmpty>
                            <CommandGroup>
                                {milkingCows.map((animal) => (
                                <CommandItem
                                    key={animal.id}
                                    value={`${animal.govtTagNo} ${animal.breed}`}
                                    onSelect={() => {
                                        setFormData({...formData, animalId: animal.id, animalTag: animal.govtTagNo });
                                        setComboboxOpen(false);
                                    }}
                                >
                                    <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.animalId === animal.id ? "opacity-100" : "opacity-0"
                                    )}
                                    />
                                    {animal.govtTagNo} - {animal.breed}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <DatePicker date={new Date(formData.date)} setDate={(d) => setFormData({ ...formData, date: d?.toISOString().split('T')[0] || '' })} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="time">Milking Time</Label>
                        <Select value={formData.time} onValueChange={(value: 'Morning' | 'Evening') => setFormData({...formData, time: value})}>
                            <SelectTrigger id="time">
                                <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Morning">Morning</SelectItem>
                                <SelectItem value="Evening">Evening</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (in Liters)</Label>
                    <Input 
                        id="quantity"
                        type="number"
                        value={formData.quantity} 
                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })} 
                        placeholder="e.g., 5.5"
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
