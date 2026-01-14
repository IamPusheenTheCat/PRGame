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
  JoinCreate: { skipAutoRedirect?: boolean } | undefined;
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
  const { currentGroup, loadUserGroups, userGroups, switchGroup, loadMembers, loadPunishments, clearGroup } = useGroupStore();
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

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
      if (user) {
        console.log('[Nav] User logged in, loading groups...');
        setIsLoadingGroups(true);
        
        // 先检查是否已经有 currentGroup（可能是从缓存恢复的）
        if (currentGroup) {
          console.log('[Nav] Already has currentGroup:', currentGroup.name);
          setIsLoadingGroups(false);
          return;
        }
        
        try {
          const groups = await loadUserGroups(user.id);
          console.log('[Nav] Loaded groups:', groups.length);
          
          // 如果有群组但没有当前群组，尝试恢复上次的群组
          if (groups.length > 0) {
            // 尝试获取上次使用的群组 ID
            const lastGroupId = await useGroupStore.getState().getLastGroupId();
            console.log('[Nav] Last used group ID:', lastGroupId);
            
            // 查找上次使用的群组
            const lastGroup = lastGroupId 
              ? groups.find(g => g.id === lastGroupId)
              : null;
            
            // 如果找到上次的群组，使用它；否则使用第一个
            const targetGroup = lastGroup || groups[0];
            console.log('[Nav] Auto-switching to group:', targetGroup.name, lastGroup ? '(last used)' : '(first)');
            
            await switchGroup(targetGroup);
            await loadMembers(targetGroup.id);
            await loadPunishments(targetGroup.id);
          } else {
            console.log('[Nav] No groups found for user');
          }
        } finally {
          setIsLoadingGroups(false);
        }
      } else {
        // 用户登出时清空群组状态
        console.log('[Nav] User logged out, clearing group state');
        clearGroup();
        setIsLoadingGroups(false);
      }
    };
    
    loadGroups();
  }, [user]);

  console.log('[Nav] Render state:', { 
    isInitialized, 
    isLoading, 
    isCheckingOnboarding, 
    isLoadingGroups,
    user: !!user, 
    currentGroup: !!currentGroup,
    userGroups: userGroups.length 
  });

  // 如果还在初始化、加载认证或检查 onboarding，显示加载屏幕
  if (!isInitialized || isLoading || isCheckingOnboarding) {
    return <LoadingScreen />;
  }
  
  // 如果用户已登录但群组还在加载中，也显示加载屏幕
  if (user && isLoadingGroups) {
    console.log('[Nav] Waiting for groups to load...');
    return <LoadingScreen />;
  }

  // 检查用户是否已选择图标
  const hasSelectedIcons = user?.instruments && user.instruments.length > 0;

  // 决定显示哪个屏幕组
  const getInitialRouteName = (): keyof RootStackParamList => {
    if (!user) {
      return showOnboarding ? 'Onboarding' : 'Welcome';
    }
    
    // 如果有当前群组，进入主界面
    if (currentGroup) {
      if (!hasSelectedIcons) return 'IconSelection';
      return 'RoundTable';
    }
    
    // 如果有用户群组列表但还没有当前群组，可能是正在加载
    // 这种情况下，先显示 RoundTable，让 useEffect 完成加载
    if (userGroups.length > 0) {
      console.log('[Nav] Has userGroups but no currentGroup, will auto-switch in useEffect');
      return 'RoundTable';
    }
    
    // 没有群组，去加入/创建页面
    return 'JoinCreate';
  };

  const initialRoute = getInitialRouteName();
  console.log('[Nav] Initial route:', initialRoute, '(currentGroup:', !!currentGroup, 'userGroups:', userGroups.length, ')');

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
