
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Sheet as ExcelIcon } from 'lucide-react';
import { DatePickerWithRange } from '@/components/date-picker-range';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Animal } from '@/lib/types';
import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { format } from 'date-fns';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

function CowRegistryReport() {
    const firestore = useFirestore();
    const { user } = useUser();

    const [breedFilter, setBreedFilter] = useState('All');
    const [colorFilter, setColorFilter] = useState('All');
    const [healthStatusFilter, setHealthStatusFilter] = useState('All');
    const [ageFilter, setAgeFilter] = useState('All');

    const animalsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/animals`);
    }, [user, firestore]);

    const { data: animals, isLoading } = useCollection<Animal>(animalsQuery);

    const filteredAnimals = useMemo(() => {
        if (!animals) return [];
        return animals.filter(animal => {
            const breedMatch = breedFilter === 'All' || animal.breed === breedFilter;
            const colorMatch = colorFilter === 'All' || animal.color === colorFilter;
            const healthStatusMatch = healthStatusFilter === 'All' || animal.healthStatus === healthStatusFilter;

            const age = new Date().getFullYear() - animal.yearOfBirth;
            const ageMatch = ageFilter === 'All' || 
                (ageFilter === '0-2' && age <= 2) ||
                (ageFilter === '3-5' && age >= 3 && age <= 5) ||
                (ageFilter === '6-10' && age >= 6 && age <= 10) ||
                (ageFilter === '10+' && age > 10);
            
            return breedMatch && colorMatch && healthStatusMatch && ageMatch;
        });
    }, [animals, breedFilter, colorFilter, healthStatusFilter, ageFilter]);
    
    const uniqueBreeds = useMemo(() => ['All', ...Array.from(new Set(animals?.map(a => a.breed)))], [animals]);
    const uniqueColors = useMemo(() => ['All', ...Array.from(new Set(animals?.map(a => a.color)))], [animals]);
    const uniqueHealthStatuses = ['All', 'Healthy', 'Sick', 'Under Treatment'];
    const ageRanges = ['All', '0-2', '3-5', '6-10', '10+'];

    const exportToExcel = () => {
        const dataToExport = filteredAnimals.map(animal => ({
            'Tag No': animal.govtTagNo,
            'Type': animal.type,
            'Breed': animal.breed,
            'Color': animal.color,
            'Gender': animal.gender,
            'Year of Birth': animal.yearOfBirth,
            'Health Status': animal.healthStatus,
            'Tag Color': animal.tagColor,
            'Identification Mark': animal.identificationMark || '',
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cow Registry");
        XLSX.writeFile(workbook, "Cow_Registry_Report.xlsx");
    };

    const exportToPdf = () => {
        const doc = new jsPDF();
        doc.text("Cow Registry Report", 14, 15);
        
        const tableData = filteredAnimals.map(animal => [
            animal.govtTagNo,
            animal.type,
            animal.breed,
            animal.color,
            animal.gender,
            animal.yearOfBirth.toString(),
            animal.healthStatus,
        ]);

        doc.autoTable({
            startY: 20,
            head: [['Tag No', 'Type', 'Breed', 'Color', 'Gender', 'Birth Year', 'Status']],
            body: tableData,
        });

        doc.save('Cow_Registry_Report.pdf');
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <CardTitle>Cow Registry</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={exportToExcel} disabled={isLoading || filteredAnimals.length === 0}><ExcelIcon className="mr-2 h-4 w-4" /> Excel</Button>
                        <Button variant="outline" onClick={exportToPdf} disabled={isLoading || filteredAnimals.length === 0}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
                    </div>
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                   <Select value={breedFilter} onValueChange={setBreedFilter}>
                       <SelectTrigger><SelectValue placeholder="All Breeds" /></SelectTrigger>
                       <SelectContent>{uniqueBreeds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                   </Select>
                   <Select value={colorFilter} onValueChange={setColorFilter}>
                       <SelectTrigger><SelectValue placeholder="All Colors" /></SelectTrigger>
                       <SelectContent>{uniqueColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                   </Select>
                   <Select value={healthStatusFilter} onValueChange={setHealthStatusFilter}>
                       <SelectTrigger><SelectValue placeholder="All Health Statuses" /></SelectTrigger>
                       <SelectContent>{uniqueHealthStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                   </Select>
                   <Select value={ageFilter} onValueChange={setAgeFilter}>
                       <SelectTrigger><SelectValue placeholder="All Ages" /></SelectTrigger>
                       <SelectContent>{ageRanges.map(a => <SelectItem key={a} value={a}>{a === '10+' ? '> 10 Years' : a === 'All' ? 'All Ages' : `${a} Years`}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Image</TableHead>
                            <TableHead>Tag No</TableHead>
                            <TableHead>Breed</TableHead>
                            <TableHead>Color</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead>Age</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && filteredAnimals.map(animal => (
                            <TableRow key={animal.id}>
                                <TableCell>
                                    <Image 
                                        src={animal.imageUrl || "https://picsum.photos/seed/placeholder/80/80"} 
                                        alt={animal.breed}
                                        width={40}
                                        height={40}
                                        className="rounded-md object-cover aspect-square"
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{animal.govtTagNo}</TableCell>
                                <TableCell>{animal.breed}</TableCell>
                                <TableCell>{animal.color}</TableCell>
                                <TableCell>{animal.gender}</TableCell>
                                <TableCell>{new Date().getFullYear() - animal.yearOfBirth}</TableCell>
                                <TableCell>{animal.healthStatus}</TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && filteredAnimals.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No animals match the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline">Reports</h1>
      </div>

      <Tabs defaultValue="cow-registry">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
            <TabsTrigger value="cow-registry">Cow Registry</TabsTrigger>
            <TabsTrigger value="movement-history" disabled>Movement History</TabsTrigger>
            <TabsTrigger value="daily-summary" disabled>Daily Summary</TabsTrigger>
            <TabsTrigger value="cross-tab" disabled>Cross-Tab Summary</TabsTrigger>
            <TabsTrigger value="detailed-report" disabled>Detailed Report</TabsTrigger>
        </TabsList>

        <TabsContent value="cow-registry" className="mt-4">
            <CowRegistryReport />
        </TabsContent>
      </Tabs>
      
       <Card>
        <CardHeader>
          <CardTitle>Year-End Closing</CardTitle>
          <CardDescription>Close the financial year and archive all data. This action is irreversible.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive-foreground text-center sm:text-left">Proceed with caution. All current year data will be finalized.</p>
              <Button variant="destructive" className="w-full sm:w-auto">Close Financial Year</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
