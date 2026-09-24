import React from 'react'
import './App.css'
import Login from './components/login/login'
import Dashboard from './components/home/home'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";


function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
