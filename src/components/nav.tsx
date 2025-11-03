'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  BarChart2,
  Settings,
  GlassWater,
  Beef,
} from 'lucide-react';

import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/lib/types';
import Logo from './logo';
import { Separator } from './ui/separator';

const navItems: NavItem[] = [
  { href: '/dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/animals', title: 'Animals', icon: Beef },
  { href: '/dashboard/milk-records', title: 'Milk Records', icon: GlassWater },
  { href: '/dashboard/finance', title: 'Finance', icon: IndianRupee },
  { href: '/dashboard/reports', title: 'Reports', icon: BarChart2 },
  { href: '/dashboard/users', title: 'Users', icon: Users },
];

const settingsItem: NavItem = {
  href: '/dashboard/settings',
  title: 'Settings',
  icon: Settings,
};

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.title}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === settingsItem.href}
                    tooltip={settingsItem.title}
                >
                    <Link href={settingsItem.href}>
                        <settingsItem.icon />
                        <span>{settingsItem.title}</span>
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
