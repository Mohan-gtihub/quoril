/**
 * Centralized Theme Configuration
 * This file contains all color definitions for the application
 * to ensure consistency across light and dark modes
 */

export const theme = {
    // Background Colors
    bg: {
        primary: '#0d0d0d',      // Pure black background
        secondary: '#1a1a1a',    // Slightly lighter black  
        tertiary: '#1f1f1f',     // Panel backgrounds (pure dark gray, not blue-tinted)
        card: '#2a2a2a',         // Card backgrounds (pure dark gray, not blue-tinted)
        hover: '#333333',        // Hover state (pure dark gray, not blue-tinted)
        light: '#ffffff',        // Light mode primary
        lightSecondary: '#f9fafb', // Light mode secondary
    },

    // Border Colors
    border: {
        default: 'rgba(255, 255, 255, 0.05)',
        hover: 'rgba(59, 130, 246, 0.3)',
        light: '#e5e7eb',
    },

    // Text Colors
    text: {
        primary: '#ffffff',
        secondary: '#d1d5db',
        tertiary: '#9ca3af',
        muted: '#6b7280',
        light: '#111827',
        lightSecondary: '#4b5563',
    },

    // Accent Colors
    accent: {
        blue: {
            50: 'rgba(59, 130, 246, 0.05)',
            100: 'rgba(59, 130, 246, 0.1)',
            200: 'rgba(59, 130, 246, 0.2)',
            300: 'rgba(59, 130, 246, 0.3)',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
        },
        green: {
            50: 'rgba(16, 185, 129, 0.05)',
            100: 'rgba(16, 185, 129, 0.1)',
            200: 'rgba(16, 185, 129, 0.2)',
            400: '#34d399',
            500: '#10b981',
        },
        yellow: {
            50: 'rgba(245, 158, 11, 0.05)',
            100: 'rgba(245, 158, 11, 0.1)',
            200: 'rgba(245, 158, 11, 0.2)',
            400: '#fbbf24',
            500: '#f59e0b',
        },
        red: {
            50: 'rgba(239, 68, 68, 0.05)',
            100: 'rgba(239, 68, 68, 0.1)',
            200: 'rgba(239, 68, 68, 0.2)',
            400: '#f87171',
            500: '#ef4444',
        },
        gray: {
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
        },
    },

    // Shadows
    shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        blue: '0 0 30px rgba(59, 130, 246, 0.05)',
    },
} as const

// Helper function to get theme colors based on mode
export const getThemeColors = (isDark: boolean = true) => {
    if (isDark) {
        return {
            bg: {
                primary: theme.bg.primary,
                secondary: theme.bg.secondary,
                tertiary: theme.bg.tertiary,
                card: theme.bg.card,
                hover: theme.bg.hover,
            },
            text: {
                primary: theme.text.primary,
                secondary: theme.text.secondary,
                tertiary: theme.text.tertiary,
                muted: theme.text.muted,
            },
            border: theme.border.default,
            borderHover: theme.border.hover,
        }
    }

    return {
        bg: {
            primary: theme.bg.light,
            secondary: theme.bg.lightSecondary,
            tertiary: '#f3f4f6',
            card: '#ffffff',
            hover: '#f9fafb',
        },
        text: {
            primary: theme.text.light,
            secondary: theme.text.lightSecondary,
            tertiary: '#6b7280',
            muted: '#9ca3af',
        },
        border: theme.border.light,
        borderHover: theme.accent.blue[300],
    }
}
