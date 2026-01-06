import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, MemberAvatar, SafeArea } from '../components/ui';
import Colors from '../constants/colors';
import { INSTRUMENTS, GENERAL_ICONS, IconItem } from '../constants/instruments';
import { useAuthStore } from '../stores/authStore';
import { useGroupStore } from '../stores/groupStore';

type RootStackParamList = {
  IconSelection: { is_band?: boolean };
  RoundTable: undefined;
};

export function IconSelectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'IconSelection'>>();
  const { user, updateUser } = useAuthStore();
  const { currentGroup } = useGroupStore();

  // 优先使用路由参数，其次使用群组设置，默认为乐队
  const isBand = route.params?.is_band ?? currentGroup?.is_band ?? true;
  const icons: IconItem[] = isBand ? INSTRUMENTS : GENERAL_ICONS;

  // 每次进入页面都从空开始选择，不保留上次的选择
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleIcon = (iconId: string) => {
    if (selectedIcons.includes(iconId)) {
      setSelectedIcons(selectedIcons.filter((id) => id !== iconId));
    } else if (selectedIcons.length < 3) {
      setSelectedIcons([...selectedIcons, iconId]);
    } else {
      Alert.alert('提示', '最多选择3个图标');
    }
  };

  const getSelectedIconNames = () => {
    return selectedIcons
      .map((id) => icons.find((i) => i.id === id)?.name)
      .filter(Boolean)
      .join(' · ');
  };

  const handleContinue = async () => {
    console.log('[IconSelection] handleContinue called, selected:', selectedIcons);
    
    if (selectedIcons.length === 0) {
      Alert.alert('提示', '请至少选择一个图标');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[IconSelection] Updating user instruments...');
      await updateUser({ instruments: selectedIcons });
      console.log('[IconSelection] Update success, navigating to RoundTable');
      // 导航到圆桌页面
      navigation.reset({
        index: 0,
        routes: [{ name: 'RoundTable' }],
      });
    } catch (error: any) {
      console.error('[IconSelection] Error:', error);
      Alert.alert('错误', error?.message || '保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeArea>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="chevron-left" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>选择图标</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>
            {isBand ? '选择你的乐器' : '选择你的专属图标'}
          </Text>
          <Text style={styles.infoSubtitle}>
            最多选择3个，这将显示在你的头像旁边
          </Text>
        </View>

        {/* Preview */}
        {user && (
          <Card variant="strong" style={styles.previewCard}>
            <View style={styles.previewContent}>
              <MemberAvatar name={user.name} id={user.id} size="lg" />
              <View style={styles.previewInfo}>
                <Text style={styles.previewName}>{user.name}</Text>
                <Text style={styles.previewIcons}>
                  {getSelectedIconNames() || '请选择图标...'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Icon Grid */}
        <View style={styles.iconGrid}>
          {icons.map((icon) => {
            const isSelected = selectedIcons.includes(icon.id);
            return (
              <TouchableOpacity
                key={icon.id}
                style={[styles.iconItem, isSelected && styles.iconItemSelected]}
                onPress={() => toggleIcon(icon.id)}
              >
                <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                  <FontAwesome
                    name={icon.icon as any}
                    size={24}
                    color={isSelected ? '#fff' : Colors.text.secondary}
                  />
                </View>
                <Text style={[styles.iconName, isSelected && styles.iconNameSelected]}>
                  {icon.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <FontAwesome name="check" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue Button */}
        <Button
          title={`继续 (${selectedIcons.length}/3)`}
          onPress={handleContinue}
          loading={isLoading}
          disabled={selectedIcons.length === 0}
          style={styles.continueButton}
        />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 15,
    color: Colors.text.tertiary,
  },
  previewCard: {
    marginBottom: 32,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  previewIcons: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  iconItem: {
    width: '30%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.glass.background,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  iconItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.glass.backgroundStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconCircleSelected: {
    backgroundColor: Colors.primary,
  },
  iconName: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  iconNameSelected: {
    color: '#fff',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    marginTop: 8,
  },
});
