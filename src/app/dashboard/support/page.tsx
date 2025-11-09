
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { User as AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { LifeBuoy } from 'lucide-react';

export default function SupportPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<AppUser>(userDocRef);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out both the subject and description fields.',
      });
      return;
    }

    setIsSubmitting(true);

    // In a real application, you would send this data to a backend service,
    // like a Firestore collection or an external ticketing system.
    console.log({
      name: userData?.name,
      email: userData?.email,
      subject,
      description,
    });

    // Simulate network request
    setTimeout(() => {
      toast({
        title: 'Support Request Submitted',
        description: 'Thank you for your feedback. Our team will get back to you shortly.',
      });
      setSubject('');
      setDescription('');
      setIsSubmitting(false);
    }, 1000);
  };

  const isLoading = isUserLoading || isUserDataLoading;

  return (
    <div className="flex justify-center items-start pt-10">
        <Card className="w-full max-w-3xl">
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-full">
                           <LifeBuoy className="h-8 w-8" />
                        </div>
                        <div>
                            <CardTitle>Contact Support</CardTitle>
                            <CardDescription>
                                Having an issue? Fill out the form below and our team will get back to you as soon as possible.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6">
                    {isLoading ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Your Name</Label><Skeleton className="h-10 w-full" /></div>
                                <div className="space-y-2"><Label>Your Email</Label><Skeleton className="h-10 w-full" /></div>
                            </div>
                            <div className="space-y-2"><Label>Subject</Label><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Label>Description</Label><Skeleton className="h-24 w-full" /></div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Your Name</Label>
                                    <Input id="name" value={userData?.name || ''} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Your Email</Label>
                                    <Input id="email" type="email" value={userData?.email || ''} disabled />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Issue with milk records" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Describe your issue</Label>
                                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Please provide as much detail as possible..." className="min-h-[150px]" />
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full sm:w-auto ml-auto" disabled={isLoading || isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    </div>
  );
}
