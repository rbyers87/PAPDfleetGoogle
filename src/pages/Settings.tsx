import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import {
  Users,
  Car,
  AlertCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ClipboardList
} from 'lucide-react';

interface Profile {
  id: string;
  role: 'admin' | 'user';
  full_name: string;
  badge_number: string | null;
  email: string;
}

interface Vehicle {
  id: string;
  unit_number: string;
  make: string;
  model: string;
  year: number;
  status: 'available' | 'assigned' | 'out_of_service';
}

interface WorkOrderSettings {
  id?: string;
  default_priority: 'low' | 'normal' | 'high' | 'urgent';
  require_mileage: boolean;
  require_location: boolean;
  auto_assign_numbers: boolean;
  notification_enabled: boolean;
}

function Settings() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'users' | 'vehicles' | 'workorders'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workOrderSettings, setWorkOrderSettings] = useState<WorkOrderSettings>({
    default_priority: 'normal',
    require_mileage: true,
    require_location: true,
    auto_assign_numbers: true,
    notification_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);

  // Form states
  const [newProfile, setNewProfile] = useState({
    email: '',
    full_name: '',
    badge_number: '',
    role: 'user',
    password: ''
  });

  const [newVehicle, setNewVehicle] = useState({
    unit_number: '',
    make: '',
    model: '',
    model_year: new Date().getFullYear()
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }

    if (activeTab === 'users') {
      fetchProfiles();
    } else if (activeTab === 'vehicles') {
      fetchVehicles();
    } else if (activeTab === 'workorders') {
      fetchWorkOrderSettings();
    }
  }, [activeTab, isAdmin, navigate]);

  async function fetchProfiles() {
    try {
      const { data, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          full_name,
          badge_number,
          email
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      setProfiles(data as Profile[]);
    } catch (err) {
      setError('Failed to fetch profiles');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
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

  async function fetchWorkOrderSettings() {
    try {
      // First, try to get existing settings
      const { data, error } = await supabase
        .from('work_order_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        setWorkOrderSettings(data);
      }
      // If no data found, keep the default settings
    } catch (err) {
      setError('Failed to fetch work order settings');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWorkOrderSettings() {
    try {
      setError(null);
      
      if (workOrderSettings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('work_order_settings')
          .update(workOrderSettings)
          .eq('id', workOrderSettings.id);

        if (error) throw error;
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('work_order_settings')
          .insert([workOrderSettings])
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setWorkOrderSettings(data);
        }
      }

      // Show success message (you could add a toast notification here)
      console.log('Settings saved successfully');
    } catch (err) {
      setError('Failed to save work order settings');
      console.error('Error:', err);
    }
  }

  // ... (keep all your existing functions: handleCreateUser, handleUpdateProfile, etc.)

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newProfile.email,
        password: newProfile.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            role: newProfile.role,
            full_name: newProfile.full_name,
            badge_number: newProfile.badge_number || null,
            email: newProfile.email
          }]);

        if (profileError) throw profileError;
      }

      setShowNewUserForm(false);
      setNewProfile({
        email: '',
        full_name: '',
        badge_number: '',
        role: 'user',
        password: ''
      });
      fetchProfiles();
    } catch (err) {
      setError('Failed to create user');
      console.error('Error:', err);
    }
  }

  async function handleUpdateProfile(profile: Profile) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: profile.role,
          full_name: profile.full_name,
          badge_number: profile.badge_number || null
        })
        .eq('id', profile.id);

      if (error) throw error;

      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error:', err);
    }
  }

  async function handleCreateVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const { error } = await supabase
        .from('vehicles')
        .insert([{
          unit_number: newVehicle.unit_number,
          make: newVehicle.make,
          model: newVehicle.model,
          year: newVehicle.model_year,
          status: 'available'
        }]);

      if (error) throw error;

      setShowNewVehicleForm(false);
      setNewVehicle({
        unit_number: '',
        make: '',
        model: '',
        model_year: new Date().getFullYear()
      });
      fetchVehicles();
    } catch (err) {
      setError('Failed to create vehicle');
      console.error('Error:', err);
    }
  }

  async function handleUpdateVehicle(vehicle: Vehicle) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          unit_number: vehicle.unit_number,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      setEditingVehicle(null);
      fetchVehicles();
    } catch (err) {
      setError('Failed to update vehicle');
      console.error('Error:', err);
    }
  }

  const filteredProfiles = profiles.filter(profile =>
    (profile.full_name && profile.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (profile.email && profile.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (profile.badge_number && profile.badge_number.includes(searchQuery))
  );

  const filteredVehicles = vehicles.filter(vehicle =>
    (vehicle.unit_number && vehicle.unit_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vehicle.make && vehicle.make.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vehicle.model && vehicle.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vehicle.year && vehicle.year.toString().includes(searchQuery))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`
              flex items-center px-1 py-4 border-b-2 font-medium text-sm
              ${activeTab === 'users'
                ? 'border-blue-800 text-blue-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <Users className="w-5 h-5 mr-2" />
            User Management1
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`
              flex items-center px-1 py-4 border-b-2 font-medium text-sm
              ${activeTab === 'vehicles'
                ? 'border-blue-800 text-blue-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <Car className="w-5 h-5 mr-2" />
            Fleet Management
          </button>
          <button
            onClick={() => setActiveTab('workorders')}
            className={`
              flex items-center px-1 py-4 border-b-2 font-medium text-sm
              ${activeTab === 'workorders'
                ? 'border-blue-800 text-blue-800'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <ClipboardList className="w-5 h-5 mr-2" />
            Work Order Settings
          </button>
        </nav>
      </div>

      {/* Search bar and Add button - hide for work orders tab */}
      {activeTab !== 'workorders' && (
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'users' ? 'users' : 'vehicles'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => activeTab === 'users' ? setShowNewUserForm(true) : setShowNewVehicleForm(true)}
            className="ml-4 flex items-center px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add {activeTab === 'users' ? 'User' : 'Vehicle'}
          </button>
        </div>
      )}

      {/* Work Orders Settings Tab */}
      {activeTab === 'workorders' && (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Work Order Template Settings</h3>
            <p className="mt-1 text-sm text-gray-600">
              Configure default settings and requirements for work orders.
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Priority Level
              </label>
              <select
                value={workOrderSettings.default_priority}
                onChange={(e) => setWorkOrderSettings({
                  ...workOrderSettings,
                  default_priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent'
                })}
                className="w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-medium text-gray-900">Required Fields</h4>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require_mileage"
                  checked={workOrderSettings.require_mileage}
                  onChange={(e) => setWorkOrderSettings({
                    ...workOrderSettings,
                    require_mileage: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="require_mileage" className="ml-2 block text-sm text-gray-900">
                  Require current mileage
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="require_location"
                  checked={workOrderSettings.require_location}
                  onChange={(e) => setWorkOrderSettings({
                    ...workOrderSettings,
                    require_location: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="require_location" className="ml-2 block text-sm text-gray-900">
                  Require vehicle location
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-base font-medium text-gray-900">System Settings</h4>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_assign_numbers"
                  checked={workOrderSettings.auto_assign_numbers}
                  onChange={(e) => setWorkOrderSettings({
                    ...workOrderSettings,
                    auto_assign_numbers: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_assign_numbers" className="ml-2 block text-sm text-gray-900">
                  Automatically assign work order numbers
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notification_enabled"
                  checked={workOrderSettings.notification_enabled}
                  onChange={(e) => setWorkOrderSettings({
                    ...workOrderSettings,
                    notification_enabled: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notification_enabled" className="ml-2 block text-sm text-gray-900">
                  Enable email notifications for work order updates
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveWorkOrderSettings}
                className="flex items-center px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* ... your existing users table code ... */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Badge Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProfile?.id === profile.id ? (
                      <input
                        type="text"
                        value={editingProfile.full_name}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          full_name: e.target.value
                        })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">
                        {profile.full_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{profile.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProfile?.id === profile.id ? (
                      <input
                        type="text"
                        value={editingProfile.badge_number || ''}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          badge_number: e.target.value
                        })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">
                        {profile.badge_number || '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProfile?.id === profile.id ? (
                      <select
                        value={editingProfile.role}
                        onChange={(e) => setEditingProfile({
                          ...editingProfile,
                          role: e.target.value as 'admin' | 'user'
                        })}
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`
                        px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${profile.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                      `}>
                        {profile.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingProfile?.id === profile.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleUpdateProfile(editingProfile)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingProfile(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingProfile(profile)}
                        className="text-blue-800 hover:text-blue-900"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicles Tab Content */}
      {activeTab === 'vehicles' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* ... your existing vehicles table code ... */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Make
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingVehicle?.id === vehicle.id ? (
                      <input
                        type="text"
                        value={editingVehicle.unit_number}
                        onChange={(e) => setEditingVehicle({
                          ...editingVehicle,
                          unit_number: e.target.value
                        })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">
                        {vehicle.unit_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingVehicle?.id === vehicle.id ? (
                      <input
                        type="text"
                        value={editingVehicle.make}
                        onChange={(e) => setEditingVehicle({
                          ...editingVehicle,
                          make: e.target.value
                        })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{vehicle.make}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingVehicle?.id === vehicle.id ? (
                      <input
                        type="text"
                        value={editingVehicle.model}
                        onChange={(e) => setEditingVehicle({
                          ...editingVehicle,
                          model: e.target.value
                        })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{vehicle.model}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingVehicle?.id === vehicle.id ? (
                      <input
                        type="number"
                        value={editingVehicle.year}
                        onChange={(e) => setEditingVehicle({
                          ...editingVehicle,
                          year: parseInt(e.target.value)
                        })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{vehicle.year}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingVehicle?.id === vehicle.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleUpdateVehicle(editingVehicle)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingVehicle(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingVehicle(vehicle)}
                        className="text-blue-800 hover:text-blue-900"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ... keep all your existing modal code for new user and new vehicle forms ... */}

      {/* New User Modal */}
      {showNewUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
                <button
                  onClick={() => setShowNewUserForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newProfile.email}
                  onChange={(e) => setNewProfile({ ...newProfile, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newProfile.full_name}
                  onChange={(e) => setNewProfile({ ...newProfile, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge Number
                </label>
                <input
                  type="text"
                  value={newProfile.badge_number}
                  onChange={(e) => setNewProfile({ ...newProfile, badge_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newProfile.role}
                  onChange={(e) => setNewProfile({ ...newProfile, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={newProfile.password}
                  onChange={(e) => setNewProfile({ ...newProfile, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Vehicle Modal */}
      {showNewVehicleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Add New Vehicle</h2>
                <button
                  onClick={() => setShowNewVehicleForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Number
                </label>
                <input
                  type="text"
                  required
                  value={newVehicle.unit_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, unit_number: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Make
                </label>
                <input
                  type="text"
                  required
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  required
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={newVehicle.model_year}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model_year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewVehicleForm(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
