
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, UserRole } from '../types.ts';
import { Save, Store, Users, UserPlus, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { db } from '../db.ts';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsView: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const [name, setName] = useState(settings.name);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url);
  const [isSaving, setIsSaving] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const data = await db.from('staff').select('ORDER BY name');