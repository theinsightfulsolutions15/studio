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
import { financialData } from '@/lib/placeholder-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function FinancePage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Financial Records</CardTitle>
                <CardDescription>Track all receipts, payments, and expenses.</CardDescription>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Transaction
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <TransactionsTable data={financialData} />
          </TabsContent>
          <TabsContent value="receipts" className="mt-4">
             <TransactionsTable data={financialData.filter(t => t.type === 'Receipt')} />
          </TabsContent>
           <TabsContent value="payments" className="mt-4">
             <TransactionsTable data={financialData.filter(t => t.type === 'Payment')} />
          </TabsContent>
           <TabsContent value="expenses" className="mt-4">
             <TransactionsTable data={financialData.filter(t => t.type === 'Expense')} />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-{financialData.length}</strong> of <strong>{financialData.length}</strong> transactions
        </div>
      </CardFooter>
    </Card>
  );
}


function TransactionsTable({ data }: { data: typeof financialData }) {
    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.date}</TableCell>
                <TableCell>
                  <Badge variant={record.type === 'Receipt' ? 'secondary' : record.type === 'Expense' ? 'destructive' : 'outline'} className="bg-opacity-80">
                    {record.type}
                  </Badge>
                </TableCell>
                <TableCell>{record.category}</TableCell>
                <TableCell className="max-w-[300px] truncate">{record.description}</TableCell>
                <TableCell className="text-right font-medium">{record.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    );
}
