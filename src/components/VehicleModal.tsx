import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import WorkOrderModal from './WorkOrderModal';

interface Profile {
  id: string;
  full_name: string;
  badge_number: string | null;
}

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: {
    id: string;
    unit_number: string;
    make: string;
    model: string;
    year: number;
    status: 'available' | 'assigned' | 'out_of_service';
    assigned_to: string | null;
    current_location: string | null;
    notes: string | null;
    is_take_home: boolean; // New property
  };
  onVehicleUpdate: () => void;
}

function VehicleModal({ isOpen, onClose, vehicle, onVehicleUpdate }: VehicleModalProps) {
  const [formData, setFormData] = useState({
    unit_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'available',
    assigned_to: '',
    current_location: '',
    notes: '',
    is_take_home: false, // New property
  });
  const [officers, setOfficers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        unit_number: vehicle.unit_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        status: vehicle.status,
        assigned_to: vehicle.assigned_to || '',
        current_location: vehicle.current_location || '',
        notes: vehicle.notes || '',
        is_take_home: vehicle.is_take_home, // New property
      });
    } else {
      setFormData({
        unit_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        status: 'available',
        assigned_to: '',
        current_location: '',
        notes: '',
        is_take_home: false, // New property
      });
    }
  }, [vehicle]);

  useEffect(() => {
    fetchOfficers();
  }, []);

  async function fetchOfficers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, badge_number')
        .order('full_name');

      if (error) throw error;
      setOfficers(data || []);
    } catch (err) {
      console.error('Error fetching officers:', err);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const vehicleData = {
        ...formData,
        assigned_to: formData.status === 'assigned' ? formData.assigned_to : null,
        current_location: formData.status === 'out_of_service' ? formData.current_location : null,
        notes: ['out_of_service', 'assigned'].includes(formData.status) ? formData.notes : null,
        is_take_home: formData.is_take_home, // Include the new property
      };

      if (vehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update({
            status: vehicleData.status,
            assigned_to: vehicleData.assigned_to,
            current_location: vehicleData.current_location,
            notes: vehicleData.notes,
            is_take_home: vehicleData.is_take_home, // Update the new property
          })
          .eq('id', vehicle.id);

        if (error) throw error;

        // Call the status update function if status has changed
        if (vehicle.status !== formData.status) {
          const { error: statusError } = await supabase.rpc('update_vehicle_status', {
            vehicle_id: vehicle.id,
            new_status: formData.status,
            notes: formData.notes
          });

          if (statusError) throw statusError;

          // Show work order modal if status changed to out_of_service
          if (formData.status === 'out_of_service') {
            setShowWorkOrderModal(true);
          }
        }
      } else {
        // Create new vehicle
        const { data: newVehicle, error } = await supabase
          .from('vehicles')
          .insert([vehicleData])
          .select()
          .single();

        if (error) throw error;

        // Create initial status history entry
        if (newVehicle) {
          const { error: statusError } = await supabase.rpc('update_vehicle_status', {
            vehicle_id: newVehicle.id,
            new_status: formData.status,
            notes: formData.notes
          });

          if (statusError) throw statusError;

          // Show work order modal if initial status is out_of_service
          if (formData.status === 'out_of_service') {
            setShowWorkOrderModal(true);
          }
        }
      }

      onVehicleUpdate();
      if (formData.status !== 'out_of_service') {
        onClose();
      }
    } catch (err) {
      setError('Failed to save vehicle. Please try again.');
      console.error('Error saving vehicle:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!vehicle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make
                </label>
                <input
                  type="text"
                  required
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!vehicle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!vehicle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!vehicle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    status: e.target.value as 'available' | 'assigned' | 'out_of_service',
                    assigned_to: e.target.value !== 'assigned' ? '' : formData.assigned_to,
                    current_location: e.target.value !== 'out_of_service' ? '' : formData.current_location,
                    notes: ['available'].includes(e.target.value) ? '' : formData.notes
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>

              {formData.status === 'assigned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    required={formData.status === 'assigned'}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Officer</option>
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.full_name} {officer.badge_number ? `(#${officer.badge_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {formData.status === 'out_of_service' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Location
                </label>
                <input
                  type="text"
                  required={formData.status === 'out_of_service'}
                  value={formData.current_location}
                  onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Maintenance Shop, Body Shop, etc."
                />
              </div>
            )}

            {['assigned', 'out_of_service'].includes(formData.status) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={formData.status === 'out_of_service' 
                    ? "Describe the issue or reason for being out of service"
                    : "Any additional notes about the assignment"}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Take Home Unit?
              </label>
              <input
                type="checkbox"
                checked={formData.is_take_home}
                onChange={(e) => setFormData({ ...formData, is_take_home: e.target.checked })}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                {loading ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showWorkOrderModal && vehicle && (
        <WorkOrderModal
          isOpen={showWorkOrderModal}
          onClose={() => {
            setShowWorkOrderModal(false);
            onClose();
          }}
          vehicleId={vehicle.id}
          unitNumber={vehicle.unit_number}
          currentLocation={formData.current_location}
        />
      )}
    </>
  );
}

export default VehicleModal;
