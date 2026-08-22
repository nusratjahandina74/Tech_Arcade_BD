"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../../lib/api.js";
import { useUser } from "../../../../../context/UserContext.jsx";
import { Card, CardContent } from "../../../../../components/ui/card.jsx";
import { Button } from "../../../../../components/ui/button.jsx";
import { Input } from "../../../../../components/ui/input.jsx";

export default function AccountSettingsPage() {
  const { user, refresh } = useUser();
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [profileMsg, setProfileMsg] = useState("");

  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({ title: "Home", addressLine: "", city: "", zone: "" });
  const [addressMsg, setAddressMsg] = useState("");

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || "", phone: user.phone || "" });
      setAddresses(user.addresses || []);
    }
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg("");
    try {
      await api.put("/users/me", profile);
      await refresh();
      setProfileMsg("Saved.");
    } catch (err) {
      setProfileMsg(err.response?.data?.message || "Could not save.");
    }
  }

  async function addAddress(e) {
    e.preventDefault();
    setAddressMsg("");
    try {
      const res = await api.post("/users/me/addresses", newAddress);
      setAddresses(res.data);
      setNewAddress({ title: "Home", addressLine: "", city: "", zone: "" });
    } catch (err) {
      setAddressMsg(err.response?.data?.message || "Could not add address.");
    }
  }

  async function removeAddress(id) {
    const res = await api.delete(`/users/me/addresses/${id}`);
    setAddresses(res.data);
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwMsg("");
    try {
      await api.put("/users/me/password", pwForm);
      setPwMsg("Password updated. You may need to log in again on other devices.");
      setPwForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setPwMsg(err.response?.data?.message || "Could not update password.");
    }
  }

  if (!user) return null;

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-700">Account settings</h1>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3">Profile</p>
          <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" size="sm">Save profile</Button>
              {profileMsg && <span className="text-xs text-muted-foreground">{profileMsg}</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3">Saved addresses</p>
          <div className="grid gap-2 mb-4">
            {addresses.map((a) => (
              <div key={a._id} className="flex items-center justify-between border border-border rounded-md p-3 text-sm">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground text-xs">{a.addressLine}, {a.city}</p>
                </div>
                <button onClick={() => removeAddress(a._id)} className="text-destructive text-xs hover:underline">Remove</button>
              </div>
            ))}
            {addresses.length === 0 && <p className="text-muted-foreground text-sm">No saved addresses yet.</p>}
          </div>
          <form onSubmit={addAddress} className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Label (Home/Office)" value={newAddress.title} onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })} />
            <Input placeholder="City" required value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
            <Input
              placeholder="Full address"
              required
              value={newAddress.addressLine}
              onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" size="sm" variant="outline">Add address</Button>
              {addressMsg && <span className="text-xs text-destructive">{addressMsg}</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3">Change password</p>
          <form onSubmit={changePassword} className="grid sm:grid-cols-2 gap-3">
            <Input
              type="password"
              placeholder="Current password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
            <Input
              type="password"
              placeholder="New password"
              required
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" size="sm">Update password</Button>
              {pwMsg && <span className="text-xs text-muted-foreground">{pwMsg}</span>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
