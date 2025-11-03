import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>

        <Card>
            <CardHeader>
                <CardTitle>Gaushala Profile</CardTitle>
                <CardDescription>Update your Gaushala's information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="gaushala-name">Gaushala Name</Label>
                    <Input id="gaushala-name" defaultValue="Shri Krishna Gaushala" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" defaultValue="Vrindavan, Mathura, Uttar Pradesh" />
                </div>
                <Button>Save Changes</Button>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>AMC Details</CardTitle>
                <CardDescription>Track Annual Maintenance Contract details for the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amc-provider">Provider Name</Label>
                        <Input id="amc-provider" defaultValue="TechSolutions Pvt. Ltd." />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="amc-expiry">Expiry Date</Label>
                        <Input id="amc-expiry" type="date" defaultValue="2025-12-31" />
                    </div>
                </div>
                <Button>Update AMC Details</Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Data Backup</CardTitle>
                <CardDescription>Securely back up all your application data.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">Create a new backup</p>
                        <p className="text-sm text-muted-foreground">Last backup: 2024-05-15</p>
                    </div>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Download Full Backup
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
