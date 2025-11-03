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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import { placeholderUsers } from '@/lib/placeholder-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and roles.</CardDescription>
            </div>
            <Button>
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
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signup Date</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placeholderUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={`https://i.pravatar.cc/150?u=${user.email}`} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{user.name}
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                    </div>
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Badge variant={user.status === 'Active' ? 'secondary' : user.status === 'Pending' ? 'default' : 'destructive'} className="bg-opacity-80">
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>{user.signupDate}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {user.status === 'Pending' && <DropdownMenuItem>Approve User</DropdownMenuItem>}
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
          Showing <strong>1-{placeholderUsers.length}</strong> of <strong>{placeholderUsers.length}</strong> users
        </div>
      </CardFooter>
    </Card>
  );
}
