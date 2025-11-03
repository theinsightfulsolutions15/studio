
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
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const router = useRouter();

  const handleLogout = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/');
      });
    }
  };

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
              <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">3</Badge>
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1">
                <p className="font-medium">New User Pending</p>
                <p className="text-xs text-muted-foreground">A new user has registered and is waiting for approval.</p>
            </DropdownMenuItem>
             <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1">
                <p className="font-medium">Animal Record Updated</p>
                <p className="text-xs text-muted-foreground">Health status of UID12345 changed to 'Sick'.</p>
            </DropdownMenuItem>
             <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1">
                <p className="font-medium">New Donation Received</p>
                <p className="text-xs text-muted-foreground">A donation of ₹5000 was received.</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage src={user?.photoURL || `https://i.pravatar.cc/150?u=${user?.email}`} alt={user?.displayName || 'User'} />
                <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
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
