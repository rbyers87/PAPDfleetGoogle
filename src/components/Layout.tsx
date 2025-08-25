import React from 'react';
    import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
    import { useAuthStore } from '../stores/authStore';
    import { 
      Car, 
      ClipboardList, 
      Settings, 
      LogOut, 
      LayoutDashboard 
    } from 'lucide-react';

    function Layout() {
      const location = useLocation();
      const navigate = useNavigate();
      const { profile, isAdmin, signOut } = useAuthStore();

      const handleSignOut = async () => {
        await signOut();
        navigate('/login');
      };

      const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard???' },
        { path: '/vehicles', icon: Car, label: 'Vehicles' },
        { path: '/work-orders', icon: ClipboardList, label: 'Work Orders' },
        ...(isAdmin ? [{ path: '/settings', icon: Settings, label: 'Settings' }] : []),
      ];

      return (
        <div className="min-h-screen bg-gray-100">
          <nav className="bg-blue-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <span className="text-xl font-bold">PAPD Fleet Management</span>
                </div>

                <div className="flex items-center gap-4">
                  <span>{profile?.full_name}</span>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-full hover:bg-blue-700"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <div className="flex">
            <aside className="w-64 bg-white h-[calc(100vh-4rem)] shadow-md">
              <nav className="mt-5 px-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center px-4 py-2 mt-2 text-gray-600 rounded-lg
                        ${isActive ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}
                      `}
                    >
                      <Icon size={20} className="mr-3" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <main className="flex-1 p-8">
              <Outlet />
            </main>
          </div>
        </div>
      );
    }

    export default Layout;
