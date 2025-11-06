
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, Search, FileDown, FileUp, Camera, Upload } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, writeBatch, doc as firestoreDoc, addDoc } from 'firebase/firestore';
import type { Animal } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function AnimalRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
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

const initialAnimalState: Omit<Animal, 'id' | 'ownerId'> = {
    type: 'Cow',
    govtTagNo: '',
    breed: '',
    color: '',
    gender: 'Female',
    yearOfBirth: new Date().getFullYear(),
    healthStatus: 'Healthy',
    tagColor: '',
    identificationMark: '',
    imageUrl: '',
};

export default function AnimalsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newAnimal, setNewAnimal] = useState(initialAnimalState);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAnimals, setFilteredAnimals] = useState<Animal[] | null>(null);

  // Image Capture State
  const [isCaptureDialogOpen, setIsCaptureDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (isCaptureDialogOpen) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
        }
      };
      getCameraPermission();
    } else {
        // Stop camera stream when dialog closes
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }
  }, [isCaptureDialogOpen, toast]);


  const handleCaptureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUri);
        setNewAnimal({ ...newAnimal, imageUrl: dataUri });
        setIsCaptureDialogOpen(false);
      }
    }
  };
  
   const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setCapturedImage(dataUri);
        setNewAnimal({ ...newAnimal, imageUrl: dataUri });
      };
      reader.readAsDataURL(file);
    }
  };


  const animalsCollection = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'animals'));
  }, [user, firestore]);
  
  const { data: animals, isLoading } = useCollection<Animal>(animalsCollection);

  useEffect(() => {
    if (animals) {
      if (!searchTerm) {
        setFilteredAnimals(animals);
      } else {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filteredData = animals.filter(animal =>
          Object.values(animal).some(value =>
            String(value).toLowerCase().includes(lowercasedFilter)
          )
        );
        setFilteredAnimals(filteredData);
      }
    } else {
      setFilteredAnimals(null);
    }
  }, [searchTerm, animals]);


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

                const existingTagNos = new Set(animals?.map(a => a.govtTagNo));
                const importTagNos = new Set<string>();
                let duplicateFoundInFile = false;
                let duplicateFoundInDB = false;
                let duplicateTagNo = '';

                for (const row of json) {
                    const tagNo = String(row['TAG NO']);
                    if (importTagNos.has(tagNo)) {
                        duplicateFoundInFile = true;
                        duplicateTagNo = tagNo;
                        break;
                    }
                    if (existingTagNos.has(tagNo)) {
                        duplicateFoundInDB = true;
                        duplicateTagNo = tagNo;
                        break;
                    }
                    importTagNos.add(tagNo);
                }

                if (duplicateFoundInFile) {
                    toast({ variant: "destructive", title: "Import Failed", description: `Duplicate Tag No "${duplicateTagNo}" found in the import file.` });
                    return;
                }
                if (duplicateFoundInDB) {
                    toast({ variant: "destructive", title: "Import Failed", description: `Tag No "${duplicateTagNo}" already exists in the database.` });
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
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleRegisterAnimal = async () => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to register an animal.' });
        return;
    }
     if (!newAnimal.govtTagNo || !newAnimal.breed) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Tag No and Breed are required.' });
        return;
    }

    if (animals?.some(animal => animal.govtTagNo === newAnimal.govtTagNo)) {
        toast({ variant: 'destructive', title: 'Registration Failed', description: `An animal with Tag No "${newAnimal.govtTagNo}" already exists.` });
        return;
    }

    setIsRegistering(true);
    try {
        const animalsColRef = collection(firestore, 'animals');
        await addDoc(animalsColRef, { ...newAnimal, ownerId: user.uid });
        toast({ title: 'Success', description: 'New animal has been registered.' });
        setNewAnimal(initialAnimalState);
        setCapturedImage(null);
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error registering animal:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to register animal.' });
    } finally {
        setIsRegistering(false);
    }
  };


  return (
    <>
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
                    <Input 
                        placeholder="Search animals..." 
                        className="pl-8 w-full min-w-[150px] md:w-[250px] lg:w-[300px]" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Register Animal
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Register a New Animal</DialogTitle>
                            <DialogDescription>
                                Fill in the details below to add a new animal to the Gaushala records.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid md:grid-cols-3 gap-6 py-4">
                           <div className="md:col-span-1 flex flex-col items-center gap-4">
                                <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                     {capturedImage ? (
                                        <Image src={capturedImage} alt="Animal" width={400} height={400} className="object-cover h-full w-full" />
                                    ) : (
                                        <Camera className="h-16 w-16 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="w-full grid grid-cols-2 gap-2">
                                    <Button variant="outline" onClick={() => setIsCaptureDialogOpen(true)}>
                                        <Camera className="mr-2 h-4 w-4" />
                                        Capture
                                    </Button>
                                    <Button variant="outline" onClick={() => uploadInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload
                                    </Button>
                                    <input
                                        type="file"
                                        ref={uploadInputRef}
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type</Label>
                                        <Select value={newAnimal.type} onValueChange={(value) => setNewAnimal({...newAnimal, type: value })}>
                                            <SelectTrigger id="type">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cow">Cow</SelectItem>
                                                <SelectItem value="Buffalo">Buffalo</SelectItem>
                                                <SelectItem value="Bull">Bull</SelectItem>
                                                <SelectItem value="Calf">Calf</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="govtTagNo">Govt. Tag No.</Label>
                                        <Input id="govtTagNo" value={newAnimal.govtTagNo} onChange={(e) => setNewAnimal({ ...newAnimal, govtTagNo: e.target.value })} placeholder="UID12345" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="breed">Breed</Label>
                                        <Input id="breed" value={newAnimal.breed} onChange={(e) => setNewAnimal({ ...newAnimal, breed: e.target.value })} placeholder="e.g., Gir, Murrah" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="color">Color</Label>
                                        <Input id="color" value={newAnimal.color} onChange={(e) => setNewAnimal({ ...newAnimal, color: e.target.value })} placeholder="e.g., Brown, Black" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <Select value={newAnimal.gender} onValueChange={(value: 'Male' | 'Female') => setNewAnimal({ ...newAnimal, gender: value })}>
                                            <SelectTrigger id="gender">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Female">Female</SelectItem>
                                                <SelectItem value="Male">Male</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="yearOfBirth">Year of Birth</Label>
                                        <Input id="yearOfBirth" type="number" value={newAnimal.yearOfBirth} onChange={(e) => setNewAnimal({ ...newAnimal, yearOfBirth: parseInt(e.target.value) })} placeholder="e.g., 2020" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="healthStatus">Health Status</Label>
                                        <Select value={newAnimal.healthStatus} onValueChange={(value: 'Healthy' | 'Sick' | 'Under Treatment') => setNewAnimal({ ...newAnimal, healthStatus: value })}>
                                            <SelectTrigger id="healthStatus">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Healthy">Healthy</SelectItem>
                                                <SelectItem value="Sick">Sick</SelectItem>
                                                <SelectItem value="Under Treatment">Under Treatment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tagColor">Tag Color</Label>
                                        <Input id="tagColor" value={newAnimal.tagColor} onChange={(e) => setNewAnimal({ ...newAnimal, tagColor: e.target.value })} placeholder="e.g., Yellow, Blue" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="identificationMark">Identification Mark</Label>
                                    <Input id="identificationMark" value={newAnimal.identificationMark} onChange={(e) => setNewAnimal({ ...newAnimal, identificationMark: e.target.value })} placeholder="Any unique marks" />
                                </div>
                           </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" onClick={handleRegisterAnimal} disabled={isRegistering}>
                                {isRegistering ? 'Registering...' : 'Register Animal'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
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
            {filteredAnimals?.map((animal) => (
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
             {filteredAnimals && filteredAnimals.length === 0 && !isLoading && (
                <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                        No animals found{searchTerm && ` for "${searchTerm}"`}.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>{filteredAnimals?.length ?? 0}</strong> of <strong>{animals?.length ?? 0}</strong> animals
        </div>
      </CardFooter>
    </Card>

    <Dialog open={isCaptureDialogOpen} onOpenChange={setIsCaptureDialogOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture Animal Photo</DialogTitle>
          <DialogDescription>
            Position the animal in the frame and click "Capture" to take a photo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-full aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          </div>
          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <Camera className="h-4 w-4" />
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser to use this feature.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsCaptureDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCaptureImage} disabled={!hasCameraPermission}>
            <Camera className="mr-2 h-4 w-4" />
            Capture Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
