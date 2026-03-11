import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { generateWorkOrderPDF } from '../utils/pdfGenerator';
import {
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Flag,
  Hash,
  User
} from 'lucide-react';

interface WorkOrder {
  id: string;
  vehicle_id: string;
  created_by: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  location: string;
  mileage: number | null;
  notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  vehicle: {
    unit_number: string;
    make: string;
    model: string;
    year: number;
  } | null;
  creator: {
    full_name: string;
    badge_number: string | null;
  } | null;
  resolver?: {
    full_name: string;
    badge_number: string | null;
  } | null;
  work_order_number: number | null;
}

type ViewMode = 'grid' | 'list';
type SortField = 'work_order_number' | 'unit_number' | 'status' | 'priority' | 'created_at' | 'resolved_at';
type SortDirection = 'asc' | 'desc';

function WorkOrders() {
  const { session, profile, isAdmin } = useAuthStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>='desc';

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(unit_number, make, model, year),
          creator:profiles!work_orders_created_by_fkey(full_name, badge_number),
          resolver:profiles!work_orders_resolved_by_fkey(full_name, badge_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (err) {
      setError('Failed to fetch work orders');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (newStatus: 'in_progress' | 'completed' | 'cancelled') => {
    if (!selectedWorkOrder) return;

    setUpdating(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Update work order
      const { error: woError } = await supabase
        .from('work_orders')
        .update({
          status: newStatus,
          resolved_at: ['completed', 'cancelled'].includes(newStatus) ? new Date().toISOString() : null,
          resolved_by: ['completed', 'cancelled'].includes(newStatus) ? userId : null,
          resolution_notes: updateNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedWorkOrder.id);

      if (woError) throw woError;

      // If status is completed, also update vehicle status to available
      if (newStatus === 'completed') {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update({
            status: 'available',
          })
          .eq('id', selectedWorkOrder.vehicle_id);

        if (vehicleError) throw vehicleError;
      }

      await fetchWorkOrders();
      // Reset modal state
      setIsUpdateModalOpen(false);
      setSelectedWorkOrder(null);
      setUpdateNotes('');
    } catch (err) {
      console.error('Error updating work order:', err);
      setError('Failed to update work order');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteWorkOrder = async (workOrder: WorkOrder) => {
    setLoading(true);
    setError(null);

    try {
      // Update work order status to completed
      const { error: woError } = await supabase
        .from('work_orders')
        .update({
          status: 'completed',
          resolved_at: new Date().toISOString(),
          resolved_by: session?.user?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', workOrder.id);

      if (woError) throw woError;

      // Update vehicle status to available
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          status: 'available',
        })
        .eq('id', workOrder.vehicle_id);

      if (vehicleError) throw vehicleError;

      // Refresh work orders
      await fetchWorkOrders();
    } catch (err) {
      setError('Failed to complete work order');
      console.error('Error completing work order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort work orders
  const sortWorkOrders = (ordersToSort: WorkOrder[]): WorkOrder[] => {
    return [...ordersToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'work_order_number':
          comparison = (a.work_order_number || 0) - (b.work_order_number || 0);
          break;
        case 'unit_number':
          const unitA = a.vehicle?.unit_number || '';
          const unitB = b.vehicle?.unit_number || '';
          comparison = unitA.localeCompare(unitB);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          const priorityOrder = { 'urgent': 0, 'high': 1, 'normal': 2, 'low': 3 };
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'resolved_at':
          const timeA = a.resolved_at ? new Date(a.resolved_at).getTime() : 0;
          const timeB = b.resolved_at ? new Date(b.resolved_at).getTime() : 0;
          comparison = timeA - timeB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleCloseModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedWorkOrder(null);
    setUpdateNotes('');
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <AlertTriangle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredWorkOrders = workOrders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
    
    const unitNumber = order.vehicle?.unit_number?.toLowerCase() || '';
    const description = order.description?.toLowerCase() || '';
    const location = order.location?.toLowerCase() || '';
    const creatorName = order.creator?.full_name?.toLowerCase() || '';
    const workOrderNum = order.work_order_number?.toString() || '';
    const searchTerm = searchQuery.toLowerCase();
    
    const matchesSearch = searchQuery === '' || 
      unitNumber.includes(searchTerm) ||
      description.includes(searchTerm) ||
      location.includes(searchTerm) ||
      creatorName.includes(searchTerm) ||
      workOrderNum.includes(searchTerm);

    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Apply sorting to filtered work orders
  const sortedWorkOrders = sortWorkOrders(filteredWorkOrders);

  const handleDownloadPDF = async (workOrder: WorkOrder) => {
    try {
      const { data: completeWorkOrder, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(unit_number, make, model, year),
          creator:profiles!work_orders_created_by_fkey(full_name, badge_number),
          resolver:profiles!work_orders_resolved_by_fkey(full_name, badge_number)
        `)
        .eq('id', workOrder.id)
        .single();

      if (error) throw error;

      if (completeWorkOrder) {
        await generateWorkOrderPDF(completeWorkOrder);
      }
    } catch (error) {
      console.error('Error fetching complete work order:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Get sort icon for column headers
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  // Render work order card for grid view
  const renderWorkOrderCard = (order: WorkOrder) => (
    <div
      key={order.id}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">
                Unit #{order.vehicle?.unit_number || 'Unknown'} - WO#{order.work_order_number || 'N/A'}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(order.priority)}`}>
                {order.priority.toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-1 capitalize">{order.status.replace(/_/g, ' ')}</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {order.vehicle?.year || 'N/A'} {order.vehicle?.make || 'Unknown'} {order.vehicle?.model || 'Model'}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-gray-700">{order.description}</p>
          <p className="text-sm text-gray-600 mt-2">
            <strong>Location:</strong> {order.location}
          </p>
        </div>

        <div className="text-sm text-gray-600">
          <p>
            <User className="w-4 h-4 inline-block mr-1" />
            Created by {order.creator?.full_name || 'Unknown User'}
            {order.creator?.badge_number && ` (Badge #${order.creator.badge_number})`}
          </p>
          <p className="mt-1">
            <Calendar className="w-4 h-4 inline-block mr-1" />
            Created: {new Date(order.created_at).toLocaleDateString()}
          </p>
          {order.resolved_at && order.resolver && (
            <p className="mt-1">
              <CheckCircle2 className="w-4 h-4 inline-block mr-1" />
              Resolved by {order.resolver.full_name || 'Unknown User'}
              {' on '}
              {new Date(order.resolved_at).toLocaleDateString()}
            </p>
          )}
          {order.resolution_notes && (
            <p className="mt-2 p-2 bg-gray-100 rounded">
              <strong>Resolution Notes:</strong> {order.resolution_notes}
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => handleDownloadPDF(order)}
            className="flex items-center px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500"
          >
            <Download className="w-4 h-4 mr-1" />
            PDF
          </button>
          {isAdmin && ['pending', 'in_progress'].includes(order.status) && (
            <button
              onClick={() => {
                setSelectedWorkOrder(order);
                setIsUpdateModalOpen(true);
              }}
              className="flex items-center px-3 py-1 text-sm bg-blue-800 text-white rounded hover:bg-blue-700"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Update
            </button>
          )}
          {isAdmin && order.status !== 'completed' && order.status !== 'cancelled' && (
            <button
              onClick={() => handleCompleteWorkOrder(order)}
              className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-500"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Render work order row for list view
  const renderWorkOrderRow = (order: WorkOrder) => (
    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          WO#{order.work_order_number || 'N/A'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          Unit #{order.vehicle?.unit_number || 'Unknown'}
        </div>
        <div className="text-xs text-gray-500">
          {order.vehicle?.year || 'N/A'} {order.vehicle?.make || 'Unknown'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(order.priority)}`}>
            {order.priority.toUpperCase()}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
          {getStatusIcon(order.status)}
          <span className="ml-1 capitalize">{order.status.replace(/_/g, ' ')}</span>
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {order.description}
        </div>
        <div className="text-xs text-gray-500">
          Location: {order.location}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {order.creator?.full_name || 'Unknown'}
        </div>
        <div className="text-xs text-gray-500">
          {new Date(order.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {order.resolved_at ? (
          <div className="text-sm text-gray-900">
            {order.resolver?.full_name || 'Unknown'}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleDownloadPDF(order)}
            className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-100"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          {isAdmin && ['pending', 'in_progress'].includes(order.status) && (
            <button
              onClick={() => {
                setSelectedWorkOrder(order);
                setIsUpdateModalOpen(true);
              }}
              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100"
              title="Update Status"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          )}
          {isAdmin && order.status !== 'completed' && order.status !== 'cancelled' && (
            <button
              onClick={() => handleCompleteWorkOrder(order)}
              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-100"
              title="Complete Work Order"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="ml-3 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Conditional rendering based on view mode */}
        {viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedWorkOrders.map(renderWorkOrderCard)}
          </div>
        ) : (
          // List View with sorting
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('work_order_number')}
                    >
                      <div className="flex items-center">
                        <Hash className="w-4 h-4 mr-1" />
                        WO #
                        {getSortIcon('work_order_number')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('unit_number')}
                    >
                      <div className="flex items-center">
                        Vehicle
                        {getSortIcon('unit_number')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center">
                        <Flag className="w-4 h-4 mr-1" />
                        Priority
                        {getSortIcon('priority')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Created
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('resolved_at')}
                    >
                      <div className="flex items-center">
                        Resolved
                        {getSortIcon('resolved_at')}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedWorkOrders.map(renderWorkOrderRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredWorkOrders.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No work orders have been created yet'}
            </p>
          </div>
        )}
      </div>

      {isUpdateModalOpen && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Update Work Order Status - Unit #{selectedWorkOrder.vehicle?.unit_number || 'Unknown'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes (Optional)
                </label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about the status change..."
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-4 border-t">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg"
                  disabled={updating}
                >
                  Close
                </button>
                <button
                  onClick={() => handleUpdateStatus('in_progress')}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Mark In Progress'}
                </button>
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Mark Completed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WorkOrders;
