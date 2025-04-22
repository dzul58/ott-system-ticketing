import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const Parent = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default Parent;
