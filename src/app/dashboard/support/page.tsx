
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
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { User as AppUser, SupportTicket } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { LifeBuoy, FileClock } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';

function SubmittedTicket({ ticket }: { ticket: SupportTicket }) {
    return (
        <div className="flex justify-center items-start pt-10">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <FileClock className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-4">You Have a Pending Ticket</CardTitle>
                    <CardDescription>
                        Your previous support request is currently being reviewed by our team.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                    <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Submission Date:</span>
                            <span className="font-medium">{format(ticket.submittedAt.toDate(), 'dd/MM/yyyy')}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Subject:</span>
                            <span className="font-medium">{ticket.subject}</span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-muted-foreground">Description:</span>
                            <p className="font-medium whitespace-pre-wrap">{ticket.description}</p>
                        </div>
                    </div>
                     <p className="mt-4 text-center text-muted-foreground">
                        You will be notified once your request has been actioned. You can only have one open ticket at a time.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

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

  const openTicketsQuery = useMemoFirebase(() => {
      if(!user || !firestore) return null;
      return query(
          collection(firestore, 'support_tickets'),
          where('userId', '==', user.uid),
          where('status', '==', 'Open')
      );
  }, [user, firestore]);
  const { data: openTickets, isLoading: isLoadingTickets } = useCollection<SupportTicket>(openTicketsQuery);
  const existingOpenTicket = openTickets?.[0];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to submit a request.',
      });
      return;
    }
    if (!subject || !description) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill out both the subject and description fields.',
      });
      return;
    }

    setIsSubmitting(true);

    const ticketData: Omit<SupportTicket, 'id'> = {
        userId: user.uid,
        userName: userData.name,
        userEmail: userData.email,
        subject: subject,
        description: description,
        submittedAt: serverTimestamp(),
        status: 'Open',
    };

    try {
        await addDoc(collection(firestore, 'support_tickets'), ticketData);
        toast({
            title: 'Support Request Submitted',
            description: 'Thank you for your feedback. Our team will get back to you shortly.',
        });
        setSubject('');
        setDescription('');
    } catch (error) {
        console.error("Error submitting ticket:", error);
        toast({
            variant: 'destructive',
            title: 'Submission Failed',
            description: 'Could not submit your request. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isUserLoading || isUserDataLoading || isLoadingTickets;

  if (isLoading) {
      return (
        <div className="flex justify-center items-start pt-10">
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="space-y-2">
                           <Skeleton className="h-6 w-48" />
                           <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Your Name</Label><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Label>Your Email</Label><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="space-y-2"><Label>Subject</Label><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Label>Description</Label><Skeleton className="h-24 w-full" /></div>
                </CardContent>
                 <CardFooter>
                    <Skeleton className="h-10 w-36 ml-auto" />
                </CardFooter>
            </Card>
        </div>
      )
  }

  if (existingOpenTicket) {
      return <SubmittedTicket ticket={existingOpenTicket} />;
  }


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
