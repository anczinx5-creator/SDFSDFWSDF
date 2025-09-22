import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  address: string;
  name: string;
  organization: string;
  role: number;
  phone?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsConsumer: () => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage for simulation
    const userData = localStorage.getItem('herbionyx_user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('herbionyx_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate login with demo users
    const demoUsers = [
      { email: 'collector@demo.com', password: 'demo123', role: 1, name: 'Demo Collector', organization: 'Collector Group Demo' },
      { email: 'tester@demo.com', password: 'demo123', role: 2, name: 'Demo Tester', organization: 'Testing Labs Demo' },
      { email: 'processor@demo.com', password: 'demo123', role: 3, name: 'Demo Processor', organization: 'Processing Unit Demo' },
      { email: 'manufacturer@demo.com', password: 'demo123', role: 4, name: 'Demo Manufacturer', organization: 'Manufacturing Plant Demo' }
    ];

    const user = demoUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const userData = {
      address: email,
      name: user.name,
      organization: user.organization,
      role: user.role,
      email: email
    };

    localStorage.setItem('token', `demo_token_${Date.now()}`);
    localStorage.setItem('userRole', user.role.toString());
    localStorage.setItem('herbionyx_user', JSON.stringify(userData));
    setUser(userData);
  };

  const loginAsConsumer = () => {
    const consumerUser = {
      address: 'consumer_address',
      name: 'Consumer User',
      organization: 'General Public',
      role: 6,
      email: 'consumer@demo.com'
    };
    
    localStorage.setItem('token', 'consumer-token');
    localStorage.setItem('userRole', '6'); // Store consumer role
    localStorage.setItem('herbionyx_user', JSON.stringify(consumerUser));
    setUser(consumerUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('herbionyx_user');
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    loginAsConsumer,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};