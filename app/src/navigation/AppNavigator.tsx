import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';
import Colors from '../constants/colors';
import {
  OnboardingScreen,
  checkShouldShowOnboarding,
  WelcomeScreen,
  LoginScreen,
  JoinCreateScreen,
  CreateGroupScreen,
  IconSelectionScreen,
  RoundTableScreen,
  AddPunishmentScreen,
  LateSelectionScreen,
  PunishmentRollScreen,
  PunishmentResultScreen,
  GuessAuthorScreen,
  SettingsScreen,
  UnlockScreen,
} from '../screens';
import { Punishment } from '../types/database';

export type RootStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  JoinCreate: undefined;
  CreateGroup: undefined;
  IconSelection: { is_band?: boolean };
  RoundTable: undefined;
  AddPunishment: { targetUserId: string; targetUserName: string };
  LateSelection: undefined;
  PunishmentRoll: { lateUserId: string; lateUserName: string };
  PunishmentResult: { punishment: Punishment; recordId: string; aiReason?: string };
  GuessAuthor: { punishment: Punishment; recordId: string };
  Settings: undefined;
  Unlock: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>加载中...</Text>
    </View>
  );
}

export function AppNavigator() {
  const { user, isLoading, isInitialized, initialize } = useAuthStore();
  const { currentGroup, loadUserGroups, userGroups, switchGroup, loadMembers, loadPunishments } = useGroupStore();
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const init = async () => {
      console.log('[Nav] Starting initialization...');
      
      try {
        // 检查是否需要显示引导页，最多等待 2 秒
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(true), 2000);
        });
        
        const shouldShow = await Promise.race([
          checkShouldShowOnboarding(),
          timeoutPromise
        ]);
        
        setShowOnboarding(shouldShow);
        console.log('[Nav] Show onboarding:', shouldShow);
      } catch (error) {
        console.log('[Nav] Onboarding check failed, defaulting to true');
        setShowOnboarding(true);
      }
      
      setIsCheckingOnboarding(false);
      
      // 初始化认证状态
      console.log('[Nav] Initializing auth...');
      await initialize();
      console.log('[Nav] Auth initialized');
    };
    
    init();
  }, []);

  // 当用户登录后，加载用户的所有群组
  useEffect(() => {
    const loadGroups = async () => {
      if (user && userGroups.length === 0) {
        console.log('[Nav] Loading user groups...');
        const groups = await loadUserGroups(user.id);
        
        // 如果有群组但没有当前群组，自动切换到第一个
        if (groups.length > 0 && !currentGroup) {
          switchGroup(groups[0]);
          await loadMembers(groups[0].id);
          await loadPunishments(groups[0].id);
        }
      }
    };
    
    loadGroups();
  }, [user]);

  console.log('[Nav] Render state:', { isInitialized, isLoading, isCheckingOnboarding, user: !!user, currentGroup: !!currentGroup });

  if (!isInitialized || isLoading || isCheckingOnboarding) {
    return <LoadingScreen />;
  }

  // 检查用户是否已选择图标
  const hasSelectedIcons = user?.instruments && user.instruments.length > 0;

  // 决定显示哪个屏幕组
  const getInitialRouteName = (): keyof RootStackParamList => {
    if (!user) {
      return showOnboarding ? 'Onboarding' : 'Welcome';
    }
    if (!currentGroup) return 'JoinCreate';
    if (!hasSelectedIcons) return 'IconSelection';
    return 'RoundTable';
  };

  const initialRoute = getInitialRouteName();
  console.log('[Nav] Initial route:', initialRoute);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background.primary },
          animation: 'slide_from_right',
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Group Selection Screens */}
        <Stack.Screen name="JoinCreate" component={JoinCreateScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
        <Stack.Screen name="IconSelection" component={IconSelectionScreen} />
        
        {/* Main App Screens */}
        <Stack.Screen name="RoundTable" component={RoundTableScreen} />
        <Stack.Screen name="AddPunishment" component={AddPunishmentScreen} />
        <Stack.Screen name="LateSelection" component={LateSelectionScreen} />
        <Stack.Screen name="PunishmentRoll" component={PunishmentRollScreen} />
        <Stack.Screen name="PunishmentResult" component={PunishmentResultScreen} />
        <Stack.Screen name="GuessAuthor" component={GuessAuthorScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Unlock" component={UnlockScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.text.tertiary,
  },
});
