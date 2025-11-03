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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';

// Helper function to generate the next customer ID
const getNextCustomerId = (users: User[] | null): string => {
    if (!users || users.length === 0) {
        return 'G-001';
    }

    const existingIds = users
        .map(u => u.customerId)
        .filter((id): id is string => !!id && id.startsWith('G-'))
        .map(id => parseInt(id.substring(2), 10))
        .filter(num => !isNaN(num));

    if (existingIds.length === 0) {
        return 'G-001';
    }

    const maxId = Math.max(...existingIds);
    return `G-${(maxId + 1).toString().padStart(3, '0')}`;
};

function UserRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32 hidden sm:block" />
          </div>
        </div>
      </TableCell>
       <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded-md" />
      </TableCell>
    </TableRow>
  );
}


export default function UsersPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [validityDate, setValidityDate] = useState<Date | undefined>();

  const usersCollection = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading } = useCollection<User>(usersCollection);

  const isAdmin = currentUser?.uid && users?.find(u => u.id === currentUser.uid)?.role === 'Admin';


  const handleApproveUser = async () => {
    if (!firestore || !selectedUser || !validityDate) {
        toast({
            variant: 'destructive',
            title: 'Approval Failed',
            description: 'Please select a validity date.',
        });
        return;
    }
    setIsApproving(selectedUser.id);
    try {
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const allUsers: User[] = usersSnapshot.docs.map(d => d.data() as User);

        const newCustomerId = getNextCustomerId(allUsers);
        const userDocRef = doc(firestore, 'users', selectedUser.id);

        await updateDoc(userDocRef, {
            status: 'Active',
            customerId: newCustomerId,
            validityDate: validityDate.toISOString().split('T')[0],
        });

        toast({
            title: 'User Approved',
            description: `The user has been approved with Customer ID: ${newCustomerId}`,
        });
    } catch (error) {
        console.error("Error approving user:", error);
        toast({
            variant: 'destructive',
            title: 'Approval Failed',
            description: 'Could not approve the user. Please try again.',
        });
    } finally {
        setIsApproving(null);
        setSelectedUser(null);
        setValidityDate(undefined);
    }
  };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and roles.</CardDescription>
            </div>
            <Button disabled={!isAdmin}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden sm:table-cell">Customer ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Validity Date</TableHead>
              <TableHead className="hidden lg:table-cell">Signup Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => <UserRowSkeleton key={i} />)}
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.photoURL || `https://i.pravatar.cc/150?u=${user.email}`} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium truncate">
                            {user.name}
                            <div className="text-sm text-muted-foreground truncate hidden sm:block">{user.email}</div>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{user.customerId || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={user.status === 'Active' ? 'secondary' : user.status === 'Pending' ? 'default' : 'destructive'} className="bg-opacity-80">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{user.validityDate || 'N/A'}</TableCell>
                <TableCell className="hidden lg:table-cell">{user.signupDate}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled={!isAdmin || isApproving === user.id}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {user.status === 'Pending' && (
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={() => setSelectedUser(user)}>
                                Approve User
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        )}
                        <DropdownMenuItem>Edit Role</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Deactivate User</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-{users?.length ?? 0}</strong> of <strong>{users?.length ?? 0}</strong> users
        </div>
      </CardFooter>
    </Card>

    <AlertDialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Approve User: {selectedUser?.name}</AlertDialogTitle>
            <AlertDialogDescription>
                Select a validity date for this user. They will have full access until this date.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="validity-date" className="text-right">
                        Validity
                    </Label>
                    <div className="col-span-3">
                        <DatePicker date={validityDate} setDate={setValidityDate} />
                    </div>
                </div>
            </div>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveUser} disabled={!validityDate || !!isApproving}>
                {isApproving ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
