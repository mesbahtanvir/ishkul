import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import IshkulHelmet from './components/IshkulTitle';
import QuestionBank from './components/QuestionBank';

export default function App() {

  // create a darkTheme function to handle dark theme using createTheme
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
      <IshkulHelmet />
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/question_bank" element={<QuestionBank />} />
        </Routes>
      </Router>
      </ThemeProvider>
  )
}