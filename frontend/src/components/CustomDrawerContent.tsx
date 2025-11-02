import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { useTenant } from '../contexts/TenantContext';
import { useCart } from '../contexts/CartContext';
import { useChat } from '../contexts/ChatContext';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const { modules } = useModules();
  const { selectedTenant } = useTenant();
  const { itemCount } = useCart();
  const { unreadCount } = useChat();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';
  const showTenantTabs = isAdmin && (!isSuperAdmin || selectedTenant !== null);

  const handleLogout = async () => {
    await logout();
    props.navigation.closeDrawer();
  };

  const navigateTo = (screen: string) => {
    props.navigation.navigate(screen);
    props.navigation.closeDrawer();
  };

  interface MenuItem {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    badge?: number;
    show: boolean;
  }

  const menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'home',
      onPress: () => navigateTo('Dashboard'),
      show: true,
    },
    {
      label: 'Super Admin',
      icon: 'shield-checkmark',
      onPress: () => navigateTo('SuperAdminDashboard'),
      show: isSuperAdmin,
    },
    {
      label: 'Butikk',
      icon: 'storefront',
      onPress: () => navigateTo('Shop'),
      badge: itemCount > 0 ? itemCount : undefined,
      show: modules.shop,
    },
    {
      label: 'PT-Økter',
      icon: 'barbell',
      onPress: () => navigateTo('PTSessions'),
      show: modules.pt,
    },
    {
      label: 'Klasser',
      icon: 'calendar',
      onPress: () => navigateTo('Classes'),
      show: isCustomer && modules.classes,
    },
    {
      label: 'Medlemskap',
      icon: 'card',
      onPress: () => navigateTo('Membership'),
      show: isCustomer && modules.membership,
    },
    {
      label: 'Treningsprogram',
      icon: 'fitness',
      onPress: () => navigateTo('Workout'),
      show: modules.workout,
    },
    {
      label: 'Dørtilgang',
      icon: 'key',
      onPress: () => navigateTo('DoorAccess'),
      show: isCustomer && modules.doorAccess,
    },
    {
      label: 'Regnskap',
      icon: 'calculator',
      onPress: () => navigateTo('Accounting'),
      show: showTenantTabs && modules.accounting,
    },
    {
      label: 'Chat',
      icon: 'chatbubbles',
      onPress: () => navigateTo('Chat'),
      badge: unreadCount > 0 ? unreadCount : undefined,
      show: modules.chat,
    },
    {
      label: 'Admin',
      icon: 'settings',
      onPress: () => navigateTo('Admin'),
      show: isAdmin,
    },
    {
      label: 'Profil',
      icon: 'person',
      onPress: () => navigateTo('Profile'),
      show: true,
    },
  ];

  const visibleMenuItems = menuItems.filter(item => item.show);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={60} color="#3B82F6" />
        </View>
        <Text style={styles.userName}>{String(user?.name || user?.email || 'Bruker')}</Text>
        <Text style={styles.userEmail}>{String(user?.email || '')}</Text>
        {user?.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{String(user.role)}</Text>
          </View>
        )}
        {selectedTenant && selectedTenant.name && (
          <View style={styles.tenantBadge}>
            <Text style={styles.tenantText}>{String(selectedTenant.name)}</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu Items */}
      <ScrollView style={styles.menuContainer}>
        {visibleMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon} size={24} color="#374151" />
            <Text style={styles.menuLabel}>{String(item.label)}</Text>
            {item.badge && typeof item.badge === 'number' && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{String(item.badge)}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={24} color="#EF4444" />
        <Text style={styles.logoutText}>Logg ut</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tenantBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  tenantText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuLabel: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
    flex: 1,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 16,
    fontWeight: '600',
  },
});
