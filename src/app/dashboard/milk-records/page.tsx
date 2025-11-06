
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, ChevronsUpDown, Check, Trash2, Plus, Droplets } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, writeBatch, doc } from 'firebase/firestore';
import type { MilkRecord, Animal, AnimalMovement } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/date-picker-range';


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

type StagedRecord = Omit<MilkRecord, 'id' | 'ownerId' | 'date' | 'time'> & { animalBreed: string };

type GroupedMilkData = {
    [date: string]: {
        morning: MilkRecord[];
        evening: MilkRecord[];
        total: number;
    }
};

export default function MilkRecordsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stagedRecords, setStagedRecords] = useState<StagedRecord[]>([]);
  
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | undefined>(new Date());
  const [currentSession, setCurrentSession] = useState<'Morning' | 'Evening'>('Morning');
  const [currentAnimal, setCurrentAnimal] = useState<{id: string, tag: string, breed: string} | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | ''>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();


  const animalsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/animals`);
  }, [firestore, user]);
  const { data: animals, isLoading: isLoadingAnimals } = useCollection<Animal>(animalsQuery);

  const movementsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/movements`);
  }, [firestore, user]);
  const { data: allMovements, isLoading: isLoadingMovements } = useCollection<AnimalMovement>(movementsQuery);

  const milkRecordsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/milk_records`));
  }, [user, firestore]);

  const { data: milkData, isLoading: isLoadingRecords } = useCollection<MilkRecord>(milkRecordsQuery);

    const animalStatuses = useMemo(() => {
        const statuses = new Map<string, 'in' | 'out'>();
        if (!animals || !allMovements) return statuses;

        const sortedMovements = [...allMovements].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const latestMovements = new Map<string, AnimalMovement>();
        for (const movement of sortedMovements) {
            latestMovements.set(movement.animalId, movement);
        }
        
        for (const animal of animals) {
            const latestMovement = latestMovements.get(animal.id);
            if (!latestMovement || latestMovement.type === 'Exit') {
                 statuses.set(animal.id, 'out');
            } else {
                 statuses.set(animal.id, 'in');
            }
        }
        return statuses;
    }, [animals, allMovements]);

  const milkingCows = useMemo(() => {
    return animals?.filter(animal => 
        animal.gender === 'Female' && 
        (animal.type === 'Cow' || animal.type === 'Buffalo') &&
        animalStatuses.get(animal.id) === 'in'
    ) || [];
  }, [animals, animalStatuses]);

    const filteredMilkData = useMemo(() => {
        if (!milkData) return null;
        if (!dateRange || (!dateRange.from && !dateRange.to)) return milkData;

        return milkData.filter(record => {
            const recordDate = new Date(record.date);
            recordDate.setUTCHours(0, 0, 0, 0);

            const from = dateRange.from ? new Date(dateRange.from) : null;
            if(from) from.setUTCHours(0,0,0,0);
            
            const to = dateRange.to ? new Date(dateRange.to) : null;
            if(to) to.setUTCHours(0,0,0,0);

            if (from && to) {
                return recordDate >= from && recordDate <= to;
            }
            if (from) {
                return recordDate >= from;
            }
            if (to) {
                return recordDate <= to;
            }
            return true;
        });
    }, [milkData, dateRange]);

    const totalInRange = useMemo(() => {
        return filteredMilkData?.reduce((acc, record) => acc + record.quantity, 0) || 0;
    }, [filteredMilkData]);
  
  const groupedData: GroupedMilkData = useMemo(() => {
    if (!filteredMilkData) return {};
    return filteredMilkData.reduce((acc, record) => {
        const date = record.date;
        if (!acc[date]) {
            acc[date] = { morning: [], evening: [], total: 0 };
        }
        if (record.time === 'Morning') {
            acc[date].morning.push(record);
        } else {
            acc[date].evening.push(record);
        }
        acc[date].total += record.quantity;
        return acc;
    }, {} as GroupedMilkData);
  }, [filteredMilkData]);

  const sortedDates = useMemo(() => Object.keys(groupedData).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()), [groupedData]);


  const openDialog = () => {
    setStagedRecords([]);
    setCurrentDate(new Date());
    setCurrentSession('Morning');
    setCurrentAnimal(null);
    setCurrentQuantity('');
    setIsDialogOpen(true);
  };
  
  const handleAddStagedRecord = () => {
      if(!currentAnimal || !currentQuantity || currentQuantity <= 0) {
          toast({ variant: 'destructive', title: 'Invalid Entry', description: 'Please select an animal and enter a valid quantity.'});
          return;
      }
      if (stagedRecords.some(r => r.animalId === currentAnimal.id)) {
          toast({ variant: 'destructive', title: 'Duplicate Entry', description: 'This animal has already been added to the list.'});
          return;
      }
      const newRecord: StagedRecord = {
          animalId: currentAnimal.id,
          animalTag: currentAnimal.tag,
          animalBreed: currentAnimal.breed,
          quantity: Number(currentQuantity),
      };
      setStagedRecords(prev => [...prev, newRecord]);
      setCurrentAnimal(null);
      setCurrentQuantity('');
  };

  const handleRemoveStagedRecord = (animalId: string) => {
      setStagedRecords(prev => prev.filter(r => r.animalId !== animalId));
  }

  const handleFormSubmit = async () => {
      if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
      }
       if (stagedRecords.length === 0) {
        toast({ variant: 'destructive', title: 'No Records', description: 'Please add at least one milk record.' });
        return;
      }

      setIsSubmitting(true);
      try {
        const batch = writeBatch(firestore);
        const recordsColRef = collection(firestore, `users/${user.uid}/milk_records`);
        
        const dateToSave = currentDate ? new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        stagedRecords.forEach(record => {
            const docRef = doc(recordsColRef);
            const { animalBreed, ...restOfRecord } = record;
            batch.set(docRef, {
                ...restOfRecord,
                date: dateToSave,
                time: currentSession,
                ownerId: user.uid,
              });              
        });

        await batch.commit();

        toast({ title: 'Success', description: `${stagedRecords.length} milk records have been added.` });
        setStagedRecords([]);
        setCurrentAnimal(null);
        setCurrentQuantity('');
        // Keep dialog open for next session/date entry
      } catch (error) {
          console.error("Error adding milk records:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to add milk records.' });
      } finally {
          setIsSubmitting(false);
      }
  };
  
  const totalStagedQuantity = useMemo(() => {
    return stagedRecords.reduce((total, record) => total + record.quantity, 0);
  }, [stagedRecords]);

  const isLoading = isLoadingAnimals || isLoadingRecords || isLoadingMovements;

  return (
    <>
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Milk Records</CardTitle>
                        <CardDescription>Log and monitor daily milk production.</CardDescription>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        <Button onClick={openDialog} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Records
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {dateRange && (dateRange.from || dateRange.to) && (
                 <CardContent>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Milk in Range</CardTitle>
                            <Droplets className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalInRange.toFixed(2)} L</div>
                            <p className="text-xs text-muted-foreground">
                                From {dateRange.from ? format(dateRange.from, 'LLL dd, y') : 'start'} to {dateRange.to ? format(dateRange.to, 'LLL dd, y') : 'end'}
                            </p>
                        </CardContent>
                    </Card>
                </CardContent>
            )}
        </Card>

        <Card>
            <CardContent className="pt-6">
                {isLoading && (
                    <div className="space-y-4">
                        {Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                )}
                {!isLoading && sortedDates.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        {dateRange ? 'No milk records found for the selected date range.' : 'No milk records found.'}
                    </div>
                )}
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {sortedDates.map(date => (
                        <AccordionItem value={date} key={date} className="border rounded-md px-4 bg-muted/20">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-semibold text-lg">{new Date(date).toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    <Badge variant="secondary" className="text-base">Total: {groupedData[date].total.toFixed(2)} L</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                            {groupedData[date].morning.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-semibold text-md">Morning Session</h3>
                                            <Badge variant="outline">Total: {groupedData[date].morning.reduce((acc, r) => acc + r.quantity, 0).toFixed(2)} L</Badge>
                                </div>
                                    <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Animal Tag</TableHead>
                                                <TableHead className="text-right">Quantity (L)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedData[date].morning.map(r => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="font-medium">{r.animalTag}</TableCell>
                                                    <TableCell className="text-right">{r.quantity.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </div>
                            )}
                                {groupedData[date].evening.length > 0 && (
                                <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-semibold text-md">Evening Session</h3>
                                            <Badge variant="outline">Total: {groupedData[date].evening.reduce((acc, r) => acc + r.quantity, 0).toFixed(2)} L</Badge>
                                </div>
                                    <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Animal Tag</TableHead>
                                                <TableHead className="text-right">Quantity (L)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedData[date].evening.map(r => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="font-medium">{r.animalTag}</TableCell>
                                                    <TableCell className="text-right">{r.quantity.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </div>
                            )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Add Milk Records</DialogTitle>
                <DialogDescription>
                    Log multiple milk production entries for a single session.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                {/* Entry Form */}
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                     <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <DatePicker date={currentDate} setDate={(d) => d && setCurrentDate(new Date(d.getTime() - d.getTimezoneOffset() * -60000))}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="time">Milking Time</Label>
                        <Select value={currentSession} onValueChange={(value: 'Morning' | 'Evening') => setCurrentSession(value)}>
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
                <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
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
                                {currentAnimal?.tag || "Select an animal..."}
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
                                            setCurrentAnimal({id: animal.id, tag: animal.govtTagNo, breed: animal.breed});
                                            setComboboxOpen(false);
                                        }}
                                    >
                                        <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currentAnimal?.id === animal.id ? "opacity-100" : "opacity-0"
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
                     <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity (L)</Label>
                        <Input 
                            id="quantity"
                            type="number"
                            value={currentQuantity} 
                            onChange={(e) => setCurrentQuantity(parseFloat(e.target.value) || '')} 
                            placeholder="e.g., 5.5"
                            className="w-28"
                        />
                    </div>
                    <Button size="icon" onClick={handleAddStagedRecord} aria-label="Add to list">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                 
                {/* Staged Records Table */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label>Entries to be Saved ({stagedRecords.length})</Label>
                        <div className="font-bold text-lg">
                            Total: {totalStagedQuantity.toFixed(2)} L
                        </div>
                    </div>
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Animal Tag</TableHead>
                                    <TableHead>Breed</TableHead>
                                    <TableHead className="text-right">Quantity (L)</TableHead>
                                    <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {stagedRecords.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                            Add records using the form above.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {stagedRecords.map((record) => (
                                    <TableRow key={record.animalId}>
                                        <TableCell>{record.animalTag}</TableCell>
                                        <TableCell>{record.animalBreed}</TableCell>
                                        <TableCell className="text-right">{record.quantity.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStagedRecord(record.animalId)}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                             </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
                <Button type="submit" onClick={handleFormSubmit} disabled={isSubmitting || stagedRecords.length === 0}>
                    {isSubmitting ? 'Saving...' : `Save ${stagedRecords.length} Record(s)`}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
