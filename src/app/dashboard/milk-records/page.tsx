
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
import { PlusCircle, ChevronsUpDown, Check, Trash2, Plus, Droplets, User } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, writeBatch, doc } from 'firebase/firestore';
import type { MilkRecord, Animal, AnimalMovement, FinancialRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/date-picker-range';
import { format } from 'date-fns';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type StagedRecord = Omit<MilkRecord, 'id' | 'ownerId' | 'date' | 'time'> & { animalBreed: string };

type GroupedMilkData = {
    [date: string]: {
        morning: MilkRecord[];
        evening: MilkRecord[];
        total: number;
    }
};

const initialMilkSaleState: Partial<FinancialRecord> = {
    customerName: '',
    quantity: 0,
    rate: 0,
    amount: 0,
    date: new Date().toISOString(),
};

export default function MilkRecordsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Production Dialog State
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [isSubmittingProduction, setIsSubmittingProduction] = useState(false);
  const [stagedRecords, setStagedRecords] = useState<StagedRecord[]>([]);
  
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | undefined>(new Date());
  const [currentSession, setCurrentSession] = useState<'Morning' | 'Evening'>('Morning');
  const [currentAnimal, setCurrentAnimal] = useState<{id: string, tag: string, breed: string} | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState<number | ''>('');
  
  // Sales Dialog State
  const [isSalesDialogOpen, setIsSalesDialogOpen] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [milkSaleData, setMilkSaleData] = useState(initialMilkSaleState);

  // Page-level State
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    const { quantity = 0, rate = 0 } = milkSaleData;
    setMilkSaleData(prev => ({ ...prev, amount: quantity * rate }));
  }, [milkSaleData.quantity, milkSaleData.rate]);

  // Data queries
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

  const milkProductionQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/milk_records`));
  }, [user, firestore]);
  const { data: milkProductionData, isLoading: isLoadingProduction } = useCollection<MilkRecord>(milkProductionQuery);
  
  const milkSalesQuery = useMemoFirebase(() => {
    if(!user || !firestore) return null;
    return query(collection(firestore, `users/${user.uid}/financial_records`), where => where('category', '==', 'Milk Sale'));
  }, [user, firestore]);
  const { data: milkSalesData, isLoading: isLoadingSales } = useCollection<FinancialRecord>(milkSalesQuery);

  // Memoized calculations
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

  const filteredMilkProductionData = useMemo(() => {
    if (!milkProductionData) return null;
    if (!dateRange || (!dateRange.from && !dateRange.to)) return milkProductionData;

    return milkProductionData.filter(record => {
        const recordDate = new Date(record.date);
        recordDate.setUTCHours(0, 0, 0, 0);

        const from = dateRange.from ? new Date(dateRange.from) : null;
        if(from) from.setUTCHours(0,0,0,0);
        
        const to = dateRange.to ? new Date(dateRange.to) : null;
        if(to) to.setUTCHours(0,0,0,0);

        if (from && to) return recordDate >= from && recordDate <= to;
        if (from) return recordDate >= from;
        if (to) return recordDate <= to;
        return true;
    });
  }, [milkProductionData, dateRange]);

  const totalProductionInRange = useMemo(() => {
    return filteredMilkProductionData?.reduce((acc, record) => acc + record.quantity, 0) || 0;
  }, [filteredMilkProductionData]);
  
  const groupedData: GroupedMilkData = useMemo(() => {
    if (!filteredMilkProductionData) return {};
    return filteredMilkProductionData.reduce((acc, record) => {
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
  }, [filteredMilkProductionData]);

  const sortedDates = useMemo(() => Object.keys(groupedData).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()), [groupedData]);

  // Handler functions
  const openProductionDialog = () => {
    setStagedRecords([]);
    setCurrentDate(new Date());
    setCurrentSession('Morning');
    setCurrentAnimal(null);
    setCurrentQuantity('');
    setIsProductionDialogOpen(true);
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

  const handleProductionSubmit = async () => {
      if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
      }
       if (stagedRecords.length === 0) {
        toast({ variant: 'destructive', title: 'No Records', description: 'Please add at least one milk record.' });
        return;
      }

      setIsSubmittingProduction(true);
      try {
        const batch = writeBatch(firestore);
        const recordsColRef = collection(firestore, `users/${user.uid}/milk_records`);
        
        const dateToSave = currentDate ? new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * -60000)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        stagedRecords.forEach(record => {
            const docRef = doc(recordsColRef);
            batch.set(docRef, {
                ...record,
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
      } catch (error) {
          console.error("Error adding milk records:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to add milk records.' });
      } finally {
          setIsSubmittingProduction(false);
      }
  };

  const handleSaleSubmit = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!milkSaleData.customerName || !milkSaleData.amount || !milkSaleData.date) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Customer, amount, and date are required.'});
        return;
    }
    
    setIsSubmittingSale(true);
    try {
        const financialColRef = collection(firestore, `users/${user.uid}/financial_records`);
        const dataToSave = {
            ...milkSaleData,
            date: new Date(milkSaleData.date).toISOString().split('T')[0],
            recordType: 'Receipt',
            category: 'Milk Sale',
            description: `Milk sale to ${milkSaleData.customerName}`,
            ownerId: user.uid,
        };
        await addDocumentNonBlocking(financialColRef, dataToSave);
        toast({ title: 'Success', description: 'Milk sale recorded successfully.'});
        setIsSalesDialogOpen(false);
        setMilkSaleData(initialMilkSaleState);

    } catch (error) {
        console.error("Error saving milk sale:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record milk sale.' });
    } finally {
        setIsSubmittingSale(false);
    }
  };
  
  const totalStagedQuantity = useMemo(() => {
    return stagedRecords.reduce((total, record) => total + record.quantity, 0);
  }, [stagedRecords]);

  const isLoading = isLoadingAnimals || isLoadingProduction || isLoadingMovements || isLoadingSales;

  return (
    <>
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Milk Management</CardTitle>
                        <CardDescription>Log production, track sales, and monitor daily output.</CardDescription>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>
                </div>
            </CardHeader>
            {(dateRange && (dateRange.from || dateRange.to)) && (
                 <CardContent>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Milk Production in Range</CardTitle>
                            <Droplets className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalProductionInRange.toFixed(2)} L</div>
                            <p className="text-xs text-muted-foreground">
                                From {dateRange.from ? format(dateRange.from, 'LLL dd, y') : 'start'} to {dateRange.to ? format(dateRange.to, 'LLL dd, y') : 'end'}
                            </p>
                        </CardContent>
                    </Card>
                </CardContent>
            )}
        </Card>

        <Tabs defaultValue="production" className="w-full">
            <div className="flex justify-between items-center mb-4">
                <TabsList className="grid grid-cols-2 w-[300px]">
                    <TabsTrigger value="production">Production</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                </TabsList>
                 <div className="flex gap-2">
                    <Button onClick={openProductionDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Production
                    </Button>
                    <Button onClick={() => setIsSalesDialogOpen(true)} variant="secondary">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Milk Sale
                    </Button>
                </div>
            </div>

            <TabsContent value="production">
                <Card>
                    <CardHeader>
                        <CardTitle>Production Records</CardTitle>
                        <CardDescription>Daily milk production entries grouped by date.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
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
                                                <TableHeader><TableRow><TableHead>Animal Tag</TableHead><TableHead className="text-right">Quantity (L)</TableHead></TableRow></TableHeader>
                                                <TableBody>{groupedData[date].morning.map(r => (<TableRow key={r.id}><TableCell className="font-medium">{r.animalTag}</TableCell><TableCell className="text-right">{r.quantity.toFixed(2)}</TableCell></TableRow>))}</TableBody>
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
                                                <TableHeader><TableRow><TableHead>Animal Tag</TableHead><TableHead className="text-right">Quantity (L)</TableHead></TableRow></TableHeader>
                                                <TableBody>{groupedData[date].evening.map(r => (<TableRow key={r.id}><TableCell className="font-medium">{r.animalTag}</TableCell><TableCell className="text-right">{r.quantity.toFixed(2)}</TableCell></TableRow>))}</TableBody>
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
            </TabsContent>
            <TabsContent value="sales">
                 <Card>
                    <CardHeader>
                        <CardTitle>Milk Sale Records</CardTitle>
                        <CardDescription>All recorded milk sales to customers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="text-right">Quantity (L)</TableHead>
                                    <TableHead className="text-right">Rate (₹)</TableHead>
                                    <TableHead className="text-right">Amount (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingSales && Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
                                    </TableRow>
                                ))}
                                {milkSalesData?.map(sale => (
                                    <TableRow key={sale.id}>
                                        <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{sale.customerName}</TableCell>
                                        <TableCell className="text-right">{sale.quantity?.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{sale.rate?.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-semibold">₹{sale.amount.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                {!isLoadingSales && milkSalesData?.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">No milk sales recorded yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>

    {/* Production Dialog */}
    <Dialog open={isProductionDialogOpen} onOpenChange={setIsProductionDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Add Milk Production Records</DialogTitle>
                <DialogDescription>Log multiple milk production entries for a single session.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                     <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <DatePicker date={currentDate} setDate={(d) => d && setCurrentDate(new Date(d.getTime() - d.getTimezoneOffset() * -60000))}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="time">Milking Time</Label>
                        <Select value={currentSession} onValueChange={(value: 'Morning' | 'Evening') => setCurrentSession(value)}><SelectTrigger id="time"><SelectValue placeholder="Select time" /></SelectTrigger><SelectContent><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Evening">Evening</SelectItem></SelectContent></Select>
                    </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
                    <div className="space-y-2">
                        <Label htmlFor="animalId">Animal (by Tag No)</Label>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full justify-between" disabled={isLoadingAnimals}>
                                {currentAnimal?.tag || "Select an animal..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={5}>
                                <Command>
                                <CommandInput placeholder="Search animal..." />
                                <CommandEmpty>{isLoadingAnimals ? "Loading animals..." : "No milking animals found."}</CommandEmpty>
                                <CommandGroup>
                                    {milkingCows.map((animal) => (
                                    <CommandItem key={animal.id} value={`${animal.govtTagNo} ${animal.breed}`} onSelect={() => { setCurrentAnimal({id: animal.id, tag: animal.govtTagNo, breed: animal.breed}); setComboboxOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", currentAnimal?.id === animal.id ? "opacity-100" : "opacity-0")} />
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
                        <Input id="quantity" type="number" value={currentQuantity} onChange={(e) => setCurrentQuantity(parseFloat(e.target.value) || '')} placeholder="e.g., 5.5" className="w-28" />
                    </div>
                    <Button size="icon" onClick={handleAddStagedRecord} aria-label="Add to list"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center"><Label>Entries to be Saved ({stagedRecords.length})</Label><div className="font-bold text-lg">Total: {totalStagedQuantity.toFixed(2)} L</div></div>
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                        <Table>
                            <TableHeader><TableRow><TableHead>Animal Tag</TableHead><TableHead>Breed</TableHead><TableHead className="text-right">Quantity (L)</TableHead><TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                             <TableBody>
                                {stagedRecords.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">Add records using the form above.</TableCell></TableRow>)}
                                {stagedRecords.map((record) => (
                                    <TableRow key={record.animalId}>
                                        <TableCell>{record.animalTag}</TableCell>
                                        <TableCell>{record.animalBreed}</TableCell>
                                        <TableCell className="text-right">{record.quantity.toFixed(2)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveStagedRecord(record.animalId)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                    </TableRow>
                                ))}
                             </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                <Button type="submit" onClick={handleProductionSubmit} disabled={isSubmittingProduction || stagedRecords.length === 0}>{isSubmittingProduction ? 'Saving...' : `Save ${stagedRecords.length} Record(s)`}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Sales Dialog */}
    <Dialog open={isSalesDialogOpen} onOpenChange={setIsSalesDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Record Milk Sale</DialogTitle>
                <DialogDescription>Log a milk sale to a customer. This will be added to your financial records as a receipt.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                    <Label htmlFor="sale-date">Date</Label>
                    <DatePicker date={milkSaleData.date ? new Date(milkSaleData.date) : undefined} setDate={(d) => setMilkSaleData(prev => ({...prev, date: d?.toISOString()}))}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-name">Customer Name</Label>
                    <Input id="customer-name" placeholder="Enter customer name" value={milkSaleData.customerName || ''} onChange={(e) => setMilkSaleData(prev => ({ ...prev, customerName: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="sale-quantity">Quantity (L)</Label>
                        <Input id="sale-quantity" type="number" placeholder="e.g. 10" value={milkSaleData.quantity || ''} onChange={(e) => setMilkSaleData(prev => ({...prev, quantity: Number(e.target.value) || 0}))} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sale-rate">Rate (₹ per L)</Label>
                        <Input id="sale-rate" type="number" placeholder="e.g. 50" value={milkSaleData.rate || ''} onChange={(e) => setMilkSaleData(prev => ({...prev, rate: Number(e.target.value) || 0}))} />
                    </div>
                </div>
                 <div className="space-y-2 rounded-md border bg-muted p-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-semibold">₹{(milkSaleData.amount || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" onClick={handleSaleSubmit} disabled={isSubmittingSale}>
                    {isSubmittingSale ? 'Saving...' : 'Save Sale'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
