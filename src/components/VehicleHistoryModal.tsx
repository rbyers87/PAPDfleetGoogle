import React from 'react';
import { X, Clock, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

interface HistoryEntry {
  id: string;
  previous_status: 'available' | 'assigned' | 'out_of_service';
  new_status: 'available' | 'assigned' | 'out_of_service';
  changed_by: {
    full_name: string;
    badge_number: string | null;
  };
  notes: string | null;
  created_at: string;
}

interface VehicleHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  unitNumber: string;
}

function VehicleHistoryModal({ isOpen, onClose, vehicleId, unitNumber }: VehicleHistoryModalProps) {
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, vehicleId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_status_history')
        .select(`
          *,
          changed_by:profiles(full_name, badge_number)
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      setError('Failed to load vehicle history');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'assigned':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'out_of_service':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600';
      case 'assigned':
        return 'text-blue-600';
      case 'out_of_service':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Status History - Unit #{unitNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No history found</h3>
              <p className="mt-1 text-sm text-gray-500">
                This vehicle has no recorded status changes.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((entry) => (
                <div key={entry.id} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span className="text-sm text-gray-600">
                          by {entry.changed_by.full_name}
                          {entry.changed_by.badge_number && ` (#${entry.changed_by.badge_number})`}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center">
                          {getStatusIcon(entry.previous_status)}
                          <span className={`ml-1 capitalize ${getStatusColor(entry.previous_status)}`}>
                            {entry.previous_status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className="flex items-center">
                          {getStatusIcon(entry.new_status)}
                          <span className={`ml-1 capitalize ${getStatusColor(entry.new_status)}`}>
                            {entry.new_status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                      {entry.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleHistoryModal;
