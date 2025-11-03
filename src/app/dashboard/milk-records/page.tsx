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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { milkData } from '@/lib/placeholder-data';


export default function MilkRecordsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Milk Records</CardTitle>
                <CardDescription>Log and monitor daily milk production.</CardDescription>
            </div>
            <Button>
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
            {milkData.map((record) => (
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
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-{milkData.length}</strong> of <strong>{milkData.length}</strong> records
        </div>
      </CardFooter>
    </Card>
  );
}
