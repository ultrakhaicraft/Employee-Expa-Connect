"use client"

import { useEffect, useState } from "react"
import { Plus, Search, Users, Edit, RefreshCw, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { CreateEmployeeCode, EditEmployeeCode, GetEmployeeCodes, DeleteEmployeeCodeExpired, DeleteEmployeeCode, GetAllBranch } from "@/services/adminService"
import PageTransition from "@/components/Transition/PageTransition"

interface EmployeeCodeItem {
  employeeId: string
  employeeCode: string
  branchId: string
  branchName?: string
  email: string
  jobTitle?: string
  createdAt: string
  expiresAt: string
  status: "Active" | "Inactive" | string
}

interface Branch {
  branchId: string
  name: string
}

export default function ViewEmpCode() {
  const { toast } = useToast()

  const [codes, setCodes] = useState<EmployeeCodeItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [expiryFilter, setExpiryFilter] = useState<"all" | "active" | "includeExpired" | "inactive">("all")
  const [branchFilter, setBranchFilter] = useState("")
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])

  const [createRows, setCreateRows] = useState<Array<{ employeeCode: string; branchId: string; email: string; jobTitle: string; expiresAt: string; status: "Inactive" }>>([
    { employeeCode: "", branchId: "", email: "", jobTitle: "", expiresAt: "", status: "Inactive" },
  ])

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<{ employeeId: string; employeeCode: string; branchId: string; email: string; jobTitle: string; expiresAt: string; status: "Active" | "Inactive" } | null>(null)
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<{ employeeId: string; employeeCode: string } | null>(null)

  const fetchBranches = async () => {
    try {
      const resp = await GetAllBranch(1, 1000) // Get all branches
      const branchList = resp?.items || resp?.data?.items || []
      setBranches(branchList.map((b: any) => ({ branchId: b.branchId, name: b.name })))
    } catch (e: any) {
      console.error("Failed to load branches:", e)
    }
  }

  const nowIsoLocal = () => {
    const now = new Date()
    now.setSeconds(0, 0)
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - offset * 60000)
    return local.toISOString().slice(0, 16)
  }

  const fetchCodes = async () => {
    try {
      setLoading(true)
      const includeExpired = expiryFilter === "includeExpired" ? true : expiryFilter === "active" ? false : undefined
      const resp = await GetEmployeeCodes({ search, page, pageSize, includeExpired, branchId: branchFilter || undefined })
      const list = resp?.data?.items || resp?.items || []
      const normalized: EmployeeCodeItem[] = list.map((item: any) => ({
        employeeId: item.employeeId,
        employeeCode: item.employeeCode,
        branchId: item.branchId || item.branch?.branchId || "",
        branchName: item.branchName || item.branch?.name || branches.find(b => b.branchId === item.branchId)?.name || "N/A",
        email: item.email || "",
        jobTitle: item.jobTitle || "",
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        status: item.status === 1 || item.status === "Active" ? "Active" : "Inactive",
      }))
      const filteredByStatus =
        expiryFilter === "inactive"
          ? normalized.filter(n => n.status === "Inactive")
          : expiryFilter === "active"
            ? normalized.filter(n => n.status === "Active")
            : normalized
      const filteredByBranch = branchFilter ? filteredByStatus.filter(n => (n.branchId || "") === branchFilter) : filteredByStatus
      setCodes(filteredByBranch)
      setTotal(resp?.data?.total ?? resp?.total ?? filteredByBranch.length)
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.response?.data?.message || "Cannot load employee codes", variant: "destructive" as any })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
    fetchCodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, expiryFilter, search, branchFilter])

  return (
    <PageTransition delayMs={100} durationMs={600} variant="zoom">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0B1F3A]">Employee Codes</h1>
            <p className="text-[#D9D9D9] mt-2">Manage employee codes and expiry dates</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-[#D9D9D9] text-[#0B1F3A] hover:bg-[#0B1F3A] hover:text-white"
            onClick={() => {
              setPage(1)
              fetchBranches()
              fetchCodes()
            }}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#D9822B]" />
              Create Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {createRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <Input placeholder="Employee Code *" value={row.employeeCode} onChange={(e) => {
                    const next = [...createRows]; next[idx].employeeCode = e.target.value; setCreateRows(next);
                  }} required />
                  <select
                    value={row.branchId}
                    onChange={(e) => {
                      const next = [...createRows]; next[idx].branchId = e.target.value; setCreateRows(next);
                    }}
                    className="px-4 py-2 border border-[#D9D9D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white"
                    required
                  >
                    <option value="">Select Branch *</option>
                    {branches.map(b => (
                      <option key={b.branchId} value={b.branchId}>{b.name}</option>
                    ))}
                  </select>
                  <Input type="email" placeholder="Email *" value={row.email} onChange={(e) => {
                    const next = [...createRows]; next[idx].email = e.target.value; setCreateRows(next);
                  }} required />
                  <Input placeholder="Job Title" value={row.jobTitle} onChange={(e) => {
                    const next = [...createRows]; next[idx].jobTitle = e.target.value; setCreateRows(next);
                  }} />
                  <div className="flex items-center gap-2">
                    <Input
                      id={`expires-${idx}`}
                      type="datetime-local"
                      min={nowIsoLocal()}
                      placeholder="Expires At"
                      value={row.expiresAt}
                      onChange={(e) => {
                        const value = e.target.value
                        const safeValue = value && value < nowIsoLocal() ? nowIsoLocal() : value
                        const next = [...createRows]; next[idx].expiresAt = safeValue; setCreateRows(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3"
                      onClick={() => {
                        const el = document.getElementById(`expires-${idx}`) as HTMLInputElement | null
                        if (el?.showPicker) el.showPicker(); else el?.focus()
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input value={row.status} disabled className="opacity-70 cursor-not-allowed" />
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCreateRows([...createRows, { employeeCode: '', branchId: '', email: '', jobTitle: '', expiresAt: '', status: "Inactive" }])}>+ Add row</Button>
                <Button onClick={() => setCreateConfirmOpen(true)} disabled={loading}>
                  {loading ? "Processing..." : "Create"}
                </Button>
              </div>
              <p className="text-sm text-[#D9D9D9] mt-2">* Employee ID will be automatically generated</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D9D9D9]" size={20} />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by employee ID or code..."
              className="pl-10"
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setSearch(searchInput); } }}
            />
          </div>
          <select value={expiryFilter} onChange={(e) => {
            setPage(1); setExpiryFilter(e.target.value as typeof expiryFilter); setSearch(searchInput);
          }} className="px-4 py-2 border border-[#D9D9D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white">
            <option value="all">Include Expired: All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="includeExpired">Include expired</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); setSearch(searchInput); }}
            className="px-4 py-2 border border-[#D9D9D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white"
          >
            <option value="">Branch: All</option>
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>{b.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => { setPage(1); setSearch(searchInput); }} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#D9822B]" /> Employee Codes ({total})</CardTitle>
              <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => setClearConfirmOpen(true)}>Clear</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[#D9D9D9] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9F9F9]">
                    <TableHead className="font-semibold text-[#0B1F3A]">Employee ID</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A]">Code</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A]">Branch</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A]">Email</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A]">Job Title</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A]">Created Date</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A]">Expires</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A]">Status</TableHead>
                    <TableHead className="font-semibold text-[#0B1F3A] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!codes || codes.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-[#D9D9D9]">No data</TableCell>
                    </TableRow>
                  ) : (
                    codes.map((it) => (
                      <TableRow key={it.employeeId + it.employeeCode}>
                        <TableCell className="text-[#0B1F3A]">{it.employeeId}</TableCell>
                        <TableCell className="text-[#0B1F3A]">{it.employeeCode}</TableCell>
                        <TableCell className="text-[#0B1F3A]">{it.branchName || "N/A"}</TableCell>
                        <TableCell className="text-[#0B1F3A]">{it.email || "N/A"}</TableCell>
                        <TableCell className="text-[#0B1F3A]">{it.jobTitle || "N/A"}</TableCell>
                        <TableCell className="text-[#0B1F3A]">{new Date(it.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-[#0B1F3A]">{it.expiresAt ? new Date(it.expiresAt).toLocaleString() : "N/A"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              it.status === "Active"
                                ? "bg-green-100 text-green-800 hover:bg-green-100 border-transparent"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent"
                            }
                          >
                            {it.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" className="border-[#D9822B] text-[#D9822B] hover:bg-[#D9822B] hover:text-white" onClick={() => { setEditRow({ employeeId: it.employeeId, employeeCode: it.employeeCode, branchId: it.branchId, email: it.email, jobTitle: it.jobTitle || "", expiresAt: it.expiresAt?.slice(0,16) || "", status: (it.status as "Active" | "Inactive") ?? "Inactive" }); setEditOpen(true) }}>
                              <Edit size={16} className="mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => { setDeleteRow({ employeeId: it.employeeId, employeeCode: it.employeeCode }); setDeleteConfirmOpen(true) }}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-[#D9D9D9]">Page {page}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page===1} onClick={() => setPage(page-1)}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page+1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Employee Code</AlertDialogTitle>
              <AlertDialogDescription className='mb-4 text-base'>Update the code or expiration.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <Input disabled value={editRow?.employeeId || ''} placeholder="Employee ID (Auto-generated)" />
              <Input value={editRow?.employeeCode || ''} onChange={(e) => setEditRow(prev => prev ? { ...prev, employeeCode: e.target.value } : prev)} placeholder="Employee Code *" required />
              <select
                value={editRow?.branchId || ''}
                onChange={(e) => setEditRow(prev => prev ? { ...prev, branchId: e.target.value } : prev)}
                className="w-full px-4 py-2 border border-[#D9D9D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white"
                required
              >
                <option value="">Select Branch *</option>
                {branches.map(b => (
                  <option key={b.branchId} value={b.branchId}>{b.name}</option>
                ))}
              </select>
              <Input type="email" value={editRow?.email || ''} onChange={(e) => setEditRow(prev => prev ? { ...prev, email: e.target.value } : prev)} placeholder="Email *" required />
              <Input value={editRow?.jobTitle || ''} onChange={(e) => setEditRow(prev => prev ? { ...prev, jobTitle: e.target.value } : prev)} placeholder="Job Title" />
              <div className="flex items-center gap-2">
                <Input
                  id="edit-expiry"
                  type="datetime-local"
                  min={nowIsoLocal()}
                  value={editRow?.expiresAt || ''}
                  onChange={(e) => setEditRow(prev => prev ? { ...prev, expiresAt: e.target.value < nowIsoLocal() ? nowIsoLocal() : e.target.value } : prev)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="px-3"
                  onClick={() => {
                    const el = document.getElementById("edit-expiry") as HTMLInputElement | null
                    if (el?.showPicker) el.showPicker(); else el?.focus()
                  }}
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
              <select
                value={editRow?.status || "Inactive"}
                onChange={(e) => setEditRow(prev => prev ? { ...prev, status: e.target.value as "Active" | "Inactive" } : prev)}
                className="w-full px-4 py-2 border border-[#D9D9D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (!editRow) return;
                try {
                  await EditEmployeeCode({
                    employeeId: editRow.employeeId,
                    employeeCode: editRow.employeeCode,
                    branchId: editRow.branchId,
                    email: editRow.email,
                    jobTitle: editRow.jobTitle,
                    expiresAt: editRow.expiresAt,
                    status: editRow.status === "Active" ? 1 : 0,
                  });
                  toast({ title: 'Updated' });
                  setEditOpen(false);
                  fetchCodes();
                }
                catch (e: any) { toast({ title: 'Update failed', description: e?.response?.data?.message || 'Please try again.', variant: 'destructive' as any }) }
              }}>Save</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription className='mb-4 text-base'>Are you sure you want to delete this employee code?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (!deleteRow) return;
                try { await DeleteEmployeeCode(deleteRow.employeeId, deleteRow.employeeCode); toast({ title: 'Deleted' }); setDeleteConfirmOpen(false); setDeleteRow(null); fetchCodes(); }
                catch (e: any) { toast({ title: 'Delete failed', description: e?.response?.data?.message || 'Please try again.', variant: 'destructive' as any }) }
              }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={createConfirmOpen} onOpenChange={setCreateConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Create</AlertDialogTitle>
              <AlertDialogDescription className='mb-4 text-base'>Are you sure you want to create the entered employee codes?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                const items = createRows.filter(r => r.employeeCode && r.branchId && r.email)
                if (items.length === 0) { toast({ title: 'Missing data', description: 'Please fill Employee Code, Branch, and Email for at least one row.', variant: 'destructive' as any }); return }
                try {
                  setLoading(true)
                  await CreateEmployeeCode(items)
                  toast({ title: 'Created', description: 'Employee codes created successfully.' })
                  setCreateRows([{ employeeCode: '', branchId: '', email: '', jobTitle: '', expiresAt: '', status: "Inactive" }])
                  setCreateConfirmOpen(false)
                  fetchCodes()
                } catch (e: any) {
                  toast({ title: 'Create failed', description: e?.response?.data?.message || 'Please try again.', variant: 'destructive' as any })
                } finally {
                  setLoading(false)
                }
              }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Clear</AlertDialogTitle>
              <AlertDialogDescription className='mb-4 text-base'>This action will delete all expired employee codes in the system. Are you sure you want to proceed?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                try { await DeleteEmployeeCodeExpired(); toast({ title: 'Cleared expired codes' }); setClearConfirmOpen(false); fetchCodes(); }
                catch (e: any) { toast({ title: 'Clear failed', description: e?.response?.data?.message || 'Please try again.', variant: 'destructive' as any }) }
              }}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  )
}

