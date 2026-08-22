"use client";

import React, { createContext, useContext } from "react";

const AdminContext = createContext(null);

export function AdminProvider({ admin, children }) {
  return <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext); // { id, name, email, role } or null
}
