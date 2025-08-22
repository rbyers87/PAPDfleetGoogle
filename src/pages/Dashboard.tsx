import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Car,
  Wrench,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  outOfServiceVehicles: number;
  totalWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
  urgentWorkOrders: number;
  recentWorkOrders: {
    id: string;
    vehicle: {
      unit_number: string;
    };
    status: string;
    priority: string;
    description: string;
    created_at: string;
  }[];
  statusBreakdown: {
    status: string;
    count: number;
  }[];
  priorityBreakdown: {
    priority: string;
    count: number;
  }[];
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      // Fetch vehicle statistics
      const { data: vehicleStats, error: vehicleError } = await supabase
        .from('vehicles')
        .select('status')
        .order('created_at', { ascending: false });

      if (vehicleError) throw vehicleError;

      // Fetch work order statistics
      const { data: workOrders, error: workOrderError } = await supabase
        .from('work_orders')
        .select(`
          id,
          status,
          priority,
          description,
          created_at,
          vehicle:vehicles(unit_number)
        `)
        .order('created_at', { ascending: false });

      if (workOrderError) throw workOrderError;

      // Calculate statistics
      const totalVehicles = vehicleStats?.length || 0;
      const availableVehicles = vehicleStats?.filter(v => v.status === 'available').length || 0;
      const outOfServiceVehicles = vehicleStats?.filter(v => v.status === 'out_of_service').length || 0;

      const statusBreakdown = workOrders?.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const priorityBreakdown = workOrders?.reduce((acc: any, order) => {
        acc[order.priority] = (acc[order.priority] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalVehicles,
        availableVehicles,
        outOfServiceVehicles,
        totalWorkOrders: workOrders?.length || 0,
        pendingWorkOrders: workOrders?.filter(wo => wo.status === 'pending').length || 0,
        completedWorkOrders: workOrders?.filter(wo => wo.status === 'completed').length || 0,
        urgentWorkOrders: workOrders?.filter(wo => wo.priority === 'urgent').length || 0,
        recentWorkOrders: workOrders?.slice(0, 5) || [],
        statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
          status,
          count: count as number
        })),
        priorityBreakdown: Object.entries(priorityBreakdown).map(([priority, count]) => ({
          priority,
          count: count as number
        }))
      });
    } catch (err) {
      setError('Failed to fetch dashboard statistics');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'in_progress':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'cancelled':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
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
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalVehicles}</p>
            </div>
            <Car className="w-8 h-8 text-blue-800" />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-green-600 flex items-center">
              <ArrowUp className="w-4 h-4 mr-1" />
              {stats.availableVehicles} Available
            </span>
            <span className="text-red-600 flex items-center">
              <ArrowDown className="w-4 h-4 mr-1" />
              {stats.outOfServiceVehicles} Out of Service
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Work Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalWorkOrders}</p>
            </div>
            <Wrench className="w-8 h-8 text-blue-800" />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-yellow-600 flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {stats.pendingWorkOrders} Pending
            </span>
            <span className="text-green-600 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {stats.completedWorkOrders} Completed
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status Breakdown</p>
              <div className="space-y-2 mt-4">
                {stats.statusBreakdown.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="flex items-center text-sm capitalize">
                      {getStatusIcon(status)}
                      <span className={`ml-2 ${getStatusColor(status)}`}>
                        {status.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-800" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Priority Breakdown</p>
              <div className="space-y-2 mt-4">
                {stats.priorityBreakdown.map(({ priority, count }) => (
                  <div key={priority} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{priority}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <AlertTriangle className="w-8 h-8 text-blue-800" />
          </div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Work Orders</h2>
        </div>
        <div className="divide-y">
          {stats.recentWorkOrders.map((order) => (
            <div key={order.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Unit #{order.vehicle.unit_number}</span>
                    <span className={`flex items-center text-sm ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1 capitalize">{order.status.replace(/_/g, ' ')}</span>
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{order.description}</p>
                </div>
                <span className={`
                  px-2 py-1 text-xs font-medium rounded-full capitalize
                  ${order.priority === 'urgent' ? 'bg-red-100 text-red-800' : 
                    order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    order.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'}
                `}>
                  {order.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
