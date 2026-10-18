import { Outlet } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";
import Header from "../../components/Header/Header";

function MainLayout() {
  return (
    <div className="main-layout">
      <Sidebar />

      <div className="main-layout__content">
        <Header />

        <main className="main-layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;