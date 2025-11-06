
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Camera, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User as AppUser } from '@/lib/types';

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

  // User Profile state
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // Image Capture State
  const [isCaptureDialogOpen, setIsCaptureDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.name || user?.displayName || '');
      setAddress(userData.address || '');
      setMobileNo(userData.mobileNo || '');
      setPhotoURL(userData.photoURL || user?.photoURL || null);
    } else if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || null);
    }
  }, [userData, user]);

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
        setPhotoURL(dataUri);
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
        setPhotoURL(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = () => {
     if (!userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to update your profile.' });
        return;
    }
    const profileData: any = {
        name: displayName,
        address,
        mobileNo,
    };
    if (photoURL) {
        profileData.photoURL = photoURL;
    }

    setDocumentNonBlocking(userDocRef, profileData, { merge: true });
    toast({
      title: "Success",
      description: "Profile updated successfully.",
    });
  };

  const isLoading = isUserLoading || isUserDocLoading;

  return (
    <>
    <div className="space-y-6">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>

        <Card>
            <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>This is your account information. Click save to update.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid md:grid-cols-[1fr_3fr] gap-6">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-32 w-32">
                           <AvatarImage src={photoURL || `https://i.pravatar.cc/150?u=${user?.email}`} />
                           <AvatarFallback>{displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
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
                    <div className="space-y-4">
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
                            <Label htmlFor="address">Address</Label>
                            {isLoading ? <Skeleton className="h-20 w-full" /> : <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="user-role">Role</Label>
                    {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="user-role" value={userData?.role || ''} readOnly disabled />}
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

     <Dialog open={isCaptureDialogOpen} onOpenChange={setIsCaptureDialogOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture Profile Photo</DialogTitle>
          <DialogDescription>
            Position yourself in the frame and click "Capture" to take a photo.
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

    