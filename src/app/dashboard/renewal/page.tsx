
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser, AmcRenewal } from '@/lib/types';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

const initialFormState: Omit<AmcRenewal, 'id' | 'userId' | 'userName' | 'submittedAt' | 'status'> = {
    date: new Date().toISOString(),
    amount: 0,
    transactionType: 'UPI',
    customerId: '',
};

export default function RenewalPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [formData, setFormData] = useState<Omit<AmcRenewal, 'id' | 'userId' | 'userName' | 'submittedAt' | 'status'>>(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    
    const { data: userData, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

    const handleSubmit = async () => {
        if (!user || !userData || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit a renewal.' });
            return;
        }
        if (formData.amount <= 0 || !formData.date) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a valid amount and date.' });
            return;
        }

        setIsSubmitting(true);
        const renewalData: Omit<AmcRenewal, 'id'> = {
            userId: user.uid,
            userName: userData.name,
            customerId: userData.customerId,
            date: new Date(formData.date).toISOString().split('T')[0],
            amount: Number(formData.amount),
            transactionType: formData.transactionType,
            status: 'Pending',
            submittedAt: new Date(),
        };

        const renewalsColRef = collection(firestore, 'amc_renewals');
        
        try {
            await addDocumentNonBlocking(renewalsColRef, renewalData);
            toast({
                title: 'Submission Successful',
                description: 'Your AMC renewal request has been submitted for approval.',
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error submitting renewal:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your request. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isLoading = isUserLoading || isUserDocLoading;

    return (
        <div className="flex justify-center items-start pt-10">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>AMC Renewal Submission</CardTitle>
                    <CardDescription>
                        Fill out the form below to submit your Annual Maintenance Contract renewal details for approval.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Your Name</Label>
                                <Input value={userData?.name || ''} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Your Customer ID</Label>
                                <Input value={userData?.customerId || 'Not yet assigned'} disabled />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Payment Date</Label>
                                <DatePicker 
                                    date={new Date(formData.date)} 
                                    setDate={(d) => setFormData(p => ({...p, date: d?.toISOString() || new Date().toISOString()}))} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount Paid (₹)</Label>
                                <Input 
                                    id="amount" 
                                    type="number" 
                                    value={formData.amount} 
                                    onChange={(e) => setFormData(p => ({...p, amount: Number(e.target.value)}))}
                                    placeholder="Enter amount"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="transactionType">Payment Mode</Label>
                            <Select 
                                value={formData.transactionType} 
                                onValueChange={(value: 'RTGS' | 'NEFT' | 'UPI' | 'Cash' | 'Other') => setFormData(p => ({...p, transactionType: value}))}
                            >
                                <SelectTrigger id="transactionType">
                                    <SelectValue placeholder="Select payment mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="RTGS">RTGS</SelectItem>
                                    <SelectItem value="NEFT">NEFT</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button 
                        className="w-full sm:w-auto ml-auto" 
                        onClick={handleSubmit} 
                        disabled={isLoading || isSubmitting}
                    >
                       {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
