import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('admin@demo.com');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-2xl">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-bold text-primary">TH Garments</h1>
                    <p className="mt-2 text-muted-foreground">Sign in to your account</p>
                </div>

                <div className="mb-6 rounded-lg bg-primary/10 border border-primary/20 p-4 text-sm text-foreground space-y-1">
                    <div className="font-bold text-primary mb-1">🔑 Demo Credentials:</div>
                    <div className="flex justify-between items-center">
                        <span>Email:</span>
                        <code className="bg-background px-2 py-0.5 rounded font-mono text-xs select-all">admin@demo.com</code>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Password:</span>
                        <code className="bg-background px-2 py-0.5 rounded font-mono text-xs select-all">admin123</code>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="Enter email"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};
