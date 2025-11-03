import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useChat } from '../contexts/ChatContext';
import { useModules } from '../contexts/ModuleContext';
import { useTenant } from '../contexts/TenantContext';
import CustomDrawerContent from '../components/CustomDrawerContent';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Main Screens
import DashboardScreen from '../screens/DashboardScreen';
import EnhancedShopScreen from '../screens/EnhancedShopScreen';
import CartScreen from '../screens/CartScreen';
import WishlistScreen from '../screens/WishlistScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PTSessionsScreen from '../screens/PTSessionsScreen';
import PTShopScreen from '../screens/PTShopScreen';
import PTBookingScreen from '../screens/PTBookingScreen';
import PTAvailabilityScreen from '../screens/PTAvailabilityScreen';
import ClassesScreen from '../screens/ClassesScreen';
import ChatScreen from '../screens/ChatScreen';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import TrainingProgramsScreen from '../screens/TrainingProgramsScreen';
import SupportScreen from '../screens/SupportScreen';
import WorkoutScreen from '../screens/WorkoutScreen';

// Admin Screens
import AdminScreen from '../screens/AdminScreen';
import ProductsManagementScreen from '../screens/ProductsManagementScreen';
import OrdersManagementScreen from '../screens/OrdersManagementScreen';
import ReviewManagementScreen from '../screens/ReviewManagementScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import ClassManagementScreen from '../screens/ClassManagementScreen';
import PTManagementScreen from '../screens/PTManagementScreen';
import WorkoutTemplateManagementScreen from '../screens/WorkoutTemplateManagementScreen';
import ExerciseManagementScreen from '../screens/ExerciseManagementScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityLogsScreen from '../screens/ActivityLogsScreen';
import ProductAnalyticsScreen from '../screens/ProductAnalyticsScreen';
import EnhancedAccountingScreen from '../screens/EnhancedAccountingScreen';
import ResultatregnskapScreen from '../screens/ResultatregnskapScreen';
import CreatePTSessionScreen from '../screens/CreatePTSessionScreen';
import EditPTSessionScreen from '../screens/EditPTSessionScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import MembershipManagementScreen from '../screens/MembershipManagementScreen';
import MembershipProfileScreen from '../screens/MembershipProfileScreen';
import MembershipDetailScreen from '../screens/MembershipDetailScreen';
import DoorManagementScreen from '../screens/DoorManagementScreen';
import DoorAccessRulesScreen from '../screens/DoorAccessRulesScreen';
import AccessLogsScreen from '../screens/AccessLogsScreen';
import DoorAccessScreen from '../screens/DoorAccessScreen';
import SuperAdminDashboardScreen from '../screens/SuperAdminDashboardScreen';
import TenantManagementScreen from '../screens/TenantManagementScreen';
import TenantDetailScreen from '../screens/TenantDetailScreen';
import CreateTenantScreen from '../screens/CreateTenantScreen';
import FeatureManagementScreen from '../screens/FeatureManagementScreen';
import AddUserToTenantScreen from '../screens/AddUserToTenantScreen';
import EditTenantUserScreen from '../screens/EditTenantUserScreen';
import ManageTenantFeaturesScreen from '../screens/ManageTenantFeaturesScreen';
import SubscriptionManagementScreen from '../screens/SubscriptionManagementScreen';
import ManageSubscriptionScreen from '../screens/ManageSubscriptionScreen';
import CreateSubscriptionScreen from '../screens/CreateSubscriptionScreen';
import TenantModulesScreen from '../screens/TenantModulesScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function MainDrawer() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { modules } = useModules();
  const { selectedTenant } = useTenant();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';

  // Show tenant-specific screens if user is ADMIN, or if SUPER_ADMIN has selected a tenant
  const showTenantScreens = isAdmin && (!isSuperAdmin || selectedTenant !== null);

  // Helper function to create cart button for shop screens
  const getCartButton = (navigation: any) => {
    if (!modules.shop || (isSuperAdmin && selectedTenant === null)) {
      return null;
    }
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Cart')}
        style={styles.cartButton}
      >
        <Ionicons name="cart-outline" size={24} color="#111827" />
        {itemCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{itemCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={28} color="#111827" />
          </TouchableOpacity>
        ),
        drawerType: 'front',
        swipeEnabled: true,
        drawerStyle: {
          width: '75%', // 75% av skjermbredden
          maxWidth: 300, // Maks 300px bred
        },
      })}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerTitle: 'Dashboard' }}
      />

      {isSuperAdmin && (
        <Drawer.Screen
          name="SuperAdminDashboard"
          component={SuperAdminDashboardScreen}
          options={{ headerTitle: 'Super Admin Portal' }}
        />
      )}

      {modules.shop && (
        <Drawer.Screen
          name="Shop"
          component={EnhancedShopScreen}
          options={({ navigation }) => ({
            headerTitle: 'Butikk',
            headerRight: () => getCartButton(navigation),
          })}
        />
      )}

      {modules.pt && (
        <Drawer.Screen
          name="PTSessions"
          component={PTSessionsScreen}
          options={{ headerTitle: 'PT-Økter' }}
        />
      )}

      {isCustomer && modules.classes && (
        <Drawer.Screen
          name="Classes"
          component={ClassesScreen}
          options={{ headerTitle: 'Klasser' }}
        />
      )}

      {isCustomer && modules.membership && (
        <Drawer.Screen
          name="Membership"
          component={MembershipProfileScreen}
          options={{ headerTitle: 'Medlemskap' }}
        />
      )}

      {modules.workout && (
        <Drawer.Screen
          name="Workout"
          component={WorkoutScreen}
          options={{ headerTitle: 'Treningsprogram' }}
        />
      )}

      {isCustomer && modules.doorAccess && (
        <Drawer.Screen
          name="DoorAccess"
          component={DoorAccessScreen}
          options={{ headerTitle: 'Dørtilgang' }}
        />
      )}

      {showTenantScreens && modules.accounting && (
        <Drawer.Screen
          name="Accounting"
          component={EnhancedAccountingScreen}
          options={{ headerTitle: 'Regnskap' }}
        />
      )}

      {modules.chat && (
        <Drawer.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerTitle: 'Chat' }}
        />
      )}

      {isAdmin && (
        <Drawer.Screen
          name="Admin"
          component={AdminScreen}
          options={{ headerTitle: 'Admin' }}
        />
      )}

      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: 'Profil' }}
      />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainDrawer" component={MainDrawer} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Wishlist" component={WishlistScreen} />
            <Stack.Screen name="Classes" component={ClassesScreen} />
            <Stack.Screen name="PurchaseHistory" component={PurchaseHistoryScreen} />
            <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
            <Stack.Screen name="TrainingPrograms" component={TrainingProgramsScreen} />
            <Stack.Screen
              name="PTShop"
              component={PTShopScreen}
              options={{ headerShown: true, headerTitle: 'PT-Timer' }}
            />
            <Stack.Screen
              name="PTBooking"
              component={PTBookingScreen}
              options={{ headerShown: true, headerTitle: 'Book PT-time' }}
            />
            <Stack.Screen
              name="PTAvailability"
              component={PTAvailabilityScreen}
              options={{ headerShown: true, headerTitle: 'Min Tilgjengelighet' }}
            />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="ProductsManagement" component={ProductsManagementScreen} />
            <Stack.Screen name="OrdersManagement" component={OrdersManagementScreen} options={{ headerShown: true, headerTitle: 'Bestillingsadministrasjon' }} />
            <Stack.Screen name="ReviewManagement" component={ReviewManagementScreen} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
            <Stack.Screen name="ClassManagement" component={ClassManagementScreen} />
            <Stack.Screen name="PTManagement" component={PTManagementScreen} />
            <Stack.Screen name="WorkoutTemplateManagement" component={WorkoutTemplateManagementScreen} />
            <Stack.Screen name="ExerciseManagement" component={ExerciseManagementScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="ActivityLogs" component={ActivityLogsScreen} />
            <Stack.Screen name="ProductAnalytics" component={ProductAnalyticsScreen} />
            <Stack.Screen name="Resultatregnskap" component={ResultatregnskapScreen} />
            <Stack.Screen name="CreatePTSession" component={CreatePTSessionScreen} />
            <Stack.Screen name="EditPTSession" component={EditPTSessionScreen} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
            <Stack.Screen name="MembershipManagement" component={MembershipManagementScreen} />
            <Stack.Screen name="MembershipDetail" component={MembershipDetailScreen} />
            <Stack.Screen name="DoorManagement" component={DoorManagementScreen} />
            <Stack.Screen name="DoorAccessRules" component={DoorAccessRulesScreen} />
            <Stack.Screen name="AccessLogs" component={AccessLogsScreen} />
            <Stack.Screen name="TenantManagement" component={TenantManagementScreen} options={{ headerShown: true, headerTitle: 'Tenant Management' }} />
            <Stack.Screen name="TenantDetail" component={TenantDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateTenant" component={CreateTenantScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FeatureManagement" component={FeatureManagementScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AddUserToTenantScreen" component={AddUserToTenantScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditTenantUserScreen" component={EditTenantUserScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageFeatures" component={ManageTenantFeaturesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} options={{ headerShown: true, headerTitle: 'Abonnementsstyring' }} />
            <Stack.Screen name="ManageSubscription" component={ManageSubscriptionScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateSubscription" component={CreateSubscriptionScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TenantModules" component={TenantModulesScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    marginLeft: 16,
    padding: 4,
  },
  cartButton: {
    marginRight: 16,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
