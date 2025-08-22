import React, { useState } from 'react';
    import { X } from 'lucide-react';
    import { supabase } from '../lib/supabase';

    interface Profile {
      id: string;
      full_name: string;
      email: string;
      role: 'admin' | 'user';
      badge_number: string | null;
    }

    interface PasswordModalProps {
      isOpen: boolean;
      onClose: () => void;
      profile: Profile | null;
      onProfileUpdate: () => void;
    }

    function PasswordModal({ isOpen, onClose, profile, onProfileUpdate }: PasswordModalProps) {
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
          if (profile) {
            const { error: authError } = await supabase.auth.updateUser({
              password: password,
            });
            if (authError) throw authError;

            onProfileUpdate();
            onClose();
          }
        } catch (err) {
          setError('Failed to update password. Please try again.');
          console.error('Error updating password:', err);
        } finally {
          setLoading(false);
        }
      };

      if (!isOpen) return null;

      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Reset Password for {profile?.full_name}
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
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    export default PasswordModal;
