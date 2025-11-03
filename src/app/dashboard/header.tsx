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

function DateTimeDisplay() {
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  useEffect(() => {
    // Set the initial date on the client to avoid hydration mismatch
    setCurrentDateTime(new Date());

    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  if (!currentDateTime) {
    return null; // Or a loading skeleton
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

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      
      <div className="flex-1">
        <DateTimeDisplay />
      </div>

      <div className="flex items-center gap-4">
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
