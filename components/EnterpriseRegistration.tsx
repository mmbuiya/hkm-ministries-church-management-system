import React, { useState, useEffect } from 'react';
import {
    MailIcon, LockIcon, UserIcon, EyeIcon, EyeOffIcon,
    CheckCircleIcon, XCircleIcon, ExclamationIcon, CameraIcon,
    ArrowLeftIcon, UserPlusIcon, ArrowRightIcon
} from './Icons';
import {
    Shield, AlertTriangle, CheckCircle, XCircle,
    Eye, EyeOff, Mail, Lock, User, Camera,
    Clock, Zap, AlertCircle
} from 'lucide-react';
import { User as AppUser } from './userData';
import { useTheme } from './ThemeContext';

export interface RegistrationData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    acceptTerms: boolean;
    acceptPrivacy: boolean;
}

export interface RegistrationResult {
    success: boolean;
    message?: string;
    requiresVerification?: boolean;
    user?: AppUser;
}

interface EnterpriseRegistrationProps {
    onRegister: (data: RegistrationData) => Promise<RegistrationResult>;
    onBack: () => void;
    onResendVerification?: (email: string) => Promise<boolean>;
}

// Password strength criteria
interface PasswordCriteria {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    noCommonPatterns: boolean;
}

// Common weak passwords to check against
const COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1'
];

