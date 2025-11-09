
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SupportPage() {
  return (
    <div className="flex justify-center items-start pt-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Support</CardTitle>
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
