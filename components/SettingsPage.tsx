
import React, { useState, useEffect } from 'react';
import { InputField, TextAreaField } from './FormControls';
import { ChurchIcon, SmsIcon, DatabaseIcon, LocationMarkerIcon, PhoneIcon, MailIcon, SaveIcon, ShieldCheckIcon, AiIcon, LockIcon } from './Icons';
import SecuritySettings from './SecuritySettings';
import DatabaseManagement from './DatabaseManagement';
import { User } from './userData';
import { storage, AppSettings } from '../services/storage';
import { useTheme, ThemeName } from './ThemeContext';
import { Palette } from 'lucide-react';

interface SettingsPageProps {
    currentUser: User | null;
}

// Theme Settings Component
const ThemeSettings: React.FC = () => {
    const { theme, setTheme, availableThemes } = useTheme();

    const themeInfo: Record<ThemeName, { name: string; colors: string[] }> = {
        green: { name: 'Forest Green', colors: ['#16a34a', '#15803d', '#166534'] },
        blue: { name: 'Ocean Blue', colors: ['#2563eb', '#1d4ed8', '#1e40af'] },
        purple: { name: 'Royal Purple', colors: ['#9333ea', '#7e22ce', '#6b21a8'] },
        orange: { name: 'Sunset Orange', colors: ['#ea580c', '#c2410c', '#9a3412'] },
        dark: { name: 'Dark Mode', colors: ['#374151', '#1f2937', '#111827'] },
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                    <Palette className="h-6 w-6 mr-2 text-purple-600" />
                    Appearance Settings
                </h2>
                <p className="text-sm text-gray-500 mt-1">Customize the look and feel of your application</p>
            </div>

            <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Color Theme</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {availableThemes.map((themeName) => (
                        <button
                            key={themeName}
                            onClick={() => setTheme(themeName)}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                theme === themeName
                                    ? 'border-green-500 ring-2 ring-green-200'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="flex gap-1 mb-2 justify-center">
                                {themeInfo[themeName].colors.map((color, i) => (
                                    <div
                                        key={i}
                                        className="w-6 h-6 rounded-full"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <p className={`text-sm font-medium text-center ${
                                theme === themeName ? 'text-green-700' : 'text-gray-600'
                            }`}>
                                {themeInfo[themeName].name}
                            </p>
                            {theme === themeName && (
                                <p className="text-xs text-green-600 text-center mt-1">Active</p>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-600">
                    <strong>Note:</strong> Theme changes are applied immediately and saved automatically.
                    The sidebar and accent colors will update to match your selected theme.
                </p>
            </div>
        </div>
    );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('General');
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const data = await storage.appSettings.getAll();
            setSettings(data);
            setLoading(false);
        };
        loadSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (settings) {
            await storage.appSettings.save(settings);
            alert('Settings saved successfully!');
        }
    };

    const updateChurchInfo = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        setSettings({
            ...settings,
            churchInfo: { ...settings.churchInfo, [e.target.name]: e.target.value }
        });
    };

    const updateSmsConfig = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!settings) return;
        setSettings({
            ...settings,
            smsConfig: { ...settings.smsConfig, [e.target.name]: e.target.value }
        });
    };
    
    const updateAiConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        setSettings({
            ...settings,
            aiApiKey: e.target.value
        });
    }

    if (loading || !settings) return <div>Loading settings...</div>;

    const TabButton: React.FC<{ name: string; label: string; icon: React.ElementType }> = ({ name, label, icon: Icon }) => {
        const isActive = activeTab === name;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(name)}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                        ? 'border-church-green text-church-green-dark'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
                <Icon className="h-5 w-5 mr-2" />
                {label}
            </button>
        );
    };

    return (
        <div className="space-y-6">
            <div className="p-6 rounded-lg bg-gradient-to-r from-emerald-50 to-green-100 shadow">
                <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
                <p className="mt-1 text-gray-600">Configure your church management system</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border">
                <div className="border-b border-gray-200 overflow-x-auto">
                    <nav className="flex space-x-2 px-4">
                        <TabButton name="General" label="Church Info" icon={ChurchIcon} />
                        <TabButton name="Appearance" label="Appearance" icon={Palette} />
                        <TabButton name="Security" label="Security" icon={ShieldCheckIcon} />
                        <TabButton name="SMS" label="SMS Config" icon={SmsIcon} />
                        <TabButton name="AI" label="AI Configuration" icon={AiIcon} />
                        <TabButton name="Database" label="Database" icon={DatabaseIcon} />
                    </nav>
                </div>
                
                <div className="p-8 relative min-h-[400px]">
                    {/* Background decorations */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-green-100 rounded-full opacity-50 z-0 pointer-events-none"></div>
                    <div className="absolute -bottom-20 -left-12 w-48 h-48 bg-yellow-100 rounded-full opacity-30 z-0 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <form onSubmit={handleSave}>
                            {activeTab === 'General' && (
                                <div className="space-y-8 animate-fade-in-up">
                                    <h2 className="text-xl font-semibold text-gray-700">Church Information</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <InputField name="name" label="Church Name" type="text" value={settings.churchInfo.name} onChange={updateChurchInfo} required icon={ChurchIcon} />
                                        <InputField name="address" label="Church Address" type="text" value={settings.churchInfo.address} onChange={updateChurchInfo} icon={LocationMarkerIcon} />
                                        <InputField name="phone" label="Church Phone" type="tel" value={settings.churchInfo.phone} onChange={updateChurchInfo} icon={PhoneIcon} />
                                        <InputField name="email" label="Church Email" type="email" value={settings.churchInfo.email} onChange={updateChurchInfo} icon={MailIcon} />
                                    </div>
                                    <div className="flex justify-start">
                                        <button type="submit" className="bg-church-green hover:bg-church-green-dark text-white font-bold py-2 px-6 rounded-lg flex items-center shadow transition duration-300">
                                            <SaveIcon className="h-5 w-5 mr-2" /> Save Changes
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Appearance' && (
                                <ThemeSettings />
                            )}

                            {activeTab === 'SMS' && (
                                <div className="space-y-8 animate-fade-in-up">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-700">SMS Gateway Configuration</h2>
                                        <p className="text-sm text-gray-500 mt-1">Configure your bulk SMS provider details here.</p>
                                    </div>
                                    <div className="p-4 border rounded-lg space-y-4 bg-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField name="apiKey" label="SMS API Key" type="password" value={settings.smsConfig.apiKey} onChange={updateSmsConfig} required icon={LockIcon} />
                                            <InputField name="senderId" label="Sender ID" type="text" value={settings.smsConfig.senderId} onChange={updateSmsConfig} required placeholder="e.g., HKM MIN" />
                                        </div>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-700">Message Templates</h2>
                                        <p className="text-sm text-gray-500 mt-1">Defaults for automated messages.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <TextAreaField name="welcomeMessage" label="Welcome Message" value={settings.smsConfig.welcomeMessage} onChange={updateSmsConfig} rows={4} />
                                        <TextAreaField name="birthdayMessage" label="Birthday Message" value={settings.smsConfig.birthdayMessage} onChange={updateSmsConfig} rows={4} />
                                    </div>
                                    <div className="flex justify-start">
                                        <button type="submit" className="bg-church-green hover:bg-church-green-dark text-white font-bold py-2 px-6 rounded-lg flex items-center shadow transition duration-300">
                                            <SaveIcon className="h-5 w-5 mr-2" /> Save SMS Settings
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'AI' && (
                                <div className="space-y-8 animate-fade-in-up">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-700 flex items-center">
                                            <AiIcon className="h-6 w-6 mr-2 text-purple-600"/>
                                            Artificial Intelligence
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">Configure the Google Gemini API Key to enable AI features (Message generation, Announcements, etc).</p>
                                    </div>
                                    <div className="p-6 border border-purple-200 rounded-lg bg-purple-50">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Google Gemini API Key</label>
                                        <div className="relative">
                                            <input 
                                                type={showApiKey ? "text" : "password"} 
                                                value={settings.aiApiKey} 
                                                onChange={updateAiConfig}
                                                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                placeholder="Enter your AI Studio API Key"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <LockIcon className="h-5 w-5 text-gray-400"/>
                                            </div>
                                            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700">
                                                {showApiKey ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-600 hover:underline">Get one here</a>.
                                        </p>
                                    </div>
                                    <div className="flex justify-start">
                                        <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg flex items-center shadow transition duration-300">
                                            <SaveIcon className="h-5 w-5 mr-2" /> Save AI Configuration
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>

                        {activeTab === 'Security' && (
                            <SecuritySettings currentUser={currentUser} />
                        )}
                        
                        {activeTab === 'Database' && (
                             <DatabaseManagement />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
