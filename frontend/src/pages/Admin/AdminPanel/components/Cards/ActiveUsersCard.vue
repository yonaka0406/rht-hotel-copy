<template>
    <StatCard
        title="ログイン中ユーザー"
        :value="activeUsers"
        colorClass="bg-blue-50 dark:bg-blue-900/20"
        titleColorClass="text-blue-800 dark:text-blue-300"
        valueColorClass="text-blue-600 dark:text-blue-400"
    />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import StatCard from './StatCard.vue';

const activeUsers = ref(0);
let activeUsersInterval = null;

const fetchActiveUsers = async () => {
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/auth/active-users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTPエラー！ステータス: ${response.status}`);
        }
        const data = await response.json();
        activeUsers.value = data.activeUsers;
    } catch (err) {
        console.error('アクティブユーザーの取得に失敗しました:', err);
    }
};

onMounted(() => {
    fetchActiveUsers();
    activeUsersInterval = setInterval(fetchActiveUsers, 30000);
});

onUnmounted(() => {
    if (activeUsersInterval) {
        clearInterval(activeUsersInterval);
    }
});
</script>