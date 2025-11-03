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
import { placeholderAnimals } from '@/lib/placeholder-data';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import Image from 'next/image';

export default function AnimalsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Animals</CardTitle>
                <CardDescription>Manage and track all animals in the Gaushala.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search animals..." className="pl-8 sm:w-[300px]" />
                </div>
                <Button>
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
              <TableHead>Breed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entry Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placeholderAnimals.map((animal) => (
              <TableRow key={animal.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt="Animal image"
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={animal.imageUrl}
                    width="64"
                    data-ai-hint={animal.imageHint}
                  />
                </TableCell>
                <TableCell className="font-medium">{animal.govtTagNo}</TableCell>
                <TableCell>{animal.breed}</TableCell>
                <TableCell>
                  <Badge variant={animal.healthStatus === 'Healthy' ? 'secondary' : animal.healthStatus === 'Sick' ? 'destructive' : 'default'} className="bg-opacity-80">
                    {animal.healthStatus}
                  </Badge>
                </TableCell>
                <TableCell>{animal.entryDate}</TableCell>
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
          Showing <strong>1-5</strong> of <strong>{placeholderAnimals.length}</strong> animals
        </div>
      </CardFooter>
    </Card>
  );
}
