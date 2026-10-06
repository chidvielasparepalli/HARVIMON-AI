import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
<<<<<<< HEAD

export default function MainLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
=======
export default function MainLayout(){return <div className="app-shell"><Sidebar/><main className="main-content"><Outlet/></main></div>;}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
