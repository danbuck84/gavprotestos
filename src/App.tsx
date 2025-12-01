import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NovoProtesto from './pages/NovoProtesto';
import AdminPainel from './pages/AdminPainel';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ce93d8', // Purple accent
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 24px', // Touch friendly
          fontSize: '1rem',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
        margin: 'normal',
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/novo-protesto" element={<NovoProtesto />} />
          <Route path="/admin" element={<AdminPainel />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
