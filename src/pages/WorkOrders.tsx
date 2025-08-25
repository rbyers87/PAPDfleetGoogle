import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import {
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Plus
} from 'lucide-react';

interface WorkOrder {
  id: string;
  vehicle_id: string;
  created_by: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  location: string;
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
  const [isNewWorkOrderModalOpen, setIsNewWorkOrderModalOpen] = useState(false);

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
      const { error } = await supabase
        .from('work_orders')
        .update({
          status: newStatus,
          resolved_at: newStatus === 'completed' ? new Date().toISOString() : null,
          resolved_by: newStatus === 'completed' ? (await supabase.auth.getUser()).data.user?.id : null,
          resolution_notes: updateNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedWorkOrder.id);

      if (error) throw error;

      await fetchWorkOrders();
      setIsUpdateModalOpen(false);
      setSelectedWorkOrder(null);
      setUpdateNotes('');
    } catch (err) {
      console.error('Error updating work order:', err);
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
    
    // Safe search with null checks
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
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

        <div className="space-y-4">
          {filteredWorkOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
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
                  <div className="flex gap-2">
                    {isAdmin && order.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedWorkOrder(order);
                          setIsUpdateModalOpen(true);
                        }}
                        className="px-3 py-1 text-sm bg-blue-800 text-white rounded hover:bg-blue-700"
                      >
                        Update Status
                      </button>
                    )}
                    {isAdmin && order.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteWorkOrder(order)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-500"
                      >
                        Complete Work Order
                      </button>
                    )}
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
                    Created by {order.creator?.full_name || 'Unknown User'}
                    {order.creator?.badge_number && ` (Badge #${order.creator.badge_number})`}
                    {' on '}
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  {order.resolved_at && order.resolver && (
                    <p className="mt-1">
                      Resolved by {order.resolver.full_name || 'Unknown User'}
                      {order.resolver.badge_number && ` (Badge #${order.resolver.badge_number})`}
                      {' on '}
                      {new Date(order.resolved_at).toLocaleDateString()}
                    </p>
                  )}
                  {order.resolution_notes && (
                    <p className="mt-2">
                      <strong>Resolution Notes:</strong> {order.resolution_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

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
                  Resolution Notes
                </label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about the resolution..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedWorkOrder(null);
                    setUpdateNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus('in_progress')}
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
                  disabled={updating}
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus('completed')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
                  disabled={updating}
                >
                  Mark Completed
                </button>
                <button
                  onClick={() => handleUpdateStatus('cancelled')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
                  disabled={updating}
                >
                  Cancel Order
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
