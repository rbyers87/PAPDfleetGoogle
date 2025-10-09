import React, { useState } from 'react';
import { X, Eye, EyeOff, CheckCircle, Key, Mail } from 'lucide-react';
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
  isAdminReset?: boolean;
}

function PasswordModal({ 
  isOpen, 
  onClose, 
  profile, 
  isAdminReset = false
}: PasswordModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    return errors;
  };

  const handlePasswordChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
    
    if (field === 'newPassword') {
      const errors = validatePassword(value);
      setValidationErrors(errors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (isAdminReset && profile) {
        // Admin triggering password reset email for another user
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          profile.email,
          {
            redirectTo: `${window.location.origin}/reset-password`
          }
        );
        
        if (resetError) throw resetError;
        
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // User changing their own password
        // Validate password strength
        const errors = validatePassword(formData.newPassword);
        if (errors.length > 0) {
          setError('Please fix the password requirements');
          setValidationErrors(errors);
          setLoading(false);
          return;
        }

        // Check if passwords match
        if (formData.newPassword !== formData.confirmPassword) {
          setError('New passwords do not match');
          setLoading(false);
          return;
        }

        const { error: authError } = await supabase.auth.updateUser({
          password: formData.newPassword
        });
        
        if (authError) throw authError;

        setSuccess(true);
        setTimeout(() => {
          onClose();
          setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setValidationErrors([]);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError(null);
    setSuccess(false);
    setValidationErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md mx-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            {isAdminReset ? (
              <Mail className="w-5 h-5 mr-2 text-blue-800" />
            ) : (
              <Key className="w-5 h-5 mr-2 text-blue-800" />
            )}
            {isAdminReset 
              ? `Send Password Reset - ${profile?.full_name}`
              : 'Change Password'
            }
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-green-700 font-medium">
                    {isAdminReset 
                      ? 'Password reset email sent successfully!'
                      : 'Password updated successfully!'
                    }
                  </p>
                  {isAdminReset && (
                    <p className="text-xs text-green-600 mt-1">
                      An email has been sent to {profile?.email} with instructions to reset their password.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isAdminReset ? (
            // Admin reset view - just confirmation
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 font-medium">
                      Send Password Reset Email
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      A secure password reset link will be sent to:
                    </p>
                    <p className="text-sm text-blue-900 font-medium mt-1">
                      {profile?.email}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      The user will receive an email with a link to create a new password. The link will expire in 1 hour.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // User self-service password change
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    required
                    value={formData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    required
                    value={formData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {formData.newPassword && validationErrors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {validationErrors.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-600">• {err}</p>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-medium mb-1">Password Requirements:</p>
                <ul className="text-xs text-blue-700 space-y-0.5">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!isAdminReset && validationErrors.length > 0)}
              className={`
                px-4 py-2 bg-blue-800 text-white rounded-lg font-medium flex items-center
                ${loading || (!isAdminReset && validationErrors.length > 0)
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-700'
                }
              `}
            >
              {loading ? (
                'Processing...'
              ) : isAdminReset ? (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Email
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordModal;
