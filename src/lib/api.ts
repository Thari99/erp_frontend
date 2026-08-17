const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Derives the tenant subdomain from the browser's own address bar — e.g.
 * "kandyclub.localhost:3000" -> "kandyclub". Returns undefined on the bare domain
 * (no subdomain), which is where the public registration page lives.
 */
export function currentSubdomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname; // no port
  const parts = host.split('.');
  // "kandyclub.localhost" -> ["kandyclub", "localhost"] -> subdomain present.
  // "localhost" / "127.0.0.1" -> no subdomain.
  if (parts.length < 2) return undefined;
  if (host === 'localhost' || host === '127.0.0.1') return undefined;
  return parts[0];
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const subdomain = currentSubdomain();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(subdomain ? { 'X-Tenant': subdomain } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(body.message ?? 'Request failed', response.status);
  }

  return response.json();
}

export interface LoginResponse {
  accessToken: string;
  user: { id: string; username: string; fullName: string; role: string };
}

export interface CurrentUser {
  id: string;
  username: string;
  roleName: string;
  isVendorRole: boolean;
  permissions: string[];
}

export interface RoleSummary {
  id: string;
  name: string;
}

export interface StaffUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isActive: boolean;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  role: RoleSummary;
}

export interface PermissionCatalogEntry {
  key: string;
  description: string;
}

export interface RolePermissionEntry {
  roleId: string;
  permissionId: string;
  permission: { id: string; key: string; description: string | null; createdAt: string };
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isVendorRole: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: RolePermissionEntry[];
  _count: { users: number };
}

export interface ModuleEntry {
  moduleKey: string;
  displayName: string;
  isEnabled: boolean;
  hasPendingRequest: boolean;
  /** Whether the current user's own permissions cover this module — not just whether it's licensed. */
  hasAccess: boolean;
}

export interface ModuleRequest {
  id: string;
  tenantId: string;
  tenant?: { subdomain: string; name: string };
  moduleKey: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  note: string | null;
}

/** One row of a club's module registry, as seen by the vendor overview. */
export interface VendorClubModule {
  moduleKey: string;
  displayName: string;
  isEnabled: boolean;
  enabledAt: string | null;
  enabledBy: string | null;
}

/**
 * A registered club plus its module state. `logo` is intentionally absent — it is a
 * base64 data URI on the server and would make this list response enormous.
 */
export interface VendorClub {
  id: string;
  subdomain: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  counts: { users: number; members: number; bookings: number };
  pendingRequestCount: number;
  modules: VendorClubModule[];
}

// ---------- Housekeeping ----------
export type HousekeepingState = 'CLEAN' | 'CLEANING' | 'DIRTY' | 'OUT_OF_SERVICE';
export type HousekeepingPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type HousekeepingRequestStatus = 'NEW' | 'APPROVED' | 'ISSUED' | 'CANCELLED';

/**
 * One row of the cleaning board. Driven by the bookable-resource list, so locations that
 * housekeeping has never touched still appear — `isTracked` is false for those and their
 * state is the default CLEAN rather than a stored value.
 */
export interface HousekeepingStatusRow {
  resourceId: string;
  name: string;
  type: ResourceType;
  typeName: string | null;
  capacity: number | null;
  state: HousekeepingState;
  priority: HousekeepingPriority;
  reason: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  isTracked: boolean;
}

export interface HousekeepingStatusSummary {
  total: number;
  clean: number;
  cleaning: number;
  dirty: number;
  outOfService: number;
  highPriority: number;
}

export interface HousekeepingRequestItem {
  id: string;
  itemId: string;
  item: { id: string; name: string; stockQty: number };
  quantity: number;
}

export interface HousekeepingRequest {
  id: string;
  requestNo: number;
  requestReference: string | null;
  requestedFor: ResourceType;
  resourceId: string | null;
  resource: { id: string; name: string; type: ResourceType } | null;
  status: HousekeepingRequestStatus;
  note: string | null;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  issuedBy: string | null;
  issuedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  /** The inventory issue this request produced, once issued. */
  stockOut: { id: string; issueNo: number; issueReference: string | null } | null;
  items: HousekeepingRequestItem[];
}

export type ResourceType = 'ROOM' | 'HALL' | 'BOARDROOM';
export type GuestType = 'MEMBER' | 'NON_MEMBER';
export type MealType =
  | 'MEMBER_SINGLE'
  | 'MEMBER_DOUBLE'
  | 'MEMBER_TRIPLE'
  | 'MEMBER_FAMILY'
  | 'NON_MEMBER_SINGLE'
  | 'NON_MEMBER_DOUBLE'
  | 'NON_MEMBER_TRIPLE'
  | 'NON_MEMBER_FAMILY';

export interface RoomType {
  id: string;
  name: string;
  memberRate: string;
  nonMemberRate: string;
  isActive: boolean;
}

export interface HallType {
  id: string;
  name: string;
  memberRate: string;
  nonMemberRate: string;
  isActive: boolean;
}

export interface BoardroomType {
  id: string;
  name: string;
  memberRate: string;
  nonMemberRate: string;
  isActive: boolean;
}

export interface BookableResource {
  id: string;
  type: ResourceType;
  name: string;
  roomTypeId: string | null;
  roomType: RoomType | null;
  hallTypeId: string | null;
  hallType: HallType | null;
  boardroomTypeId: string | null;
  boardroomType: BoardroomType | null;
  capacity: number | null;
  isActive: boolean;
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'CHECKED_OUT';

export type MemberType = 'LIFETIME' | 'NORMAL' | 'CORPORATE' | 'COMPLIMENTARY';
export type MemberStatus = 'UNDER_REVIEW' | 'ACTIVE' | 'DEACTIVATED';

export interface MemberSpecialDate {
  id: string;
  description: string;
  date: string;
}

export interface Member {
  id: string;
  memberNo: number;
  memberReference: string | null;
  title: string | null;
  memberType: MemberType;
  fullName: string;
  address: string | null;
  nic: string | null;
  dob: string | null;
  phone: string | null;
  landNumber: string | null;
  email: string | null;
  joinDate: string;
  resignDate: string | null;
  remark: string | null;
  photo: string | null;
  status: MemberStatus;
  accountBalance: string;
  referredById: string | null;
  referredBy: Pick<Member, 'id' | 'memberNo' | 'memberReference' | 'fullName'> | null;
  specialDates: MemberSpecialDate[];
  createdAt: string;
}

export type MemberAccountEntryType = 'CHARGE' | 'PAYMENT' | 'REVERSAL';

export interface MemberAccountTransaction {
  id: string;
  memberId: string;
  type: MemberAccountEntryType;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingNo: number;
  guestName: string;
  guestPhone: string | null;
  guestType: GuestType;
  memberId: string | null;
  member: Member | null;
  nic: string | null;
  landNumber: string | null;
  email: string | null;
  clubName: string | null;
  referenceMemberId: string | null;
  referenceMember: Member | null;
  mealType: MealType | null;
  adultCount: number;
  childrenCount: number;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  resource: BookableResource;
  description: string | null;
  remark: string | null;
  subtotal: string;
  serviceChargePercent: string;
  serviceChargeAmount: string;
  discount: string;
  advance: string;
  netAmount: string;
  createdAt: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  isActive: boolean;
  createdAt: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  account: ChartOfAccount;
  debit: string;
  credit: string;
}

export interface JournalEntry {
  id: string;
  journalNo: number;
  reference: string;
  description: string | null;
  postedAt: string;
  lines: JournalEntryLine[];
}

export interface Payment {
  id: string;
  paymentNo: number;
  reference: string;
  amount: string;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MEMBER_CREDIT';
  status: 'RECORDED' | 'REVERSED';
  createdAt: string;
  journalEntry: JournalEntry | null;
}

export type VendorPaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER';

export interface PayableVendor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  balance: string;
  createdAt: string;
}

export type VendorBillStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID';

