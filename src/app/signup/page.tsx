'use client';

import Link from "next/link";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/logo";
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Helper function to get the next customer ID
async function getNextCustomerId(firestore: any): Promise<string> {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('customerId', '!=', ''));
    const querySnapshot = await getDocs(q);
    let maxId = 0;
    if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.customerId && data.customerId.startsWith('G-')) {
                const idNumber = parseInt(data.customerId.substring(2), 10);
                if (!isNaN(idNumber) && idNumber > maxId) {
                    maxId = idNumber;
                }
            }
        });
    }
    return `G-${(maxId + 1).toString().padStart(3, '0')}`;
}


export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialized.'})
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(firestore, 'users', user.uid);
      
      const isAdmin = email === 'theinsightfulsolutions@gmail.com';
      
      let customerId = '';
      if (isAdmin) {
          customerId = await getNextCustomerId(firestore);
      }

      const userData = {
        id: user.uid,
        name: fullName,
        email: email,
        role: isAdmin ? 'Admin' : 'User',
        status: isAdmin ? 'Active' : 'Pending', // Set status to 'Pending' for new users
        signupDate: new Date().toISOString().split('T')[0],
        address: '',
        mobileNo: '',
        customerId: customerId, // Assign customerId for admin, empty for others
        validityDate: isAdmin ? '2099-12-31' : '', // Give admin a far future validity date
      };
      await setDocumentNonBlocking(userRef, userData, { merge: true });

      if (isAdmin) {
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        await setDocumentNonBlocking(adminRoleRef, { uid: user.uid }, { merge: true });
        toast({
          title: "Admin Account Created",
          description: "Your admin account has been successfully created.",
        });
      } else {
        toast({
          title: "Account Created",
          description: "Your account has been created and is now pending admin approval.",
        });
      }

      router.push('/');

    } catch (error: any) {
      console.error("Error signing up:", error);
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message,
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
            <div className="mb-4 inline-block">
                <Logo />
            </div>
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>Enter your details to register. Your account will be active after admin approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input id="full-name" placeholder="Ram Kumar" required value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="ram@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
