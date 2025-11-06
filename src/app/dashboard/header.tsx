'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, UserCheck, ShieldCheck, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { doc, collection, query, where } from 'firebase/firestore';
import type { User as AppUser, AmcRenewal, Animal } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

function DateTimeDisplay() {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDateTime(new Date());

    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!currentDateTime) {
    return null;
  }

  const date = currentDateTime.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const day = currentDateTime.toLocaleString('en-us', { weekday: 'long' });
  const time = currentDateTime.toLocaleTimeString();

  return (
    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
      <div className="hidden sm:flex items-center gap-2">
        <span>{date}</span>
        <span className="h-4 w-px bg-border" />
        <span>{day}</span>
      </div>
      <div className="font-mono tracking-wider">{time}</div>
    </div>
  );
}


export default function Header() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userData } = useDoc<AppUser>(userDocRef);

  const isAdmin = userData?.role === 'Admin';

  const pendingUsersQuery = useMemoFirebase(() => (
    isAdmin && firestore ? query(collection(firestore, 'users'), where('status', '==', 'Pending')) : null
  ), [isAdmin, firestore]);
  const { data: pendingUsers } = useCollection<AppUser>(pendingUsersQuery);

  const pendingRenewalsQuery = useMemoFirebase(() => (
      isAdmin && firestore ? query(collection(firestore, 'amc_renewals'), where('status', '==', 'Pending')) : null
  ), [isAdmin, firestore]);
  const { data: pendingRenewals } = useCollection<AmcRenewal>(pendingRenewalsQuery);

  const sickAnimalsQuery = useMemoFirebase(() => (
      user && firestore ? query(collection(firestore, `users/${user.uid}/animals`), where('healthStatus', 'in', ['Sick', 'Under Treatment'])) : null
  ), [user, firestore]);
  const { data: sickAnimals } = useCollection<Animal>(sickAnimalsQuery);

  const notificationsCount = (pendingUsers?.length ?? 0) + (pendingRenewals?.length ?? 0) + (sickAnimals?.length ?? 0);

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/');
      });
    }
  };

  const displayName = userData?.name || user?.displayName;
  const photoURL = userData?.photoURL || user?.photoURL;
  const fallback = displayName ? displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      
      <div className="flex-1">
        <DateTimeDisplay />
      </div>

      <div className="flex items-center gap-4">
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              {notificationsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">{notificationsCount}</Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[350px]">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationsCount === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    You have no new notifications.
                </div>
            ) : (
                <>
                {pendingUsers?.map(u => (
                    <DropdownMenuItem key={u.id} asChild>
                        <Link href="/dashboard/user-approvals" className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-blue-500" />
                                <p className="font-medium">New User Pending Approval</p>
                            </div>
                            <p className="pl-6 text-xs text-muted-foreground">{u.name} is waiting for approval.</p>
                        </Link>
                    </DropdownMenuItem>
                ))}
                {pendingRenewals?.map(r => (
                     <DropdownMenuItem key={r.id} asChild>
                        <Link href="/dashboard/amc" className="flex flex-col items-start gap-1">
                           <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-green-500" />
                                <p className="font-medium">New AMC Renewal Request</p>
                            </div>
                            <p className="pl-6 text-xs text-muted-foreground">{r.userName} submitted a renewal request.</p>
                        </Link>
                    </DropdownMenuItem>
                ))}
                {sickAnimals?.map(a => (
                     <DropdownMenuItem key={a.id} asChild>
                        <Link href="/dashboard/master/animals" className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-red-500" />
                                <p className="font-medium">Animal Health Alert</p>
                            </div>
                            <p className="pl-6 text-xs text-muted-foreground">Animal {a.govtTagNo} is {a.healthStatus}.</p>
                        </Link>
                    </DropdownMenuItem>
                ))}
                </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage src={photoURL || `https://i.pravatar.cc/150?u=${user?.email}`} alt={displayName || 'User'} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/dashboard/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
