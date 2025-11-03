import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { DatePickerWithRange } from '@/components/date-picker-range';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline">Reports</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <DatePickerWithRange className="w-full sm:w-auto" />
            <Button className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Generate Report
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Select a date range and report type to generate a downloadable report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center">
            <div>
              <p className="text-muted-foreground">Select a report type and date range.</p>
              <p className="text-sm text-muted-foreground">Generated reports will appear here.</p>
            </div>
          </div>
        </CardContent>
      </Card>
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
