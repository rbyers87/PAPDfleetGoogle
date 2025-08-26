import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { 
  Car, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck,
  Search,
  Filter,
  Plus,
  Settings,
  History
} from 'lucide-react';
import VehicleModal from '../components/VehicleModal';
import VehicleHistoryModal from '../components/VehicleHistoryModal';

interface Vehicle {
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
  profile?: {
    full_name: string;
    badge_number: string;
  };
}

function Vehicles() {
  const { isAdmin } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>(undefined);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryVehicle, setSelectedHistoryVehicle] = useState<{ id: string; unitNumber: string } | null>(null);
  const [showTakeHome, setShowTakeHome] = useState(false); // New state for Take Home filter

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          profile:profiles(full_name, badge_number)
        `)
        .order('unit_number');

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      setError('Failed to fetch vehicles');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddVehicle = () => {
    setSelectedVehicle(undefined);
    setIsModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleViewHistory = (vehicle: Vehicle) => {
    setSelectedHistoryVehicle({
      id: vehicle.id,
      unitNumber: vehicle.unit_number
    });
    setIsHistoryModalOpen(true);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    let matchesTakeHome = true;
    if (statusFilter === 'available') {
      if (showTakeHome === false) {
        matchesTakeHome = !vehicle.is_take_home;
      }
    }

    const matchesSearch = 
      searchQuery === '' ||
      vehicle.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.current_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.profile?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch && matchesTakeHome;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'out_of_service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'assigned':
        return <UserCheck className="w-4 h-4" />;
      case 'out_of_service':
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Fleet Vehicles</h1>
          {isAdmin && (
            <button 
              onClick={handleAddVehicle}
              className="flex items-center px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vehicles..."
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
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="out_of_service">Out of Service</option>
            </select>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={showTakeHome}
                onChange={(e) => setShowTakeHome(e.target.checked)}
              />
              <span className="ml-2 text-gray-700">Take Home</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Unit #{vehicle.unit_number}
                    </h3>
                    <p className="text-gray-600">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(vehicle.status)}`}>
                    {getStatusIcon(vehicle.status)}
                    <span className="ml-2 capitalize">{vehicle.status.replace(/_/g, ' ')}</span>
                  </span>
                </div>

                {vehicle.status === 'assigned' && vehicle.profile && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Assigned to:</strong> {vehicle.profile.full_name}
                      {vehicle.profile.badge_number && ` (Badge #${vehicle.profile.badge_number})`}
                    </p>
                  </div>
                )}

                {vehicle.status === 'out_of_service' && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Location:</strong> {vehicle.current_location}
                    </p>
                    {vehicle.notes && (
                      <p className="text-sm text-red-800 mt-1">
                        <strong>Notes:</strong> {vehicle.notes}
                      </p>
                    )}
                  </div>
                )}

                {vehicle.is_take_home && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Take Home Unit</strong>
                    </p>
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-4">
                  <button 
                    onClick={() => handleViewHistory(vehicle)}
                    className="flex items-center text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    <History className="w-4 h-4 mr-1" />
                    History
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleEditVehicle(vehicle)}
                      className="flex items-center text-blue-800 hover:text-blue-600 text-sm font-medium"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Manage
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredVehicles.length === 0 && (
          <div className="text-center py-12">
            <Car className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No vehicles have been added to the fleet yet'}
            </p>
          </div>
        )}
      </div>

      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vehicle={selectedVehicle}
        onVehicleUpdate={fetchVehicles}
      />

      {selectedHistoryVehicle && (
        <VehicleHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedHistoryVehicle(null);
          }}
          vehicleId={selectedHistoryVehicle.id}
          unitNumber={selectedHistoryVehicle.unitNumber}
        />
      )}
    </>
  );
}

export default Vehicles;
