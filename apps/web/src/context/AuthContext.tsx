import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api';

export interface UserPersona {
  id: string;
  displayName: string;
  institutionalEmail: string;
  role: 'DEPT_HEAD' | 'FACULTY' | 'CR' | 'STUDENT' | 'PLATFORM_ADMIN';
  department: string;
  designation: string;
  demoIdentifier?: string | null;
}

interface AuthContextType {
  currentUser: UserPersona;
  availableUsers: UserPersona[];
  switchUser: (role: string) => Promise<void>;
  isLoading: boolean;
}

const defaultUser: UserPersona = {
  id: 'hod-1',
  displayName: 'Demo Head of Department',
  institutionalEmail: 'hod.demo@campusflow.example',
  role: 'DEPT_HEAD',
  department: 'Department of Computer Science & Engineering',
  designation: 'HOD CSE • Professor',
  demoIdentifier: 'DEMO-FAC-001',
};

const AuthContext = createContext<AuthContextType>({
  currentUser: defaultUser,
  availableUsers: [],
  switchUser: async () => {},
  isLoading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserPersona>(() => {
    const saved = localStorage.getItem('bmsce_user');
    return saved ? JSON.parse(saved) : defaultUser;
  });
  const [availableUsers, setAvailableUsers] = useState<UserPersona[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/auth/demo-users'))
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setAvailableUsers(data.data);
          // If we had no user or default, pick HOD or saved
          const savedRole = localStorage.getItem('bmsce_role') || 'DEPT_HEAD';
          const match = data.data.find((u: UserPersona) => u.role === savedRole);
          if (match) setCurrentUser(match);
        }
      })
      .catch((err) => console.warn('Could not load demo users:', err));
  }, []);

  const switchUser = async (role: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/demo-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data?.data?.user) {
        const u: UserPersona = {
          id: data.data.user.userId,
          displayName: data.data.user.displayName,
          institutionalEmail: data.data.user.institutionalEmail,
          role: data.data.user.role,
          department: 'Department of Computer Science & Engineering',
          designation: data.data.user.designation || 'Academic User',
          demoIdentifier: data.data.user.demoIdentifier,
        };
        setCurrentUser(u);
        localStorage.setItem('bmsce_user', JSON.stringify(u));
        localStorage.setItem('bmsce_role', u.role);
        localStorage.setItem('bmsce_token', data.data.token);
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, availableUsers, switchUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

