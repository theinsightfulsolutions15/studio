
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, UserCheck, ShieldCheck, Activity, CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { doc, collection, query, where, writeBatch, orderBy } from 'firebase/firestore';
import type { User as AppUser, Animal, AppNotification } from '@/lib/types';
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

  // --- Admin Specific Notifications (User Requests) ---
   const adminNotificationsQuery = useMemoFirebase(() => (
    isAdmin && firestore ? query(collection(firestore, 'admin_notifications'), where('read', '==', false), orderBy('createdAt', 'desc')) : null
  ), [isAdmin, firestore]);
  const { data: adminNotifications } = useCollection<AppNotification>(adminNotificationsQuery);


  // --- User-Specific Personal Notifications (ONLY for Admins now) ---
  const userNotificationsQuery = useMemoFirebase(() => (
    user && firestore && isAdmin ? query(collection(firestore, `users/${user.uid}/notifications`), where('read', '==', false), orderBy('createdAt', 'desc')) : null
  ), [user, firestore, isAdmin]);
  const { data: userNotifications } = useCollection<AppNotification>(userNotificationsQuery);

  // --- User-Specific Health Alerts ---
  const sickAnimalsQuery = useMemoFirebase(() => (
      user && firestore ? query(collection(firestore, `users/${user.uid}/animals`), where('healthStatus', 'in', ['Sick', 'Under Treatment'])) : null
  ), [user, firestore]);
  const { data: sickAnimals } = useCollection<Animal>(sickAnimalsQuery);
  

  const adminNotificationsCount = adminNotifications?.length ?? 0;
  
  const personalNotifications = useMemo(() => {
      // For admins, combine personal notifications and sick animal alerts
      if (isAdmin) {
          return [
              ...(userNotifications || []),
              ...(sickAnimals?.map(a => ({
                  id: `sick-${a.id}`,
                  title: "Animal Health Alert",
                  description: `Animal ${a.govtTagNo} is ${a.healthStatus}.`,
                  createdAt: new Date(), // This won't be accurate, but it's for display
                  href: '/dashboard/master/animals',
                  icon: 'Activity' as const,
                  read: false,
              })) || [])
          ];
      }
      // For regular users, only show sick animal alerts
      return sickAnimals?.map(a => ({
          id: `sick-${a.id}`,
          title: "Animal Health Alert",
          description: `Animal ${a.govtTagNo} is ${a.healthStatus}.`,
          createdAt: new Date(),
          href: '/dashboard/master/animals',
          icon: 'Activity' as const,
          read: false,
      })) || [];
  }, [userNotifications, sickAnimals, isAdmin]);

  const personalNotificationsCount = personalNotifications.length;

  const totalNotificationsCount = isAdmin ? adminNotificationsCount + personalNotificationsCount : 0; // Only admins see the count badge

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/');
      });
    }
  };

  const markAllAsRead = async () => {
    if (!firestore || !user || !isAdmin) return; // Only allow admins to perform this
    const batch = writeBatch(firestore);

    if (adminNotifications) {
        adminNotifications.forEach(notif => {
            const notifRef = doc(firestore, 'admin_notifications', notif.id);
            batch.update(notifRef, { read: true });
        });
    }
    
    if (userNotifications) {
        userNotifications.forEach(notif => {
            const notifRef = doc(firestore, `users/${user.uid}/notifications`, notif.id);
            batch.update(notifRef, { read: true });
        });
    }

    try {
        await batch.commit();
    } catch(e) {
        console.error("Failed to mark all notifications as read", e);
    }
  };

  const displayName = userData?.name || user?.displayName;
  const photoURL = userData?.photoURL || user?.photoURL;
  const fallback = displayName ? displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase();

  const getIcon = (iconName: AppNotification['icon']) => {
    switch (iconName) {
        case 'UserCheck': return <UserCheck className="h-4 w-4 text-blue-500" />;
        case 'ShieldCheck': return <ShieldCheck className="h-4 w-4 text-green-500" />;
        case 'Activity': return <Activity className="h-4 w-4 text-red-500" />;
        default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };
  

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      
      <div className="flex-1">
        <DateTimeDisplay />
      </div>

      <div className="flex items-center gap-4">
         {isAdmin && (
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                <Bell className="h-5 w-5" />
                {totalNotificationsCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">{totalNotificationsCount}</Badge>
                )}
                <span className="sr-only">Toggle notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[350px]">
                <DropdownMenuLabel className="flex justify-between items-center">
                <span>Notifications</span>
                {(totalNotificationsCount > 0) && (
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={markAllAsRead}>Mark all as read</Button>
                )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {totalNotificationsCount === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        You have no new notifications.
                    </div>
                ) : (
                    <>
                    {/* Personal notifications (for admin) */}
                    {personalNotifications?.map(n => (
                        <DropdownMenuItem key={n.id} asChild>
                            <Link href={n.href || '#'} className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                    {getIcon(n.icon)}
                                    <p className="font-medium">{n.title}</p>
                                </div>
                                <p className="pl-6 text-xs text-muted-foreground">{n.description}</p>
                            </Link>
                        </DropdownMenuItem>
                    ))}
                    {/* Admin-only notifications */}
                    {adminNotificationsCount > 0 && (
                        <>
                        {personalNotificationsCount > 0 && <DropdownMenuSeparator />}
                        {adminNotifications?.map(n => (
                            <DropdownMenuItem key={n.id} asChild>
                                <Link href={n.href || '#'} className="flex flex-col items-start gap-1">
                                    <div className="flex items-center gap-2">
                                        {getIcon(n.icon)}
                                        <p className="font-medium">{n.title}</p>
                                    </div>
                                    <p className="pl-6 text-xs text-muted-foreground">{n.description}</p>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                        </>
                    )}
                    </>
                )}
            </DropdownMenuContent>
            </DropdownMenu>
         )}

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
