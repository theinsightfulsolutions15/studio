
'use client';

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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, orderBy, where } from 'firebase/firestore';
import type { SupportTicket, User as AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Ticket, Inbox } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useState } from 'react';

function TicketRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell>
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
      </TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  );
}

export default function SupportTicketsPage() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const userDocRef = useMemoFirebase(() => (authUser ? doc(firestore, 'users', authUser.uid) : null), [authUser, firestore]);
  const { data: currentUser, isLoading: isUserLoading } = useDoc<AppUser>(userDocRef);
  const isAdmin = currentUser?.role === 'Admin';

  const ticketsQuery = useMemoFirebase(() => {
    if (!isAdmin || !firestore) return null;
    return query(collection(firestore, 'support_tickets'), orderBy('submittedAt', 'desc'));
  }, [isAdmin, firestore]);

  const { data: allTickets, isLoading: isLoadingTickets } = useCollection<SupportTicket>(ticketsQuery);

  const openTickets = useMemo(() => allTickets?.filter(t => t.status === 'Open') || [], [allTickets]);
  const closedTickets = useMemo(() => allTickets?.filter(t => t.status === 'Closed') || [], [allTickets]);

  const handleUpdateStatus = async (ticket: SupportTicket, status: 'Open' | 'Closed') => {
    if (!firestore) return;
    const ticketRef = doc(firestore, 'support_tickets', ticket.id);
    try {
        await updateDocumentNonBlocking(ticketRef, { status: status });
        toast({
            title: 'Status Updated',
            description: `Ticket from ${ticket.userName} has been marked as ${status}.`
        });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update ticket status.' });
    }
  };

  const isLoading = isAuthUserLoading || isUserLoading || isLoadingTickets;
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Loading Support Tickets...</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to view this page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const TicketsTable = ({ tickets }: { tickets: SupportTicket[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="hidden md:table-cell">Subject</TableHead>
          <TableHead>Status</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map(ticket => (
          <TableRow key={ticket.id}>
            <TableCell>{format(ticket.submittedAt.toDate(), 'dd/MM/yyyy')}</TableCell>
            <TableCell>
              <div className="font-medium">{ticket.userName}</div>
              <div className="text-sm text-muted-foreground">{ticket.userEmail}</div>
            </TableCell>
            <TableCell className="hidden md:table-cell">{ticket.subject}</TableCell>
            <TableCell>
              <Badge variant={ticket.status === 'Open' ? 'destructive' : 'secondary'}>{ticket.status}</Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setSelectedTicket(ticket)}>View Details</DropdownMenuItem>
                  {ticket.status === 'Open' && (
                    <DropdownMenuItem onSelect={() => handleUpdateStatus(ticket, 'Closed')}>Mark as Closed</DropdownMenuItem>
                  )}
                  {ticket.status === 'Closed' && (
                    <DropdownMenuItem onSelect={() => handleUpdateStatus(ticket, 'Open')}>Re-open Ticket</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
        {tickets.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-10 w-10" />
                    <span>No tickets in this category.</span>
                </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>Review and manage user-submitted support requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="open">
                Open
                <Badge variant="destructive" className="ml-2">{openTickets.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
            <TabsContent value="open" className="mt-4">
                {isLoadingTickets ? <TicketRowSkeleton /> : <TicketsTable tickets={openTickets} />}
            </TabsContent>
            <TabsContent value="closed" className="mt-4">
                {isLoadingTickets ? <TicketRowSkeleton /> : <TicketsTable tickets={closedTickets} />}
            </TabsContent>
          </Tabs>
        </CardContent>
         <CardFooter>
            <div className="text-xs text-muted-foreground">
                Showing <strong>{allTickets?.length ?? 0}</strong> total tickets
            </div>
        </CardFooter>
      </Card>
      
      <Dialog open={!!selectedTicket} onOpenChange={(isOpen) => !isOpen && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Ticket from {selectedTicket?.userName}</DialogTitle>
            <DialogDescription>
                Submitted {selectedTicket && formatDistanceToNow(selectedTicket.submittedAt.toDate(), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
                <h4 className="font-semibold text-sm">Subject</h4>
                <p className="text-sm">{selectedTicket?.subject}</p>
            </div>
             <div className="space-y-1">
                <h4 className="font-semibold text-sm">Description</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{selectedTicket?.description}</p>
            </div>
             <div className="space-y-1">
                <h4 className="font-semibold text-sm">User Details</h4>
                <p className="text-sm">{selectedTicket?.userName} ({selectedTicket?.userEmail})</p>
            </div>
          </div>
          <DialogFooter>
             <Button variant="secondary" onClick={() => setSelectedTicket(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    