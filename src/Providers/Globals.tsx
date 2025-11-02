import React, { createContext, useContext, useState, type ReactNode } from 'react';

type PlanType = 'Free' | 'Silver' | 'Gold' | 'Platinum';

interface IUser {
    id: number;
    name: string;
    email: string;
    plan: PlanType;
    avatarUrl: string;
}

export const defaultUser: IUser = {
    id: -1,//Fake ID for default user
    name: 'John Doe',
    email: 'johndoe@trackfy.com',
    avatarUrl: 'https://i.pravatar.cc/?u=johndoe@trackfy.com',
    // Placeholder avatar image,  fake API that will always return the same image for the same email
    plan: 'Silver',
}

type GlobalState = {
    user: IUser | null;
    theme: 'light' | 'dark';
    setUser: (user: IUser | null) => void;
    setDarkMode: (darkMode: boolean) => void;
    logout: () => void;
    changeUserPlan: (newPlan: IUser['plan']) => void;
    onMobile: boolean;
};

const GlobalContext = createContext<GlobalState | undefined>(undefined);

export const useGlobals = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobals must be used within a GlobalProvider');
    }
    return context;
};

type GlobalProviderProps = {
    children: ReactNode;
};

export const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
    const [user, _setUser] = useState<IUser | null>(defaultUser);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [onMobile, setOnMobile] = useState<boolean>(window.innerWidth < 768);
    const setDarkMode = (enabled: boolean) => {
        if (enabled) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        setTheme(enabled ? 'dark' : 'light');
        localStorage.setItem('theme', enabled ? 'dark' : 'light');
    }

    const setUser = (user: IUser | null) => {
        _setUser(user);
        if (!user) {
            localStorage.removeItem('user');
            return;
        }
        localStorage.setItem('user', JSON.stringify(user));
    }
    const changeUserPlan = (newPlan: PlanType) => {
        if (!user) return; // This should throw an error or handle unauthenticated state
        setUser({ ...user, plan: newPlan });
    }
    const logout = () => {
        setUser(null);
    }
    React.useEffect(() => {
        // On mount, check the preferred theme in local storage or system preference
        // and apply to the document.
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setDarkMode(true);
        } else {
            setDarkMode(false);
        }
        // add event listener to track window resize and set onMobile accordingly
        const handleResize = () => {
            setOnMobile(window.innerWidth < 1200);// 1200px breakpoint for the filter bar
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        // Load user from local storage or API if needed
        // For now, we use the default user even on refresh
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setUser(user);
            } catch (error) {
                console.error('Error parsing user from localStorage', error);
            }
        }
        else {
            setUser(defaultUser);
        }
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    React.useEffect(() => {

    }, []);
    return (
        <GlobalContext.Provider value={{ user, theme, setUser, setDarkMode, onMobile, logout, changeUserPlan}}>
            {children}
        </GlobalContext.Provider>
    );
};