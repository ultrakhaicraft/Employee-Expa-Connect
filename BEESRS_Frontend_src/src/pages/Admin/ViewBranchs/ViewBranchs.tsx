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
import { Search, ChevronLeft, ChevronRight, Edit, Trash2, Building2, Plus, RefreshCw } from 'lucide-react'
import { GetAllBranch, UpdateBranch, CreateBranch, GetCountriesForBranch, GetCitiesForBranch } from '@/services/adminService'
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

interface Branch {
  branchId: string
  isActive: boolean
  name: string
  address: string
  cityId: string
  countryId: string
  phoneNumber: string
  email: string
  establishedDate: string
}

interface CountryOption {
  countryId: string
  name: string
}

interface CityOption {
  cityId: string
  name: string
  countryId: string
}

export default function ViewBranchs() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 10
  const { toast } = useToast()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState<Branch | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    cityId: '',
    countryId: '',
    phoneNumber: '',
    email: '',
    establishedDate: ''
  })
  const [addForm, setAddForm] = useState({
    name: '',
    address: '',
    cityId: '',
    countryId: '',
    phoneNumber: '',
    email: '',
    establishedDate: ''
  })
  const [countries, setCountries] = useState<CountryOption[]>([])
  const [addCities, setAddCities] = useState<CityOption[]>([])
  const [editCities, setEditCities] = useState<CityOption[]>([])

  const fetchBranches = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await GetAllBranch(currentPage, pageSize)
      if (response && response.items) {
        setBranches(response.items)
        setTotalItems(response.totalItems)
        setTotalPages(Math.ceil(response.totalItems / pageSize))
      } else {
        setError('Failed to load branches data')
      }
    } catch (error: any) {
      console.error('Error fetching branches:', error)
      setError(error.response?.data?.message || 'Failed to load branches')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [currentPage])

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const resp = await GetCountriesForBranch()
        setCountries(resp || [])
      } catch (error) {
        console.error('Failed to load countries', error)
        setCountries([])
      }
    }
    loadCountries()
  }, [])

  const loadCities = async (countryId: string, target: 'add' | 'edit') => {
    if (!countryId) {
      target === 'add' ? setAddCities([]) : setEditCities([])
      return
    }
    try {
      const resp = await GetCitiesForBranch(countryId)
      if (target === 'add') {
        setAddCities(resp || [])
      } else {
        setEditCities(resp || [])
      }
    } catch (error) {
      console.error('Failed to load cities', error)
      target === 'add' ? setAddCities([]) : setEditCities([])
    }
  }

  // Disable body scroll when dialog is open
  useEffect(() => {
    if (editDialogOpen || addDialogOpen) {
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
  }, [editDialogOpen, addDialogOpen])

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && branch.isActive) ||
                         (statusFilter === 'inactive' && !branch.isActive)
    
    return matchesSearch && matchesStatus
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const openEditDialog = (branch: Branch) => {
    setSelectedBranchForEdit(branch)
    setEditForm({
      name: branch.name,
      address: branch.address,
      cityId: branch.cityId,
      countryId: branch.countryId,
      phoneNumber: branch.phoneNumber,
      email: branch.email,
      establishedDate: branch.establishedDate
    })
    loadCities(branch.countryId, 'edit')
    setEditDialogOpen(true)
  }

  const handleConfirmEdit = async () => {
    if (!selectedBranchForEdit) return
    if (!editForm.countryId || !editForm.cityId) {
      toast({
        title: 'Missing location',
        description: 'Please select both country and city.',
        variant: 'destructive' as any,
      })
      return
    }
    try {
      await UpdateBranch(
        selectedBranchForEdit.branchId,
        editForm.name,
        editForm.address,
        editForm.cityId,
        editForm.countryId,
        editForm.phoneNumber,
        editForm.email,
        editForm.establishedDate
      )
      toast({
        title: 'Update successful',
        description: `${editForm.name} has been updated successfully.`,
      })
      setEditDialogOpen(false)
      setSelectedBranchForEdit(null)
      await fetchBranches()
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.response?.data?.message || 'Unable to update branch. Please try again.',
        variant: 'destructive' as any,
      })
    }
  }

  const openAddDialog = () => {
    setAddForm({
      name: '',
      address: '',
      cityId: '',
      countryId: '',
      phoneNumber: '',
      email: '',
      establishedDate: ''
    })
    setAddCities([])
    setAddDialogOpen(true)
  }

  const handleConfirmAdd = async () => {
    if (!addForm.countryId || !addForm.cityId) {
      toast({
        title: 'Missing location',
        description: 'Please select both country and city.',
        variant: 'destructive' as any,
      })
      return
    }
    try {
      await CreateBranch(
        addForm.name,
        addForm.address,
        addForm.cityId,
        addForm.countryId,
        addForm.phoneNumber,
        addForm.email,
        addForm.establishedDate
      )
      toast({
        title: 'Branch created successfully',
        description: `${addForm.name} has been created successfully.`,
      })
      setAddDialogOpen(false)
      await fetchBranches()
    } catch (e: any) {
      toast({
        title: 'Creation failed',
        description: e?.response?.data?.message || 'Unable to create branch. Please try again.',
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
            <h1 className="text-3xl font-bold text-[#1F2937]">Branch Management</h1>
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
            <h1 className="text-3xl font-bold text-[#1F2937]">Branch Management</h1>
          </div>
          <Card className="border border-[#E5E7EB] shadow-sm bg-white">
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchBranches} className="bg-[#D9822B] hover:bg-[#c17424] text-white">
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
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Branch</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              Update the branch information below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Branch Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                placeholder="Enter branch name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Address</label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                placeholder="Enter branch address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Phone Number</label>
                <Input
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                  className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Email</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Established Date</label>
              <Input
                type="date"
                value={editForm.establishedDate}
                onChange={(e) => setEditForm({...editForm, establishedDate: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">City ID</label>
                <select
                  value={editForm.cityId}
                  onChange={(e) => setEditForm({ ...editForm, cityId: e.target.value })}
                  className="w-full px-4 py-2 border border-[#D0D7E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white text-[#1F2937]"
                  disabled={!editForm.countryId}
                >
                  <option value="">Select city</option>
                  {editCities.map((city) => (
                    <option key={city.cityId} value={city.cityId}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Country ID</label>
                <select
                  value={editForm.countryId}
                  onChange={(e) => {
                    const value = e.target.value
                    setEditForm({ ...editForm, countryId: value, cityId: '' })
                    loadCities(value, 'edit')
                  }}
                  className="w-full px-4 py-2 border border-[#D0D7E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white text-[#1F2937]"
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.countryId} value={country.countryId}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Branch</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              Fill in the information below to create a new branch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Branch Name</label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                placeholder="Enter branch name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Address</label>
              <Input
                value={addForm.address}
                onChange={(e) => setAddForm({...addForm, address: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                placeholder="Enter branch address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Phone Number</label>
                <Input
                  value={addForm.phoneNumber}
                  onChange={(e) => setAddForm({...addForm, phoneNumber: e.target.value})}
                  className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Email</label>
                <Input
                  value={addForm.email}
                  onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                  className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Established Date</label>
              <Input
                type="date"
                value={addForm.establishedDate}
                onChange={(e) => setAddForm({...addForm, establishedDate: e.target.value})}
                className="border-[#D9D9D9] focus:ring-[#D9822B]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">City ID</label>
                <select
                  value={addForm.cityId}
                  onChange={(e) => setAddForm({ ...addForm, cityId: e.target.value })}
                  className="w-full px-4 py-2 border border-[#D9D9D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white text-[#1F2937]"
                  disabled={!addForm.countryId}
                >
                  <option value="">Select city</option>
                  {addCities.map((city) => (
                    <option key={city.cityId} value={city.cityId}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Country ID</label>
                <select
                  value={addForm.countryId}
                  onChange={(e) => {
                    const value = e.target.value
                    setAddForm({ ...addForm, countryId: value, cityId: '' })
                    loadCities(value, 'add')
                  }}
                  className="w-full px-4 py-2 border border-[#D9D9D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9822B] bg-white text-[#1F2937]"
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.countryId} value={country.countryId}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdd}>Create Branch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">Branch Management</h1>
            <p className="text-[#7A869A] mt-2">Manage and view all branches in the system</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#D0D7E4] text-[#1F2937] hover:bg-[#1F2937] hover:text-white"
              onClick={fetchBranches}
              disabled={isLoading}
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openAddDialog} className="bg-[#D9822B] hover:bg-[#c17424] text-white">
              <Plus size={20} className="mr-2" />
              Add Branch
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#D9822B]" />
              Branch List ({totalItems})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A0A8B5]" size={20} />
                <Input
                  type="text"
                  placeholder="Search branches by name, address, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                />
              </div>
              <div className="flex gap-2">
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
                    <TableHead className="font-semibold text-[#1F2937]">Branch</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Address</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Contact</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Status</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Established Date</TableHead>
                    <TableHead className="font-semibold text-[#1F2937] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[#9AA3B5]">
                        No branches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBranches.map((branch) => (
                      <TableRow key={branch.branchId} className="hover:bg-[#F9F9F9]">
                        <TableCell>
                          <div>
                            <div className="font-medium text-[#1F2937]">{branch.name}</div>
                            <div className="text-sm text-[#7A869A]">{branch.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#1F2937]">{branch.address}</TableCell>
                        <TableCell>
                          <div>
                            <div className="text-[#1F2937]">{branch.phoneNumber}</div>
                            <div className="text-sm text-[#7A869A]">{branch.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={branch.isActive ? "default" : "secondary"}
                            className={branch.isActive 
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent" 
                              : "bg-rose-100 text-rose-600 hover:bg-rose-100 border-transparent"
                            }
                          >
                            {branch.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#1F2937]">{formatDate(branch.establishedDate)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-[#D9822B]/70 bg-[#FFF2E3] text-[#D9822B] hover:bg-[#D9822B] hover:text-white"
                                >
                                  <Edit size={16} className="mr-1" />
                                  Edit
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="top" align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                                  Edit Branch Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 size={16} className="mr-1" />
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-[#7A869A]">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredBranches.length)} of {filteredBranches.length} results
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