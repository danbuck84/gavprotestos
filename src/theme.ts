import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#121212',
            paper: '#1E1E1E',
        },
        primary: {
            main: '#FF3D00', // Neon Orange / Racing Red
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#00E5FF', // Cyan accent
        },
        text: {
            primary: '#ffffff',
            secondary: '#B0B0B0',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Montserrat", "Helvetica", "Arial", sans-serif',
        fontSize: 16, // Base font size increased for mobile
        h4: {
            fontWeight: 700,
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none', // More modern look
            fontWeight: 600,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    minHeight: '48px', // Mobile touch target
                    borderRadius: '8px',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
                    }
                }
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    marginBottom: '24px', // Increased spacing
                },
            },
        },
        MuiContainer: {
            styleOverrides: {
                root: {
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    '@media (min-width:600px)': {
                        paddingLeft: '24px',
                        paddingRight: '24px',
                    },
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Remove default gradient/image
                    backgroundColor: '#1E1E1E',
                    boxShadow: 'none',
                    borderBottom: '1px solid #333',
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                }
            }
        }
    },
});

export default theme;
