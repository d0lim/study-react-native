import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#4CAF50' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '내 농장',
          tabBarIcon: ({ color }) => <MaterialIcons name="eco" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: '상점',
          tabBarIcon: ({ color }) => <MaterialIcons name="storefront" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: '아이템',
          tabBarIcon: ({ color }) => <MaterialIcons name="inventory-2" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="invite"
        options={{
          title: '초대',
          tabBarIcon: ({ color }) => <MaterialIcons name="person-add" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