export interface VendorBill {
  id: string;
  billNo: number;
  billReference: string | null;
  vendorId: string;
  vendor: PayableVendor;
  expenseAccountCode: string;
  amount: string;
  balance: string;
  status: VendorBillStatus;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

export interface FiscalYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  closingJournalEntryId: string | null;
  createdAt: string;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceReport {
  from: string | null;
  to: string;
  accounts: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface GeneralLedgerEntry {
  date: string;
  journalNo: number;
  reference: string;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerGroup {
  account: { code: string; name: string; type: AccountType; normalBalance: NormalBalance };
  entries: GeneralLedgerEntry[];
}

export interface BalanceSheetRow {
  code: string;
  name: string;
  balance: number;
}

export interface BalanceSheetReport {
  asOf: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}

export interface IncomeStatementRow {
  code: string;
  name: string;
  amount: number;
}

export interface IncomeStatementReport {
  from: string | null;
  to: string;
  income: IncomeStatementRow[];
  expenses: IncomeStatementRow[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

export interface BarCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface BarBrand {
  id: string;
  name: string;
  isActive: boolean;
}

export interface BarUnit {
  id: string;
  name: string;
  isActive: boolean;
}

export interface BarProduct {
  id: string;
  categoryId: string | null;
  category: BarCategory | null;
  brandId: string | null;
  brand: BarBrand | null;
  vendorId: string | null;
  vendor: BarVendor | null;
  unitId: string | null;
  unit: BarUnit | null;
  photo: string | null;
  name: string;
  purchasePrice: string | null;
  unitPrice: string;
  expiryDate: string | null;
  stockQty: number;
  reorderLevel: number | null;
  isActive: boolean;
  isCocktail: boolean;
}

export interface CocktailIngredient {
  id: string;
  ingredientProductId: string;
  ingredientProduct: BarProduct;
  quantity: number;
  unitId: string | null;
  unit: BarUnit | null;
}

export interface Cocktail extends BarProduct {
  cocktailIngredients: CocktailIngredient[];
}

export interface BarStockMovement {
  id: string;
  productId: string;
  type: 'STOCK_IN' | 'SALE' | 'ADJUSTMENT' | 'VOID_RETURN';
  quantity: number;
  reason: string | null;
  createdAt: string;
}

export type BarPaymentMethod = 'CASH' | 'CARD' | 'MEMBER';
export type BarSaleStatus = 'HELD' | 'COMPLETED';
export type BarGuestType = 'WALK_IN' | 'MEMBER' | 'CLUB';

export interface BarSaleItem {
  id: string;
  productId: string;
  product: BarProduct;
  unitPrice: string;
  quantity: number;
  total: string;
}

export interface BarSale {
  id: string;
  saleNo: number;
  saleReference: string | null;
  status: BarSaleStatus;
  guestType: BarGuestType;
  memberId: string | null;
  member: Member | null;
  guestName: string | null;
  paymentMethod: BarPaymentMethod | null;
  subtotal: string;
  serviceChargePercent: string;
  serviceChargeAmount: string;
  grossAmount: string;
  discount: string;
  total: string;
  payment: string;
  balance: string;
  remarks: string | null;
  soldBy: string | null;
  voidedAt: string | null;
  completedAt: string | null;
  items: BarSaleItem[];
  createdAt: string;
}

export interface BarVendor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

export type BarPurchaseOrderStatus = 'OPEN' | 'RECEIVED' | 'CANCELLED';

export interface BarPurchaseOrderItem {
  id: string;
  productId: string;
  product: BarProduct;
  orderedQty: number;
  unitCost: string;
  discount: string;
  total: string;
}

export interface BarPurchaseOrder {
  id: string;
  poNo: number;
  poReference: string | null;
  vendorId: string;
  vendor: BarVendor;
  status: BarPurchaseOrderStatus;
  totalAmount: string;
  remark: string | null;
  createdBy: string;
  createdAt: string;
  items: BarPurchaseOrderItem[];
  gatePass: { id: string; gatePassNo: number; gatePassReference: string | null; receivedBy: string; receivedAt: string } | null;
}

export interface BarGatePassItem {
  id: string;
  productId: string;
  product: BarProduct;
  receivedQty: number;
  damageQty: number;
  expiryDate: string | null;
  remark: string | null;
}

export interface BarGatePass {
  id: string;
  gatePassNo: number;
  gatePassReference: string | null;
  purchaseOrderId: string;
  purchaseOrder: BarPurchaseOrder;
  vehicleNo: string | null;
  receivedBy: string;
  receivedAt: string;
  items: BarGatePassItem[];
}

export interface BarSalesReport {
  from: string | null;
  to: string | null;
  saleCount: number;
  totalRevenue: number;
  totalsByMethod: Record<string, number>;
  compedCount: number;
  compedValue: number;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
}

export interface BarStockReportRow {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  stockQty: number;
  reorderLevel: number | null;
  isLow: boolean;
  stockValue: number;
}

export interface BarStockReport {
  rows: BarStockReportRow[];
  totalStockValue: number;
  lowStockCount: number;
}

export interface BarDailyStockReportRow {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  opening: number;
  stockIn: number;
  stockOut: number;
  closing: number;
}

export interface BarDailyStockReport {
  date: string;
  rows: BarDailyStockReportRow[];
}

export interface TenantProfile {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
}

export interface ModuleCatalogEntry {
  moduleKey: string;
  displayName: string;
}

export interface RegisterTenantInput {
  clubName: string;
  clubAddress?: string;
  clubPhone?: string;
  clubEmail?: string;
  clubLogo?: string;
  subdomain: string;
  selectedModules: string[];
  adminFullName: string;
  adminEmail: string;
  adminUsername: string;
  adminPassword: string;
}

export interface RegisterTenantResponse {
  subdomain: string;
  clubName: string;
  enabledModules: string[];
}

// ===================== Inventory: Stationery Stock (consumables) =====================

export interface InventoryCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface InventoryVendor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  categoryId: string | null;
  category: InventoryCategory | null;
  vendorId: string | null;
  vendor: InventoryVendor | null;
  name: string;
  photo: string | null;
  purchasePrice: string | null;
  stockQty: number;
  reorderLevel: number | null;
  isActive: boolean;
}

export type InventoryStockMovementType = 'STOCK_IN' | 'ISSUE' | 'ADJUSTMENT' | 'VOID_RETURN';

export interface InventoryStockMovement {
  id: string;
  itemId: string;
  type: InventoryStockMovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

export type InventoryPurchaseOrderStatus = 'OPEN' | 'RECEIVED' | 'CANCELLED';

export interface InventoryPurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  item: InventoryItem;
  orderedQty: number;
  unitCost: string;
  discount: string;
  total: string;
}

export interface InventoryPurchaseOrder {
  id: string;
  poNo: number;
  poReference: string | null;
  vendorId: string;
  vendor: InventoryVendor;
  status: InventoryPurchaseOrderStatus;
  totalAmount: string;
  remark: string | null;
  createdBy: string;
  createdAt: string;
  items: InventoryPurchaseOrderItem[];
  gatePass: { id: string; gatePassNo: number; gatePassReference: string | null; receivedBy: string; receivedAt: string } | null;
}

export interface InventoryGatePassItem {
  id: string;
  itemId: string;
  item: InventoryItem;
  receivedQty: number;
  damageQty: number;
  remark: string | null;
}

export interface InventoryGatePass {
  id: string;
  gatePassNo: number;
  gatePassReference: string | null;
  purchaseOrderId: string;
  purchaseOrder: InventoryPurchaseOrder;
  vehicleNo: string | null;
  receivedBy: string;
  receivedAt: string;
  items: InventoryGatePassItem[];
}

export interface InventoryStockOutItem {
  id: string;
  itemId: string;
  item: InventoryItem;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface InventoryStockOut {
  id: string;
  issueNo: number;
  issueReference: string | null;
  issuedTo: string;
  issuedBy: string | null;
  remark: string | null;
  createdAt: string;
  items: InventoryStockOutItem[];
}

export interface InventoryStockReportRow {
  id: string;
  name: string;
  category: string | null;
  vendor: string | null;
  stockQty: number;
  reorderLevel: number | null;
  isLow: boolean;
  stockValue: number;
}

export interface InventoryStockReport {
  rows: InventoryStockReportRow[];
  totalStockValue: number;
  lowStockCount: number;
}

export interface InventoryDailyStockReportRow {
  id: string;
  name: string;
  category: string | null;
  vendor: string | null;
  opening: number;
  stockIn: number;
  stockOut: number;
  closing: number;
}

export interface InventoryDailyStockReport {
  date: string;
  rows: InventoryDailyStockReportRow[];
}

// ===================== Inventory: Physical Stock (fixed assets) =====================

export interface PhysicalAssetCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export type PhysicalAssetUnitStatus = 'IN_STOCK' | 'ON_LOAN' | 'UNDER_MAINTENANCE' | 'DISPOSED';

export interface PhysicalAssetUnit {
  id: string;
  assetId: string;
  unitCode: string;
  status: PhysicalAssetUnitStatus;
  location: string | null;
  createdAt: string;
}

export interface PhysicalAsset {
  id: string;
  categoryId: string | null;
  category: PhysicalAssetCategory | null;
  assetNo: number;
  assetReference: string | null;
  name: string;
  photo: string | null;
  buyingPrice: string | null;
  purchaseDate: string | null;
  sourceOfPurchase: string | null;
  depreciationPerYear: string | null;
  location: string | null;
  remark: string | null;
  isActive: boolean;
  createdAt: string;
  units: PhysicalAssetUnit[];
}

export interface PhysicalAssetTransfer {
  id: string;
  unitId: string;
  fromLocation: string | null;
  toLocation: string;
  sharedBy: string | null;
  remark: string | null;
  createdAt: string;
}

export type PhysicalAssetDisposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PhysicalAssetDisposal {
  id: string;
  unitId: string;
  unit: PhysicalAssetUnit & { asset: PhysicalAsset };
  reason: string;
  removedBy: string | null;
  approvedBy: string | null;
  status: PhysicalAssetDisposalStatus;
  createdAt: string;
  resolvedAt: string | null;
}

// ===================== Payroll =====================

export interface PayrollDepartment {
  id: string;
  name: string;
  shortCode: string | null;
  isActive: boolean;
}

export interface PayrollJobPosition {
  id: string;
  departmentId: string | null;
  department: PayrollDepartment | null;
  name: string;
  basicPerDay: string;
  otPerHour: string;
  isActive: boolean;
}

export interface PayrollAllowanceType {
  id: string;
  name: string;
  defaultAmount: string;
  isActive: boolean;
}

export interface PayrollDeductionType {
  id: string;
  name: string;
  defaultAmount: string;
  isActive: boolean;
}

export type PayrollEmployeeStatus = 'ACTIVE' | 'RESIGNED';

export interface PayrollEmployee {
  id: string;
  empNo: number;
  employeeReference: string | null;
  departmentId: string | null;
  department: PayrollDepartment | null;
  positionId: string | null;
  position: PayrollJobPosition | null;
  title: string | null;
  firstName: string;
  lastName: string;
  address: string | null;
  nic: string | null;
  email: string | null;
  dob: string | null;
  mobile: string | null;
  landNumber: string | null;
  joinDate: string;
  epfNumber: string | null;
  etfNumber: string | null;
  emergencyContact: string | null;
  resignDate: string | null;
  remark: string | null;
  photo: string | null;
  status: PayrollEmployeeStatus;
}

export interface PayrollShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface PayrollEmployeeShift {
  id: string;
  employeeId: string;
  employee: PayrollEmployee;
  shiftId: string;
  shift: PayrollShift;
  shiftDate: string;
}

export type PayrollLeaveType = 'NONE' | 'FULL_DAY' | 'HALF_DAY' | 'SHORT_LEAVE';

export interface PayrollAttendance {
  id: string;
  employeeId: string;
  employee: PayrollEmployee;
  shiftId: string | null;
  shift: PayrollShift | null;
  attendanceDate: string;
  inTime: string | null;
  outTime: string | null;
  workedHours: string;
  otHours: string;
  leaveType: PayrollLeaveType;
}

export type PayrollLeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PayrollLeaveRequest {
  id: string;
  employeeId: string;
  employee: PayrollEmployee;
  leaveType: PayrollLeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: PayrollLeaveRequestStatus;
  approvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PayrollSalaryAllowanceLine {
  id: string;
  allowanceTypeId: string;
  allowanceType: PayrollAllowanceType;
  amount: string;
}

export interface PayrollSalaryDeductionLine {
  id: string;
  deductionTypeId: string;
  deductionType: PayrollDeductionType;
  amount: string;
}

export interface PayrollSalary {
  id: string;
  salaryNo: number;
  salaryReference: string | null;
  employeeId: string;
  employee: PayrollEmployee;
  salaryMonth: string;
  workingDays: number;
  fullDayLeaves: number;
  halfDayLeaves: number;
  shortLeaves: number;
  basicSalary: string;
  totalOtHours: string;
  payableOt: string;
  totalAllowance: string;
  totalDeduction: string;
  epfEmployee: string;
  epfEmployer: string;
  etf: string;
  grossSalary: string;
  netSalary: string;
  remark: string | null;
  createdBy: string | null;
  createdAt: string;
  allowances: PayrollSalaryAllowanceLine[];
  deductions: PayrollSalaryDeductionLine[];
}

export interface PayrollEpfEtfReportRow {
  employeeId: string;
  employeeReference: string | null;
  employeeName: string;
  epfNumber: string | null;
  etfNumber: string | null;
  basicSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  epfTotal: number;
  etf: number;
}

export interface PayrollEpfEtfReport {
  salaryMonth: string;
  rows: PayrollEpfEtfReportRow[];
  totalEpfEmployee: number;
  totalEpfEmployer: number;
  totalEtf: number;
}

export interface PayrollSettings {
  id: string;
  epfEmployeeRate: string;
  epfEmployerRate: string;
  etfRate: string;
  updatedAt: string;
}

// ===================== Food =====================

export interface FoodCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface FoodItem {
  id: string;
  categoryId: string | null;
  category: FoodCategory | null;
  name: string;
  photo: string | null;
  costOfMaking: string | null;
  price: string;
  isAvailable: boolean;
  isActive: boolean;
}

export type FoodTableStatus = 'AVAILABLE' | 'OCCUPIED';

export interface FoodTable {
  id: string;
  name: string;
  capacity: number | null;
  status: FoodTableStatus;
  isActive: boolean;
}

export type FoodOrderType = 'DINE_IN' | 'TAKEAWAY';
export type FoodPaymentMethod = 'CASH' | 'CARD' | 'MEMBER';
export type FoodSaleStatus = 'HELD' | 'COMPLETED';
export type FoodGuestType = 'WALK_IN' | 'MEMBER' | 'CLUB';

export interface FoodSaleItem {
  id: string;
  foodItemId: string;
  foodItem: FoodItem;
  unitPrice: string;
  quantity: number;
  total: string;
}

export interface FoodSale {
  id: string;
  saleNo: number;
  saleReference: string | null;
  status: FoodSaleStatus;
  orderType: FoodOrderType;
  tableId: string | null;
  table: FoodTable | null;
  guestType: FoodGuestType;
  memberId: string | null;
  member: Member | null;
  guestName: string | null;
  paymentMethod: FoodPaymentMethod | null;
  subtotal: string;
  serviceChargePercent: string;
  serviceChargeAmount: string;
  grossAmount: string;
  discount: string;
  total: string;
  payment: string;
  balance: string;
  remarks: string | null;
  soldBy: string | null;
  voidedAt: string | null;
  completedAt: string | null;
  items: FoodSaleItem[];
  createdAt: string;
}

export interface FoodIngredientCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface FoodVendor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

export interface FoodStockItem {
  id: string;
  categoryId: string | null;
  category: FoodIngredientCategory | null;
  vendorId: string | null;
  vendor: FoodVendor | null;
  name: string;
  unit: string | null;
  purchasePrice: string | null;
  expiryDate: string | null;
  stockQty: number;
  reorderLevel: number | null;
  isActive: boolean;
}

export interface FoodStockMovement {
  id: string;
  stockItemId: string;
  type: 'STOCK_IN' | 'ADJUSTMENT';
  quantity: number;
  reason: string | null;
  createdAt: string;
}

export type FoodPurchaseOrderStatus = 'OPEN' | 'RECEIVED' | 'CANCELLED';

export interface FoodPurchaseOrderItem {
  id: string;
  stockItemId: string;
  stockItem: FoodStockItem;
  orderedQty: number;
  unitCost: string;
  discount: string;
  total: string;
}

export interface FoodPurchaseOrder {
  id: string;
  poNo: number;
  poReference: string | null;
  vendorId: string;
  vendor: FoodVendor;
  status: FoodPurchaseOrderStatus;
  totalAmount: string;
  remark: string | null;
  createdBy: string;
  createdAt: string;
  items: FoodPurchaseOrderItem[];
  gatePass: { id: string; gatePassNo: number; gatePassReference: string | null; receivedBy: string; receivedAt: string } | null;
}

export interface FoodGatePassItem {
  id: string;
  stockItemId: string;
  stockItem: FoodStockItem;
  receivedQty: number;
  damageQty: number;
  expiryDate: string | null;
  remark: string | null;
}

export interface FoodGatePass {
  id: string;
  gatePassNo: number;
  gatePassReference: string | null;
  purchaseOrderId: string;
  purchaseOrder: FoodPurchaseOrder;
  vehicleNo: string | null;
  receivedBy: string;
  receivedAt: string;
  items: FoodGatePassItem[];
}

export interface FoodSalesReport {
  from: string | null;
  to: string | null;
  saleCount: number;
  totalRevenue: number;
  totalsByMethod: Record<string, number>;
  compedCount: number;
  compedValue: number;
  topItems: Array<{ foodItemId: string; name: string; quantity: number; revenue: number }>;
}

export interface FoodStockReportRow {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  stockQty: number;
  reorderLevel: number | null;
  isLow: boolean;
  stockValue: number;
}

export interface FoodStockReport {
  rows: FoodStockReportRow[];
  totalStockValue: number;
  lowStockCount: number;
}

export interface FoodDailyStockReportRow {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  opening: number;
  stockIn: number;
  stockOut: number;
  closing: number;
}

export interface FoodDailyStockReport {
  date: string;
  rows: FoodDailyStockReportRow[];
}

export const api = {
  moduleCatalog: () => request<ModuleCatalogEntry[]>('/tenants/modules'),
  subdomainAvailable: (subdomain: string) =>
    request<{ available: boolean }>(`/tenants/subdomain-available?subdomain=${encodeURIComponent(subdomain)}`),
  registerTenant: (input: RegisterTenantInput) =>
    request<RegisterTenantResponse>('/tenants/register', { method: 'POST', body: JSON.stringify(input) }),
  bootstrapPlatform: (input: { token: string; adminFullName: string; adminEmail: string; adminUsername: string; adminPassword: string }) =>
    request<{ subdomain: string; username: string }>('/tenants/bootstrap-platform', { method: 'POST', body: JSON.stringify(input) }),

  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request<CurrentUser>('/me'),
  modules: () => request<ModuleEntry[]>('/modules'),
  setModuleEnabled: (moduleKey: string, isEnabled: boolean) =>
    request<ModuleEntry>(`/modules/${moduleKey}`, { method: 'PATCH', body: JSON.stringify({ isEnabled }) }),
  requestModule: (moduleKey: string) => request<ModuleRequest>(`/modules/${moduleKey}/request`, { method: 'POST' }),

  listVendorClubs: () => request<VendorClub[]>('/vendor/clubs'),

  listVendorModuleRequests: () => request<ModuleRequest[]>('/vendor/module-requests'),
  approveModuleRequest: (id: string) => request<ModuleRequest>(`/vendor/module-requests/${id}/approve`, { method: 'PATCH' }),
  rejectModuleRequest: (id: string, note?: string) =>
    request<ModuleRequest>(`/vendor/module-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ note }) }),

  getTenantProfile: () => request<TenantProfile>('/tenant/profile'),
  updateTenantProfile: (input: Partial<{ name: string; address: string; phone: string; email: string; logo: string }>) =>
    request<TenantProfile>('/tenant/profile', { method: 'PATCH', body: JSON.stringify(input) }),

  listRoomTypes: () => request<RoomType[]>('/booking/room-types'),
  createRoomType: (input: { name: string; memberRate: number; nonMemberRate: number }) =>
    request<RoomType>('/booking/room-types', { method: 'POST', body: JSON.stringify(input) }),
  updateRoomType: (id: string, input: Partial<{ name: string; memberRate: number; nonMemberRate: number; isActive: boolean }>) =>
    request<RoomType>(`/booking/room-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteRoomType: (id: string) => request<{ id: string }>(`/booking/room-types/${id}`, { method: 'DELETE' }),

  listHallTypes: () => request<HallType[]>('/booking/hall-types'),
  createHallType: (input: { name: string; memberRate: number; nonMemberRate: number }) =>
    request<HallType>('/booking/hall-types', { method: 'POST', body: JSON.stringify(input) }),
  updateHallType: (id: string, input: Partial<{ name: string; memberRate: number; nonMemberRate: number; isActive: boolean }>) =>
    request<HallType>(`/booking/hall-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteHallType: (id: string) => request<{ id: string }>(`/booking/hall-types/${id}`, { method: 'DELETE' }),

  listBoardroomTypes: () => request<BoardroomType[]>('/booking/boardroom-types'),
  createBoardroomType: (input: { name: string; memberRate: number; nonMemberRate: number }) =>
    request<BoardroomType>('/booking/boardroom-types', { method: 'POST', body: JSON.stringify(input) }),
  updateBoardroomType: (
    id: string,
    input: Partial<{ name: string; memberRate: number; nonMemberRate: number; isActive: boolean }>,
  ) => request<BoardroomType>(`/booking/boardroom-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBoardroomType: (id: string) => request<{ id: string }>(`/booking/boardroom-types/${id}`, { method: 'DELETE' }),

  listResources: () => request<BookableResource[]>('/booking/resources'),
  createResource: (input: {
    type: ResourceType;
    name: string;
    roomTypeId?: string;
    hallTypeId?: string;
    boardroomTypeId?: string;
    capacity?: number;
  }) => request<BookableResource>('/booking/resources', { method: 'POST', body: JSON.stringify(input) }),
  updateResource: (
    id: string,
    input: Partial<{
      name: string;
      roomTypeId: string;
      hallTypeId: string;
      boardroomTypeId: string;
      capacity: number;
      isActive: boolean;
    }>,
  ) => request<BookableResource>(`/booking/resources/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteResource: (id: string) => request<{ id: string }>(`/booking/resources/${id}`, { method: 'DELETE' }),
  findAvailableResources: (
    type: ResourceType,
    checkIn: string,
    checkOut: string,
    filters?: { roomTypeId?: string; hallTypeId?: string; boardroomTypeId?: string },
  ) => {
    const params = new URLSearchParams({ type, checkIn, checkOut });
    if (filters?.roomTypeId) params.set('roomTypeId', filters.roomTypeId);
    if (filters?.hallTypeId) params.set('hallTypeId', filters.hallTypeId);
    if (filters?.boardroomTypeId) params.set('boardroomTypeId', filters.boardroomTypeId);
    return request<BookableResource[]>(`/booking/resources/available?${params.toString()}`);
  },
  listBookings: (type?: ResourceType, memberId?: string) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (memberId) params.set('memberId', memberId);
    const query = params.toString();
    return request<Booking[]>(`/booking/bookings${query ? `?${query}` : ''}`);
  },
  getBooking: (id: string) => request<Booking>(`/booking/bookings/${id}`),
  createBooking: (input: {
    resourceId?: string;
    type?: ResourceType;
    roomTypeId?: string;
    hallTypeId?: string;
    boardroomTypeId?: string;
    guestName: string;
    guestPhone?: string;
    guestType?: GuestType;
    memberId?: string;
    nic?: string;
    landNumber?: string;
    email?: string;
    clubName?: string;
    referenceMemberId?: string;
    mealType?: MealType;
    adultCount?: number;
    childrenCount?: number;
    checkIn: string;
    checkOut: string;
    description?: string;
    remark?: string;
    subtotal?: number;
    serviceChargePercent?: number;
    serviceChargeAmount?: number;
    discount?: number;
    advance?: number;
    netAmount?: number;
  }) => request<Booking>('/booking/bookings', { method: 'POST', body: JSON.stringify(input) }),
  cancelBooking: (id: string) => request<Booking>(`/booking/bookings/${id}/cancel`, { method: 'PATCH' }),
  updateBookingPricing: (
    id: string,
    input: Partial<{ serviceChargePercent: number; serviceChargeAmount: number; discount: number; netAmount: number }>,
  ) => request<Booking>(`/booking/bookings/${id}/pricing`, { method: 'PATCH', body: JSON.stringify(input) }),
  checkOutBooking: (id: string) => request<Booking>(`/booking/bookings/${id}/checkout`, { method: 'PATCH' }),
  recordPayment: (input: {
    reference: string;
    amount: number;
    method: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'MEMBER_CREDIT';
    debitAccountCode: string;
    creditAccountCode: string;
    description?: string;
  }) => request<Payment>(`/payments`, { method: 'POST', body: JSON.stringify(input) }),
  listPayments: () => request<Payment[]>('/payments'),

  listAccounts: () => request<ChartOfAccount[]>('/ledger/accounts'),
  createAccount: (input: { code: string; name: string; type: AccountType; normalBalance: NormalBalance }) =>
    request<ChartOfAccount>('/ledger/accounts', { method: 'POST', body: JSON.stringify(input) }),
  updateAccount: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<ChartOfAccount>(`/ledger/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  listPayableVendors: () => request<PayableVendor[]>('/payables/vendors'),
  createPayableVendor: (input: { name: string; phone?: string; address?: string }) =>
    request<PayableVendor>('/payables/vendors', { method: 'POST', body: JSON.stringify(input) }),
  updatePayableVendor: (id: string, input: Partial<{ name: string; phone: string; address: string; isActive: boolean }>) =>
    request<PayableVendor>(`/payables/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePayableVendor: (id: string) => request<{ id: string }>(`/payables/vendors/${id}`, { method: 'DELETE' }),

  listVendorBills: () => request<VendorBill[]>('/payables/bills'),
  getVendorBill: (id: string) => request<VendorBill>(`/payables/bills/${id}`),
  createVendorBill: (input: { vendorId: string; expenseAccountCode: string; amount: number; description?: string }) =>
    request<VendorBill>('/payables/bills', { method: 'POST', body: JSON.stringify(input) }),
  recordVendorBillPayment: (id: string, input: { amount: number; method: VendorPaymentMethod; description?: string }) =>
    request<VendorBill>(`/payables/bills/${id}/payments`, { method: 'PATCH', body: JSON.stringify(input) }),

  listFiscalYears: () => request<FiscalYear[]>('/fiscal-years'),
  createFiscalYear: (input: { label: string; startDate: string; endDate: string }) =>
    request<FiscalYear>('/fiscal-years', { method: 'POST', body: JSON.stringify(input) }),
  updateFiscalYear: (id: string, input: Partial<{ label: string; startDate: string; endDate: string }>) =>
    request<FiscalYear>(`/fiscal-years/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFiscalYear: (id: string) => request<{ id: string }>(`/fiscal-years/${id}`, { method: 'DELETE' }),
  closeFiscalYear: (id: string) => request<FiscalYear>(`/fiscal-years/${id}/close`, { method: 'POST' }),

  getTrialBalance: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return request<TrialBalanceReport>(`/ledger/reports/trial-balance${query ? `?${query}` : ''}`);
  },
  getGeneralLedger: (accountId?: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (accountId) params.set('accountId', accountId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return request<GeneralLedgerGroup[]>(`/ledger/reports/general-ledger${query ? `?${query}` : ''}`);
  },
  getBalanceSheet: (asOf?: string) =>
    request<BalanceSheetReport>(`/ledger/reports/balance-sheet${asOf ? `?asOf=${asOf}` : ''}`),
  getIncomeStatement: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return request<IncomeStatementReport>(`/ledger/reports/income-statement${query ? `?${query}` : ''}`);
  },

  listMembers: () => request<Member[]>('/members'),
  getMember: (id: string) => request<Member>(`/members/${id}`),
  createMember: (input: {
    title?: string;
    memberType?: MemberType;
    fullName: string;
    address?: string;
    nic?: string;
    dob?: string;
    phone?: string;
    landNumber?: string;
    email?: string;
    joinDate?: string;
    remark?: string;
    photo?: string;
    referredById?: string;
    status?: MemberStatus;
    specialDates?: Array<{ description: string; date: string }>;
  }) => request<Member>('/members', { method: 'POST', body: JSON.stringify(input) }),
  updateMember: (
    id: string,
    input: Partial<{
      title: string;
      memberType: MemberType;
      fullName: string;
      address: string;
      nic: string;
      dob: string;
      phone: string;
      landNumber: string;
      email: string;
      joinDate: string;
      resignDate: string;
      remark: string;
      photo: string;
      referredById: string;
    }>,
  ) => request<Member>(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  updateMemberStatus: (id: string, status: MemberStatus) =>
    request<Member>(`/members/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteMember: (id: string) => request<{ id: string }>(`/members/${id}`, { method: 'DELETE' }),
  addMemberSpecialDate: (id: string, input: { description: string; date: string }) =>
    request<Member>(`/members/${id}/special-dates`, { method: 'POST', body: JSON.stringify(input) }),
  removeMemberSpecialDate: (id: string, specialDateId: string) =>
    request<Member>(`/members/${id}/special-dates/${specialDateId}`, { method: 'DELETE' }),
  getMemberAccountTransactions: (id: string) => request<MemberAccountTransaction[]>(`/members/${id}/transactions`),
  recordMemberAccountPayment: (id: string, input: { amount: number; method: 'CASH' | 'CARD' | 'BANK_TRANSFER'; description?: string }) =>
    request<Member>(`/members/${id}/payments`, { method: 'POST', body: JSON.stringify(input) }),

  listBarCategories: () => request<BarCategory[]>('/bar/categories'),
  createBarCategory: (input: { name: string; isActive?: boolean }) =>
    request<BarCategory>('/bar/categories', { method: 'POST', body: JSON.stringify(input) }),
  updateBarCategory: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<BarCategory>(`/bar/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBarCategory: (id: string) => request<{ id: string }>(`/bar/categories/${id}`, { method: 'DELETE' }),

  listBarBrands: () => request<BarBrand[]>('/bar/brands'),
  createBarBrand: (input: { name: string; isActive?: boolean }) =>
    request<BarBrand>('/bar/brands', { method: 'POST', body: JSON.stringify(input) }),
  updateBarBrand: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<BarBrand>(`/bar/brands/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBarBrand: (id: string) => request<{ id: string }>(`/bar/brands/${id}`, { method: 'DELETE' }),

  listBarUnits: () => request<BarUnit[]>('/bar/units'),
  createBarUnit: (input: { name: string }) =>
    request<BarUnit>('/bar/units', { method: 'POST', body: JSON.stringify(input) }),
  updateBarUnit: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<BarUnit>(`/bar/units/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBarUnit: (id: string) => request<{ id: string }>(`/bar/units/${id}`, { method: 'DELETE' }),

  listBarProducts: () => request<BarProduct[]>('/bar/products'),
  createBarProduct: (input: {
    name: string;
    categoryId?: string;
    brandId?: string;
    vendorId?: string;
    unitId?: string;
    photo?: string;
    purchasePrice?: number;
    unitPrice: number;
    expiryDate?: string;
    stockQty?: number;
    reorderLevel?: number;
  }) => request<BarProduct>('/bar/products', { method: 'POST', body: JSON.stringify(input) }),
  updateBarProduct: (
    id: string,
    input: Partial<{
      name: string;
      categoryId: string;
      brandId: string;
      vendorId: string;
      unitId: string;
      photo: string;
      purchasePrice: number;
      unitPrice: number;
      expiryDate: string;
      reorderLevel: number;
      isActive: boolean;
    }>,
  ) => request<BarProduct>(`/bar/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBarProduct: (id: string) => request<{ id: string }>(`/bar/products/${id}`, { method: 'DELETE' }),
  adjustBarStock: (id: string, input: { quantity: number; reason?: string }) =>
    request<BarProduct>(`/bar/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify(input) }),
  listBarStockMovements: (id: string) => request<BarStockMovement[]>(`/bar/products/${id}/stock-movements`),

  listBarCocktails: () => request<Cocktail[]>('/bar/cocktails'),
  createBarCocktail: (input: {
    name: string;
    categoryId?: string;
    brandId?: string;
    photo?: string;
    unitPrice: number;
    isActive?: boolean;
    ingredients: Array<{ productId: string; quantity: number; unitId?: string }>;
  }) => request<Cocktail>('/bar/cocktails', { method: 'POST', body: JSON.stringify(input) }),
  updateBarCocktail: (
    id: string,
    input: Partial<{
      name: string;
      categoryId: string;
      brandId: string;
      photo: string;
      unitPrice: number;
      isActive: boolean;
      ingredients: Array<{ productId: string; quantity: number; unitId?: string }>;
    }>,
  ) => request<Cocktail>(`/bar/cocktails/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  listBarSales: () => request<BarSale[]>('/bar/sales'),
  listHeldBarSales: () => request<BarSale[]>('/bar/sales/held'),
  getBarSale: (id: string) => request<BarSale>(`/bar/sales/${id}`),
  createBarSale: (input: {
    items: Array<{ productId: string; quantity: number }>;
    paymentMethod?: BarPaymentMethod;
    guestType?: BarGuestType;
    memberId?: string;
    guestName?: string;
    serviceChargePercent?: number;
    discount?: number;
    payment?: number;
    remarks?: string;
    hold?: boolean;
  }) => request<BarSale>('/bar/sales', { method: 'POST', body: JSON.stringify(input) }),
  completeBarSale: (
    id: string,
    input: {
      paymentMethod: BarPaymentMethod;
      guestType?: BarGuestType;
      memberId?: string;
      guestName?: string;
      discount?: number;
      payment?: number;
    },
  ) => request<BarSale>(`/bar/sales/${id}/complete`, { method: 'PATCH', body: JSON.stringify(input) }),
  cancelHeldBarSale: (id: string) => request<{ id: string }>(`/bar/sales/${id}/hold`, { method: 'DELETE' }),
  voidBarSale: (id: string) => request<BarSale>(`/bar/sales/${id}/void`, { method: 'PATCH' }),

  listBarVendors: () => request<BarVendor[]>('/bar/vendors'),
  createBarVendor: (input: { name: string; phone?: string; address?: string; isActive?: boolean }) =>
    request<BarVendor>('/bar/vendors', { method: 'POST', body: JSON.stringify(input) }),
  updateBarVendor: (id: string, input: Partial<{ name: string; phone: string; address: string; isActive: boolean }>) =>
    request<BarVendor>(`/bar/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBarVendor: (id: string) => request<{ id: string }>(`/bar/vendors/${id}`, { method: 'DELETE' }),

  listBarPurchaseOrders: () => request<BarPurchaseOrder[]>('/bar/purchase-orders'),
  getBarPurchaseOrder: (id: string) => request<BarPurchaseOrder>(`/bar/purchase-orders/${id}`),
  createBarPurchaseOrder: (input: {
    vendorId: string;
    remark?: string;
    items: Array<{ productId: string; orderedQty: number; unitCost: number; discount?: number }>;
  }) => request<BarPurchaseOrder>('/bar/purchase-orders', { method: 'POST', body: JSON.stringify(input) }),
  cancelBarPurchaseOrder: (id: string) => request<BarPurchaseOrder>(`/bar/purchase-orders/${id}/cancel`, { method: 'PATCH' }),
  updateBarPurchaseOrder: (
    id: string,
    input: Partial<{
      vendorId: string;
      remark: string;
      items: Array<{ productId: string; orderedQty: number; unitCost: number; discount?: number }>;
    }>,
  ) => request<BarPurchaseOrder>(`/bar/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteBarPurchaseOrder: (id: string) => request<{ id: string }>(`/bar/purchase-orders/${id}`, { method: 'DELETE' }),

  listBarGatePasses: () => request<BarGatePass[]>('/bar/gate-passes'),
  getBarGatePass: (id: string) => request<BarGatePass>(`/bar/gate-passes/${id}`),
  listOpenBarPurchaseOrders: () => request<BarPurchaseOrder[]>('/bar/gate-passes/open-purchase-orders'),
  receiveBarGatePass: (input: {
    purchaseOrderId: string;
    vehicleNo?: string;
    items: Array<{ productId: string; receivedQty: number; damageQty?: number; expiryDate?: string; remark?: string }>;
  }) => request<BarGatePass>('/bar/gate-passes', { method: 'POST', body: JSON.stringify(input) }),

  barSalesReport: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return request<BarSalesReport>(`/bar/reports/sales${query ? `?${query}` : ''}`);
  },
  barStockReport: () => request<BarStockReport>('/bar/reports/stock'),
  barDailyStockReport: (date?: string) =>
    request<BarDailyStockReport>(`/bar/reports/daily-stock${date ? `?date=${date}` : ''}`),

  // ---------- Food: menu ----------
  listFoodCategories: () => request<FoodCategory[]>('/food/categories'),
  createFoodCategory: (input: { name: string; isActive?: boolean }) =>
    request<FoodCategory>('/food/categories', { method: 'POST', body: JSON.stringify(input) }),
  updateFoodCategory: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<FoodCategory>(`/food/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFoodCategory: (id: string) => request<{ id: string }>(`/food/categories/${id}`, { method: 'DELETE' }),

  listFoodItems: () => request<FoodItem[]>('/food/items'),
  createFoodItem: (input: { name: string; categoryId?: string; photo?: string; costOfMaking?: number; price: number; isAvailable?: boolean }) =>
    request<FoodItem>('/food/items', { method: 'POST', body: JSON.stringify(input) }),
  updateFoodItem: (
    id: string,
    input: Partial<{ name: string; categoryId: string; photo: string; costOfMaking: number; price: number; isAvailable: boolean; isActive: boolean }>,
  ) => request<FoodItem>(`/food/items/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFoodItem: (id: string) => request<{ id: string }>(`/food/items/${id}`, { method: 'DELETE' }),

  listFoodTables: () => request<FoodTable[]>('/food/tables'),
  createFoodTable: (input: { name: string; capacity?: number }) =>
    request<FoodTable>('/food/tables', { method: 'POST', body: JSON.stringify(input) }),
  updateFoodTable: (id: string, input: Partial<{ name: string; capacity: number; isActive: boolean }>) =>
    request<FoodTable>(`/food/tables/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFoodTable: (id: string) => request<{ id: string }>(`/food/tables/${id}`, { method: 'DELETE' }),

  // ---------- Food: POS / sales ----------
  listFoodSales: () => request<FoodSale[]>('/food/sales'),
  listHeldFoodSales: () => request<FoodSale[]>('/food/sales/held'),
  getFoodSale: (id: string) => request<FoodSale>(`/food/sales/${id}`),
  createFoodSale: (input: {
    items: Array<{ foodItemId: string; quantity: number }>;
    orderType?: FoodOrderType;
    tableId?: string;
    paymentMethod?: FoodPaymentMethod;
    guestType?: FoodGuestType;
    memberId?: string;
    guestName?: string;
    serviceChargePercent?: number;
    discount?: number;
    payment?: number;
    remarks?: string;
    hold?: boolean;
  }) => request<FoodSale>('/food/sales', { method: 'POST', body: JSON.stringify(input) }),
  completeFoodSale: (
    id: string,
    input: {
      paymentMethod: FoodPaymentMethod;
      guestType?: FoodGuestType;
      memberId?: string;
      guestName?: string;
      discount?: number;
      payment?: number;
    },
  ) => request<FoodSale>(`/food/sales/${id}/complete`, { method: 'PATCH', body: JSON.stringify(input) }),
  cancelHeldFoodSale: (id: string) => request<{ id: string }>(`/food/sales/${id}/hold`, { method: 'DELETE' }),
  voidFoodSale: (id: string) => request<FoodSale>(`/food/sales/${id}/void`, { method: 'PATCH' }),

  // ---------- Food: ingredient purchasing ----------
  listFoodIngredientCategories: () => request<FoodIngredientCategory[]>('/food/ingredient-categories'),
  createFoodIngredientCategory: (input: { name: string; isActive?: boolean }) =>
    request<FoodIngredientCategory>('/food/ingredient-categories', { method: 'POST', body: JSON.stringify(input) }),
  updateFoodIngredientCategory: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<FoodIngredientCategory>(`/food/ingredient-categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFoodIngredientCategory: (id: string) => request<{ id: string }>(`/food/ingredient-categories/${id}`, { method: 'DELETE' }),

  listFoodVendors: () => request<FoodVendor[]>('/food/vendors'),
  createFoodVendor: (input: { name: string; phone?: string; address?: string; isActive?: boolean }) =>
    request<FoodVendor>('/food/vendors', { method: 'POST', body: JSON.stringify(input) }),
  updateFoodVendor: (id: string, input: Partial<{ name: string; phone: string; address: string; isActive: boolean }>) =>
    request<FoodVendor>(`/food/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFoodVendor: (id: string) => request<{ id: string }>(`/food/vendors/${id}`, { method: 'DELETE' }),

  listFoodStockItems: () => request<FoodStockItem[]>('/food/stock-items'),
  createFoodStockItem: (input: {
    name: string;
    categoryId?: string;
    vendorId?: string;
    unit?: string;
    purchasePrice?: number;
    expiryDate?: string;
    stockQty?: number;
    reorderLevel?: number;
  }) => request<FoodStockItem>('/food/stock-items', { method: 'POST', body: JSON.stringify(input) }),
  updateFoodStockItem: (
    id: string,
    input: Partial<{
      name: string;
      categoryId: string;
      vendorId: string;
      unit: string;
      purchasePrice: number;
      expiryDate: string;
      reorderLevel: number;
      isActive: boolean;
    }>,
  ) => request<FoodStockItem>(`/food/stock-items/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFoodStockItem: (id: string) => request<{ id: string }>(`/food/stock-items/${id}`, { method: 'DELETE' }),
  adjustFoodStock: (id: string, input: { quantity: number; reason?: string }) =>
    request<FoodStockItem>(`/food/stock-items/${id}/stock`, { method: 'PATCH', body: JSON.stringify(input) }),
  listFoodStockMovements: (id: string) => request<FoodStockMovement[]>(`/food/stock-items/${id}/stock-movements`),

  listFoodPurchaseOrders: () => request<FoodPurchaseOrder[]>('/food/purchase-orders'),
  getFoodPurchaseOrder: (id: string) => request<FoodPurchaseOrder>(`/food/purchase-orders/${id}`),
  createFoodPurchaseOrder: (input: {
    vendorId: string;
    remark?: string;
    items: Array<{ stockItemId: string; orderedQty: number; unitCost: number; discount?: number }>;
  }) => request<FoodPurchaseOrder>('/food/purchase-orders', { method: 'POST', body: JSON.stringify(input) }),
  cancelFoodPurchaseOrder: (id: string) => request<FoodPurchaseOrder>(`/food/purchase-orders/${id}/cancel`, { method: 'PATCH' }),
  updateFoodPurchaseOrder: (
    id: string,
    input: Partial<{
      vendorId: string;
      remark: string;
      items: Array<{ stockItemId: string; orderedQty: number; unitCost: number; discount?: number }>;
    }>,
  ) => request<FoodPurchaseOrder>(`/food/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteFoodPurchaseOrder: (id: string) => request<{ id: string }>(`/food/purchase-orders/${id}`, { method: 'DELETE' }),

  listFoodGatePasses: () => request<FoodGatePass[]>('/food/gate-passes'),
  getFoodGatePass: (id: string) => request<FoodGatePass>(`/food/gate-passes/${id}`),
  listOpenFoodPurchaseOrders: () => request<FoodPurchaseOrder[]>('/food/gate-passes/open-purchase-orders'),
  receiveFoodGatePass: (input: {
    purchaseOrderId: string;
    vehicleNo?: string;
    items: Array<{ stockItemId: string; receivedQty: number; damageQty?: number; expiryDate?: string; remark?: string }>;
  }) => request<FoodGatePass>('/food/gate-passes', { method: 'POST', body: JSON.stringify(input) }),

  foodSalesReport: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return request<FoodSalesReport>(`/food/reports/sales${query ? `?${query}` : ''}`);
  },
  foodStockReport: () => request<FoodStockReport>('/food/reports/stock'),
  foodDailyStockReport: (date?: string) =>
    request<FoodDailyStockReport>(`/food/reports/daily-stock${date ? `?date=${date}` : ''}`),

  // ---------- Inventory: catalogue ----------
  listInventoryCategories: () => request<InventoryCategory[]>('/inventory/categories'),
  createInventoryCategory: (input: { name: string; isActive?: boolean }) =>
    request<InventoryCategory>('/inventory/categories', { method: 'POST', body: JSON.stringify(input) }),
  updateInventoryCategory: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<InventoryCategory>(`/inventory/categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteInventoryCategory: (id: string) => request<{ id: string }>(`/inventory/categories/${id}`, { method: 'DELETE' }),

  listInventoryVendors: () => request<InventoryVendor[]>('/inventory/vendors'),
  createInventoryVendor: (input: { name: string; phone?: string; address?: string; isActive?: boolean }) =>
    request<InventoryVendor>('/inventory/vendors', { method: 'POST', body: JSON.stringify(input) }),
  updateInventoryVendor: (id: string, input: Partial<{ name: string; phone: string; address: string; isActive: boolean }>) =>
    request<InventoryVendor>(`/inventory/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteInventoryVendor: (id: string) => request<{ id: string }>(`/inventory/vendors/${id}`, { method: 'DELETE' }),

  listInventoryItems: () => request<InventoryItem[]>('/inventory/items'),
  createInventoryItem: (input: {
    name: string;
    categoryId?: string;
    vendorId?: string;
    photo?: string;
    purchasePrice?: number;
    stockQty?: number;
    reorderLevel?: number;
  }) => request<InventoryItem>('/inventory/items', { method: 'POST', body: JSON.stringify(input) }),
  updateInventoryItem: (
    id: string,
    input: Partial<{
      name: string;
      categoryId: string;
      vendorId: string;
      photo: string;
      purchasePrice: number;
      reorderLevel: number;
      isActive: boolean;
    }>,
  ) => request<InventoryItem>(`/inventory/items/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteInventoryItem: (id: string) => request<{ id: string }>(`/inventory/items/${id}`, { method: 'DELETE' }),
  adjustInventoryItemStock: (id: string, input: { quantity: number; reason?: string }) =>
    request<InventoryItem>(`/inventory/items/${id}/stock`, { method: 'PATCH', body: JSON.stringify(input) }),
  listInventoryItemStockMovements: (id: string) =>
    request<InventoryStockMovement[]>(`/inventory/items/${id}/stock-movements`),

  // ---------- Inventory: purchase orders ----------
  listInventoryPurchaseOrders: () => request<InventoryPurchaseOrder[]>('/inventory/purchase-orders'),
  getInventoryPurchaseOrder: (id: string) => request<InventoryPurchaseOrder>(`/inventory/purchase-orders/${id}`),
  createInventoryPurchaseOrder: (input: {
    vendorId: string;
    remark?: string;
    items: Array<{ itemId: string; orderedQty: number; unitCost: number; discount?: number }>;
  }) => request<InventoryPurchaseOrder>('/inventory/purchase-orders', { method: 'POST', body: JSON.stringify(input) }),
  cancelInventoryPurchaseOrder: (id: string) =>
    request<InventoryPurchaseOrder>(`/inventory/purchase-orders/${id}/cancel`, { method: 'PATCH' }),
  updateInventoryPurchaseOrder: (
    id: string,
    input: Partial<{
      vendorId: string;
      remark: string;
      items: Array<{ itemId: string; orderedQty: number; unitCost: number; discount?: number }>;
    }>,
  ) => request<InventoryPurchaseOrder>(`/inventory/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteInventoryPurchaseOrder: (id: string) => request<{ id: string }>(`/inventory/purchase-orders/${id}`, { method: 'DELETE' }),

  // ---------- Inventory: gate pass ----------
  listInventoryGatePasses: () => request<InventoryGatePass[]>('/inventory/gate-passes'),
  getInventoryGatePass: (id: string) => request<InventoryGatePass>(`/inventory/gate-passes/${id}`),
  listOpenInventoryPurchaseOrders: () => request<InventoryPurchaseOrder[]>('/inventory/gate-passes/open-purchase-orders'),
  receiveInventoryGatePass: (input: {
    purchaseOrderId: string;
    vehicleNo?: string;
    items: Array<{ itemId: string; receivedQty: number; damageQty?: number; remark?: string }>;
  }) => request<InventoryGatePass>('/inventory/gate-passes', { method: 'POST', body: JSON.stringify(input) }),

  // ---------- Inventory: stock out (issue to staff) ----------
  listInventoryStockOuts: () => request<InventoryStockOut[]>('/inventory/stock-outs'),
  getInventoryStockOut: (id: string) => request<InventoryStockOut>(`/inventory/stock-outs/${id}`),
  createInventoryStockOut: (input: { issuedTo: string; remark?: string; items: Array<{ itemId: string; quantity: number }> }) =>
    request<InventoryStockOut>('/inventory/stock-outs', { method: 'POST', body: JSON.stringify(input) }),

  // ---------- Housekeeping: cleaning status board ----------
  listHousekeepingStatuses: () => request<HousekeepingStatusRow[]>('/housekeeping/statuses'),
  housekeepingStatusSummary: () => request<HousekeepingStatusSummary>('/housekeeping/statuses/summary'),
  updateHousekeepingStatus: (
    resourceId: string,
    input: { state: HousekeepingState; priority?: HousekeepingPriority; reason?: string },
  ) => request<unknown>(`/housekeeping/statuses/${resourceId}`, { method: 'PATCH', body: JSON.stringify(input) }),

  // ---------- Housekeeping: supply requests ----------
  listHousekeepingRequests: (status?: HousekeepingRequestStatus) =>
    request<HousekeepingRequest[]>(`/housekeeping/requests${status ? `?status=${status}` : ''}`),
  getHousekeepingRequest: (id: string) => request<HousekeepingRequest>(`/housekeeping/requests/${id}`),
  createHousekeepingRequest: (input: {
    requestedFor: ResourceType;
    resourceId?: string;
    note?: string;
    items: Array<{ itemId: string; quantity: number }>;
  }) => request<HousekeepingRequest>('/housekeeping/requests', { method: 'POST', body: JSON.stringify(input) }),
  updateHousekeepingRequest: (
    id: string,
    input: Partial<{
      requestedFor: ResourceType;
      resourceId: string;
      note: string;
      items: Array<{ itemId: string; quantity: number }>;
    }>,
  ) => request<HousekeepingRequest>(`/housekeeping/requests/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  approveHousekeepingRequest: (id: string) =>
    request<HousekeepingRequest>(`/housekeeping/requests/${id}/approve`, { method: 'PATCH' }),
  issueHousekeepingRequest: (id: string) =>
    request<HousekeepingRequest>(`/housekeeping/requests/${id}/issue`, { method: 'PATCH' }),
  cancelHousekeepingRequest: (id: string, reason?: string) =>
    request<HousekeepingRequest>(`/housekeeping/requests/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // ---------- Inventory: reports ----------
  inventoryStockReport: () => request<InventoryStockReport>('/inventory/reports/stock'),
  inventoryDailyStockReport: (date?: string) =>
    request<InventoryDailyStockReport>(`/inventory/reports/daily-stock${date ? `?date=${date}` : ''}`),

  // ---------- Physical Stock: asset categories ----------
  listAssetCategories: () => request<PhysicalAssetCategory[]>('/inventory/asset-categories'),
  createAssetCategory: (input: { name: string; isActive?: boolean }) =>
    request<PhysicalAssetCategory>('/inventory/asset-categories', { method: 'POST', body: JSON.stringify(input) }),
  updateAssetCategory: (id: string, input: Partial<{ name: string; isActive: boolean }>) =>
    request<PhysicalAssetCategory>(`/inventory/asset-categories/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteAssetCategory: (id: string) => request<{ id: string }>(`/inventory/asset-categories/${id}`, { method: 'DELETE' }),

  // ---------- Physical Stock: assets ----------
  listAssets: () => request<PhysicalAsset[]>('/inventory/assets'),
  getAsset: (id: string) => request<PhysicalAsset>(`/inventory/assets/${id}`),
  createAsset: (input: {
    name: string;
    categoryId?: string;
    photo?: string;
    buyingPrice?: number;
    purchaseDate?: string;
    sourceOfPurchase?: string;
    depreciationPerYear?: number;
    location?: string;
    remark?: string;
    quantity?: number;
  }) => request<PhysicalAsset>('/inventory/assets', { method: 'POST', body: JSON.stringify(input) }),
  updateAsset: (
    id: string,
    input: Partial<{
      name: string;
      categoryId: string;
      photo: string;
      buyingPrice: number;
      purchaseDate: string;
      sourceOfPurchase: string;
      depreciationPerYear: number;
      location: string;
      remark: string;
      isActive: boolean;
    }>,
  ) => request<PhysicalAsset>(`/inventory/assets/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteAsset: (id: string) => request<{ id: string }>(`/inventory/assets/${id}`, { method: 'DELETE' }),

  // ---------- Physical Stock: asset units (transfer / disposal) ----------
  listAssetUnitTransfers: (unitId: string) => request<PhysicalAssetTransfer[]>(`/inventory/asset-units/${unitId}/transfers`),
  transferAssetUnit: (unitId: string, input: { toLocation: string; remark?: string }) =>
    request<PhysicalAssetUnit & { asset: PhysicalAsset; transfers: PhysicalAssetTransfer[] }>(
      `/inventory/asset-units/${unitId}/transfer`,
      { method: 'POST', body: JSON.stringify(input) },
    ),
  listAssetDisposals: (status?: PhysicalAssetDisposalStatus) =>
    request<PhysicalAssetDisposal[]>(`/inventory/asset-units/disposals${status ? `?status=${status}` : ''}`),
  requestAssetDisposal: (unitId: string, input: { reason: string }) =>
    request<PhysicalAssetDisposal>(`/inventory/asset-units/${unitId}/disposals`, { method: 'POST', body: JSON.stringify(input) }),
  resolveAssetDisposal: (disposalId: string, input: { status: 'APPROVED' | 'REJECTED' }) =>
    request<PhysicalAssetDisposal>(`/inventory/asset-units/disposals/${disposalId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  // ---------- Payroll: master data ----------
  listPayrollDepartments: () => request<PayrollDepartment[]>('/payroll/departments'),
  createPayrollDepartment: (input: { name: string; shortCode?: string; isActive?: boolean }) =>
    request<PayrollDepartment>('/payroll/departments', { method: 'POST', body: JSON.stringify(input) }),
  updatePayrollDepartment: (id: string, input: Partial<{ name: string; shortCode: string; isActive: boolean }>) =>
    request<PayrollDepartment>(`/payroll/departments/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePayrollDepartment: (id: string) => request<{ id: string }>(`/payroll/departments/${id}`, { method: 'DELETE' }),

  listPayrollJobPositions: () => request<PayrollJobPosition[]>('/payroll/job-positions'),
  createPayrollJobPosition: (input: { name: string; departmentId?: string; basicPerDay?: number; otPerHour?: number; isActive?: boolean }) =>
    request<PayrollJobPosition>('/payroll/job-positions', { method: 'POST', body: JSON.stringify(input) }),
  updatePayrollJobPosition: (
    id: string,
    input: Partial<{ name: string; departmentId: string; basicPerDay: number; otPerHour: number; isActive: boolean }>,
  ) => request<PayrollJobPosition>(`/payroll/job-positions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePayrollJobPosition: (id: string) => request<{ id: string }>(`/payroll/job-positions/${id}`, { method: 'DELETE' }),

  listPayrollAllowanceTypes: () => request<PayrollAllowanceType[]>('/payroll/allowance-types'),
  createPayrollAllowanceType: (input: { name: string; defaultAmount?: number; isActive?: boolean }) =>
    request<PayrollAllowanceType>('/payroll/allowance-types', { method: 'POST', body: JSON.stringify(input) }),
  updatePayrollAllowanceType: (id: string, input: Partial<{ name: string; defaultAmount: number; isActive: boolean }>) =>
    request<PayrollAllowanceType>(`/payroll/allowance-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePayrollAllowanceType: (id: string) => request<{ id: string }>(`/payroll/allowance-types/${id}`, { method: 'DELETE' }),

  listPayrollDeductionTypes: () => request<PayrollDeductionType[]>('/payroll/deduction-types'),
  createPayrollDeductionType: (input: { name: string; defaultAmount?: number; isActive?: boolean }) =>
    request<PayrollDeductionType>('/payroll/deduction-types', { method: 'POST', body: JSON.stringify(input) }),
  updatePayrollDeductionType: (id: string, input: Partial<{ name: string; defaultAmount: number; isActive: boolean }>) =>
    request<PayrollDeductionType>(`/payroll/deduction-types/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePayrollDeductionType: (id: string) => request<{ id: string }>(`/payroll/deduction-types/${id}`, { method: 'DELETE' }),

  // ---------- Payroll: employees ----------
  listPayrollEmployees: () => request<PayrollEmployee[]>('/payroll/employees'),
  getPayrollEmployee: (id: string) => request<PayrollEmployee>(`/payroll/employees/${id}`),
  createPayrollEmployee: (input: {
    title?: string;
    firstName: string;
    lastName: string;
    departmentId?: string;
    positionId?: string;
    address?: string;
    nic?: string;
    email?: string;
    dob?: string;
    mobile?: string;
    landNumber?: string;
    joinDate?: string;
    epfNumber?: string;
    etfNumber?: string;
    emergencyContact?: string;
    remark?: string;
    photo?: string;
    status?: PayrollEmployeeStatus;
  }) => request<PayrollEmployee>('/payroll/employees', { method: 'POST', body: JSON.stringify(input) }),
  updatePayrollEmployee: (
    id: string,
    input: Partial<{
      title: string;
      firstName: string;
      lastName: string;
      departmentId: string;
      positionId: string;
      address: string;
      nic: string;
      email: string;
      dob: string;
      mobile: string;
      landNumber: string;
      resignDate: string;
      epfNumber: string;
      etfNumber: string;
      emergencyContact: string;
      remark: string;
      photo: string;
      status: PayrollEmployeeStatus;
    }>,
  ) => request<PayrollEmployee>(`/payroll/employees/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  // ---------- Payroll: shifts & assignment ----------
  listPayrollShifts: () => request<PayrollShift[]>('/payroll/shifts'),
  createPayrollShift: (input: { name: string; startTime: string; endTime: string; isActive?: boolean }) =>
    request<PayrollShift>('/payroll/shifts', { method: 'POST', body: JSON.stringify(input) }),
  updatePayrollShift: (id: string, input: Partial<{ name: string; startTime: string; endTime: string; isActive: boolean }>) =>
    request<PayrollShift>(`/payroll/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deletePayrollShift: (id: string) => request<{ id: string }>(`/payroll/shifts/${id}`, { method: 'DELETE' }),

  listPayrollEmployeeShifts: (date?: string) =>
    request<PayrollEmployeeShift[]>(`/payroll/employee-shifts${date ? `?date=${date}` : ''}`),
  assignPayrollEmployeeShift: (input: { employeeId: string; shiftId: string; shiftDate: string }) =>
    request<PayrollEmployeeShift>('/payroll/employee-shifts', { method: 'POST', body: JSON.stringify(input) }),
  removePayrollEmployeeShift: (id: string) => request<{ id: string }>(`/payroll/employee-shifts/${id}`, { method: 'DELETE' }),

  // ---------- Payroll: attendance ----------
  listPayrollAttendance: (employeeId?: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employeeId', employeeId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return request<PayrollAttendance[]>(`/payroll/attendance${query ? `?${query}` : ''}`);
  },
  markPayrollAttendance: (input: {
    employeeId: string;
    attendanceDate: string;
    shiftId?: string;
    inTime?: string;
    outTime?: string;
    leaveType?: PayrollLeaveType;
  }) => request<PayrollAttendance>('/payroll/attendance', { method: 'POST', body: JSON.stringify(input) }),

  // ---------- Payroll: leave requests ----------
  listPayrollLeaveRequests: (status?: PayrollLeaveRequestStatus) =>
    request<PayrollLeaveRequest[]>(`/payroll/leave-requests${status ? `?status=${status}` : ''}`),
  createPayrollLeaveRequest: (input: { employeeId: string; leaveType: PayrollLeaveType; startDate: string; endDate: string; reason?: string }) =>
    request<PayrollLeaveRequest>('/payroll/leave-requests', { method: 'POST', body: JSON.stringify(input) }),
  resolvePayrollLeaveRequest: (id: string, input: { status: 'APPROVED' | 'REJECTED' }) =>
    request<PayrollLeaveRequest>(`/payroll/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  // ---------- Payroll: salary run ----------
  listPayrollSalaries: (employeeId?: string, salaryMonth?: string) => {
    const params = new URLSearchParams();
    if (employeeId) params.set('employeeId', employeeId);
    if (salaryMonth) params.set('salaryMonth', salaryMonth);
    const query = params.toString();
    return request<PayrollSalary[]>(`/payroll/salaries${query ? `?${query}` : ''}`);
  },
  getPayrollSalary: (id: string) => request<PayrollSalary>(`/payroll/salaries/${id}`),
  calculatePayrollSalary: (input: {
    employeeId: string;
    salaryMonth: string;
    allowances?: Array<{ allowanceTypeId: string; amount: number }>;
    deductions?: Array<{ deductionTypeId: string; amount: number }>;
    remark?: string;
  }) => request<PayrollSalary>('/payroll/salaries', { method: 'POST', body: JSON.stringify(input) }),

  // ---------- Payroll: reports ----------
  payrollEpfEtfReport: (salaryMonth: string) => request<PayrollEpfEtfReport>(`/payroll/reports/epf-etf?salaryMonth=${salaryMonth}`),

  // ---------- Payroll: settings ----------
  getPayrollSettings: () => request<PayrollSettings>('/payroll/settings'),
  updatePayrollSettings: (input: Partial<{ epfEmployeeRate: number; epfEmployerRate: number; etfRate: number }>) =>
    request<PayrollSettings>('/payroll/settings', { method: 'PATCH', body: JSON.stringify(input) }),

  // ---------- Administration: users ----------
  listUsers: () => request<StaffUser[]>('/users'),
  getUser: (id: string) => request<StaffUser>(`/users/${id}`),
  createUser: (input: { email: string; username: string; password: string; fullName: string; roleId: string }) =>
    request<StaffUser>('/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: string, input: Partial<{ email: string; username: string; fullName: string; roleId: string; isActive: boolean }>) =>
    request<StaffUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  resetUserPassword: (id: string, newPassword: string) =>
    request<{ id: string }>(`/users/${id}/reset-password`, { method: 'PATCH', body: JSON.stringify({ newPassword }) }),

  // ---------- Administration: roles ----------
  listRoles: () => request<Role[]>('/roles'),
  getRole: (id: string) => request<Role>(`/roles/${id}`),
  rolePermissionCatalog: () => request<PermissionCatalogEntry[]>('/roles/permission-catalog'),
  createRole: (input: { name: string; description?: string }) =>
    request<Role>('/roles', { method: 'POST', body: JSON.stringify(input) }),
  updateRole: (id: string, input: Partial<{ name: string; description: string }>) =>
    request<Role>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  setRolePermissions: (id: string, permissionKeys: string[]) =>
    request<Role>(`/roles/${id}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissionKeys }) }),
  deleteRole: (id: string) => request<{ id: string }>(`/roles/${id}`, { method: 'DELETE' }),
};
