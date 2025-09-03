import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  unitNumber: string;
  currentLocation: string;
}

function WorkOrderModal({ isOpen, onClose, vehicleId, unitNumber, currentLocation }: WorkOrderModalProps) {
  const { session, user } = useAuthStore();
  const [formData, setFormData] = useState({
    description: '',
    priority: 'normal',
    location: currentLocation,
    mileage: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current session from Supabase directly
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Debug logging
      console.log('Session from store:', session);
      console.log('Session from Supabase:', currentSession);
      console.log('User from store:', user);

      // Check authentication using either source
      const activeSession = currentSession || session;
      if (!activeSession?.user?.id) {
        setError('User not authenticated.');
        return;
      }

      // Fetch the last work order number and increment it
      const { data: lastWorkOrder, error: lastWorkOrderError } = await supabase
        .from('work_orders')
        .select('work_order_number')
        .order('work_order_number', { ascending: false })
        .limit(1);

      if (lastWorkOrderError) throw lastWorkOrderError;

      const lastWorkOrderNumber = lastWorkOrder && lastWorkOrder.length > 0 ? lastWorkOrder[0].work_order_number : 0;
      const newWorkOrderNumber = lastWorkOrderNumber + 1;

      // Use active session for created_by field
      const createdBy = user?.name || activeSession.user.email || 'Unknown User';

      const { error } = await supabase
        .from('work_orders')
        .insert([{
          vehicle_id: vehicleId,
          unit_number: unitNumber,
          description: formData.description,
          priority: formData.priority,
          location: formData.location,
          created_by: createdBy,
          mileage: parseInt(formData.mileage) || 0, // Ensure this is a number
          work_order_number: newWorkOrderNumber,
          notes: formData.notes,
        }]);

      if (error) throw error;
      onClose();
    } catch (err) {
      setError('Failed to create work order. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Work Order - Unit #{unitNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description of Issue
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the issue that needs attention..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information or comments..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Where is the vehicle located?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Mileage
            </label>
            <input
              type="number"
              required
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the current mileage"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`
                px-4 py-2 bg-blue-800 text-white rounded-lg
                ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}
              `}
            >
              {loading ? 'Creating...' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkOrderModal;
