
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser } from '@/firebase';

export default function SupportTicketsPage() {
  const { isAdmin } = useUser();

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex justify-center items-start pt-10">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>
            This page is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>The support ticket functionality has been temporarily removed for redesign.</p>
        </CardContent>
      </Card>
    </div>
  );
}
