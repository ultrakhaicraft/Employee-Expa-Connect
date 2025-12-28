import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Search, ChevronLeft, ChevronRight, Edit, Users, UserCog, Building2, RefreshCw } from 'lucide-react'
import { ViewUsers as ViewUsersAPI, UpdateUserToModerator, GetAllBranch, SetBranchForUser } from '@/services/adminService'
import PageTransition from '@/components/Transition/PageTransition'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'

interface User {
  userId: string
  employeeId: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  roleId: number
  roleName: string
  isActive: boolean
  jobTitle: string
  branchName: string | null
  currentBranchName: string | null
  createdAt: string
  updatedAt: string
}

export default function ViewUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 10
  const { toast } = useToast()
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [selectedUserForPromote, setSelectedUserForPromote] = useState<User | null>(null)
  const [updateBranchDialogOpen, setUpdateBranchDialogOpen] = useState(false)
  const [selectedUserForBranch, setSelectedUserForBranch] = useState<User | null>(null)
  const [branches, setBranches] = useState<Array<{ branchId: string; name: string }>>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await ViewUsersAPI()
      if (response && response.items) {
        setUsers(response.items)
        setTotalItems(response.totalItems)
        setTotalPages(Math.ceil(response.totalItems / pageSize))
      } else {
        setError('Failed to load users data')
      }
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError(error.response?.data?.message || 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Disable body scroll when dialog is open
  useEffect(() => {
    if (promoteDialogOpen) {
      // Store the current scroll position
      const scrollY = window.scrollY
      
      // Disable body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Re-enable body scroll
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        
        // Restore scroll position
        window.scrollTo(0, scrollY)
      }
    }
  }, [promoteDialogOpen])

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.currentBranchName || user.branchName || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive)
    
    const matchesRole = roleFilter === 'all' || user.roleName === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole
  })

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const openPromoteConfirm = (user: User) => {
    setSelectedUserForPromote(user)
    setPromoteDialogOpen(true)
  }

  const openUpdateBranch = async (user: User) => {
    setSelectedUserForBranch(user)
    setUpdateBranchDialogOpen(true)
    setSelectedBranchId('')
    try {
      const resp = await GetAllBranch(1, 100)
      if (resp && resp.items) {
        setBranches(resp.items.map((b: any) => ({ branchId: b.branchId, name: b.name })))
      }
    } catch (e) {
      console.error('Failed to load branches', e)
      setBranches([])
    }
  }

  const handleConfirmUpdateBranch = async () => {
    if (!selectedUserForBranch || !selectedBranchId) return
    // Basic GUID validation to avoid server 500 on malformed ids
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!guidRegex.test(selectedUserForBranch.userId) || !guidRegex.test(selectedBranchId)) {
      toast({
        title: 'Invalid IDs',
        description: 'UserId or BranchId is not a valid GUID format.',
        variant: 'destructive' as any,
      })
      return
    }
    try {
      await SetBranchForUser(selectedUserForBranch.userId, selectedBranchId)
      toast({
        title: 'Branch updated',
        description: `${selectedUserForBranch.fullName} assigned to selected branch.`,
      })
      setUpdateBranchDialogOpen(false)
      setSelectedUserForBranch(null)
      setSelectedBranchId('')
      await fetchUsers()
    } catch (e: any) {
      toast({
        title: 'Failed to update branch',
        description: e?.response?.data?.message || 'Please try again.',
        variant: 'destructive' as any,
      })
    }
  }

  const handleConfirmPromote = async () => {
    if (!selectedUserForPromote) return
    try {
      await UpdateUserToModerator(selectedUserForPromote.userId)
      toast({
        title: 'Promotion successful',
        description: `${selectedUserForPromote.fullName} is now a Moderator.`,
      })
      setPromoteDialogOpen(false)
      setSelectedUserForPromote(null)
      await fetchUsers()
    } catch (e: any) {
      toast({
        title: 'Promotion failed',
        description: e?.response?.data?.message || 'Unable to promote user. Please try again.',
        variant: 'destructive' as any,
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#1F2937]">User Management</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D9822B]"></div>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#1F2937]">User Management</h1>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchUsers} className="bg-[#D9822B] hover:bg-[#c17424] text-white">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      {/* Update Branch Dialog */}
      <AlertDialog open={updateBranchDialogOpen} onOpenChange={setUpdateBranchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Branch</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              {`Select a branch for ${selectedUserForBranch?.fullName ?? 'this user'}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-4 py-2 border border-[#D0D7E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white text-[#1F2937]"
            >
              <option value="">Select a branch</option>
              {branches.map(b => (
                <option key={b.branchId} value={b.branchId}>{b.name}</option>
              ))}
            </select>
          </div>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdateBranch} disabled={!selectedBranchId}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Promotion</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              {`Are you sure you want to promote ${selectedUserForPromote?.fullName ?? 'this user'} to Moderator?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPromote}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">User Management</h1>
            <p className="text-[#7A869A] mt-2">Manage and view all users in the system</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#D0D7E4] text-[#1F2937] hover:bg-[#1F2937] hover:text-white"
              onClick={fetchUsers}
              disabled={isLoading}
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="border border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#D9822B]" />
              <span className="text-[#1F2937]">User List ({totalItems})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A0A8B5]" size={20} />
                <Input
                  type="text"
                  placeholder="Search users by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-[#D0D7E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white text-[#1F2937]"
                >
                  <option value="all">All Roles</option>
                  {Array.from(new Set(users.map(u => u.roleName))).map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-[#D0D7E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white text-[#1F2937]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-[#E5E7EB] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#EEF2F9]">
                    <TableHead className="font-semibold text-[#1F2937]">User</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Employee ID</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Job Title</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Branch</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Role</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Status</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Created Date</TableHead>
                    <TableHead className="font-semibold text-[#1F2937] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#9AA3B5]">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.userId} className="hover:bg-[#F9F9F9]">
                        <TableCell>
                          <div>
                            <div className="font-medium text-[#1F2937]">{user.fullName}</div>
                            <div className="text-sm text-[#7A869A]">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#1F2937]">{user.employeeId}</TableCell>
                        <TableCell className="text-[#1F2937]">{user.jobTitle || '-'}</TableCell>
                        <TableCell className="text-[#1F2937]">
                          {user.currentBranchName || user.branchName ? (
                            <span>{user.currentBranchName || user.branchName}</span>
                          ) : (
                            <Badge 
                              className="bg-[#FFF2E0] text-[#B97711] hover:bg-[#FFF2E0] border-transparent"
                            >
                              Unset
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[#1F2937]">
                          {user.roleName === 'Moderator' ? (
                            <Badge className="bg-[#E8EDFF] text-[#3053C5] hover:bg-[#E8EDFF] border-transparent">
                              {user.roleName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-[#D9822B] text-[#D9822B]">
                              {user.roleName}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.isActive ? "default" : "secondary"}
                            className={
                              user.isActive
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent"
                                : "bg-rose-100 text-rose-600 hover:bg-rose-100 border-transparent"
                            }
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#1F2937]">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#D9822B]/70 bg-[#FEF4E6] text-[#D9822B] hover:bg-[#D9822B] hover:text-white"
                                >
                                  <Edit size={16} className="mr-1" />
                                  Edit
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="top" align="end">
                                <DropdownMenuItem
                                  onClick={() => openPromoteConfirm(user)}
                                  disabled={user.roleName === 'Moderator'}
                                  className={`text-[#1F2937] hover:bg-[#F0F4FF] ${
                                    user.roleName === 'Moderator' ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  <UserCog  size={16} className="mr-1" />
                                  Promote to Moderator
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openUpdateBranch(user)} className=' text-[#1F2937] hover:bg-[#F0F4FF]'>
                                <Building2   size={16} className="mr-1" />
                                  Update Branch
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-[#7A869A]">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="border-[#D0D7E4] hover:bg-[#D9822B] hover:text-white"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 p-0 ${
                          currentPage === page
                            ? "bg-[#D9822B] hover:bg-[#c17424] text-white"
                            : "border-[#D0D7E4] hover:bg-[#D9822B] hover:text-white"
                        }`}
                      >
                        {page}
                      </Button>
                    )
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="border-[#D0D7E4] hover:bg-[#D9822B] hover:text-white"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}