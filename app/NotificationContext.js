import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './context/AuthContext';
import { safeFormatDate } from './utils/dateFormat';

const NotificationContext = createContext(null);

const formatNotificationDate = (offsetHours) => {
  const date = new Date();
  date.setHours(date.getHours() - offsetHours);
  return safeFormatDate(date, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const buildNotifications = (firstName) => [
  {
    id: 'nutrition-plan',
    title: 'Nuevo plan alimentario disponible',
    message: `${firstName}, ya tienes una nueva propuesta de comidas con calorias y macros ajustados a tu objetivo actual.`,
    icon: 'restaurant-outline',
    color: '#16a34a',
    dateLabel: formatNotificationDate(2),
    actionLabel: 'Ver nutricion',
    navigateTo: { screen: 'Nutricion' },
    unread: true,
  },
  {
    id: 'register-success',
    title: 'Registro exitoso',
    message: 'Tu perfil quedo creado correctamente. Ya puedes revisar tus datos, ajustar preferencias y empezar tu seguimiento.',
    icon: 'checkmark-circle-outline',
    color: '#2563eb',
    dateLabel: formatNotificationDate(6),
    actionLabel: 'Ir al perfil',
    navigateTo: { screen: 'Perfil' },
    unread: false,
  },
  {
    id: 'routine-refresh',
    title: 'Nuevo plan de rutinas sugerido',
    message: 'Encontramos nuevas sesiones recomendadas para hoy segun tu actividad reciente y objetivo de entrenamiento.',
    icon: 'barbell-outline',
    color: '#e60404',
    dateLabel: formatNotificationDate(10),
    actionLabel: 'Ver rutinas',
    navigateTo: { screen: 'Rutinas' },
    unread: true,
  },
  {
    id: 'analytics-checkin',
    title: 'Chequeo de progreso',
    message: 'Tus analiticas ya pueden darte prioridades de recuperacion, energia e hidratacion para el dia.',
    icon: 'pulse-outline',
    color: '#a855f7',
    dateLabel: formatNotificationDate(18),
    actionLabel: 'Abrir analiticas',
    navigateTo: { screen: 'Mis Analiticas' },
    unread: false,
  },
];

export function NotificationProvider({ children }) {
  const { userProfile, currentUser } = useAuth();
  const firstName =
    userProfile?.fullName?.trim()?.split(' ')?.[0] ||
    currentUser?.displayName?.trim()?.split(' ')?.[0] ||
    'Usuario';
  const [notifications, setNotifications] = useState(() => buildNotifications(firstName));

  useEffect(() => {
    setNotifications(buildNotifications(firstName));
  }, [firstName]);

  const value = useMemo(() => {
    const unreadCount = notifications.filter((item) => item.unread).length;

    return {
      notifications,
      unreadCount,
      markAllAsRead: () => {
        setNotifications((current) =>
          current.map((item) => (item.unread ? { ...item, unread: false } : item))
        );
      },
    };
  }, [notifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
