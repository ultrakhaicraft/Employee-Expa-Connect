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
import { Search, ChevronLeft, ChevronRight, Edit, Trash2, Tag, Plus, RefreshCw } from 'lucide-react'
import { GetCategories, CreateCategory, EditCategory, DeleteCategory } from '@/services/adminService'
import PageTransition from '@/components/Transition/PageTransition'
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
import { Textarea } from '@/components/ui/textarea'

interface Category {
  categoryId: number
  name: string
  description: string
}

export default function ViewCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const pageSize = 10
  const { toast } = useToast()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmCreateDialogOpen, setConfirmCreateDialogOpen] = useState(false)
  const [confirmEditDialogOpen, setConfirmEditDialogOpen] = useState(false)
  const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState<Category | null>(null)
  const [selectedCategoryForDelete, setSelectedCategoryForDelete] = useState<Category | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  })
  const [addForm, setAddForm] = useState({
    name: '',
    description: ''
  })

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      const response = await GetCategories()
      if (response && response.items) {
        setCategories(response.items)
        setTotalItems(response.totalItems || response.items.length)
        setTotalPages(Math.ceil((response.totalItems || response.items.length) / pageSize))
      } else {
        setError('Failed to load categories data')
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError(error.response?.data?.message || 'Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Disable body scroll when dialog is open
  useEffect(() => {
    if (editDialogOpen || addDialogOpen || deleteDialogOpen || confirmCreateDialogOpen || confirmEditDialogOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [editDialogOpen, addDialogOpen, deleteDialogOpen, confirmCreateDialogOpen, confirmEditDialogOpen])

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (category.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const openEditDialog = (category: Category) => {
    setSelectedCategoryForEdit(category)
    setEditForm({
      name: category.name,
      description: category.description || ''
    })
    setEditDialogOpen(true)
  }

  const handleConfirmEdit = async () => {
    if (!selectedCategoryForEdit) return
    if (!editForm.name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Category name is required.',
        variant: 'destructive' as any,
      })
      return
    }
    try {
      await EditCategory(
        selectedCategoryForEdit.categoryId,
        editForm.name.trim(),
        editForm.description.trim()
      )
      toast({
        title: 'Update successful',
        description: `${editForm.name} has been updated successfully.`,
      })
      setEditDialogOpen(false)
      setConfirmEditDialogOpen(false)
      setSelectedCategoryForEdit(null)
      await fetchCategories()
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.response?.data?.message || 'Unable to update category. Please try again.',
        variant: 'destructive' as any,
      })
    }
  }

  const openAddDialog = () => {
    setAddForm({
      name: '',
      description: ''
    })
    setAddDialogOpen(true)
  }

  const handleConfirmAdd = async () => {
    if (!addForm.name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Category name is required.',
        variant: 'destructive' as any,
      })
      return
    }
    try {
      await CreateCategory(
        addForm.name.trim(),
        addForm.description.trim()
      )
      toast({
        title: 'Category created successfully',
        description: `${addForm.name} has been created successfully.`,
      })
      setAddDialogOpen(false)
      setConfirmCreateDialogOpen(false)
      await fetchCategories()
    } catch (e: any) {
      toast({
        title: 'Creation failed',
        description: e?.response?.data?.message || 'Unable to create category. Please try again.',
        variant: 'destructive' as any,
      })
    }
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategoryForDelete(category)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedCategoryForDelete) return
    try {
      await DeleteCategory(selectedCategoryForDelete.categoryId)
      toast({
        title: 'Delete successful',
        description: `${selectedCategoryForDelete.name} has been deleted successfully.`,
      })
      setDeleteDialogOpen(false)
      setSelectedCategoryForDelete(null)
      await fetchCategories()
    } catch (e: any) {
      toast({
        title: 'Delete failed',
        description: e?.response?.data?.message || 'Unable to delete category. Please try again.',
        variant: 'destructive' as any,
      })
    }
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#1F2937]">Category Management</h1>
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
            <h1 className="text-3xl font-bold text-[#1F2937]">Category Management</h1>
          </div>
          <Card className="border border-[#E5E7EB] shadow-sm bg-white">
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchCategories} className="bg-[#D9822B] hover:bg-[#c17424] text-white">
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
      {/* Edit Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Category</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              Update the category information below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Category Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                placeholder="Enter category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5] min-h-[100px]"
                placeholder="Enter category description"
              />
            </div>
          </div>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setEditDialogOpen(false)
              setConfirmEditDialogOpen(true)
            }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Edit Dialog */}
      <AlertDialog open={confirmEditDialogOpen} onOpenChange={setConfirmEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Update</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              Are you sure you want to update "{editForm.name}"? This will modify the category information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel onClick={() => {
              setConfirmEditDialogOpen(false)
              setEditDialogOpen(true)
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>Confirm Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Dialog */}
      <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Category</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              Fill in the information below to create a new category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Category Name</label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                placeholder="Enter category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B1F3A] mb-2">Description</label>
              <Textarea
                value={addForm.description}
                onChange={(e) => setAddForm({...addForm, description: e.target.value})}
                className="border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5] min-h-[100px]"
                placeholder="Enter category description"
              />
            </div>
          </div>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setAddDialogOpen(false)
              setConfirmCreateDialogOpen(true)
            }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Create Dialog */}
      <AlertDialog open={confirmCreateDialogOpen} onOpenChange={setConfirmCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Create</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              Are you sure you want to create "{addForm.name}"? This will add a new category to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel onClick={() => {
              setConfirmCreateDialogOpen(false)
              setAddDialogOpen(true)
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAdd}>Confirm Create</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className='mb-4 text-base'>
              Are you sure you want to delete "{selectedCategoryForDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-5'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">Category Management</h1>
            <p className="text-[#7A869A] mt-2">Manage and view all place categories in the system</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#D0D7E4] text-[#1F2937] hover:bg-[#1F2937] hover:text-white"
              onClick={fetchCategories}
              disabled={isLoading}
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </Button>
            <Button onClick={openAddDialog} className="bg-[#D9822B] hover:bg-[#c17424] text-white">
              <Plus size={20} className="mr-2" />
              Add Category
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-[#D9822B]" />
              Category List ({totalItems})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A0A8B5]" size={20} />
                <Input
                  type="text"
                  placeholder="Search categories by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-[#D0D7E4] focus:ring-[#D9822B] text-[#1F2937] placeholder:text-[#A0A8B5]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-[#E5E7EB] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#EEF2F9]">
                    <TableHead className="font-semibold text-[#1F2937]">ID</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Name</TableHead>
                    <TableHead className="font-semibold text-[#1F2937]">Description</TableHead>
                    <TableHead className="font-semibold text-[#1F2937] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-[#9AA3B5]">
                        No categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCategories.map((category) => (
                      <TableRow key={category.categoryId} className="hover:bg-[#F9F9F9]">
                        <TableCell className="text-[#1F2937] font-medium">{category.categoryId}</TableCell>
                        <TableCell className="text-[#1F2937] font-medium">{category.name}</TableCell>
                        <TableCell className="text-[#7A869A]">{category.description || '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#D9822B]/70 bg-[#FFF2E3] text-[#D9822B] hover:bg-[#D9822B] hover:text-white"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit size={16} className="mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => openDeleteDialog(category)}
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
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredCategories.length)} of {filteredCategories.length} results
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
