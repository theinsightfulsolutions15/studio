
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, addDoc, query, orderBy, where, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { User as AppUser, SupportTicket } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { LifeBuoy, Inbox } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';


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

  const ticketsQuery = useMemoFirebase(() => {
      if(!user || !firestore) return null;
      // Query the top-level collection for tickets belonging to the current user
      return query(
          collection(firestore, 'support_tickets'),
          where('userId', '==', user.uid),
          orderBy('submittedAt', 'desc')
      );
  }, [user, firestore]);
  
  const { data: userTickets, isLoading: isLoadingTickets } = useCollection<SupportTicket>(ticketsQuery);


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
        submittedAt: new Date(),
        status: 'Open',
    };

    try {
        // Save to the top-level 'support_tickets' collection
        const ticketsColRef = collection(firestore, `support_tickets`);
        await addDocumentNonBlocking(ticketsColRef, ticketData);
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


  return (
    <div className="flex justify-center items-start pt-10">
        <div className="w-full max-w-3xl space-y-6">
            <Card>
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
                             <div className="grid gap-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Your Name</Label><Skeleton className="h-10 w-full" /></div>
                                    <div className="space-y-2"><Label>Your Email</Label><Skeleton className="h-10 w-full" /></div>
                                </div>
                                <div className="space-y-2"><Label>Subject</Label><Skeleton className="h-10 w-full" /></div>
                                <div className="space-y-2"><Label>Description</Label><Skeleton className="h-24 w-full" /></div>
                            </div>
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

            <Card>
                <CardHeader>
                    <CardTitle>Your Ticket History</CardTitle>
                    <CardDescription>A list of your submitted support requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <Skeleton className="h-4 w-1/2 mx-auto" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoading && userTickets && userTickets.length > 0 ? (
                                userTickets.map((ticket) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell>{ticket.submittedAt ? format(ticket.submittedAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{ticket.subject}</TableCell>
                                        <TableCell>
                                            <Badge variant={ticket.status === 'Open' ? 'destructive' : 'secondary'}>
                                                {ticket.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Inbox className="h-8 w-8" />
                                            You haven't submitted any tickets yet.
                                        </div>
                                    </TableCell>
                                </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