const EnterpriseRegistration: React.FC<EnterpriseRegistrationProps> = ({
    onRegister,
    onBack,
    onResendVerification
}) => {
    const { colors } = useTheme();

    // Form state
    const [formData, setFormData] = useState<RegistrationData>({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        avatar: '',
        acceptTerms: false,
        acceptPrivacy: false
    });

    // UI state
    const [currentStep, setCurrentStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Validation state
    const [emailValid, setEmailValid] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        noCommonPatterns: false
    });
    const [passwordsMatch, setPasswordsMatch] = useState(false);
    const [emailExists, setEmailExists] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);

    // Email verification state
    const [verificationSent, setVerificationSent] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    // Email validation
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const isValid = emailRegex.test(email);

        // Additional checks for enterprise domains
        const hasValidDomain = !email.includes('..') && !email.startsWith('.') && !email.endsWith('.');

        return isValid && hasValidDomain;
    };

    // Password strength validation
    const validatePassword = (password: string): PasswordCriteria => {
        return {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            noCommonPatterns: !COMMON_PASSWORDS.some(common =>
                password.toLowerCase().includes(common.toLowerCase())
            )
        };
    };

    // Calculate password strength score
    const getPasswordStrength = (criteria: PasswordCriteria): number => {
        const score = Object.values(criteria).filter(Boolean).length;
        return Math.round((score / 6) * 100);
    };

    // Get password strength color and label
    const getPasswordStrengthInfo = (score: number) => {
        if (score < 50) return { color: 'text-red-600', bg: 'bg-red-100', label: 'Weak', barColor: 'bg-red-500' };
        if (score < 75) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair', barColor: 'bg-yellow-500' };
        if (score < 90) return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good', barColor: 'bg-blue-500' };
        return { color: 'text-green-600', bg: 'bg-green-100', label: 'Strong', barColor: 'bg-green-500' };
    };

    // Handle input changes
    const handleInputChange = (field: keyof RegistrationData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    // Handle email validation
    useEffect(() => {
        if (formData.email) {
            setEmailValid(validateEmail(formData.email));
        }
    }, [formData.email, emailTouched]);

    // Handle password validation
    useEffect(() => {
        if (formData.password) {
            setPasswordCriteria(validatePassword(formData.password));
        }
    }, [formData.password]);

    // Handle password matching
    useEffect(() => {
        if (formData.confirmPassword) {
            setPasswordsMatch(formData.password === formData.confirmPassword);
        }
    }, [formData.password, formData.confirmPassword]);

    // Handle avatar upload
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('Avatar image must be less than 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                handleInputChange('avatar', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Validate current step
    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return emailValid && !emailExists && formData.firstName.trim().length >= 2 && formData.lastName.trim().length >= 2;
            case 2:
                const passwordScore = getPasswordStrength(passwordCriteria);
                return passwordScore >= 75 && passwordsMatch;
            case 3:
                return formData.acceptTerms && formData.acceptPrivacy;
            default:
                return false;
        }
    };

    // Handle step navigation
    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
            setError('Please complete all required fields correctly');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await onRegister(formData);

            if (result.success) {
                if (result.requiresVerification) {
                    setVerificationSent(true);
                    setVerificationEmail(formData.email);
                    setSuccessMessage('Account created successfully! Please check your email to verify your account.');
                } else {
                    setSuccessMessage('Account created successfully! You can now log in.');
                }
            } else {
                setError(result.message || 'Registration failed. Please try again.');
            }
        } catch (error: any) {
            setError(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle resend verification
    const handleResendVerification = async () => {
        if (!onResendVerification || resendCooldown > 0) return;

        setIsLoading(true);
        try {
            const success = await onResendVerification(verificationEmail);
            if (success) {
                setSuccessMessage('Verification email sent! Please check your inbox.');
                setResendCooldown(60); // 60 second cooldown

                const timer = setInterval(() => {
                    setResendCooldown(prev => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setError('Failed to send verification email. Please try again.');
            }
        } catch (error) {
            setError('Failed to send verification email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Render verification screen
    if (verificationSent) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verify Your Email</h2>
                            <p className="text-gray-600">
                                We've sent a verification link to:
                            </p>
                            <p className="font-semibold text-gray-800 mt-1">{verificationEmail}</p>
                        </div>

                        {successMessage && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                    <p className="text-sm text-green-700">{successMessage}</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center">
                                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Click the verification link in your email to activate your account.
                                The link will expire in 24 hours.
                            </p>

                            <div className="border-t pt-4">
                                <p className="text-sm text-gray-600 mb-3">Didn't receive the email?</p>
                                <button
                                    onClick={handleResendVerification}
                                    disabled={isLoading || resendCooldown > 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    {isLoading ? (
                                        'Sending...'
                                    ) : resendCooldown > 0 ? (
                                        `Resend in ${resendCooldown}s`
                                    ) : (
                                        'Resend Verification Email'
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onBack}
                            className="mt-6 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center w-full"
                        >
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-block mb-4">
                            <img src="https://i.ibb.co/5xzH9bWR/HKM-LOGO.png" alt="HKM MINISTRIES Logo" className="h-16 w-auto mx-auto" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Create Your Account</h1>
                        <p className="text-gray-500">Join HKM MINISTRIES with enterprise-grade security</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center mb-8">
                        {[1, 2, 3].map((step) => (
                            <React.Fragment key={step}>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step <= currentStep
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {step < currentStep ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        step
                                    )}
                                </div>
                                {step < 3 && (
                                    <div className={`w-12 h-1 mx-2 ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step Labels */}
                    <div className="flex justify-between text-xs text-gray-600 mb-8 px-2">
                        <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Personal Info</span>
                        <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>Security</span>
                        <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>Terms</span>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start">
                                <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                                <p className="text-sm text-green-700">{successMessage}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Step 1: Personal Information */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>

                                {/* Avatar Upload */}
                                <div className="flex flex-col items-center mb-6">
                                    <div className="relative">
                                        {formData.avatar ? (
                                            <img
                                                src={formData.avatar}
                                                alt="Avatar Preview"
                                                className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                                <User className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                        <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full cursor-pointer shadow-md transition-colors">
                                            <Camera className="w-3 h-3" />
                                        </label>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Profile Photo (Optional, max 5MB)</p>
                                </div>

                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            First Name *
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formData.firstName}
                                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="John"
                                                required
                                                minLength={2}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Last Name *
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formData.lastName}
                                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Doe"
                                                required
                                                minLength={2}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            onBlur={() => setEmailTouched(true)}
                                            className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${emailTouched && !emailValid
                                                    ? 'border-red-300 focus:border-red-500'
                                                    : emailTouched && emailValid && !emailExists
                                                        ? 'border-green-300 focus:border-green-500'
                                                        : 'border-gray-300 focus:border-blue-500'
                                                }`}
                                            placeholder="john.doe@example.com"
                                            required
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            {checkingEmail ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            ) : emailTouched && emailValid && !emailExists ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : emailTouched && (!emailValid || emailExists) ? (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            ) : null}
                                        </div>
                                    </div>
                                    {emailTouched && !emailValid && (
                                        <p className="text-xs text-red-600 mt-1">Please enter a valid email address</p>
                                    )}
                                    {emailExists && (
                                        <p className="text-xs text-red-600 mt-1">This email is already registered</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Security */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Settings</h3>

                                {/* Password Field */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password *
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => handleInputChange('password', e.target.value)}
                                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Create a strong password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {/* Password Strength Indicator */}
                                    {formData.password && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-600">Password Strength:</span>
                                                <span className={`text-sm font-medium ${getPasswordStrengthInfo(getPasswordStrength(passwordCriteria)).color}`}>
                                                    {getPasswordStrengthInfo(getPasswordStrength(passwordCriteria)).label}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthInfo(getPasswordStrength(passwordCriteria)).barColor}`}
                                                    style={{ width: `${getPasswordStrength(passwordCriteria)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Password Criteria */}
                                    {formData.password && (
                                        <div className="mt-3 space-y-1">
                                            <p className="text-xs text-gray-600 mb-2">Password must contain:</p>
                                            {Object.entries({
                                                'At least 8 characters': passwordCriteria.minLength,
                                                'One uppercase letter': passwordCriteria.hasUppercase,
                                                'One lowercase letter': passwordCriteria.hasLowercase,
                                                'One number': passwordCriteria.hasNumber,
                                                'One special character': passwordCriteria.hasSpecialChar,
                                                'No common patterns': passwordCriteria.noCommonPatterns
                                            }).map(([label, met]) => (
                                                <div key={label} className="flex items-center text-xs">
                                                    {met ? (
                                                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3 text-red-500 mr-2" />
                                                    )}
                                                    <span className={met ? 'text-green-700' : 'text-red-700'}>
                                                        {label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password Field */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password *
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                            className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formData.confirmPassword && !passwordsMatch
                                                    ? 'border-red-300 focus:border-red-500'
                                                    : formData.confirmPassword && passwordsMatch
                                                        ? 'border-green-300 focus:border-green-500'
                                                        : 'border-gray-300 focus:border-blue-500'
                                                }`}
                                            placeholder="Confirm your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {formData.confirmPassword && !passwordsMatch && (
                                        <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                                    )}
                                    {formData.confirmPassword && passwordsMatch && (
                                        <p className="text-xs text-green-600 mt-1">Passwords match</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Terms and Conditions */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Terms & Privacy</h3>

                                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                    <div className="flex items-start">
                                        <input
                                            type="checkbox"
                                            id="acceptTerms"
                                            checked={formData.acceptTerms}
                                            onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            required
                                        />
                                        <label htmlFor="acceptTerms" className="ml-3 text-sm text-gray-700">
                                            I agree to the{' '}
                                            <a href="#" className="text-blue-600 hover:underline font-medium">
                                                Terms of Service
                                            </a>{' '}
                                            and understand the responsibilities of using this system.
                                        </label>
                                    </div>

                                    <div className="flex items-start">
                                        <input
                                            type="checkbox"
                                            id="acceptPrivacy"
                                            checked={formData.acceptPrivacy}
                                            onChange={(e) => handleInputChange('acceptPrivacy', e.target.checked)}
                                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            required
                                        />
                                        <label htmlFor="acceptPrivacy" className="ml-3 text-sm text-gray-700">
                                            I acknowledge that I have read and understand the{' '}
                                            <a href="#" className="text-blue-600 hover:underline font-medium">
                                                Privacy Policy
                                            </a>{' '}
                                            and consent to the collection and use of my data.
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                                        <div className="text-sm text-blue-700">
                                            <p className="font-medium mb-1">Enterprise Security Notice</p>
                                            <p>Your account will be created with Guest privileges. A system administrator will review and assign appropriate permissions based on your role within the organization.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-6">
                            <button
                                type="button"
                                onClick={currentStep === 1 ? onBack : prevStep}
                                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                {currentStep === 1 ? 'Back to Login' : 'Previous'}
                            </button>

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    disabled={!validateStep(currentStep)}
                                    className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                                >
                                    Next
                                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading || !validateStep(3)}
                                    className="flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlusIcon className="w-4 h-4 mr-2" />
                                            Create Account
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-8">HKM MINISTRIES - Enterprise Security</p>
                </div>
            </div>
        </div>
    );
};

export default EnterpriseRegistration;