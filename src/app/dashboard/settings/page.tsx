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

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  // User Profile state
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [mobileNo, setMobileNo] = useState('');

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.name || user?.displayName || '');
      setAddress(userData.address || '');
      setMobileNo(userData.mobileNo || '');
    } else if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [userData, user]);


  const handleProfileSave = () => {
     if (!userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to update your profile.' });
        return;
    }
    const profileData = {
        name: displayName,
        address,
        mobileNo,
    };
    setDocumentNonBlocking(userDocRef, profileData, { merge: true });
    toast({
      title: "Success",
      description: "Profile updated successfully.",
    });
  };

  const isLoading = isUserLoading || isUserDocLoading;

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>

        <Card>
            <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>This is your account information. Click save to update.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="user-name">Your Name</Label>
                        {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="user-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="user-email">Your Email</Label>
                        {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="user-email" value={user?.email || ''} readOnly disabled />}
                    </div>
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="user-mobile">Mobile No.</Label>
                        {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="user-mobile" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} />}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="customer-id">Customer ID</Label>
                        {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="customer-id" value={userData?.customerId || ''} readOnly disabled />}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="user-role">Role</Label>
                    {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="user-role" value={userData?.role || ''} readOnly disabled />}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    {isLoading ? <Skeleton className="h-20 w-full" /> : <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />}
                </div>
                <Button onClick={handleProfileSave} disabled={isLoading}>Save Changes</Button>
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
                <CardDescription>This section is for demo purposes and is not connected to the database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="gaushala-name">Gaushala Name</Label>
                    <Input id="gaushala-name" defaultValue="Shri Krishna Gaushala" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="g-address">Address</Label>
                    <Textarea id="g-address" defaultValue="Vrindavan, Mathura, Uttar Pradesh" />
                </div>
                <Button onClick={() => toast({ title: 'Demo', description: 'This is a demo feature.'})}>Save Changes</Button>
            </CardContent>
        </Card>
    </div>
  );
}
