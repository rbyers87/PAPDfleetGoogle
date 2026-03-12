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
  History,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown
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
  is_take_home: boolean;
  profile?: {
    full_name: string;
    badge_number: string;
  };
}

type ViewMode = 'grid' | 'list';
type SortField = 'unit_number' | 'status' | 'assignment' | 'take_home';
type SortDirection = 'asc' | 'desc';
type GroupField = 'status' | 'take_home' | null;

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
  const [showTakeHome, setShowTakeHome] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Sorting and grouping state
  const [sortField, setSortField] = useState<SortField>('unit_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [groupField, setGroupField] = useState<GroupField>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    // Clear grouping when sorting by a different field
    setGroupField(null);
  };

  // Handle column header click for grouping
  const handleGroup = (field: GroupField) => {
    if (groupField === field) {
      // Toggle grouping off if clicking the same field
      setGroupField(null);
    } else {
      // Set new group field
      setGroupField(field);
      // Expand all groups by default
      const allGroups = getUniqueValues(field);
      setExpandedGroups(new Set(allGroups));
    }
    // Reset sorting to default when grouping
    setSortField('unit_number');
    setSortDirection('asc');
  };

  // Get unique values for grouping
  const getUniqueValues = (field: GroupField): string[] => {
    if (!field) return [];
    
    const values = filteredVehicles.map(vehicle => {
      switch (field) {
        case 'status':
          return vehicle.status.replace(/_/g, ' ');
        case 'take_home':
          return vehicle.is_take_home ? 'Take Home' : 'Non-Take Home';
        default:
          return '';
      }
    });
    
    return [...new Set(values)].sort();
  };

  // Toggle group expansion
  const toggleGroup = (groupValue: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupValue)) {
      newExpanded.delete(groupValue);
    } else {
      newExpanded.add(groupValue);
    }
    setExpandedGroups(newExpanded);
  };

  // Expand all groups
  const expandAllGroups = () => {
    const allGroups = getUniqueValues(groupField);
    setExpandedGroups(new Set(allGroups));
  };

  // Collapse all groups
  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  // Sort vehicles
  const sortVehicles = (vehiclesToSort: Vehicle[]): Vehicle[] => {
    return [...vehiclesToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'unit_number':
          // Extract numeric part for natural sorting
          const numA = parseInt(a.unit_number.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.unit_number.replace(/\D/g, '')) || 0;
          comparison = numA - numB;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'assignment':
          const assignmentA = a.profile?.full_name || a.current_location || '';
          const assignmentB = b.profile?.full_name || b.current_location || '';
          comparison = assignmentA.localeCompare(assignmentB);
          break;
        case 'take_home':
          comparison = (a.is_take_home === b.is_take_home) ? 0 : a.is_take_home ? -1 : 1;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Group vehicles
  const groupVehicles = (vehiclesToGroup: Vehicle[]): Map<string, Vehicle[]> => {
    if (!groupField) {
      const map = new Map();
      map.set('all', vehiclesToGroup);
      return map;
    }

    const grouped = new Map<string, Vehicle[]>();
    
    vehiclesToGroup.forEach(vehicle => {
      let key = '';
      switch (groupField) {
        case 'status':
          key = vehicle.status.replace(/_/g, ' ');
          break;
        case 'take_home':
          key = vehicle.is_take_home ? 'Take Home' : 'Non-Take Home';
          break;
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(vehicle);
    });
    
    // Sort groups by key
    return new Map([...grouped.entries()].sort());
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

  // Get sorted and grouped vehicles
  const sortedVehicles = sortVehicles(filteredVehicles);
  const groupedVehicles = groupVehicles(sortedVehicles);

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

  // Get sort icon for column headers
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  // Get group indicator for column headers
  const getGroupIndicator = (field: GroupField) => {
    if (groupField === field) {
      return <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">grouped</span>;
    }
    return null;
  };

  // Render vehicle card for grid view
  const renderVehicleCard = (vehicle: Vehicle) => (
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
  );

  // Render vehicle row for list view
  const renderVehicleRow = (vehicle: Vehicle) => (
    <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Car className="w-5 h-5 text-gray-400 mr-3" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              Unit #{vehicle.unit_number}
            </div>
            <div className="text-sm text-gray-500">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(vehicle.status)}`}>
          {getStatusIcon(vehicle.status)}
          <span className="ml-1 capitalize">{vehicle.status.replace(/_/g, ' ')}</span>
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {vehicle.status === 'assigned' && vehicle.profile ? (
          <div className="text-sm text-gray-900">
            {vehicle.profile.full_name}
            {vehicle.profile.badge_number && (
              <span className="text-xs text-gray-500 block">Badge: {vehicle.profile.badge_number}</span>
            )}
          </div>
        ) : vehicle.current_location ? (
          <div className="text-sm text-gray-500">{vehicle.current_location}</div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {vehicle.is_take_home ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Take Home
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => handleViewHistory(vehicle)}
          className="text-gray-600 hover:text-gray-900 mr-4"
          title="View History"
        >
          <History className="w-4 h-4" />
        </button>
        {isAdmin && (
          <button
            onClick={() => handleEditVehicle(vehicle)}
            className="text-blue-600 hover:text-blue-900"
            title="Manage Vehicle"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );

  // Render grouped list view
  const renderGroupedList = () => {
    const rows: JSX.Element[] = [];
    
    groupedVehicles.forEach((vehiclesInGroup, groupKey) => {
      if (groupKey === 'all') {
        // No grouping, just render all rows
        vehiclesInGroup.forEach(vehicle => {
          rows.push(renderVehicleRow(vehicle));
        });
      } else {
        const isExpanded = expandedGroups.has(groupKey);
        const groupCount = vehiclesInGroup.length;
        
        // Group header row
        rows.push(
          <tr key={`group-${groupKey}`} className="bg-gray-50">
            <td colSpan={5} className="px-6 py-3">
              <div className="flex items-center">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  <span>{groupKey}</span>
                  <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    {groupCount} {groupCount === 1 ? 'vehicle' : 'vehicles'}
                  </span>
                </button>
              </div>
            </td>
          </tr>
        );
        
        // Group content rows (if expanded)
        if (isExpanded) {
          vehiclesInGroup.forEach(vehicle => {
            rows.push(renderVehicleRow(vehicle));
          });
        }
      }
    });
    
    return rows;
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Fleet Vehicles</h1>
          <div className="flex items-center gap-4">
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

        {/* Group controls for list view */}
        {viewMode === 'list' && groupField && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Grouped by: {groupField === 'status' ? 'Status' : 'Take Home'}</span>
            <button
              onClick={expandAllGroups}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              Expand All
            </button>
            <button
              onClick={collapseAllGroups}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              Collapse All
            </button>
            <button
              onClick={() => setGroupField(null)}
              className="text-gray-600 hover:text-gray-800 text-xs font-medium ml-2"
            >
              Clear Grouping
            </button>
          </div>
        )}

        {/* Conditional rendering based on view mode */}
        {viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map(renderVehicleCard)}
          </div>
        ) : (
          // List View with sorting and grouping
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('unit_number')}
                    onDoubleClick={() => handleGroup(null)} // Double-click to clear grouping
                  >
                    <div className="flex items-center">
                      Vehicle
                      {getSortIcon('unit_number')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('status')}
                    onDoubleClick={() => handleGroup('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon('status')}
                      {getGroupIndicator('status')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('assignment')}
                    onDoubleClick={() => handleGroup(null)}
                  >
                    <div className="flex items-center">
                      Assignment/Location
                      {getSortIcon('assignment')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('take_home')}
                    onDoubleClick={() => handleGroup('take_home')}
                  >
                    <div className="flex items-center">
                      Take Home
                      {getSortIcon('take_home')}
                      {getGroupIndicator('take_home')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {renderGroupedList()}
              </tbody>
            </table>
          </div>
        )}

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
