'use client';

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
import { Download } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // User Profile state
  const [gaushalaName, setGaushalaName] = useState('Shri Krishna Gaushala');
  const [address, setAddress] = useState('Vrindavan, Mathura, Uttar Pradesh');

  // AMC Details state
  const [amcProvider, setAmcProvider] = useState('');
  const [amcExpiry, setAmcExpiry] = useState('');
  const [amcDescription, setAmcDescription] = useState('');

  const amcDetailsRef = useMemoFirebase(() => {
    if (!user) return null;
    // Assuming one AMC detail doc per user for simplicity, with a fixed ID
    return doc(firestore, `users/${user.uid}/amc_details/main`);
  }, [user, firestore]);

  const { data: amcData, isLoading: isAmcLoading } = useDoc(amcDetailsRef);

  useEffect(() => {
    if (amcData) {
      setAmcProvider(amcData.providerName || '');
      setAmcExpiry(amcData.endDate?.split('T')[0] || '');
      setAmcDescription(amcData.description || '');
    }
  }, [amcData]);


  const handleProfileSave = () => {
    toast({
      title: "Success",
      description: "Gaushala profile updated successfully. (This is a demo and not saved to the database)",
    });
  };

  const handleAmcUpdate = () => {
    if (!user || !amcDetailsRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to update AMC details.' });
        return;
    }
    const amcDataToSave = {
        userId: user.uid,
        providerName: amcProvider,
        description: amcDescription,
        startDate: new Date().toISOString(),
        endDate: amcExpiry ? new Date(amcExpiry).toISOString() : '',
    };
    setDocumentNonBlocking(amcDetailsRef, amcDataToSave, { merge: true });
    toast({
        title: "AMC Details Updated",
        description: "Your AMC details have been saved.",
    });
  };

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>

        <Card>
            <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>This is your account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="user-name">Your Name</Label>
                    {isUserLoading ? <Skeleton className="h-10 w-full" /> : <Input id="user-name" value={user?.displayName || ''} readOnly disabled />}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="user-email">Your Email</Label>
                    {isUserLoading ? <Skeleton className="h-10 w-full" /> : <Input id="user-email" value={user?.email || ''} readOnly disabled />}
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>AMC Details</CardTitle>
                <CardDescription>Track Annual Maintenance Contract details for the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAmcLoading ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                     <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-20 w-full" /></div>
                     <Skeleton className="h-10 w-36" />
                  </div>
                ) : (
                <>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amc-provider">Provider Name</Label>
                            <Input id="amc-provider" value={amcProvider} onChange={(e) => setAmcProvider(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amc-expiry">Expiry Date</Label>
                            <Input id="amc-expiry" type="date" value={amcExpiry} onChange={(e) => setAmcExpiry(e.target.value)} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="amc-description">Description</Label>
                        <Textarea id="amc-description" placeholder="Enter AMC description" value={amcDescription} onChange={(e) => setAmcDescription(e.target.value)} />
                    </div>
                    <Button onClick={handleAmcUpdate}>Update AMC Details</Button>
                </>
                )}
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

         <Card>
            <CardHeader>
                <CardTitle>Gaushala Profile</CardTitle>
                <CardDescription>Update your Gaushala's information (demo only).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="gaushala-name">Gaushala Name</Label>
                    <Input id="gaushala-name" value={gaushalaName} onChange={(e) => setGaushalaName(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <Button onClick={handleProfileSave}>Save Changes</Button>
            </CardContent>
        </Card>
    </div>
  );
}
