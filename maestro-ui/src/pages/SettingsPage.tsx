import React, { useState } from 'react';
import { Bell, Shield, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearAuthStorage } from '../services/oauth';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsAlerts: false,
    darkMode: false,
    twoFactorAuth: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleLogout = () => {
    clearAuthStorage();
    navigate('/login');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 space-y-3">
        <h1 className="text-4xl font-bold text-slate-900">{t('settings.title')}</h1>
        <p className="text-slate-600 text-lg">{t('settings.subtitle')}</p>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm hover:shadow-md transition-all duration-250">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bell size={20} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{t('settings.notifications')}</h2>
        </div>

        <div className="space-y-4">
          <SettingToggle
            label={t('settings.emailNotifications')}
            description={t('settings.emailNotificationsDesc')}
            enabled={settings.emailNotifications}
            onChange={() => handleToggle('emailNotifications')}
          />
          <SettingToggle
            label={t('settings.smsAlerts')}
            description={t('settings.smsAlertsDesc')}
            enabled={settings.smsAlerts}
            onChange={() => handleToggle('smsAlerts')}
          />
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6 shadow-sm hover:shadow-md transition-all duration-250">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Shield size={20} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{t('settings.security')}</h2>
        </div>

        <div className="space-y-4">
          <SettingToggle
            label={t('settings.twoFactor')}
            description={t('settings.twoFactorDesc')}
            enabled={settings.twoFactorAuth}
            onChange={() => handleToggle('twoFactorAuth')}
          />
          <div className="pt-4 border-t border-slate-200">
            <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-250 font-semibold">
              {t('settings.changePassword')}
            </button>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all duration-250">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <User size={20} className="text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{t('settings.account')}</h2>
        </div>

        <div className="space-y-4">
          <div className="pb-4 border-b border-slate-200">
            <p className="text-sm text-slate-600 mb-1">{t('settings.emailAddress')}</p>
            <p className="text-lg font-semibold text-slate-900">john.underwood@creditmanagement.fr</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-all duration-250 font-semibold flex items-center justify-center space-x-2 mt-4"
          >
            <LogOut size={18} />
            <span>{t('settings.signOut')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingToggle: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}> = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors duration-250">
    <div className="space-y-1">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
    <button
      onClick={onChange}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-250 ${
        enabled ? 'bg-brand-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-250 ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export default SettingsPage;
