'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Wine,
  UtensilsCrossed,
  Boxes,
  Package,
  BrushCleaning,
  ChevronDown,
  Users,
  Building2,
  Inbox,
  Store,
  Wallet,
  ShieldCheck,
  Landmark,
  type LucideIcon,
} from 'lucide-react';
import { useAppShell } from '@/lib/app-shell';

interface NavLink {
  label: string;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavLink[];
}

type NavEntry = NavLink | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

function entryHrefs(entry: NavEntry): string[] {
  return isNavGroup(entry) ? entry.items.map((item) => item.href) : [entry.href];
}

interface ModuleNavConfig {
  icon: LucideIcon;
  label: string;
  items?: NavEntry[]; // omitted = licensed but not built yet
}

const ACCOUNTING_NAV_ITEMS: NavEntry[] = [
  {
    label: 'Chart of Accounts',
    items: [
      { label: 'Create Account', href: '/accounting/chart-of-accounts/new' },
      { label: 'Manage Accounts', href: '/accounting/chart-of-accounts' },
    ],
  },
  {
    label: 'Payments',
    items: [
      { label: 'Record Payment', href: '/accounting/payments/new' },
      { label: 'Manage Payments', href: '/accounting/payments' },
    ],
  },
  {
    label: 'Payable Vendors',
    items: [
      { label: 'Create Vendor', href: '/accounting/payable-vendors/new' },
      { label: 'Manage Vendors', href: '/accounting/payable-vendors' },
    ],
  },
  {
    label: 'Vendor Bills',
    items: [
      { label: 'Record Bill', href: '/accounting/vendor-bills/new' },
      { label: 'Manage Bills', href: '/accounting/vendor-bills' },
    ],
  },
  {
    label: 'Fiscal Years',
    items: [
      { label: 'Create Fiscal Year', href: '/accounting/fiscal-years/new' },
      { label: 'Manage Fiscal Years', href: '/accounting/fiscal-years' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Trial Balance', href: '/accounting/reports/trial-balance' },
      { label: 'General Ledger', href: '/accounting/reports/general-ledger' },
      { label: 'Balance Sheet', href: '/accounting/reports/balance-sheet' },
      { label: 'Income Statement', href: '/accounting/reports/income-statement' },
    ],
  },
];

// Only "booking" has real pages so far. Everything else falls back to DEFAULT_ICON
// and renders as "Coming soon" — licensed for this deployment, just not built yet.
const MODULE_NAV: Record<string, ModuleNavConfig> = {
  booking: {
    icon: CalendarDays,
    label: 'Booking',
    items: [
      { label: 'Booking Calendar', href: '/booking/calendar' },
      { label: 'New Booking', href: '/booking/new' },
      { label: 'Manage Booking', href: '/booking/manage' },
      { label: 'Checkout Booking', href: '/booking/checkout' },
      { label: 'Setup Rooms/Halls/Boardrooms', href: '/booking/setup' },
    ],
  },
  membership: {
    icon: Users,
    label: 'Membership',
    items: [
      { label: 'Members', href: '/members' },
      { label: 'New Member', href: '/members/new' },
    ],
  },
  bar: {
    icon: Wine,
    label: 'Bar',
    items: [
      {
        label: 'POS',
        items: [
          { label: 'New Billing', href: '/bar/pos' },
          { label: 'Manage Bills', href: '/bar/sales' },
        ],
      },
      {
        label: 'Category',
        items: [
          { label: 'Create Category', href: '/bar/categories/new' },
          { label: 'Manage Category', href: '/bar/categories' },
        ],
      },
      {
        label: 'Brands',
        items: [
          { label: 'Create Brand', href: '/bar/brands/new' },
          { label: 'Manage Brand', href: '/bar/brands' },
        ],
      },
      {
        label: 'Cocktails',
        items: [
          { label: 'Create Cocktail', href: '/bar/cocktails/new' },
          { label: 'Manage Cocktails', href: '/bar/cocktails' },
        ],
      },
      {
        label: 'Stock',
        items: [
          { label: 'New Product', href: '/bar/items/new' },
          { label: 'Manage Product', href: '/bar/items' },
        ],
      },
      {
        label: 'Suppliers',
        items: [
          { label: 'Create Supplier', href: '/bar/vendors/new' },
          { label: 'Manage Supplier', href: '/bar/vendors' },
        ],
      },
      {
        label: 'Purchase Orders',
        items: [
          { label: 'Create Purchase Order', href: '/bar/purchase-orders/new' },
          { label: 'Manage Purchase Orders', href: '/bar/purchase-orders' },
        ],
      },
      { label: 'Manage Gate Pass', href: '/bar/gate-pass' },
      {
        label: 'Reports',
        items: [
          { label: 'Daily Stock report', href: '/bar/reports/daily-stock' },
          { label: 'Sales Report', href: '/bar/reports/sales' },
          { label: 'Stock report', href: '/bar/reports/stock' },
        ],
      },
    ],
  },
  food: {
    icon: UtensilsCrossed,
    label: 'Food',
    items: [
      {
        label: 'POS',
        items: [
          { label: 'New Billing', href: '/food/pos' },
          { label: 'Manage Bills', href: '/food/sales' },
        ],
      },
      {
        label: 'Category',
        items: [
          { label: 'Create Category', href: '/food/categories/new' },
          { label: 'Manage Category', href: '/food/categories' },
        ],
      },
      {
        label: 'Menu',
        items: [
          { label: 'New Menu Item', href: '/food/items/new' },
          { label: 'Manage Menu Item', href: '/food/items' },
        ],
      },
      {
        label: 'Tables',
        items: [
          { label: 'Create Table', href: '/food/tables/new' },
          { label: 'Manage Tables', href: '/food/tables' },
        ],
      },
      {
        label: 'Ingredient Category',
        items: [
          { label: 'Create Ingredient Category', href: '/food/ingredient-categories/new' },
          { label: 'Manage Ingredient Category', href: '/food/ingredient-categories' },
        ],
      },
      {
        label: 'Ingredient Suppliers',
        items: [
          { label: 'Create Supplier', href: '/food/vendors/new' },
          { label: 'Manage Supplier', href: '/food/vendors' },
        ],
      },
      {
        label: 'Ingredient Stock',
        items: [
          { label: 'New Ingredient', href: '/food/stock-items/new' },
          { label: 'Manage Ingredients', href: '/food/stock-items' },
        ],
      },
      {
        label: 'Purchase Orders',
        items: [
          { label: 'Create Purchase Order', href: '/food/purchase-orders/new' },
          { label: 'Manage Purchase Orders', href: '/food/purchase-orders' },
        ],
      },
      { label: 'Manage Gate Pass', href: '/food/gate-pass' },
      {
        label: 'Reports',
        items: [
          { label: 'Daily Stock report', href: '/food/reports/daily-stock' },
          { label: 'Sales Report', href: '/food/reports/sales' },
          { label: 'Stock report', href: '/food/reports/stock' },
        ],
      },
    ],
  },
  housekeeping: {
    icon: BrushCleaning,
    label: 'Housekeeping',
    items: [
      { label: 'Cleaning Status', href: '/housekeeping' },
      {
        label: 'Supply Requests',
        items: [
          { label: 'New Request', href: '/housekeeping/requests/new' },
          { label: 'Manage Requests', href: '/housekeeping/requests' },
        ],
      },
    ],
  },
  inventory: {
    icon: Package,
    label: 'Inventory',
    items: [
      {
        label: 'Category',
        items: [
          { label: 'Create Category', href: '/inventory/categories/new' },
          { label: 'Manage Category', href: '/inventory/categories' },
        ],
      },
      {
        label: 'Suppliers',
        items: [
          { label: 'Create Supplier', href: '/inventory/vendors/new' },
          { label: 'Manage Supplier', href: '/inventory/vendors' },
        ],
      },
      {
        label: 'Items',
        items: [
          { label: 'New Item', href: '/inventory/items/new' },
          { label: 'Manage Item', href: '/inventory/items' },
        ],
      },
      {
        label: 'Purchase Orders',
        items: [
          { label: 'Create Purchase Order', href: '/inventory/purchase-orders/new' },
          { label: 'Manage Purchase Orders', href: '/inventory/purchase-orders' },
        ],
      },
      { label: 'Manage Gate Pass', href: '/inventory/gate-pass' },
      {
        label: 'Stock Out',
        items: [
          { label: 'Issue Stock', href: '/inventory/stock-out/new' },
          { label: 'Manage Stock Out', href: '/inventory/stock-out' },
        ],
      },
      {
        label: 'Physical Stock',
        items: [
          { label: 'Create Asset Category', href: '/inventory/assets/categories/new' },
          { label: 'Manage Asset Category', href: '/inventory/assets/categories' },
          { label: 'New Asset', href: '/inventory/assets/new' },
          { label: 'Manage Assets', href: '/inventory/assets' },
          { label: 'Disposal Requests', href: '/inventory/assets/disposals' },
        ],
      },
      {
        label: 'Reports',
        items: [
          { label: 'Daily Stock report', href: '/inventory/reports/daily-stock' },
          { label: 'Stock report', href: '/inventory/reports/stock' },
        ],
      },
    ],
  },
  payroll: {
    icon: Wallet,
    label: 'Payroll',
    items: [
      {
        label: 'Department',
        items: [
          { label: 'Create Department', href: '/payroll/departments/new' },
          { label: 'Manage Department', href: '/payroll/departments' },
        ],
      },
      {
        label: 'Job Position',
        items: [
          { label: 'Create Job Position', href: '/payroll/positions/new' },
          { label: 'Manage Job Position', href: '/payroll/positions' },
        ],
      },
      {
        label: 'Allowance Type',
        items: [
          { label: 'Create Allowance Type', href: '/payroll/allowance-types/new' },
          { label: 'Manage Allowance Type', href: '/payroll/allowance-types' },
        ],
      },
      {
        label: 'Deduction Type',
        items: [
          { label: 'Create Deduction Type', href: '/payroll/deduction-types/new' },
          { label: 'Manage Deduction Type', href: '/payroll/deduction-types' },
        ],
      },
      {
        label: 'Employee',
        items: [
          { label: 'Register Employee', href: '/payroll/employees/new' },
          { label: 'Manage Employee', href: '/payroll/employees' },
        ],
      },
      {
        label: 'Working Shift',
        items: [
          { label: 'Create Shift', href: '/payroll/shifts/new' },
          { label: 'Manage Shift', href: '/payroll/shifts' },
        ],
      },
      { label: 'Shift Assigning', href: '/payroll/shift-assignment' },
      { label: 'Attendance', href: '/payroll/attendance' },
      { label: 'Leave Request', href: '/payroll/leave-requests' },
      {
        label: 'Salary',
        items: [
          { label: 'Calculate Salary', href: '/payroll/salary/new' },
          { label: 'Manage Salary', href: '/payroll/salary' },
        ],
      },
      { label: 'EPF/ETF Report', href: '/payroll/reports/epf-etf' },
      { label: 'EPF/ETF Rates', href: '/payroll/settings' },
    ],
  },
  administration: {
    icon: ShieldCheck,
    label: 'Administration',
    items: [
      {
        label: 'Users',
        items: [
          { label: 'Create User', href: '/admin/users/new' },
          { label: 'Manage Users', href: '/admin/users' },
        ],
      },
      {
        label: 'Roles',
        items: [
          { label: 'Create Role', href: '/admin/roles/new' },
          { label: 'Manage Roles', href: '/admin/roles' },
        ],
      },
    ],
  },
  accounting: {
    icon: Landmark,
    label: 'Accounting',
    items: ACCOUNTING_NAV_ITEMS,
  },
};

const DEFAULT_ICON = Boxes;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, modules } = useAppShell();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  function logout() {
    localStorage.removeItem('accessToken');
    router.push('/login');
  }

  // Licensed for the club AND within this specific user's own permissions — a role scoped
  // to just Booking shouldn't see Bar/Payroll/etc. in the nav just because the club has
  // them enabled for other staff.
  const enabledModules = modules.filter((m) => m.isEnabled && m.hasAccess);

  return (
    <aside className="flex w-64 flex-none flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-5 py-4">
        <p className="text-sm font-semibold text-slate-50">Module ERP</p>
        {user && <p className="truncate text-xs text-slate-500">{user.username}</p>}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <Link
          href="/dashboard"
          className={`mx-3 mb-3 flex items-center gap-2.5 rounded px-3 py-2 text-sm ${
            pathname === '/dashboard' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
          }`}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </Link>

        {/* The vendor is the ERP owner, not a club — it has no club profile to fill in
            (no logo on receipts, no address on invoices), so this is hidden for them. */}
        {!user?.isVendorRole && (
          <Link
            href="/club-profile"
            className={`mx-3 mb-3 flex items-center gap-2.5 rounded px-3 py-2 text-sm ${
              pathname === '/club-profile' ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <Building2 size={16} />
            Club Profile
          </Link>
        )}

        {/* Platform-wide pages, shown only to a vendor-role account. These read across
            every tenant, unlike everything below which is scoped to this club. */}
        {user?.isVendorRole && (
          <div className="mb-3 border-y border-slate-800 py-2">
            <p className="px-6 pb-1 text-[10px] uppercase tracking-wide text-slate-600">Platform</p>
            {[
              { href: '/vendor/clubs', label: 'Registered Clubs', icon: Store },
              { href: '/vendor/module-requests', label: 'Module Requests', icon: Inbox },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`mx-3 flex items-center gap-2.5 rounded px-3 py-2 text-sm ${
                  pathname === href ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>
        )}

        {enabledModules.map((module) => {
          const config = MODULE_NAV[module.moduleKey];
          const Icon = config?.icon ?? DEFAULT_ICON;
          const label = config?.label ?? module.displayName;
          const items = config?.items;
          const isOpen = expanded === module.moduleKey;
          const isActiveGroup = items?.some((entry) => entryHrefs(entry).includes(pathname)) ?? false;

          if (!items) {
            return (
              <div
                key={module.moduleKey}
                className="mx-3 mb-1 flex items-center justify-between rounded px-3 py-2 text-sm text-slate-500"
                title="Licensed, but this module hasn't been built yet"
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} />
                  {label}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Soon</span>
              </div>
            );
          }

          if (items.length === 1 && !isNavGroup(items[0])) {
            const only = items[0] as NavLink;
            return (
              <Link
                key={module.moduleKey}
                href={only.href}
                className={`mx-3 mb-1 flex items-center gap-2.5 rounded px-3 py-2 text-sm ${
                  pathname === only.href ? 'bg-slate-800 text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          }

          return (
            <div key={module.moduleKey} className="mx-3 mb-1">
              <button
                onClick={() => setExpanded(isOpen ? null : module.moduleKey)}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm ${
                  isActiveGroup ? 'text-emerald-400' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} />
                  {label}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="ml-4 mt-0.5 border-l border-slate-800 pl-3">
                  {items.map((entry) => {
                    if (!isNavGroup(entry)) {
                      return (
                        <Link
                          key={entry.href}
                          href={entry.href}
                          className={`block rounded px-2 py-1.5 text-sm ${
                            pathname === entry.href ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/60'
                          }`}
                        >
                          {entry.label}
                        </Link>
                      );
                    }

                    const groupKey = `${module.moduleKey}:${entry.label}`;
                    const isGroupOpen = expandedGroup === groupKey;
                    const isGroupActive = entry.items.some((item) => pathname === item.href);

                    return (
                      <div key={entry.label}>
                        <button
                          onClick={() => setExpandedGroup(isGroupOpen ? null : groupKey)}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm ${
                            isGroupActive ? 'text-emerald-400' : 'text-slate-400 hover:bg-slate-800/60'
                          }`}
                        >
                          {entry.label}
                          <ChevronDown size={12} className={`transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isGroupOpen && (
                          <div className="ml-3 border-l border-slate-800 pl-3">
                            {entry.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`block rounded px-2 py-1.5 text-sm ${
                                  pathname === item.href ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:bg-slate-800/60'
                                }`}
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          onClick={logout}
          className="w-full rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-red-500 hover:text-red-400"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
