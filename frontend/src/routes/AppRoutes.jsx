import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Activity from "../pages/Activity.jsx";
import Memory from "../pages/Memory.jsx";
import Settings from "../pages/Settings.jsx";

export default function AppRoutes() {
  return <Routes><Route element={<MainLayout />}><Route path="/" element={<Dashboard />} /><Route path="/activity" element={<Activity />} /><Route path="/memory" element={<Memory />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>;
}
