import { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  UserX,
  Mail,
  Briefcase,
  Eye,
  Phone,
  Globe,
  MapPin,
  CalendarDays,
  Info
} from 'lucide-react'
import PageTransition from '@/components/Transition/PageTransition'
import { GetUsersInArea, ToggleUserStatus, GetUserDetails } from '@/services/moderatorService'
import type { UserListItem, UserInfo } from '@/services/moderatorService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

export default function ManageUsers() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isToggleDialogOpen, setIsToggleDialogOpen] = useState(false)
  const [userToToggle, setUserToToggle] = useState<UserListItem | null>(null)
  const [toggling, setToggling] = useState(false)
  
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const pageSize = 10
  const { toast } = useToast()

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await GetUsersInArea({
        page,
        pageSize,
        search: searchTerm || undefined,
        isActive: statusFilter === '' ? undefined : statusFilter === 'active'
      })

      setUsers(response.items || [])
      setTotalPages(Math.ceil((response.totalItems || 0) / pageSize))
      setTotalItems(response.totalItems || 0)
      setCurrentPage(response.page || 1)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
      toast({
        title: 'Error',
        description: 'Failed to load users in your area',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(1)
  }, [statusFilter])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchUsers(1)
  }

  const handleToggleClick = (user: UserListItem) => {
    setUserToToggle(user)
    setIsToggleDialogOpen(true)
  }

  const handleConfirmToggle = async () => {
    if (!userToToggle) return

    try {
      setToggling(true)
      await ToggleUserStatus(userToToggle.userId)
      toast({
        title: 'Success',
        description: `User ${userToToggle.isActive ? 'deactivated' : 'activated'} successfully`
      })
      setIsToggleDialogOpen(false)
      setUserToToggle(null)
      fetchUsers(currentPage)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive'
      })
    } finally {
      setToggling(false)
    }
  }

  const handleViewDetails = async (userId: string) => {
    try {
      setLoadingDetail(true)
      const details = await GetUserDetails(userId)
      setSelectedUser(details)
      setIsDetailModalOpen(true)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load user details',
        variant: 'destructive'
      })
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <PageTransition delayMs={100} durationMs={600} variant="zoom">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-600 mt-2">Manage users in your branch</p>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">Loading users...</div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-red-500">{error}</div>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <Users className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Users Found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  {searchTerm || statusFilter
                    ? 'No users match your search criteria. Try adjusting your filters.'
                    : 'There are no users in your branch yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Users ({totalItems})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.userId} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{user.fullName}</span>
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{user.employeeId}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-gray-600">
                              <Briefcase className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                              {user.jobTitle || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {user.roleName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={user.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(user.userId)}
                                disabled={loadingDetail}
                              >
                                <Eye className="h-4 w-4 mr-1.5" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleClick(user)}
                                className={user.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                              >
                                {user.isActive ? (
                                  <><UserX className="h-4 w-4 mr-1.5" /> Deactivate</>
                                ) : (
                                  <><UserCheck className="h-4 w-4 mr-1.5" /> Activate</>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchUsers(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchUsers(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Toggle Status Confirmation Dialog */}
        <AlertDialog open={isToggleDialogOpen} onOpenChange={setIsToggleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{userToToggle?.isActive ? 'Deactivate User' : 'Activate User'}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {userToToggle?.isActive ? 'deactivate' : 'activate'} <strong>{userToToggle?.fullName}</strong>?
                {userToToggle?.isActive 
                  ? ' They will no longer be able to log in to the system.' 
                  : ' They will be able to log in and use the system again.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToToggle(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmToggle}
                disabled={toggling}
                className={userToToggle?.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {toggling ? 'Processing...' : (userToToggle?.isActive ? 'Deactivate' : 'Activate')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* User Details Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Profile Details</DialogTitle>
              <DialogDescription>
                Comprehensive information about the employee
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="mt-4 space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-gray-100">
                    <AvatarImage src={selectedUser.profile?.profilePictureUrl} />
                    <AvatarFallback className="text-xl bg-blue-50 text-blue-600">
                      {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.fullName}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedUser.roleName}
                      </Badge>
                      <span className="text-sm text-gray-500 font-mono">{selectedUser.employeeId}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Info className="h-4 w-4" /> Professional Info
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-700">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Job Title</p>
                          <p className="font-medium">{selectedUser.jobTitle || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-gray-700">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Current Branch</p>
                          <p className="font-medium">{selectedUser.currentBranch || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Contact & Location
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-700">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Email Address</p>
                          <p className="font-medium">{selectedUser.email}</p>
                          {selectedUser.emailVerified && (
                            <Badge variant="outline" className="mt-1 h-5 text-[10px] bg-green-50 text-green-700 border-green-200">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Phone Number</p>
                          <p className="font-medium">{selectedUser.phoneNumber || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedUser.profile && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                          <Globe className="h-4 w-4" /> Regional Info
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-gray-700">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Home Country</p>
                              <p className="font-medium">{selectedUser.profile.homeCountry || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-gray-700">
                            <Info className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Timezone</p>
                              <p className="font-medium">{selectedUser.profile.timezone || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" /> Account Info
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-gray-700">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Member Since</p>
                              <p className="font-medium">{new Date(selectedUser.profile.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedUser.profile.bio && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Biography</h3>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                          "{selectedUser.profile.bio}"
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}
