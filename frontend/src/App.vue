<template>
  <div id="app">
    <Toast />
    <ConfirmDialog />
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
</script>

<style></style>
