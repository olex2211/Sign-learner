import React from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../src/constants/theme";

function TabIcon({
  iconName,
  focused,
  label,
}: {
  iconName: any;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={styles.iconWrap}>
      <Feather 
        name={iconName} 
        size={24} 
        color={focused ? Colors.greenDark : Colors.textMuted} 
      />
      <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="home" focused={focused} label="Головна" />
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="book-open" focused={focused} label="Навчання" />
          ),
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="grid" focused={focused} label="Жести" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="user" focused={focused} label="Профіль" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.greenLight,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 70,
  },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  labelFocused: {
    color: Colors.greenDark,
    fontWeight: "700",
  },
});
