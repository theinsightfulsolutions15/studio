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
import { MoreHorizontal, PlusCircle, Search, FileDown, FileUp } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, writeBatch, doc as firestoreDoc } from 'firebase/firestore';
import type { Animal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRef } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

function AnimalRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export default function AnimalsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const animalsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'animals'));
  }, [user, firestore]);
  
  const { data: animals, isLoading } = useCollection<Animal>(animalsCollection);

  const handleExport = () => {
    if (!animals) {
        toast({
            variant: "destructive",
            title: "Export Failed",
            description: "No animal data to export.",
        });
        return;
    }
    const dataToExport = animals.map(animal => ({
        'TYPE': animal.type,
        'TAG NO': animal.govtTagNo,
        'BREED': animal.breed,
        'COLOR': animal.color,
        'GENDER': animal.gender,
        'YEAR OF BIRTH': animal.yearOfBirth,
        'HEALTH STATUS': animal.healthStatus,
        'TAG COLOR': animal.tagColor,
        'IDENTIFICATION MARK': animal.identificationMark || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Animals");
    XLSX.writeFile(workbook, "Gaushala_Animals.xlsx");
     toast({
        title: "Export Successful",
        description: "Animal data has been exported to Gaushala_Animals.xlsx.",
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && firestore && user) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                  toast({ variant: 'destructive', title: "Import Failed", description: "The Excel file is empty." });
                  return;
                }

                const batch = writeBatch(firestore);
                const animalsColRef = collection(firestore, 'animals');

                json.forEach((row) => {
                    const newDocRef = firestoreDoc(animalsColRef);
                    
                    const animalData: Omit<Animal, 'id'> = {
                        type: row['TYPE'],
                        govtTagNo: String(row['TAG NO']),
                        breed: row['BREED'],
                        color: row['COLOR'],
                        gender: row['GENDER'],
                        yearOfBirth: Number(row['YEAR OF BIRTH']),
                        healthStatus: row['HEALTH STATUS'],
                        tagColor: row['TAG COLOR'],
                        identificationMark: row['IDENTIFICATION MARK'] || '',
                        ownerId: user.uid,
                    };

                    batch.set(newDocRef, animalData);
                });

                await batch.commit();

                toast({
                    title: "Import Successful",
                    description: `${json.length} animal records have been imported.`,
                });

            } catch (error) {
                console.error("Import error:", error);
                toast({
                    variant: "destructive",
                    title: "Import Failed",
                    description: "Could not import the file. Please check the file format and try again.",
                });
            }
        };
        reader.readAsBinaryString(file);
    }
     // Reset the file input so the same file can be uploaded again
    if(event.target) {
        event.target.value = '';
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle>Animals</CardTitle>
                <CardDescription>Manage and track all animals in the Gaushala.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search animals..." className="pl-8 w-full min-w-[150px] md:w-[250px] lg:w-[300px]" />
                </div>
                 <Button variant="outline" onClick={handleImportClick}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".xlsx, .xls"
                />
                <Button variant="outline" onClick={handleExport}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                </Button>
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
              <TableHead>Type</TableHead>
              <TableHead>Tag No</TableHead>
              <TableHead>Breed</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Year of Birth</TableHead>
              <TableHead>Health Status</TableHead>
              <TableHead>Tag Color</TableHead>
              <TableHead>Identification Mark</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || !user) && Array.from({ length: 5 }).map((_, i) => <AnimalRowSkeleton key={i} />)}
            {animals?.map((animal) => (
              <TableRow key={animal.id}>
                <TableCell>{animal.type}</TableCell>
                <TableCell className="font-medium">{animal.govtTagNo}</TableCell>
                <TableCell>{animal.breed}</TableCell>
                <TableCell>{animal.color}</TableCell>
                <TableCell>{animal.gender}</TableCell>
                <TableCell>{animal.yearOfBirth}</TableCell>
                <TableCell>
                  <Badge variant={animal.healthStatus === 'Healthy' ? 'secondary' : animal.healthStatus === 'Sick' ? 'destructive' : 'default'} className="bg-opacity-80">
                    {animal.healthStatus}
                  </Badge>
                </TableCell>
                <TableCell>{animal.tagColor}</TableCell>
                <TableCell>{animal.identificationMark}</TableCell>
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
             {animals && animals.length === 0 && !isLoading && (
                <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                        No animals found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{animals?.length ?? 0}</strong> of <strong>{animals?.length ?? 0}</strong> animals
        </div>
      </CardFooter>
    </Card>
  );
}
