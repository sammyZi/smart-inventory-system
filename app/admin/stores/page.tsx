"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Search, Edit, Trash2, StoreIcon } from 'lucide-react'
import { sampleStores, type Store } from "@/lib/sample-data"
import { useToast } from "@/hooks/use-toast"

export default function AdminStoresPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [stores, setStores] = useState<Store[]>(sampleStores)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newStore, setNewStore] = useState({
    name: "",
    address: "",
    phone: "",
    email: ""
  })
  const [editingStore, setEditingStore] = useState<Store | null>(null)

  if (!user || user.role !== "admin") {
    return <div>Access denied</div>
  }

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateStore = () => {
    if (!newStore.name || !newStore.address || !newStore.phone || !newStore.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required store details.",
        variant: "destructive"
      })
      return
    }

    const store: Store = {
      id: `store${stores.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...newStore
    }
    
    setStores([...stores, store])
    setNewStore({ name: "", address: "", phone: "", email: "" })
    setIsCreateDialogOpen(false)
    
    toast({
      title: "Store created",
      description: "New store has been created successfully.",
    })
  }

  const handleEditStore = (store: Store) => {
    setEditingStore(store)
    setIsEditDialogOpen(true)
  }

  const handleSaveStore = () => {
    if (editingStore) {
      setStores(stores.map(s => s.id === editingStore.id ? { ...editingStore, updatedAt: new Date() } : s))
      setIsEditDialogOpen(false)
      setEditingStore(null)
      toast({
        title: "Store Updated",
        description: `${editingStore.name} has been updated successfully.`,
      })
    }
  }

  const handleDeleteStore = (storeId: string) => {
    setStores(stores.filter(s => s.id !== storeId))
    toast({
      title: "Store deleted",
      description: "Store has been deleted successfully.",
    })
  }

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="Store Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Stores</h2>
            <p className="text-gray-600 mt-1">Manage your physical store locations</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-gray-200/50">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Create New Store</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Add a new store location to your system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                <div className="space-y-2">
                  <Label htmlFor="store-name" className="text-gray-700">Store Name</Label>
                  <Input 
                    id="store-name" 
                    placeholder="e.g., Main Street Branch" 
                    value={newStore.name}
                    onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-email" className="text-gray-700">Email</Label>
                  <Input 
                    id="store-email" 
                    type="email"
                    placeholder="store@example.com" 
                    value={newStore.email}
                    onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="store-address" className="text-gray-700">Address</Label>
                  <Input 
                    id="store-address" 
                    placeholder="123 Business St, City, State, Zip" 
                    value={newStore.address}
                    onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-phone" className="text-gray-700">Phone Number</Label>
                  <Input 
                    id="store-phone" 
                    placeholder="+1 (123) 456-7890" 
                    value={newStore.phone}
                    onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateStore} className="gradient-bg">Create Store</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Search Stores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, address, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stores Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All Stores</CardTitle>
            <CardDescription>
              {filteredStores.length} store{filteredStores.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.address}</TableCell>
                      <TableCell>
                        <p>{store.phone}</p>
                        <p className="text-sm text-muted-foreground">{store.email}</p>
                      </TableCell>
                      <TableCell>{store.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditStore(store)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteStore(store.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Edit Store Dialog */}
        {editingStore && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border border-gray-200/50">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Edit Store: {editingStore.name}</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Update store details.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                <div className="space-y-2">
                  <Label htmlFor="edit-store-name" className="text-gray-700">Store Name</Label>
                  <Input 
                    id="edit-store-name" 
                    value={editingStore.name}
                    onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-store-email" className="text-gray-700">Email</Label>
                  <Input 
                    id="edit-store-email" 
                    type="email"
                    value={editingStore.email}
                    onChange={(e) => setEditingStore({ ...editingStore, email: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="edit-store-address" className="text-gray-700">Address</Label>
                  <Input 
                    id="edit-store-address" 
                    value={editingStore.address}
                    onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-store-phone" className="text-gray-700">Phone Number</Label>
                  <Input 
                    id="edit-store-phone" 
                    value={editingStore.phone}
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                    className="bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveStore} className="gradient-bg">Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}
